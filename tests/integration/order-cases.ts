import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids } from "../../prisma/seed-data";
import { OrdersService } from "../../src/modules/commerce/orders/service";
export function orderCases(db: PrismaClient): void {
  describe("customer order history authority", () => {
    const service = new OrdersService(db, () => new Date("2026-09-08T00:00:00.000Z"));
    it("scopes history to the owning customer and exposes paid invoice data", async () => { const list = await service.list(ids.customer, {}); expect(list.ok && list.data.items.length).toBeGreaterThan(0); const denied = await service.get(ids.otherCustomer, ids.paidOrder); expect(denied.ok).toBe(false); const invoice = await service.invoice(ids.customer, ids.paidOrder); expect(invoice.ok).toBe(true); if (invoice.ok) expect(invoice.data.paymentReference).toBe("demo-verified-payment"); });
    it("records a cancellation request once and denies shipped orders", async () => { const order = await db.order.findFirstOrThrow({ where: { customerId: ids.otherCustomer }, orderBy: { placedAt: "desc" } }); const result = await service.cancel(ids.otherCustomer, order.id, "cancel-test-key-265"); expect(result.ok).toBe(true); if (result.ok) { const retry = await service.cancel(ids.otherCustomer, order.id, "cancel-test-key-265"); expect(retry.ok).toBe(true); if (retry.ok) expect(retry.data).toEqual(result.data); } await db.order.update({ where: { id: ids.paidOrder }, data: { status: "SHIPPED" } }); expect((await service.cancel(ids.customer, ids.paidOrder, "cancel-test-key-266")).ok).toBe(false); });
  });
}
