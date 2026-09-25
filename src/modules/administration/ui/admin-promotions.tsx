"use client";

import { useEffect, useState } from "react";
import type { ApiResult } from "@/contracts/common";
import type { PromotionRecord, PromotionalContentRecord } from "@/contracts/promotions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminMilestoneApi } from "./admin-milestone-api";

type PromotionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; promotions: readonly PromotionRecord[]; content: readonly PromotionalContentRecord[] };

type PromotionForm = Readonly<{ code: string; discountType: "PERCENTAGE" | "FIXED"; discountValue: string; currency: string; active: boolean; activeFrom: string; activeUntil: string }>;

const initialPromotion: PromotionForm = { code: "", discountType: "PERCENTAGE", discountValue: "", currency: "AUD", active: true, activeFrom: "", activeUntil: "" };

function timestamp(value: string): string | null | undefined {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

export function AdminPromotions() {
  const [state, setState] = useState<PromotionState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [promotion, setPromotion] = useState<PromotionForm>(initialPromotion);
  const [contentTitle, setContentTitle] = useState("");
  const [contentBrief, setContentBrief] = useState("");
  const [contentPromotionId, setContentPromotionId] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const promotions = state.status === "ready" ? state.promotions : [];
  const content = state.status === "ready" ? state.content : [];
  const canCreateFixed = promotion.discountType === "FIXED";
  const promotionAmount = Number(promotion.discountValue);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [promotionsResult, contentResult] = await Promise.all([
          getAdminMilestoneApi().listPromotions({ page: 1, pageSize: 100 }),
          getAdminMilestoneApi().listPromotionalContent({ page: 1, pageSize: 100 }),
        ]);
        if (!active) return;
        if (!promotionsResult.ok) {
          setState({ status: "error", message: promotionsResult.error.message });
          return;
        }
        if (!contentResult.ok) {
          setState({ status: "error", message: contentResult.error.message });
          return;
        }
        setState({ status: "ready", promotions: promotionsResult.data.items, content: contentResult.data.items });
      } catch {
        if (active) setState({ status: "error", message: "Promotion management is temporarily unavailable." });
      }
    }
    void load();
    return () => { active = false; };
  }, [reloadToken]);

  function reload() {
    setState({ status: "loading" });
    setReloadToken(value => value + 1);
  }

  async function perform(id: string, request: () => Promise<ApiResult<unknown>>) {
    setPending(id);
    setActionError(null);
    const result = await request();
    setPending(null);
    if (!result.ok) {
      setActionError(result.error.message);
      reload();
      return;
    }
    reload();
  }

  function createPromotion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const activeFrom = timestamp(promotion.activeFrom);
    const activeUntil = timestamp(promotion.activeUntil);
    if (!Number.isSafeInteger(promotionAmount) || promotionAmount < 1 || activeFrom === undefined || activeUntil === undefined) {
      setActionError("Enter a whole-number discount and valid optional dates.");
      return;
    }
    void perform("create-promotion", () => getAdminMilestoneApi().createPromotion({
      code: promotion.code,
      discountType: promotion.discountType,
      discountValue: promotionAmount,
      currency: canCreateFixed ? promotion.currency : null,
      active: promotion.active,
      activeFrom,
      activeUntil,
    }));
    setPromotion(initialPromotion);
  }

  function createContent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void perform("create-content", () => getAdminMilestoneApi().createPromotionalContent({ title: contentTitle, brief: contentBrief, ...(contentPromotionId ? { promotionId: contentPromotionId } : {}) }));
    setContentTitle("");
    setContentBrief("");
    setContentPromotionId("");
  }

  return (
    <section aria-labelledby="promotions-heading" className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="promotions-heading" className="text-h2 font-semibold">Promotions and content</h2>
          <p className="mt-2 text-sm text-text-muted">Create and update only persisted promotion fields. Generated previews require a separate approval or rejection.</p>
        </div>
        <Button variant="outline" onClick={reload} disabled={state.status === "loading" || pending !== null}>Refresh</Button>
      </div>

      {actionError && <p role="alert" className="rounded-md border border-danger/30 bg-danger-background/40 p-3 text-sm text-danger">{actionError}</p>}

      {state.status === "loading" && <div role="status" aria-busy="true" className="space-y-3"><span className="sr-only">Loading promotion management…</span><Skeleton className="h-72" /><Skeleton className="h-56" /></div>}
      {state.status === "error" && <ErrorState title="Could not load promotions" message={state.message} onRetry={reload} />}

      {state.status === "ready" && <>
        <Card className="p-5">
          <h3 className="text-h3 font-semibold">Create promotion</h3>
          <form onSubmit={createPromotion} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium">Code<input required value={promotion.code} onChange={event => setPromotion(value => ({ ...value, code: event.target.value.toUpperCase() }))} className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3" /></label>
            <label className="block text-sm font-medium">Discount type<select value={promotion.discountType} onChange={event => setPromotion(value => ({ ...value, discountType: event.target.value as PromotionForm["discountType"] }))} className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3"><option value="PERCENTAGE">Percentage (basis points)</option><option value="FIXED">Fixed amount (minor units)</option></select></label>
            <label className="block text-sm font-medium">Discount value<input required inputMode="numeric" value={promotion.discountValue} onChange={event => setPromotion(value => ({ ...value, discountValue: event.target.value }))} className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3" /></label>
            {canCreateFixed && <label className="block text-sm font-medium">Currency<input required minLength={3} maxLength={3} value={promotion.currency} onChange={event => setPromotion(value => ({ ...value, currency: event.target.value.toUpperCase() }))} className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3" /></label>}
            <label className="block text-sm font-medium">Starts at (optional)<input type="datetime-local" value={promotion.activeFrom} onChange={event => setPromotion(value => ({ ...value, activeFrom: event.target.value }))} className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3" /></label>
            <label className="block text-sm font-medium">Ends at (optional)<input type="datetime-local" value={promotion.activeUntil} onChange={event => setPromotion(value => ({ ...value, activeUntil: event.target.value }))} className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3" /></label>
            <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" checked={promotion.active} onChange={event => setPromotion(value => ({ ...value, active: event.target.checked }))} />Active</label>
            <div className="md:col-span-2"><Button type="submit" isLoading={pending === "create-promotion"} disabled={pending !== null}>Create promotion</Button></div>
          </form>
        </Card>

        <section aria-labelledby="existing-promotions-heading" className="space-y-4">
          <h3 id="existing-promotions-heading" className="text-h3 font-semibold">Persisted promotions</h3>
          {promotions.length === 0 ? <EmptyState title="No promotions" description="Create a promotion to see it here." /> : promotions.map(item => <PromotionCard key={item.id} item={item} pending={pending} onUpdate={request => { void perform(`update-${item.id}`, request); }} />)}
        </section>

        <Card className="p-5">
          <h3 className="text-h3 font-semibold">Create promotional content</h3>
          <form onSubmit={createContent} className="mt-5 grid gap-4">
            <label className="block text-sm font-medium">Title<input required maxLength={200} value={contentTitle} onChange={event => setContentTitle(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3" /></label>
            <label className="block text-sm font-medium">Brief<textarea required maxLength={2000} value={contentBrief} onChange={event => setContentBrief(event.target.value)} rows={4} className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2" /></label>
            <label className="block text-sm font-medium">Promotion (optional)<select value={contentPromotionId} onChange={event => setContentPromotionId(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3"><option value="">No linked promotion</option>{promotions.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label>
            <div><Button type="submit" isLoading={pending === "create-content"} disabled={pending !== null}>Create draft</Button></div>
          </form>
        </Card>

        <section aria-labelledby="content-heading" className="space-y-4">
          <h3 id="content-heading" className="text-h3 font-semibold">Promotional content</h3>
          {content.length === 0 ? <EmptyState title="No promotional content" description="Create a persisted draft before requesting generation." /> : content.map(item => <ContentCard key={item.id} item={item} pending={pending} onGenerate={() => { void perform(`generate-${item.id}`, () => getAdminMilestoneApi().generatePromotionalContent({ contentId: item.id })); }} onReview={status => { void perform(`review-${item.id}`, () => getAdminMilestoneApi().reviewPromotionalContent({ contentId: item.id, status })); }} />)}
        </section>
      </>}
    </section>
  );
}

function PromotionCard({ item, pending, onUpdate }: Readonly<{ item: PromotionRecord; pending: string | null; onUpdate: (request: () => Promise<ApiResult<unknown>>) => void }>) {
  const [form, setForm] = useState<PromotionForm>({ code: item.code, discountType: item.discountType, discountValue: String(item.discountValue), currency: item.currency ?? "AUD", active: item.active, activeFrom: item.activeFrom ? item.activeFrom.slice(0, 16) : "", activeUntil: item.activeUntil ? item.activeUntil.slice(0, 16) : "" });
  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(form.discountValue);
    const activeFrom = timestamp(form.activeFrom);
    const activeUntil = timestamp(form.activeUntil);
    if (!Number.isSafeInteger(amount) || amount < 1 || activeFrom === undefined || activeUntil === undefined) return;
    onUpdate(() => getAdminMilestoneApi().updatePromotion({ promotionId: item.id, code: form.code, discountType: form.discountType, discountValue: amount, currency: form.discountType === "FIXED" ? form.currency : null, active: form.active, activeFrom, activeUntil }));
  };
  return <Card className="p-5"><form onSubmit={save} className="grid gap-3 md:grid-cols-2"><label className="text-sm font-medium">Code<input required value={form.code} onChange={event => setForm(value => ({ ...value, code: event.target.value.toUpperCase() }))} className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3" /></label><label className="text-sm font-medium">Discount type<select value={form.discountType} onChange={event => setForm(value => ({ ...value, discountType: event.target.value as PromotionForm["discountType"] }))} className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3"><option value="PERCENTAGE">Percentage (basis points)</option><option value="FIXED">Fixed amount (minor units)</option></select></label><label className="text-sm font-medium">Discount value<input required inputMode="numeric" value={form.discountValue} onChange={event => setForm(value => ({ ...value, discountValue: event.target.value }))} className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3" /></label>{form.discountType === "FIXED" && <label className="text-sm font-medium">Currency<input required minLength={3} maxLength={3} value={form.currency} onChange={event => setForm(value => ({ ...value, currency: event.target.value.toUpperCase() }))} className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3" /></label>}<label className="text-sm font-medium">Starts at<input type="datetime-local" value={form.activeFrom} onChange={event => setForm(value => ({ ...value, activeFrom: event.target.value }))} className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3" /></label><label className="text-sm font-medium">Ends at<input type="datetime-local" value={form.activeUntil} onChange={event => setForm(value => ({ ...value, activeUntil: event.target.value }))} className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3" /></label><label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" checked={form.active} onChange={event => setForm(value => ({ ...value, active: event.target.checked }))} />Active</label><div className="md:col-span-2"><Button type="submit" variant="outline" isLoading={pending === `update-${item.id}`} disabled={pending !== null}>Save promotion</Button></div></form></Card>;
}

function ContentCard({ item, pending, onGenerate, onReview }: Readonly<{ item: PromotionalContentRecord; pending: string | null; onGenerate: () => void; onReview: (status: "APPROVED" | "REJECTED") => void }>) {
  const reviewing = pending === `review-${item.id}`;
  return <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h4 className="break-words font-semibold">{item.title}</h4><p className="mt-1 text-sm text-text-muted">Status: {item.status}{item.provider ? ` · ${item.provider}` : ""}</p></div><span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium">{item.status}</span></div><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6">{item.brief}</p>{item.previewUrl && <a href={item.previewUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-medium text-primary underline">Open generated preview</a>}{item.status === "FAILED" && <p role="alert" className="mt-4 text-sm text-danger">Generation failed{item.failureCode ? `: ${item.failureCode}` : "."} No preview is available.</p>}<div className="mt-5 flex flex-wrap gap-2">{(item.status === "DRAFT" || item.status === "FAILED") && <Button type="button" size="sm" onClick={onGenerate} isLoading={pending === `generate-${item.id}`} disabled={pending !== null}>Generate preview</Button>}{item.status === "PREVIEW" && <><Button type="button" size="sm" onClick={() => onReview("APPROVED")} isLoading={reviewing} disabled={pending !== null}>Approve preview</Button><Button type="button" size="sm" variant="danger" onClick={() => onReview("REJECTED")} isLoading={reviewing} disabled={pending !== null}>Reject preview</Button></>}</div></Card>;
}
