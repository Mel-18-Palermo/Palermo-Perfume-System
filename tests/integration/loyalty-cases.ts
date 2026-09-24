import { afterEach, describe, expect, it } from "vitest";
import { ids } from "../../prisma/seed-data";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import { ParticipationService } from "../../src/modules/participation/loyalty/service";

export function loyaltyCases(db: PrismaClient): void {
  describe("loyalty, subscriptions, and referrals", () => {
    afterEach(async () => {
      await db.loyaltyLedgerEntry.deleteMany();
      await db.referral.deleteMany();
      await db.referralCode.deleteMany();
      await db.loyaltyAccount.deleteMany();
      await db.subscription.deleteMany();
    });

    it("persists subscription opt-in and opt-out state", async () => {
      const service = new ParticipationService(db);
      expect(await service.setSubscription(ids.customer, true)).toMatchObject({ ok: true, data: { optedIn: true } });
      const optedIn = await db.subscription.findUniqueOrThrow({ where: { customerId: ids.customer } });
      expect(optedIn).toMatchObject({ optedIn: true, optedOutAt: null });
      expect(optedIn.optedInAt).toBeInstanceOf(Date);
      expect(await service.setSubscription(ids.customer, false)).toMatchObject({ ok: true, data: { optedIn: false } });
      const optedOut = await db.subscription.findUniqueOrThrow({ where: { customerId: ids.customer } });
      expect(optedOut).toMatchObject({ optedIn: false, optedInAt: null });
      expect(optedOut.optedOutAt).toBeInstanceOf(Date);
    });

    it("keeps one referral code per customer and rejects self-referral and duplicate attribution", async () => {
      const service = new ParticipationService(db, () => "REFCODE01");
      expect(await service.referralCode(ids.customer)).toMatchObject({ ok: true, data: { code: "REFCODE01" } });
      expect(await service.referralCode(ids.customer)).toMatchObject({ ok: true, data: { code: "REFCODE01" } });
      expect(await db.referralCode.count({ where: { customerId: ids.customer } })).toBe(1);
      expect(await new ParticipationService(db, () => "REFCODE01").referralCode(ids.otherCustomer)).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
      expect(await service.applyReferral(ids.customer, "REFCODE01")).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      expect(await service.applyReferral(ids.otherCustomer, "REFCODE01")).toMatchObject({ ok: true });
      expect(await service.applyReferral(ids.otherCustomer, "REFCODE01")).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    });

    it("credits a qualifying successful order once using immutable ledger identity", async () => {
      const service = new ParticipationService(db);
      expect(await service.rewardCompletedOrder(ids.customer, ids.paidOrder, 100)).toMatchObject({ ok: true, data: { awarded: true } });
      expect(await service.rewardCompletedOrder(ids.customer, ids.paidOrder, 100)).toMatchObject({ ok: true, data: { awarded: false } });
      expect(await db.loyaltyAccount.findUniqueOrThrow({ where: { customerId: ids.customer } })).toMatchObject({ points: 100 });
      expect(await db.loyaltyLedgerEntry.count({ where: { identity: `order:${ids.paidOrder}` } })).toBe(1);
    });

    it("qualifies a referral atomically with its reward ledger entry and replays once", async () => {
      const service = new ParticipationService(db, () => "REFCODE02");
      await service.referralCode(ids.otherCustomer);
      await service.applyReferral(ids.customer, "REFCODE02");
      expect(await service.rewardQualifyingReferral(ids.paidOrder, 100)).toMatchObject({ ok: true, data: { awarded: true } });
      expect(await service.rewardQualifyingReferral(ids.paidOrder, 100)).toMatchObject({ ok: true, data: { awarded: false } });
      const referral = await db.referral.findUniqueOrThrow({ where: { referredCustomerId: ids.customer } });
      const ledger = await db.loyaltyLedgerEntry.findUniqueOrThrow({ where: { identity: `referral:${referral.id}` } });
      expect(referral).toMatchObject({ qualifyingOrderId: ids.paidOrder });
      expect(referral.qualifiedAt).toBeInstanceOf(Date);
      expect(ledger).toMatchObject({ type: "REFERRAL_REWARD", referralId: referral.id, orderId: null, points: 100 });
      expect(await db.loyaltyAccount.findUniqueOrThrow({ where: { customerId: ids.otherCustomer } })).toMatchObject({ points: 100 });
    });

    it("does not double-award concurrent referral qualification", async () => {
      const service = new ParticipationService(db, () => "REFCODE03");
      await service.referralCode(ids.otherCustomer);
      await service.applyReferral(ids.customer, "REFCODE03");
      await Promise.all([service.rewardQualifyingReferral(ids.paidOrder, 100), service.rewardQualifyingReferral(ids.paidOrder, 100)]);
      const referral = await db.referral.findUniqueOrThrow({ where: { referredCustomerId: ids.customer } });
      expect(await db.loyaltyLedgerEntry.count({ where: { identity: `referral:${referral.id}` } })).toBe(1);
      expect(await db.loyaltyAccount.findUniqueOrThrow({ where: { customerId: ids.otherCustomer } })).toMatchObject({ points: 100 });
    });
  });
}
