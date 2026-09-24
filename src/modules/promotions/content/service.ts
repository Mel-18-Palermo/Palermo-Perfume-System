import type { ApiResult } from "../../../contracts/common";
import { failure, success } from "../../../lib/api/result";
import type { DiscountType, Prisma, PrismaClient, PromotionalContentStatus } from "../../../lib/db/generated/client";

export interface PromotionalVideoProvider { generate(input: Readonly<{ title: string; brief: string }>): Promise<Readonly<{ jobId: string; previewUrl: string }>>; }
export type PromotionActor = Readonly<{ adminId: string; permissions: readonly string[] }>;
const id = /^[0-9a-f-]{10,64}$/i;
const management = (actor: PromotionActor) => id.test(actor.adminId) && actor.permissions.includes("promotions:manage");
const promotionCode = /^[A-Z0-9][A-Z0-9_-]{2,63}$/;
const currency = /^[A-Z]{3}$/;
export type PromotionInput = Readonly<{ code: string; discountType: DiscountType; discountValue: number; currency?: string | null; eligibility?: Prisma.InputJsonValue; active: boolean; activeFrom?: Date | null; activeUntil?: Date | null }>;

function validPromotion(input: PromotionInput): boolean {
  if (!promotionCode.test(input.code) || !Number.isSafeInteger(input.discountValue) || input.discountValue < 1) return false;
  if (input.discountType === "FIXED" ? !input.currency || !currency.test(input.currency) : input.currency !== null && input.currency !== undefined) return false;
  if (input.discountType === "PERCENTAGE" && input.discountValue > 10_000) return false;
  return (!input.activeFrom || !input.activeUntil || input.activeFrom < input.activeUntil);
}

export class PromotionalContentService {
  constructor(private readonly db: PrismaClient, private readonly provider: PromotionalVideoProvider) {}
  async createPromotion(actor: PromotionActor, input: PromotionInput): Promise<ApiResult<{ id: string }>> {
    if (!management(actor)) return failure("FORBIDDEN");
    const data = { ...input, code: input.code.toUpperCase(), currency: input.discountType === "FIXED" ? input.currency?.toUpperCase() ?? null : null, eligibility: input.eligibility ?? {} };
    if (!validPromotion(data)) return failure("VALIDATION_ERROR");
    try { return success({ id: (await this.db.promotion.create({ data })).id }); } catch (error) { if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return failure("CONFLICT"); throw error; }
  }
  async updatePromotion(actor: PromotionActor, promotionId: string, input: PromotionInput): Promise<ApiResult<null>> {
    if (!management(actor)) return failure("FORBIDDEN");
    if (!id.test(promotionId)) return failure("VALIDATION_ERROR");
    const data = { ...input, code: input.code.toUpperCase(), currency: input.discountType === "FIXED" ? input.currency?.toUpperCase() ?? null : null, eligibility: input.eligibility ?? {} };
    if (!validPromotion(data)) return failure("VALIDATION_ERROR");
    try { const changed = await this.db.promotion.updateMany({ where: { id: promotionId }, data }); return changed.count === 1 ? success(null) : failure("NOT_FOUND"); } catch (error) { if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return failure("CONFLICT"); throw error; }
  }
  async create(actor: PromotionActor, input: Readonly<{ title: string; brief: string; promotionId?: string }>): Promise<ApiResult<{ id: string }>> {
    if (!management(actor)) return failure("FORBIDDEN");
    if (!input.title.trim() || input.title.length > 200 || !input.brief.trim() || input.brief.length > 2000 || (input.promotionId && !id.test(input.promotionId))) return failure("VALIDATION_ERROR");
    const content = await this.db.promotionalContent.create({ data: { title: input.title.trim(), brief: input.brief.trim(), promotionId: input.promotionId ?? null } });
    return success({ id: content.id });
  }
  async generate(actor: PromotionActor, contentId: string): Promise<ApiResult<null>> {
    if (!management(actor)) return failure("FORBIDDEN");
    const content = await this.db.promotionalContent.findUnique({ where: { id: contentId } });
    if (!content || !["DRAFT", "FAILED"].includes(content.status)) return failure("CONFLICT");
    try {
      const result = await this.provider.generate({ title: content.title, brief: content.brief });
      await this.db.promotionalContent.update({ where: { id: contentId }, data: { status: "PREVIEW", provider: "AI_VIDEO", providerJobId: result.jobId, previewUrl: result.previewUrl, failureCode: null } });
      return success(null);
    } catch { await this.db.promotionalContent.update({ where: { id: contentId }, data: { status: "FAILED", failureCode: "PROVIDER_UNAVAILABLE" } }); return failure("TEMPORARILY_UNAVAILABLE"); }
  }
  async review(actor: PromotionActor, contentId: string, status: Extract<PromotionalContentStatus, "APPROVED" | "REJECTED">): Promise<ApiResult<null>> {
    if (!management(actor)) return failure("FORBIDDEN");
    if (!id.test(contentId) || !["APPROVED", "REJECTED"].includes(status)) return failure("VALIDATION_ERROR");
    const changed = await this.db.promotionalContent.updateMany({ where: { id: contentId, status: "PREVIEW", reviewedById: null, reviewedAt: null }, data: { status, reviewedById: actor.adminId, reviewedAt: new Date() } });
    return changed.count === 1 ? success(null) : failure("CONFLICT");
  }
}
