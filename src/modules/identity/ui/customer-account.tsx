"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";
import type { CatalogueFilters } from "@/contracts/catalogue";
import type { AddressInput, CustomerProfile } from "@/contracts/profile";
import { api } from "@/lib/api";

type AddressFields = Record<keyof AddressInput, string>;

const emptyAddress = (): AddressFields => ({
  recipientName: "", line1: "", line2: "", suburb: "", state: "", postcode: "", country: "AU",
});

function addressFields(address: AddressInput | null): AddressFields {
  return address ? { ...address, line2: address.line2 ?? "" } : emptyAddress();
}

function addressInput(fields: AddressFields): AddressInput {
  return { ...fields, line2: fields.line2.trim() || null, country: fields.country.trim().toUpperCase() };
}

function AddressForm({ prefix, value, onChange, disabled }: Readonly<{
  prefix: string;
  value: AddressFields;
  onChange: (next: AddressFields) => void;
  disabled: boolean;
}>) {
  const fields: readonly { readonly key: keyof AddressFields; readonly label: string; readonly autoComplete: string }[] = [
    { key: "recipientName", label: "Recipient name", autoComplete: "name" },
    { key: "line1", label: "Address line 1", autoComplete: "address-line1" },
    { key: "line2", label: "Address line 2 (optional)", autoComplete: "address-line2" },
    { key: "suburb", label: "Suburb", autoComplete: "address-level2" },
    { key: "state", label: "State", autoComplete: "address-level1" },
    { key: "postcode", label: "Postcode", autoComplete: "postal-code" },
    { key: "country", label: "Country code", autoComplete: "country" },
  ];
  return <div className="grid gap-4 sm:grid-cols-2">
    {fields.map(field => <label key={field.key} className={field.key === "line1" || field.key === "line2" ? "sm:col-span-2" : ""}>
      <span className="mb-1 block text-label text-text">{field.label}</span>
      <input id={`${prefix}-${field.key}`} name={field.key} required={field.key !== "line2"} autoComplete={field.autoComplete} disabled={disabled}
        value={value[field.key]} onChange={event => onChange({ ...value, [field.key]: event.target.value })}
        maxLength={field.key === "recipientName" || field.key === "suburb" || field.key === "state" ? 100 : field.key === "line1" || field.key === "line2" ? 200 : field.key === "postcode" ? 16 : 2}
        minLength={field.key === "country" ? 2 : undefined} pattern={field.key === "postcode" ? "[A-Za-z0-9 -]{3,16}" : field.key === "country" ? "[A-Za-z]{2}" : undefined}
        inputMode={field.key === "postcode" ? "text" : undefined} autoCapitalize={field.key === "country" ? "characters" : undefined}
        className="min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 disabled:opacity-60" />
    </label>)}
  </div>;
}

