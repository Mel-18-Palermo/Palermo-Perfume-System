"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Address } from "../_lib/types";

export interface AddressFormProps {
  title: string;
  value: Address | null;
  onSave: (address: Address) => void;
  disabled?: boolean;
}

const emptyAddress: Address = {
  recipientName: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
};

export function AddressForm({ title, value, onSave, disabled }: AddressFormProps) {
  const [form, setForm] = React.useState<Address>(value ?? emptyAddress);
  const [errors, setErrors] = React.useState<Partial<Record<keyof Address, string>>>({});

  React.useEffect(() => {
    setForm(value ?? emptyAddress);
  }, [value]);

  function update<K extends keyof Address>(key: K, val: Address[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof Address, string>> = {};
    if (!form.recipientName.trim()) next.recipientName = "Recipient name is required.";
    if (!form.line1.trim()) next.line1 = "Address line 1 is required.";
    if (!form.city.trim()) next.city = "City is required.";
    if (!form.region.trim()) next.region = "Region/state is required.";
    if (!form.postalCode.trim()) next.postalCode = "Postal code is required.";
    if (!form.country.trim()) next.country = "Country is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Recipient name"
        value={form.recipientName}
        error={errors.recipientName}
        disabled={disabled}
        onChange={(e) => update("recipientName", e.target.value)}
      />
      <Input
        label="Address line 1"
        value={form.line1}
        error={errors.line1}
        disabled={disabled}
        onChange={(e) => update("line1", e.target.value)}
      />
      <Input
        label="Address line 2 (optional)"
        value={form.line2 ?? ""}
        disabled={disabled}
        onChange={(e) => update("line2", e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="City"
          value={form.city}
          error={errors.city}
          disabled={disabled}
          onChange={(e) => update("city", e.target.value)}
        />
        <Input
          label="Region / State"
          value={form.region}
          error={errors.region}
          disabled={disabled}
          onChange={(e) => update("region", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Postal code"
          value={form.postalCode}
          error={errors.postalCode}
          disabled={disabled}
          onChange={(e) => update("postalCode", e.target.value)}
        />
        <Input
          label="Country"
          value={form.country}
          error={errors.country}
          disabled={disabled}
          onChange={(e) => update("country", e.target.value)}
        />
      </div>
      <Button type="submit" size="sm" disabled={disabled}>
        Save {title}
      </Button>
    </form>
  );
}
