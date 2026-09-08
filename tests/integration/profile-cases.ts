import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ids } from "../../prisma/seed-data";
import { ProfileService } from "../../src/modules/identity/profile-service";
import type { ApiResult } from "../../src/contracts/common";

function code<T>(result: ApiResult<T>): string { expect(result.ok).toBe(false); return result.ok ? "" : result.error.code; }
const address = { recipientName: "Other Customer", line1: "2 Example Street", line2: null, suburb: "Example", state: "VIC", postcode: "3000", country: "AU" } as const;

export function profileCases(db: PrismaClient): void {
  describe("authoritative customer profile and fragrance identity", () => {
    const service = new ProfileService(db, () => new Date("2026-09-08T00:00:00.000Z"));
    const actor = { customerId: ids.otherCustomer };
    it("initialises an isolated profile and rejects unauthorised or malformed ownership", async () => {
      await db.address.deleteMany({ where: { customerId: ids.otherCustomer } }); await db.fragranceProfile.deleteMany({ where: { customerId: ids.otherCustomer } });
      const result = await service.get(actor); expect(result.ok).toBe(true); if (result.ok) { expect(result.data.id).toBe(ids.otherCustomer); expect(result.data.deliveryAddress).toBeNull(); expect(result.data.preferences.favouriteNoteIds).toEqual([]); }
      expect(code(await service.get({ customerId: "not-an-id" }))).toBe("VALIDATION_ERROR");
    });
    it("updates only approved preferences and keeps medical language outside the field", async () => {
      const initial = await service.get(actor); if (!initial.ok) throw new Error("profile setup failed");
      const changed = await service.update(actor, { expectedRevision: initial.data.revision, name: "Updated Other Customer", preferences: { favouriteNoteIds: [ids.note], preferredIntensityId: ids.intensity, sensitivityAvoidance: "Avoid woody notes" } });
      expect(changed.ok).toBe(true); if (changed.ok) { expect(changed.data.name).toBe("Updated Other Customer"); expect(changed.data.preferences.favouriteNoteIds).toEqual([ids.note]); }
      const stale = await service.update(actor, { expectedRevision: initial.data.revision, name: "Should Not Save", preferences: { favouriteNoteIds: [], preferredIntensityId: null, sensitivityAvoidance: null } }); expect(code(stale)).toBe("CONFLICT");
      const current = await service.get(actor); if (!current.ok) throw new Error("profile read failed");
      expect(code(await service.update(actor, { expectedRevision: current.data.revision, name: "Updated Other Customer", preferences: { favouriteNoteIds: [], preferredIntensityId: null, sensitivityAvoidance: "medical diagnosis" } }))).toBe("VALIDATION_ERROR");
    });
    it("maintains one delivery and one billing address with explicit reuse semantics", async () => {
      const initial = await service.get(actor); if (!initial.ok) throw new Error("profile setup failed");
      const delivery = await service.setDeliveryAddress(actor, { expectedRevision: initial.data.revision, address }); expect(delivery.ok).toBe(true); if (!delivery.ok) return;
      expect(delivery.data.deliveryAddress?.line1).toBe(address.line1); expect(delivery.data.billingAddress?.line1).toBe(address.line1); expect(delivery.data.billingSameAsDelivery).toBe(true);
      const billing = await service.setBillingAddress(actor, { expectedRevision: delivery.data.revision, billing: { kind: "SEPARATE", address: { ...address, line1: "3 Billing Street" } } }); expect(billing.ok).toBe(true); if (!billing.ok) return;
      expect(billing.data.billingAddress?.line1).toBe("3 Billing Street"); expect(billing.data.billingSameAsDelivery).toBe(false);
      const reused = await service.setBillingAddress(actor, { expectedRevision: billing.data.revision, billing: { kind: "USE_DELIVERY" } }); expect(reused.ok).toBe(true); if (reused.ok) expect(reused.data.billingSameAsDelivery).toBe(true);
    });
    it("generates the same deterministic family identity for unchanged positive inputs", async () => {
      const current = await service.get(actor); if (!current.ok) throw new Error("profile setup failed");
      const updated = await service.update(actor, { expectedRevision: current.data.revision, name: current.data.name, preferences: { favouriteNoteIds: [ids.note], preferredIntensityId: ids.intensity, sensitivityAvoidance: null } }); if (!updated.ok) throw new Error("preference update failed");
      const first = await service.generateIdentity(actor, { expectedRevision: updated.data.revision }); expect(first.ok).toBe(true); if (!first.ok) return;
      expect(first.data.fragranceIdentity?.status).toBe("CURRENT"); expect(first.data.fragranceIdentity?.primaryFamily.id).toBe(ids.family);
      const second = await service.generateIdentity(actor, { expectedRevision: first.data.revision }); expect(second.ok).toBe(true); if (second.ok) expect(second.data.fragranceIdentity?.primaryFamily.id).toBe(first.data.fragranceIdentity?.primaryFamily.id);
    });
    it("requires a positive preference before generating identity", async () => {
      const current = await service.get(actor); if (!current.ok) throw new Error("profile setup failed");
      const cleared = await service.update(actor, { expectedRevision: current.data.revision, name: current.data.name, preferences: { favouriteNoteIds: [], preferredIntensityId: null, sensitivityAvoidance: "Avoid woody notes" } }); if (!cleared.ok) throw new Error("preference clear failed");
      expect(code(await service.generateIdentity(actor, { expectedRevision: cleared.data.revision }))).toBe("VALIDATION_ERROR");
    });
  });
}