export function CustomerAccount() {
  const router = useRouter();
  const [profile, setProfile] = React.useState<CustomerProfile | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [cart, setCart] = React.useState<CartDto | null>(null);
  const [filters, setFilters] = React.useState<CatalogueFilters | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ variant: "success" | "danger" | "warning"; text: string } | null>(null);
  const [name, setName] = React.useState("");
  const [noteIds, setNoteIds] = React.useState<readonly string[]>([]);
  const [intensityId, setIntensityId] = React.useState("");
  const [avoidance, setAvoidance] = React.useState("");
  const [delivery, setDelivery] = React.useState<AddressFields>(emptyAddress);
  const [billing, setBilling] = React.useState<AddressFields>(emptyAddress);
  const [sameAsDelivery, setSameAsDelivery] = React.useState(true);

  const sync = React.useCallback((next: CustomerProfile) => {
    setProfile(next); setName(next.name); setNoteIds(next.preferences.favouriteNoteIds);
    setIntensityId(next.preferences.preferredIntensityId ?? ""); setAvoidance(next.preferences.sensitivityAvoidance ?? "");
    setDelivery(addressFields(next.deliveryAddress)); setBilling(addressFields(next.billingAddress)); setSameAsDelivery(next.billingSameAsDelivery);
  }, []);

  const reload = React.useCallback(async (conflict = false) => {
    const result = await api.profile.get();
    if (result.ok) { sync(result.data); if (conflict) setMessage({ variant: "warning", text: "Your account changed elsewhere. The latest saved details have been reloaded." }); return true; }
    if (result.error.code === "UNAUTHENTICATED") { router.replace("/login?next=/account"); return false; }
    setMessage({ variant: "danger", text: result.error.message }); return false;
  }, [router, sync]);

  React.useEffect(() => {
    let active = true;
    async function initialise() {
      const [sessionResult, profileResult, cartResult, filtersResult] = await Promise.all([api.auth.getSession(), api.profile.get(), api.cart.get(), api.catalogue.getFilters()]);
      if (!active) return;
      if (!sessionResult.ok || sessionResult.data.user?.role !== "CUSTOMER" || !profileResult.ok) {
        router.replace("/login?next=/account");
        return;
      }
      setSession(sessionResult.data); sync(profileResult.data);
      if (cartResult.ok) setCart(cartResult.data);
      if (filtersResult.ok) setFilters(filtersResult.data);
      else setMessage({ variant: "warning", text: "Preference choices are temporarily unavailable; your saved choices remain unchanged." });
      setLoading(false);
    }
    void initialise();
    return () => { active = false; };
  }, [router, sync]);

  async function mutate(label: string, successText: string, action: (current: CustomerProfile) => ReturnType<typeof api.profile.update>): Promise<void> {
    if (!profile || busy) return;
    setBusy(label); setMessage(null);
    try {
      const result = await action(profile);
      if (result.ok) { sync(result.data); setMessage({ variant: "success", text: successText }); }
      else if (result.error.code === "CONFLICT") await reload(true);
      else if (result.error.code === "UNAUTHENTICATED") router.replace("/login?next=/account");
      else setMessage({ variant: "danger", text: result.error.message });
    } finally { setBusy(null); }
  }

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate("profile", "Your profile and fragrance preferences have been saved.", current => api.profile.update({ expectedRevision: current.revision, name, preferences: { favouriteNoteIds: noteIds, preferredIntensityId: intensityId || null, sensitivityAvoidance: avoidance.trim() || null } }));
  }
  function saveDelivery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate("delivery", "Your delivery address has been saved.", current => api.profile.setDeliveryAddress({ expectedRevision: current.revision, address: addressInput(delivery) }));
  }
  function saveBilling(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate("billing", "Your billing address has been saved.", current => api.profile.setBillingAddress({ expectedRevision: current.revision, billing: sameAsDelivery ? { kind: "USE_DELIVERY" } : { kind: "SEPARATE", address: addressInput(billing) } }));
  }
  function generateIdentity() { void mutate("identity", "Your fragrance identity has been generated.", current => api.profile.generateIdentity({ expectedRevision: current.revision })); }
  async function deactivate() {
    if (!profile || busy || !window.confirm("Deactivate your Palermo account? You will be signed out.")) return;
    setBusy("deactivate"); setMessage(null);
    try {
      const result = await api.profile.deactivate({ expectedRevision: profile.revision });
      if (result.ok) { router.replace("/login"); router.refresh(); }
      else if (result.error.code === "CONFLICT") await reload(true);
      else if (result.error.code === "UNAUTHENTICATED") router.replace("/login?next=/account");
      else setMessage({ variant: "danger", text: result.error.message });
    } finally { setBusy(null); }
  }

  const disabled = loading || busy !== null;
  return <CustomerShell cart={cart} session={session} isLoading={loading}>
    <div className="mx-auto max-w-[var(--container-page)] space-y-6">
      <div><h1 className="text-h1 text-text">Account</h1><p className="mt-1 text-sm text-text-muted">Manage your profile, fragrance preferences and saved addresses.</p></div>
      {message && <Alert variant={message.variant}>{message.text}</Alert>}
      {loading && <Card aria-busy="true" aria-label="Loading account details"><CardContent className="space-y-4"><div className="h-6 w-48 animate-pulse rounded bg-surface-muted" /><div className="h-11 w-full animate-pulse rounded bg-surface-muted" /><div className="h-11 w-3/4 animate-pulse rounded bg-surface-muted" /></CardContent></Card>}
      {!loading && profile && <>
        <Card><CardHeader><CardTitle>Profile and preferences</CardTitle></CardHeader><CardContent>
          <form className="space-y-5" onSubmit={saveProfile}>
            <label><span className="mb-1 block text-label text-text">Name</span><input required maxLength={100} autoComplete="name" disabled={disabled} value={name} onChange={event => setName(event.target.value)} className="min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 disabled:opacity-60" /></label>
            <p className="text-sm text-text-muted">Email: {profile.email}</p>
            <fieldset disabled={disabled}><legend className="mb-2 text-label text-text">Favourite notes</legend><div className="flex flex-wrap gap-x-4 gap-y-2">{filters?.note.map(note => <label key={note.id} className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={noteIds.includes(note.id)} onChange={() => setNoteIds(current => current.includes(note.id) ? current.filter(id => id !== note.id) : [...current, note.id])} />{note.label}</label>)}</div></fieldset>
            <label><span className="mb-1 block text-label text-text">Preferred intensity</span><select disabled={disabled || !filters} value={intensityId} onChange={event => setIntensityId(event.target.value)} className="min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 disabled:opacity-60"><option value="">No preference</option>{filters?.intensity.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
            <label><span className="mb-1 block text-label text-text">Fragrance avoidance (optional)</span><textarea disabled={disabled} maxLength={500} value={avoidance} onChange={event => setAvoidance(event.target.value)} className="min-h-24 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 disabled:opacity-60" /><span className="mt-1 block text-xs text-text-muted">Share scent preferences only; do not include medical information.</span></label>
            <Button type="submit" isLoading={busy === "profile"}>Save profile</Button>
          </form>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Delivery address</CardTitle></CardHeader><CardContent><form className="space-y-5" onSubmit={saveDelivery}><AddressForm prefix="delivery" value={delivery} onChange={setDelivery} disabled={disabled} /><Button type="submit" isLoading={busy === "delivery"}>Save delivery address</Button></form></CardContent></Card>
        <Card><CardHeader><CardTitle>Billing address</CardTitle></CardHeader><CardContent><form className="space-y-5" onSubmit={saveBilling}><label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={sameAsDelivery} disabled={disabled} onChange={event => setSameAsDelivery(event.target.checked)} />Same as delivery address</label>{sameAsDelivery && !profile.deliveryAddress && <p className="text-sm text-text-muted">Save a delivery address before using it for billing.</p>}{!sameAsDelivery && <AddressForm prefix="billing" value={billing} onChange={setBilling} disabled={disabled} />}<Button type="submit" disabled={sameAsDelivery && !profile.deliveryAddress} isLoading={busy === "billing"}>Save billing address</Button></form></CardContent></Card>
        <Card><CardHeader><CardTitle>Fragrance identity</CardTitle></CardHeader><CardContent className="space-y-4">{profile.fragranceIdentity ? <div><p className="font-medium text-text">{profile.fragranceIdentity.primaryFamily.label}</p><p className="mt-1 text-sm text-text-muted">{profile.fragranceIdentity.explanation}</p><p className="mt-2 text-xs text-text-muted">Status: {profile.fragranceIdentity.status}</p></div> : <p className="text-sm text-text-muted">Save at least one favourite note or a preferred intensity to generate your fragrance identity.</p>}<Button type="button" variant="outline" onClick={generateIdentity} disabled={!profile.preferences.favouriteNoteIds.length && !profile.preferences.preferredIntensityId} isLoading={busy === "identity"}>Generate fragrance identity</Button></CardContent></Card>
        <Card><CardHeader><CardTitle>Account status</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-text-muted">Status: {profile.accountStatus}</p><Button type="button" variant="danger" onClick={() => void deactivate()} isLoading={busy === "deactivate"}>Deactivate account</Button></CardContent></Card>
      </>}
    </div>
  </CustomerShell>;
}
