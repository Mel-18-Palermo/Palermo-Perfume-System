import type { Endpoint, EntityId, Timestamp } from "./common";

export type ReviewStatus = "PENDING" | "APPROVED" | "HIDDEN" | "REMOVED";

export type PublicReview = Readonly<{
  id: EntityId;
  rating: number;
  text: string;
  createdAt: Timestamp;
}>;

export type ReviewSubmission = Readonly<{
  perfumeId: EntityId;
  rating: number;
  text: string;
}>;

export type ReviewUpdate = Readonly<{
  reviewId: EntityId;
  rating: number;
  text: string;
}>;

export type ReviewModeration = Readonly<{
  reviewId: EntityId;
  status: Extract<ReviewStatus, "APPROVED" | "HIDDEN" | "REMOVED">;
}>;

export type ReviewsApi = Readonly<{
  publicForPerfume: Endpoint<{ readonly perfumeId: EntityId }, readonly PublicReview[]>;
  create: Endpoint<ReviewSubmission, { readonly id: EntityId; readonly status: ReviewStatus }>;
  update: Endpoint<ReviewUpdate, null>;
}>;
