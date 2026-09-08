export type InventorySnapshot = Readonly<{
  onHand: number;
  reserved: number;
}>;

export type CatalogueAvailability = "AVAILABLE" | "OUT_OF_STOCK" | "UNAVAILABLE";

export function availableQuantity(balance: InventorySnapshot | null | undefined): number {
  return balance ? balance.onHand - balance.reserved : 0;
}

export function isVariantSellable(
  availability: CatalogueAvailability,
  balance: InventorySnapshot | null | undefined,
  quantity = 1,
): boolean {
  return availability === "AVAILABLE" && Number.isSafeInteger(quantity) && quantity > 0 && availableQuantity(balance) >= quantity;
}

export function publicVariantAvailability(
  availability: CatalogueAvailability,
  balance: InventorySnapshot | null | undefined,
): CatalogueAvailability {
  if (availability === "UNAVAILABLE") return "UNAVAILABLE";
  return isVariantSellable(availability, balance) ? "AVAILABLE" : "OUT_OF_STOCK";
}
