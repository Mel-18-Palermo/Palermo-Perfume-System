"use client";

import * as React from "react";
import type { PerfumeVariantSummary } from "@/contracts/catalogue";
import type { EntityId, Revision } from "@/contracts/common";
import { getAdminCatalogueApi } from "./admin-catalogue-api";
import { AdminButton } from "./admin-ui-kit";

type Availability = PerfumeVariantSummary["availability"];

interface VariantFormValues {
  sku: string;
  bottleSize: string;
  concentration: string;
  amount: string;
  currency: string;
  availability: Availability;
  personalisedLabel: boolean;
  engravingName: boolean;
  giftMessage: boolean;
}

function initialValues(variant: PerfumeVariantSummary | undefined, defaultCurrency: string): VariantFormValues {
  return {
    sku: variant?.sku ?? "",
    bottleSize: variant?.bottleSize ?? "",
    concentration: variant?.concentration ?? "",
    amount: variant ? (variant.price.amountMinor / 100).toFixed(2) : "",
    currency: variant?.price.currency ?? defaultCurrency,
    availability: variant?.availability ?? "AVAILABLE",
    personalisedLabel: variant?.customisations.personalisedLabel ?? false,
    engravingName: variant?.customisations.engravingName ?? false,
    giftMessage: variant?.customisations.giftMessage ?? false,
  };
}

export interface AdminVariantFormProps {
  mode: "create" | "edit";
  perfumeId: EntityId;
  perfumeRevision: Revision;
  defaultCurrency: string;
  initialVariant?: PerfumeVariantSummary;
  onSaved?: (variant: PerfumeVariantSummary) => void;
  onCancel?: () => void;
}

