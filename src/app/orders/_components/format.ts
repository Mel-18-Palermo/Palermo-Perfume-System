import type { MoneyValue, Timestamp } from "@/contracts/common";

/** Display-only formatting; the server remains authoritative for the underlying values. */
export function formatMoney(value: MoneyValue): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: value.currency }).format(
    value.amountMinor / 100,
  );
}

export function formatDate(value: Timestamp): string {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
