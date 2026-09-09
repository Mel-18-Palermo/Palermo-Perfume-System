"use client";

import * as React from "react";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import type { AddressInput, Address } from "../../../contracts/profile";

export interface AddressFormProps {
  title: string;
  value: Address | AddressInput | null;
  onSave: (address: AddressInput) => void | Promise<void>;
  disabled?: boolean;
  submitLabel?: string;
}

const emptyAddress: AddressInput = {
  recipientName: "",
  line1: "",
  line2: null,
  suburb: "",
  state: "",
  postcode: "",
  country: "",
};

export function AddressForm({ title, value, onSave, disabled, submitLabel }: AddressFormProps) {
  const [form, setForm] = React.useState<AddressInput>(value ?? emptyAddress);
  const [errors, setErrors] = React.useState<Partial<Record<keyof AddressInput, string>>>({});
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    setForm(value ?? emptyAddress);
  }, [value]);

  function update<K extends keyof AddressInput>(key: K, val: AddressInput[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof AddressInput, string>> = {};
    if (!form.recipientName.trim()) next.recipientName = "Recipient name is required.";
    if (!form.line1.trim()) next.line1 = "Address line 1 is required.";
    if (!form.suburb.trim()) next.suburb = "Suburb is required.";
    if (!form.state.trim()) next.state = "State is required.";
    if (!form.postcode.trim()) next.postcode = "Postcode is required.";
    if (!form.country.trim()) next.country = "Country is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSave(form);
    } finally {
      setSubmitting(false);
    }
  }

  const isDisabled = disabled || submitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Recipient name"
        value={form.recipientName}
        error={errors.recipientName}
        disabled={isDisabled}
        onChange={(e) => update("recipientName", e.target.value)}
      />
      <Input
        label="Address line 1"
        value={form.line1}
        error={errors.line1}
        disabled={isDisabled}
        onChange={(e) => update("line1", e.target.value)}
      />
      <Input
        label="Address line 2 (optional)"
        value={form.line2 ?? ""}
        disabled={isDisabled}
        onChange={(e) => update("line2", e.target.value || null)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Suburb"
          value={form.suburb}
          error={errors.suburb}
          disabled={isDisabled}
          onChange={(e) => update("suburb", e.target.value)}
        />
        <Input
          label="State"
          value={form.state}
          error={errors.state}
          disabled={isDisabled}
          onChange={(e) => update("state", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Postcode"
          value={form.postcode}
          error={errors.postcode}
          disabled={isDisabled}
          onChange={(e) => update("postcode", e.target.value)}
        />
        <Input
          label="Country"
          value={form.country}
          error={errors.country}
          disabled={isDisabled}
          onChange={(e) => update("country", e.target.value)}
        />
      </div>
      <Button type="submit" size="sm" isLoading={submitting} disabled={isDisabled}>
        {submitLabel ?? `Save ${title}`}
      </Button>
    </form>
  );
}
