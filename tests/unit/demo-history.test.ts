import { describe, expect, it } from "vitest";
import { generateHistory } from "../../prisma/demo-history/generator";
import { historyProfile, type HistoryInput } from "../../prisma/demo-history/types";
import { validateHistory } from "../../prisma/demo-history/validation";

const variants = Array.from({ length: 22 }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, perfumeId: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, perfumeName: `Approved ${index + 1}`, sku: `APP-${index + 1}`, priceMinor: 3500, currency: "AUD", availability: index < 20 ? "AVAILABLE" as const : "OUT_OF_STOCK" as const }));
const input = (seed: number): HistoryInput => ({ profile: historyProfile, seed, asOf: new Date("2026-09-28T04:30:00.000Z"), cutover: new Date("2026-09-27T00:00:00.000Z"), variants, moderatorId: "20000000-0000-4000-8000-000000000001", delivery: { id: "30000000-0000-4000-8000-000000000001", name: "Demo delivery", chargeMinor: 1000, currency: "AUD" } });

describe("demo historical dataset", () => {
  it("is deterministic, stable and internally coherent", () => {
    const left = generateHistory(input(20260928)); const right = generateHistory(input(20260928));
    expect(left).toEqual(right); expect(left.customers).toHaveLength(180); expect(left.orders).toHaveLength(450); expect(left.orderItems.length).toBeGreaterThanOrEqual(700); expect(left.reviews).toHaveLength(183); expect(left.carts).toHaveLength(24); expect(left.wishlists).toHaveLength(260);
    validateHistory(left, input(20260928));
    expect(new Set(left.customers.map(value => value.id)).size).toBe(left.customers.length);
    expect(left.customers.every(value => value.email.endsWith(".test") && value.authUserId === null)).toBe(true);
    expect(left.payments.every(value => value.provider === "DEMO_HISTORY_IMPORT" && (value.status !== "SUCCEEDED" || value.providerReference?.startsWith("demo_history_pi_")))).toBe(true);
  });
  it("changes generated attributes without changing deterministic ownership IDs for a new seed", () => {
    const left = generateHistory(input(1)); const right = generateHistory(input(2));
    expect(left.customers.map(value => value.id)).toEqual(right.customers.map(value => value.id));
    expect(left.customers.map(value => value.name)).not.toEqual(right.customers.map(value => value.name));
  });
});
