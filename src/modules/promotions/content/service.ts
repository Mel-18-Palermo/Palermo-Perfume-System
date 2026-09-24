import type { ApiResult } from "../../../contracts/common";
import { failure, success } from "../../../lib/api/result";
import type { DiscountType, Prisma, PrismaClient, PromotionalContentStatus } from "../../../lib/db/generated/client";

export interface PromotionalVideoProvider {
  generate(input: Readonly<{ title: string; brief: string }>): Promise<unknown>;
}

export type PromotionActor = Readonly<{ adminId: string; permissions: readonly string[] }>;
export type PromotionInput = Readonly<{
  code: string;
  discountType: DiscountType;
  discountValue: number;
  currency?: string | null;
  eligibility?: Prisma.InputJsonValue;
  active: boolean;
  activeFrom?: Date | null;
  activeUntil?: Date | null;
}>;

const id = /^[0-9a-f-]{10,64}$/i;
const promotionCode = /^[A-Z0-9][A-Z0-9_-]{2,63}$/;
const currency = /^[A-Z]{3}$/;
const canManage = (actor: PromotionActor) => id.test(actor.adminId) && actor.permissions.includes("promotions:manage");
const unique = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

function validPromotion(input: PromotionInput): boolean {
  if (!promotionCode.test(input.code) || !Number.isSafeInteger(input.discountValue) || input.discountValue < 1) return false;
  if (input.discountType === "FIXED" ? !input.currency || !currency.test(input.currency) : input.currency !== null && input.currency !== undefined) return false;
  if (input.discountType === "PERCENTAGE" && input.discountValue > 10_000) return false;
  return !input.activeFrom || !input.activeUntil || input.activeFrom < input.activeUntil;
}

function providerPreview(value: unknown): Readonly<{ jobId: string; previewUrl: string }> | null {
  if (typeof value !== "object" || value === null || !("jobId" in value) || !("previewUrl" in value)) return null;
  const { jobId, previewUrl } = value;
  return typeof jobId === "string" && jobId.length > 0 && jobId.length <= 500 && typeof previewUrl === "string" && /^https:\/\/.+/.test(previewUrl) && previewUrl.length <= 2_000
    ? { jobId, previewUrl }
    : null;
}

export class PromotionalContentService {
  constructor(private readonly db: PrismaClient, private readonly provider: PromotionalVideoProvider, private readonly now: () => Date = () => new Date()) {}

  async createPromotion(actor: PromotionActor, input: PromotionInput): Promise<ApiResult<{ id: string }>> {
    if (!canManage(actor)) return failure("FORBIDDEN");
    const data = { ...input, code: input.code.toUpperCase(), currency: input.discountType === "FIXED" ? input.currency?.toUpperCase() ?? null : null, eligibility: input.eligibility ?? {} };
    if (!validPromotion(data)) return failure("VALIDATION_ERROR");
    try { return success({ id: (await this.db.promotion.create({ data })).id }); } catch (error) { if (unique(error)) return failure("CONFLICT"); throw error; }
  }

  async updatePromotion(actor: PromotionActor, promotionId: string, input: PromotionInput): Promise<ApiResult<null>> {
    if (!canManage(actor)) return failure("FORBIDDEN");
    if (!id.test(promotionId)) return failure("VALIDATION_ERROR");
    const data = { ...input, code: input.code.toUpperCase(), currency: input.discountType === "FIXED" ? input.currency?.toUpperCase() ?? null : null, eligibility: input.eligibility ?? {} };
    if (!validPromotion(data)) return failure("VALIDATION_ERROR");
    try { const changed = await this.db.promotion.updateMany({ where: { id: promotionId }, data }); return changed.count === 1 ? success(null) : failure("NOT_FOUND"); } catch (error) { if (unique(error)) return failure("CONFLICT"); throw error; }
  }

  async create(actor: PromotionActor, input: Readonly<{ title: string; brief: string; promotionId?: string }>): Promise<ApiResult<{ id: string }>> {
    if (!canManage(actor)) return failure("FORBIDDEN");
    if (!input.title.trim() || input.title.length > 200 || !input.brief.trim() || input.brief.length > 2_000 || (input.promotionId && !id.test(input.promotionId))) return failure("VALIDATION_ERROR");
    const content = await this.db.promotionalContent.create({ data: { title: input.title.trim(), brief: input.brief.trim(), promotionId: input.promotionId ?? null } });
    return success({ id: content.id });
  }

  async generate(actor: PromotionActor, contentId: string): Promise<ApiResult<null>> {
    if (!canManage(actor)) return failure("FORBIDDEN");
    if (!id.test(contentId)) return failure("VALIDATION_ERROR");
    const content = await this.db.promotionalContent.findUnique({ where: { id: contentId } });
    if (!content) return failure("NOT_FOUND");
    const claim = await this.db.promotionalContent.updateMany({
      where: { id: contentId, status: { in: ["DRAFT", "FAILED"] } },
      data: { status: "GENERATED" },
    });
    if (claim.count !== 1) return failure("CONFLICT");
    try {
      const preview = providerPreview(await this.provider.generate({ title: content.title, brief: content.brief }));
      if (!preview) throw new Error("Malformed promotional video provider output");
      await this.db.promotionalContent.updateMany({ where: { id: contentId, status: "GENERATED" }, data: { status: "PREVIEW", provider: "AI_VIDEO", providerJobId: preview.jobId, previewUrl: preview.previewUrl, failureCode: null } });
      return success(null);
    } catch {
      await this.db.promotionalContent.updateMany({ where: { id: contentId, status: "GENERATED" }, data: { status: "FAILED", failureCode: "PROVIDER_UNAVAILABLE" } });
      return failure("TEMPORARILY_UNAVAILABLE");
    }
  }

  async review(actor: PromotionActor, contentId: string, status: Extract<PromotionalContentStatus, "APPROVED" | "REJECTED">): Promise<ApiResult<null>> {
    if (!canManage(actor)) return failure("FORBIDDEN");
    if (!id.test(contentId) || !(["APPROVED", "REJECTED"] as const).includes(status)) return failure("VALIDATION_ERROR");
    const changed = await this.db.promotionalContent.updateMany({ where: { id: contentId, status: "PREVIEW", reviewedById: null, reviewedAt: null }, data: { status, reviewedById: actor.adminId, reviewedAt: this.now() } });
    return changed.count === 1 ? success(null) : failure("CONFLICT");
  }
}
