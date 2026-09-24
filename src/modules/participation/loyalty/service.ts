import { randomBytes } from "node:crypto";
import type { ApiResult } from "../../../contracts/common";
import { failure, success } from "../../../lib/api/result";
import type { PrismaClient } from "../../../lib/db/generated/client";

const id = /^[0-9a-f-]{10,64}$/i;
const code = /^[A-Z0-9]{8,24}$/;
const reward = (points: number) => Number.isSafeInteger(points) && points > 0 && points <= 100_000;
const duplicate = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

export class ParticipationService {
  constructor(private readonly db: PrismaClient, private readonly randomCode = () => randomBytes(6).toString("hex").toUpperCase()) {}

  async setSubscription(customerId: string, optedIn: boolean): Promise<ApiResult<{ optedIn: boolean }>> {
    if (!id.test(customerId)) return failure("VALIDATION_ERROR");
    const customer = await this.db.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!customer) return failure("NOT_FOUND");
    const now = new Date();
    const result = await this.db.subscription.upsert({ where: { customerId }, create: { customerId, optedIn, optedInAt: optedIn ? now : null, optedOutAt: optedIn ? null : now }, update: { optedIn, optedInAt: optedIn ? now : null, optedOutAt: optedIn ? null : now } });
    return success({ optedIn: result.optedIn });
  }

  async referralCode(customerId: string): Promise<ApiResult<{ code: string }>> {
    if (!id.test(customerId)) return failure("VALIDATION_ERROR");
    const exists = await this.db.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!exists) return failure("NOT_FOUND");
    const present = await this.db.referralCode.findUnique({ where: { customerId } });
    if (present) return success({ code: present.code });
    for (let attempt = 0; attempt < 4; attempt++) {
      const candidate = this.randomCode();
      if (!code.test(candidate)) throw new Error("invalid referral-code generator");
      try { return success({ code: (await this.db.referralCode.create({ data: { customerId, code: candidate } })).code }); } catch (error) { if (!duplicate(error)) throw error; }
    }
    return failure("CONFLICT");
  }

  async applyReferral(referredCustomerId: string, referralCode: string): Promise<ApiResult<null>> {
    if (!id.test(referredCustomerId) || !code.test(referralCode)) return failure("VALIDATION_ERROR");
    const codeRecord = await this.db.referralCode.findUnique({ where: { code: referralCode } });
    if (!codeRecord || codeRecord.customerId === referredCustomerId) return failure("FORBIDDEN");
    try { await this.db.referral.create({ data: { referrerCustomerId: codeRecord.customerId, referredCustomerId } }); return success(null); } catch (error) { if (duplicate(error)) return failure("CONFLICT"); throw error; }
  }

  async rewardCompletedOrder(customerId: string, orderId: string, points: number): Promise<ApiResult<{ awarded: boolean }>> {
    if (!id.test(customerId) || !id.test(orderId) || !reward(points)) return failure("VALIDATION_ERROR");
    const order = await this.db.order.findFirst({ where: { id: orderId, customerId, payment: { is: { status: "SUCCEEDED" } } }, select: { id: true } });
    if (!order) return failure("FORBIDDEN");
    return this.credit(customerId, points, `order:${orderId}`, "ORDER_REWARD", orderId);
  }

  async rewardQualifyingReferral(orderId: string, points: number): Promise<ApiResult<{ awarded: boolean }>> {
    if (!id.test(orderId) || !reward(points)) return failure("VALIDATION_ERROR");
    const result = await this.db.$transaction(async tx => {
      const order = await tx.order.findFirst({ where: { id: orderId, payment: { is: { status: "SUCCEEDED" } } }, select: { customerId: true } });
      if (!order) return "NOT_FOUND" as const;
      const referral = await tx.referral.findUnique({ where: { referredCustomerId: order.customerId } });
      if (!referral) return "NOT_FOUND" as const;
      if (referral.qualifyingOrderId && referral.qualifyingOrderId !== orderId) return "CONFLICT" as const;
      const claimed = await tx.referral.updateMany({ where: { id: referral.id, qualifyingOrderId: null }, data: { qualifyingOrderId: orderId, qualifiedAt: new Date() } });
      if (claimed.count !== 1 && referral.qualifyingOrderId !== orderId) return "CONFLICT" as const;
      const account = await tx.loyaltyAccount.upsert({ where: { customerId: referral.referrerCustomerId }, create: { customerId: referral.referrerCustomerId }, update: {} });
      try { await tx.loyaltyLedgerEntry.create({ data: { accountId: account.id, type: "REFERRAL_REWARD", points, identity: `referral:${referral.id}`, orderId: null, referralId: referral.id } }); }
      catch (error) { if (duplicate(error)) return "DONE" as const; throw error; }
      await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: { increment: points } } });
      return "AWARDED" as const;
    });
    if (result === "NOT_FOUND") return failure("NOT_FOUND");
    if (result === "CONFLICT") return failure("CONFLICT");
    return success({ awarded: result === "AWARDED" });
  }

  private async credit(customerId: string, points: number, identity: string, type: "ORDER_REWARD" | "REFERRAL_REWARD", orderId?: string, referralId?: string): Promise<ApiResult<{ awarded: boolean }>> {
    try {
      const result = await this.db.$transaction(async tx => {
        const account = await tx.loyaltyAccount.upsert({ where: { customerId }, create: { customerId }, update: {} });
        try { await tx.loyaltyLedgerEntry.create({ data: { accountId: account.id, type, points, identity, orderId: orderId ?? null, referralId: referralId ?? null } }); }
        catch (error) { if (duplicate(error)) return false; throw error; }
        await tx.loyaltyAccount.update({ where: { id: account.id }, data: { points: { increment: points } } });
        return true;
      });
      return success({ awarded: result });
    } catch (error) { throw error; }
  }
}