export function AdminVariantForm({
  mode,
  perfumeId,
  perfumeRevision,
  defaultCurrency,
  initialVariant,
  onSaved,
  onCancel,
}: AdminVariantFormProps) {
  const [values, setValues] = React.useState<VariantFormValues>(() => initialValues(initialVariant, defaultCurrency));
  const [fieldErrors, setFieldErrors] = React.useState<Readonly<Record<string, readonly string[]>>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const validate = (): Readonly<Record<string, readonly string[]>> => {
    const errors: Record<string, string[]> = {};
    if (!values.sku.trim()) errors.sku = ["Enter a SKU."];
    if (!values.bottleSize.trim()) errors.bottleSize = ["Enter a bottle size."];
    if (!values.concentration.trim()) errors.concentration = ["Enter a concentration."];
    const amountNumber = Number(values.amount);
    if (!values.amount.trim() || !Number.isFinite(amountNumber) || amountNumber < 0) {
      errors.amount = ["Enter a valid, non-negative price."];
    }
    if (!/^[A-Z]{3}$/.test(values.currency.trim())) {
      errors.currency = ["Enter a 3-letter currency code, e.g. AUD."];
    }
    return errors;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    const api = getAdminCatalogueApi();
    const input = {
      sku: values.sku.trim(),
      bottleSize: values.bottleSize.trim(),
      concentration: values.concentration.trim(),
      price: { amountMinor: Math.round(Number(values.amount) * 100), currency: values.currency.trim().toUpperCase() },
      availability: values.availability,
      customisations: {
        personalisedLabel: values.personalisedLabel,
        engravingName: values.engravingName,
        giftMessage: values.giftMessage,
        giftPackaging: initialVariant?.customisations.giftPackaging ?? [],
      },
    };

    const request = mode === "create"
      ? api.createVariant({ ...input, perfumeId, idempotencyKey: crypto.randomUUID() })
      : api.updateVariant({ ...input, perfumeId, variantId: initialVariant?.id ?? "", expectedRevision: perfumeRevision });

    void request.then(result => {
      setSubmitting(false);
      if (!result.ok) {
        setSubmitError(result.error.message);
        return;
      }
      onSaved?.(result.data);
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-form space-y-4 rounded-lg border border-border p-4" aria-labelledby="admin-variant-form-heading">
      <h3 id="admin-variant-form-heading" className="text-h3 font-semibold">
        {mode === "create" ? "Add variant" : "Edit variant"}
      </h3>

      <p className="rounded-md bg-info-bg px-3 py-2 text-sm text-info">
        This form uses a fixture-based mock. The saved record will be a fixed demo variant, not your exact input, until real persistence is implemented under #270.
      </p>

      {submitError ? (
        <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {submitError}
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="variant-sku" className="text-label">SKU</label>
        <input
          id="variant-sku"
          type="text"
          className="w-full rounded-md border border-border px-3 py-2"
          value={values.sku}
          onChange={event => setValues(current => ({ ...current, sku: event.target.value }))}
          aria-describedby={fieldErrors.sku ? "variant-sku-error" : undefined}
          aria-invalid={fieldErrors.sku ? true : undefined}
        />
        {fieldErrors.sku ? <p id="variant-sku-error" role="alert" className="text-sm text-danger">{fieldErrors.sku[0]}</p> : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="variant-bottle-size" className="text-label">Bottle size</label>
        <input
          id="variant-bottle-size"
          type="text"
          className="w-full rounded-md border border-border px-3 py-2"
          value={values.bottleSize}
          onChange={event => setValues(current => ({ ...current, bottleSize: event.target.value }))}
          aria-describedby={fieldErrors.bottleSize ? "variant-bottle-size-error" : undefined}
          aria-invalid={fieldErrors.bottleSize ? true : undefined}
        />
        {fieldErrors.bottleSize ? <p id="variant-bottle-size-error" role="alert" className="text-sm text-danger">{fieldErrors.bottleSize[0]}</p> : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="variant-concentration" className="text-label">Concentration</label>
        <input
          id="variant-concentration"
          type="text"
          className="w-full rounded-md border border-border px-3 py-2"
          value={values.concentration}
          onChange={event => setValues(current => ({ ...current, concentration: event.target.value }))}
          aria-describedby={fieldErrors.concentration ? "variant-concentration-error" : undefined}
          aria-invalid={fieldErrors.concentration ? true : undefined}
        />
        {fieldErrors.concentration ? <p id="variant-concentration-error" role="alert" className="text-sm text-danger">{fieldErrors.concentration[0]}</p> : null}
      </div>

      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <label htmlFor="variant-amount" className="text-label">Price</label>
          <input
            id="variant-amount"
            type="text"
            inputMode="decimal"
            className="w-full rounded-md border border-border px-3 py-2"
            value={values.amount}
            onChange={event => setValues(current => ({ ...current, amount: event.target.value }))}
            aria-describedby={fieldErrors.amount ? "variant-amount-error" : undefined}
            aria-invalid={fieldErrors.amount ? true : undefined}
          />
          {fieldErrors.amount ? <p id="variant-amount-error" role="alert" className="text-sm text-danger">{fieldErrors.amount[0]}</p> : null}
        </div>
        <div className="w-28 space-y-1">
          <label htmlFor="variant-currency" className="text-label">Currency</label>
          <input
            id="variant-currency"
            type="text"
            maxLength={3}
            className="w-full rounded-md border border-border px-3 py-2 uppercase"
            value={values.currency}
            onChange={event => setValues(current => ({ ...current, currency: event.target.value }))}
            aria-describedby={fieldErrors.currency ? "variant-currency-error" : undefined}
            aria-invalid={fieldErrors.currency ? true : undefined}
          />
          {fieldErrors.currency ? <p id="variant-currency-error" role="alert" className="text-sm text-danger">{fieldErrors.currency[0]}</p> : null}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="variant-availability" className="text-label">Availability</label>
        <select
          id="variant-availability"
          className="w-full rounded-md border border-border px-3 py-2"
          value={values.availability}
          onChange={event => setValues(current => ({ ...current, availability: event.target.value as Availability }))}
        >
          <option value="AVAILABLE">Available</option>
          <option value="OUT_OF_STOCK">Out of stock</option>
          <option value="UNAVAILABLE">Unavailable</option>
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-label">Customisations</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.personalisedLabel}
            onChange={event => setValues(current => ({ ...current, personalisedLabel: event.target.checked }))}
          />
          Personalised label
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.engravingName}
            onChange={event => setValues(current => ({ ...current, engravingName: event.target.checked }))}
          />
          Engraving name
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.giftMessage}
            onChange={event => setValues(current => ({ ...current, giftMessage: event.target.checked }))}
          />
          Gift message
        </label>
      </fieldset>

      <div className="space-y-1 opacity-60">
        <p className="text-label">Gift packaging</p>
        <p className="text-sm text-text-muted">
          Not yet available — no contract-approved option list exists for this field yet.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <AdminButton type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </AdminButton>
        <AdminButton type="submit" isLoading={submitting} disabled={submitting}>
          {mode === "create" ? "Add variant" : "Save variant"}
        </AdminButton>
      </div>
    </form>
  );
}
