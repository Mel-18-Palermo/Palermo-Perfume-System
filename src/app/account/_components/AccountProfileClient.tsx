"use client";

import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { EmptyState } from "../../../components/ui/empty-state";
import { AddressForm } from "./AddressForm";
import { api } from "../../../lib/api";
import type {
  CustomerProfile,
  AddressInput,
  FragrancePreferences,
} from "../../../contracts/profile";
import type { CatalogueFilters } from "../../../contracts/catalogue";

type LoadState = "loading" | "loaded" | "error";

export function AccountProfileClient() {
  const [state, setState] = React.useState<LoadState>("loading");
  const [profile, setProfile] = React.useState<CustomerProfile | null>(null);
  const [filters, setFilters] = React.useState<CatalogueFilters | null>(null);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [conflictNotice, setConflictNotice] = React.useState("");

  const [nameDraft, setNameDraft] = React.useState("");
  const [nameError, setNameError] = React.useState("");
  const [savingName, setSavingName] = React.useState(false);

  const [prefsDraft, setPrefsDraft] = React.useState<FragrancePreferences | null>(null);
  const [prefsError, setPrefsError] = React.useState("");
  const [savingPrefs, setSavingPrefs] = React.useState(false);

  const [showSeparateBilling, setShowSeparateBilling] = React.useState(false);
  const [identityError, setIdentityError] = React.useState("");
  const [generatingIdentity, setGeneratingIdentity] = React.useState(false);
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setState("loading");
    setErrorMessage("");
    const [profileResult, filtersResult] = await Promise.all([
      api.profile.get(),
      api.catalogue.getFilters(),
    ]);

    if (!profileResult.ok) {
      setErrorMessage(profileResult.error.message);
      setState("error");
      return;
    }
    if (!filtersResult.ok) {
      setErrorMessage(filtersResult.error.message);
      setState("error");
      return;
    }

    setProfile(profileResult.data);
    setFilters(filtersResult.data);
    setNameDraft(profileResult.data.name);
    setPrefsDraft(profileResult.data.preferences);
    setShowSeparateBilling(!profileResult.data.billingSameAsDelivery);
    setState("loaded");
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function handleConflict(message?: string) {
    setConflictNotice(
      message ?? "Your profile changed elsewhere. We've reloaded the latest version."
    );
    load();
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!nameDraft.trim()) {
      setNameError("Name cannot be empty.");
      return;
    }
    setNameError("");
    setSavingName(true);
    const result = await api.profile.update({
      expectedRevision: profile.revision,
      name: nameDraft.trim(),
      preferences: profile.preferences,
    });
    setSavingName(false);

    if (result.ok) {
      setProfile(result.data);
      setNameDraft(result.data.name);
      setPrefsDraft(result.data.preferences);
    } else if (result.error.code === "CONFLICT") {
      handleConflict();
    } else if (result.error.code === "VALIDATION_ERROR") {
      setNameError(result.error.fieldErrors?.name?.[0] ?? result.error.message);
    } else {
      setErrorMessage(result.error.message);
    }
  }

  function toggleNote(noteId: string) {
    setPrefsDraft((prev) => {
      if (!prev) return prev;
      const has = prev.favouriteNoteIds.includes(noteId);
      const favouriteNoteIds = has
        ? prev.favouriteNoteIds.filter((id) => id !== noteId)
        : [...prev.favouriteNoteIds, noteId];
      return { ...prev, favouriteNoteIds };
    });
  }

  function setIntensity(intensityId: string) {
    setPrefsDraft((prev) => (prev ? { ...prev, preferredIntensityId: intensityId } : prev));
  }

  function setSensitivity(value: string) {
    setPrefsDraft((prev) => (prev ? { ...prev, sensitivityAvoidance: value || null } : prev));
  }

  async function handleSavePreferences() {
    if (!profile || !prefsDraft) return;
    setPrefsError("");
    setSavingPrefs(true);
    const result = await api.profile.update({
      expectedRevision: profile.revision,
      name: profile.name,
      preferences: prefsDraft,
    });
    setSavingPrefs(false);

    if (result.ok) {
      setProfile(result.data);
      setPrefsDraft(result.data.preferences);
    } else if (result.error.code === "CONFLICT") {
      handleConflict();
    } else if (result.error.code === "VALIDATION_ERROR") {
      setPrefsError(result.error.message);
    } else {
      setErrorMessage(result.error.message);
    }
  }

  async function handleSaveDeliveryAddress(address: AddressInput) {
    if (!profile) return;
    const result = await api.profile.setDeliveryAddress({
      expectedRevision: profile.revision,
      address,
    });
    if (result.ok) {
      setProfile(result.data);
      setShowSeparateBilling(!result.data.billingSameAsDelivery);
    } else if (result.error.code === "CONFLICT") {
      handleConflict();
    } else {
      setErrorMessage(result.error.message);
    }
  }

  async function handleUseDeliveryForBilling() {
    if (!profile) return;
    const result = await api.profile.setBillingAddress({
      expectedRevision: profile.revision,
      billing: { kind: "USE_DELIVERY" },
    });
    if (result.ok) {
      setProfile(result.data);
      setShowSeparateBilling(false);
    } else if (result.error.code === "CONFLICT") {
      handleConflict();
    } else {
      setErrorMessage(result.error.message);
    }
  }

  async function handleSaveSeparateBilling(address: AddressInput) {
    if (!profile) return;
    const result = await api.profile.setBillingAddress({
      expectedRevision: profile.revision,
      billing: { kind: "SEPARATE", address },
    });
    if (result.ok) {
      setProfile(result.data);
    } else if (result.error.code === "CONFLICT") {
      handleConflict();
    } else {
      setErrorMessage(result.error.message);
    }
  }

  async function handleGenerateIdentity() {
    if (!profile) return;
    setIdentityError("");
    setGeneratingIdentity(true);
    const result = await api.profile.generateIdentity({ expectedRevision: profile.revision });
    setGeneratingIdentity(false);

    if (result.ok) {
      setProfile(result.data);
    } else if (result.error.code === "CONFLICT") {
      handleConflict();
    } else if (result.error.code === "VALIDATION_ERROR") {
      setIdentityError(result.error.message);
    } else {
      setErrorMessage(result.error.message);
    }
  }

  if (state === "loading") {
    return (
      <div className="space-y-4" aria-live="polite" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full animate-pulse rounded-lg bg-surface-muted" />
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <EmptyState
        title="We couldn't load your account"
        description={errorMessage || "Something went wrong while fetching your profile. Please try again."}
        action={<Button onClick={load}>Try again</Button>}
      />
    );
  }

  if (!profile || !filters || !prefsDraft) return null;

  return (
    <div className="space-y-6">
      {conflictNotice && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {conflictNotice}
          <button
            type="button"
            onClick={() => setConflictNotice("")}
            className="ml-3 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {errorMessage}
        </div>
      )}

      {/* Account overview */}
      <Card>
        <CardHeader>
          <CardTitle>Account overview</CardTitle>
          <CardDescription>Your account status and basic details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {profile.name}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {profile.email}
          </p>
          <p>
            <span className="text-muted-foreground">Status:</span>{" "}
            <span className="font-medium">{profile.accountStatus}</span>
          </p>
        </CardContent>
      </Card>

      {/* Profile form (FR-PROFILE-001) */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your display name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Full name"
                value={nameDraft}
                error={nameError}
                disabled={savingName}
                onChange={(e) => setNameDraft(e.target.value)}
              />
            </div>
            <Button type="submit" isLoading={savingName}>
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Delivery address (FR-PROFILE-002) */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery address</CardTitle>
          <CardDescription>Used for shipping your orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddressForm
            title="delivery address"
            value={profile.deliveryAddress}
            onSave={handleSaveDeliveryAddress}
          />
        </CardContent>
      </Card>

      {/* Billing address (FR-PROFILE-003) */}
      <Card>
        <CardHeader>
          <CardTitle>Billing address</CardTitle>
          <CardDescription>Used for invoices and payment records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={!showSeparateBilling}
              onChange={(e) => {
                if (e.target.checked) {
                  handleUseDeliveryForBilling();
                } else {
                  setShowSeparateBilling(true);
                }
              }}
              className="h-4 w-4 rounded border-border"
            />
            Same as delivery address
          </label>
          {showSeparateBilling && (
            <AddressForm
              title="billing address"
              value={profile.billingSameAsDelivery ? null : profile.billingAddress}
              onSave={handleSaveSeparateBilling}
            />
          )}
        </CardContent>
      </Card>

      {/* Fragrance preferences (FR-PROFILE-004/005/006/007) */}
      <Card>
        <CardHeader>
          <CardTitle>Fragrance preferences</CardTitle>
          <CardDescription>
            All fields below are optional. This information powers your Fragrance Identity and
            recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium text-foreground">Favourite notes</p>
            <div className="flex flex-wrap gap-2">
              {filters.note.map((note) => {
                const selected = prefsDraft.favouriteNoteIds.includes(note.id);
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => toggleNote(note.id)}
                    aria-pressed={selected}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    {note.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-foreground">Preferred intensity</p>
            <div className="flex flex-wrap gap-2">
              {filters.intensity.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setIntensity(option.id)}
                  aria-pressed={prefsDraft.preferredIntensityId === option.id}
                  className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                    prefsDraft.preferredIntensityId === option.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-foreground hover:bg-surface-muted"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="sensitivity" className="mb-2 block text-xs font-medium text-foreground">
              Notes or characteristics you&apos;d prefer to avoid (optional)
            </label>
            <textarea
              id="sensitivity"
              value={prefsDraft.sensitivityAvoidance ?? ""}
              onChange={(e) => setSensitivity(e.target.value)}
              rows={3}
              placeholder="e.g. strong musk, very sweet vanilla"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This is a personal preference note, not medical or health information.
            </p>
          </div>

          {prefsError && (
            <p role="alert" className="text-xs text-danger">
              {prefsError}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button size="sm" isLoading={savingPrefs} onClick={handleSavePreferences}>
            Save preferences
          </Button>
        </CardFooter>
      </Card>

      {/* Fragrance identity (FR-PROFILE-008) */}
      <Card>
        <CardHeader>
          <CardTitle>Your Fragrance Identity</CardTitle>
          <CardDescription>Generated from your preferences above.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {profile.fragranceIdentity ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {profile.fragranceIdentity.primaryFamily.label}
              </p>
              <p className="text-sm text-muted-foreground">{profile.fragranceIdentity.explanation}</p>
              {profile.fragranceIdentity.status === "STALE" && (
                <p className="text-xs font-medium text-danger">
                  Your preferences changed — regenerate to see an updated result.
                </p>
              )}
            </div>
          ) : (
            <EmptyState
              title="Not generated yet"
              description="Generate your Fragrance Identity based on your current preferences."
            />
          )}
          {identityError && (
            <p role="alert" className="text-xs text-danger">
              {identityError}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button size="sm" isLoading={generatingIdentity} onClick={handleGenerateIdentity}>
            Regenerate Fragrance Identity
          </Button>
        </CardFooter>
      </Card>

      {/* Account deactivation — presentation only, per #253 scope */}
      <Card>
        <CardHeader>
          <CardTitle>Deactivate account</CardTitle>
          <CardDescription>
            This will deactivate your account. This is not the same as deleting it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!deactivateOpen ? (
            <Button variant="danger" size="sm" onClick={() => setDeactivateOpen(true)}>
              Deactivate my account
            </Button>
          ) : (
            <div className="space-y-3 rounded-md border border-danger/30 bg-danger/5 p-4">
              <p className="text-sm text-foreground">
                Are you sure you want to deactivate your account? You will not be able to log in
                while your account is deactivated.
              </p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" disabled>
                  Yes, deactivate
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeactivateOpen(false)}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This confirmation is presentation-only for this task; deactivation is completed
                separately (FR-AUTH-007).
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
