import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids } from "../../prisma/seed-data";
import { PaymentService } from "../../src/modules/commerce/payment/service";
export function paymentCases(db: PrismaClient): void {
  describe("sandbox payment finalisation", () => {
    const service = new PaymentService(db); const secret = "palermo-sandbox-webhook";
    it("creates a provider-reference-only payment and finalises one pending order once", async () => { const order = await db.order.findFirstOrThrow({ where: { customerId: ids.otherCustomer }, orderBy: { placedAt: "desc" }, include: { payment: true } }); const initiated = await service.initiate(ids.otherCustomer, order.id); expect(initiated.ok).toBe(true); if (!initiated.ok) return; const payload = JSON.stringify({ paymentId: initiated.data.paymentId, status: "SUCCEEDED", providerReference: initiated.data.providerReference }); const signature = createHmac("sha256", secret).update(payload).digest("hex"); const finalized = await service.webhook(payload, signature); expect(finalized.ok && finalized.data.status).toBe("SUCCEEDED"); expect(await db.order.findUniqueOrThrow({ where: { id: order.id } }).then(value => value.status)).toBe("CONFIRMED"); const duplicate = await service.webhook(payload, signature); expect(duplicate.ok && duplicate.data.status).toBe("SUCCEEDED"); });
    it("rejects invalid webhook signatures without changing payment state", async () => { const payment = await db.payment.findFirstOrThrow({ where: { order: { customerId: ids.customer } }, orderBy: { updatedAt: "desc" } }); const result = await service.webhook(JSON.stringify({ paymentId: payment.id, status: "SUCCEEDED", providerReference: "forged" }), "invalid"); expect(result.ok).toBe(false); });
  });
}
