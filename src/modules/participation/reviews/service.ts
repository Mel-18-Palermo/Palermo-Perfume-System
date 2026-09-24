import type { ApiResult } from "../../../contracts/common";
import { failure, success } from "../../../lib/api/result";
import type { PrismaClient, ReviewStatus } from "../../../lib/db/generated/client";

export type ReviewActor = Readonly<{ customerId: string }>;
export type ReviewModerator = Readonly<{ adminId: string; permissions: readonly string[] }>;
export type ReviewInput = Readonly<{ perfumeId: string; rating: number; text: string }>;

const id = /^[0-9a-f-]{10,64}$/i;
const reviewText = /^.{1,1000}$/s;
const moderatorStatuses: readonly ReviewStatus[] = ["APPROVED", "HIDDEN", "REMOVED"];
const unique = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

function validInput(input: ReviewInput): boolean {
  return id.test(input.perfumeId) && Number.isInteger(input.rating) && input.rating >= 1 && input.rating <= 5
    && reviewText.test(input.text.trim());
}

export class ReviewService {
  constructor(private readonly db: PrismaClient, private readonly now: () => Date = () => new Date()) {}

  async create(actor: ReviewActor, input: ReviewInput): Promise<ApiResult<{ id: string; status: ReviewStatus }>> {
    if (!id.test(actor.customerId) || !validInput(input)) return failure("VALIDATION_ERROR");
    const purchased = await this.db.orderItem.findFirst({
      where: { variant: { perfumeId: input.perfumeId }, order: { customerId: actor.customerId, payment: { is: { status: "SUCCEEDED" } } } },
      select: { id: true },
    });
    if (!purchased) return failure("FORBIDDEN");
    try {
      const review = await this.db.review.create({ data: { customerId: actor.customerId, perfumeId: input.perfumeId, rating: input.rating, text: input.text.trim() } });
      return success({ id: review.id, status: review.status });
    } catch (error) {
      if (unique(error)) return failure("CONFLICT");
      throw error;
    }
  }

  async update(actor: ReviewActor, reviewId: string, input: Pick<ReviewInput, "rating" | "text">): Promise<ApiResult<null>> {
    if (!id.test(actor.customerId) || !id.test(reviewId) || !Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5 || !reviewText.test(input.text.trim())) return failure("VALIDATION_ERROR");
    const changed = await this.db.review.updateMany({ where: { id: reviewId, customerId: actor.customerId, status: "PENDING" }, data: { rating: input.rating, text: input.text.trim() } });
    return changed.count === 1 ? success(null) : failure("NOT_FOUND");
  }

  async publicForPerfume(perfumeId: string) {
    if (!id.test(perfumeId)) return failure("VALIDATION_ERROR");
    const reviews = await this.db.review.findMany({ where: { perfumeId, status: "APPROVED" }, select: { id: true, rating: true, text: true, createdAt: true }, orderBy: { createdAt: "desc" } });
    return success(reviews.map(review => ({ ...review, createdAt: review.createdAt.toISOString() })));
  }

  async moderate(actor: ReviewModerator, reviewId: string, status: ReviewStatus): Promise<ApiResult<null>> {
    if (!id.test(actor.adminId) || !actor.permissions.includes("reviews:moderate")) return failure("FORBIDDEN");
    if (!id.test(reviewId) || !moderatorStatuses.includes(status)) return failure("VALIDATION_ERROR");
    const changed = await this.db.review.updateMany({ where: { id: reviewId }, data: { status, moderatedById: actor.adminId, moderatedAt: this.now() } });
    return changed.count === 1 ? success(null) : failure("NOT_FOUND");
  }
}
