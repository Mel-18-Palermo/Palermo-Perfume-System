/**
 * Participation contract types (reviews, loyalty, subscription, referral).
 *
 * Scope note (Issue #278): `src/contracts/**` is a protected path and the canonical
 * participation contracts are owned by #275 (verified-purchase review service and
 * moderation state) and #276 (loyalty points, subscription opt-in/out, referral
 * baseline). Neither is available yet, so these declarations are a provisional,
 * presentation-side mirror of the canonical shapes described in
 * `docs/development/frontend-contracts.md` and decisions D-073..D-077.
 *
 * They must be replaced by re-exports from `src/contracts/participation.ts` once
 * #275/#276 land. Nothing in this module derives eligibility, moderation outcomes,
 * loyalty balances or referral rewards -- every such value is read from the server
 * response shape below.
 */

/** Mirrors the canonical application error vocabulary (frontend-contracts.md §4). */
export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TEMPORARILY_UNAVAILABLE"
  | "INTEGRATION_ERROR"
  | "INTERNAL_ERROR";

export interface AppError {
  code: AppErrorCode;
  message: string;
}

/* ------------------------------------------------------------------ reviews */

/** Server-owned moderation state (D-073). The UI never transitions this itself. */
export type ReviewModerationStatus =
  | "PENDING_MODERATION"
  | "PUBLISHED"
  | "HIDDEN"
  | "REJECTED";

/** Server-owned eligibility outcome (D-073). The UI never computes this. */
export type ReviewEligibilityReason =
  | "ELIGIBLE"
  | "NOT_AUTHENTICATED"
  | "NO_VERIFIED_PURCHASE"
  | "ALREADY_REVIEWED"
  | "REVIEW_UNDER_MODERATION";

export interface ReviewEligibilityDto {
  canSubmit: boolean;
  reason: ReviewEligibilityReason;
  existingReviewId: string | null;
}

export interface ReviewAuthorSummary {
  /** Server-masked display name; the UI never renders raw account identifiers. */
  displayName: string;
}

export interface CustomerReviewDto {
  id: string;
  perfumeId: string;
  author: ReviewAuthorSummary;
  rating: number;
  body: string;
  submittedAt: string;
  moderationStatus: ReviewModerationStatus;
  verifiedPurchase: boolean;
}

export interface ReviewSummaryDto {
  averageRating: number | null;
  publishedCount: number;
}

export interface PerfumeReviewsDto {
  perfumeId: string;
  eligibility: ReviewEligibilityDto;
  summary: ReviewSummaryDto;
  /** Published reviews only; hidden/rejected entries are filtered server-side. */
  reviews: CustomerReviewDto[];
  /** The signed-in customer's own review while it is awaiting moderation. */
  ownPendingReview: CustomerReviewDto | null;
}

export interface ReviewSubmissionRequest {
  perfumeId: string;
  rating: number;
  body: string;
  /** Guards against duplicate submission on retry (frontend-contracts.md §18). */
  idempotencyKey: string;
}

export interface ReviewSubmissionResult {
  review: CustomerReviewDto;
  /** Server-authored confirmation copy, including moderation expectations. */
  message: string;
}

/* ------------------------------------------------------------------ loyalty */

export type LoyaltyEntryKind =
  | "EARNED"
  | "REDEEMED"
  | "REFERRAL_BONUS"
  | "ADJUSTMENT";

export interface LoyaltyLedgerEntryDto {
  id: string;
  kind: LoyaltyEntryKind;
  /** Signed, server-calculated point delta. The UI only formats it. */
  points: number;
  description: string;
  occurredAt: string;
  orderReference: string | null;
}

export interface LoyaltyRedemptionRuleDto {
  /** Administrator-configured rule (D-075), rendered as supplied. */
  pointsRequired: number;
  rewardLabel: string;
}

export interface LoyaltySummaryDto {
  availablePoints: number;
  lifetimePoints: number;
  redemptionRule: LoyaltyRedemptionRuleDto | null;
  /** Server decides redeemability; the UI never compares balances itself. */
  redeemable: boolean;
}

export interface LoyaltyOverviewDto {
  summary: LoyaltySummaryDto;
  history: LoyaltyLedgerEntryDto[];
}

/* ------------------------------------------------------------- subscription */

/** Basic opt-in/opt-out record (D-076). No recurring billing in baseline. */
export type SubscriptionStatus = "OPTED_IN" | "OPTED_OUT";

export interface SubscriptionStateDto {
  status: SubscriptionStatus;
  channelLabel: string;
  description: string;
  updatedAt: string | null;
}

/* ----------------------------------------------------------------- referral */

/** Server-owned referral reward state (D-077). */
export type ReferralRewardStatus =
  | "PENDING"
  | "QUALIFIED"
  | "AWARDED"
  | "EXPIRED";

export interface ReferralRewardDto {
  id: string;
  /** Server-masked invitee label; never a raw email address. */
  inviteeLabel: string;
  status: ReferralRewardStatus;
  /** Server-calculated award, null until the referral qualifies. */
  pointsAwarded: number | null;
  updatedAt: string;
}

export interface ReferralOverviewDto {
  code: string;
  shareUrl: string;
  /** Server-authored copy describing the configured award. */
  rewardRuleLabel: string;
  rewards: ReferralRewardDto[];
}
