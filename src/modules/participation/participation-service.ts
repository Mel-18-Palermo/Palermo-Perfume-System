/**
 * Participation presentation service (Issue #278).
 *
 * Mirrors the module-local service boundary already established by
 * `src/modules/personalisation/recommendation-service.ts`: async functions that
 * stand in for the Palermo client contract until the owning backend issues
 * (#275 reviews/moderation, #276 loyalty/subscription/referral) are available.
 *
 * Every eligibility flag, moderation status, point balance and referral reward
 * below is returned as server-authored data. This module performs no eligibility,
 * moderation, loyalty or referral calculation -- those are explicitly out of
 * scope for #278 and remain owned by #275/#276.
 */

import type {
  AppError,
  AppErrorCode,
  LoyaltyOverviewDto,
  PerfumeReviewsDto,
  ReferralOverviewDto,
  ReviewSubmissionRequest,
  ReviewSubmissionResult,
  SubscriptionStateDto,
  SubscriptionStatus,
} from "./participation-contracts";

/**
 * Presentation scenario selector.
 *
 * This only chooses which server response fixture is replayed, so that every
 * state required by #278 (loading / empty / error / ineligible / pending) can be
 * demonstrated and screenshotted before the real services exist. It follows the
 * same intent as the `forceFailureMode` switch used by the quiz service in #269.
 */
export type ParticipationScenario =
  | "default"
  | "loading"
  | "empty"
  | "error"
  | "ineligible"
  | "pending"
  | "subscribed"
  /** Reviews load normally, but submitting one fails. */
  | "submit-error";

const SCENARIOS: readonly ParticipationScenario[] = [
  "default",
  "loading",
  "empty",
  "error",
  "ineligible",
  "pending",
  "subscribed",
  "submit-error",
];

/** Reads `?state=` on the client. Unknown or absent values fall back to `default`. */
export function readParticipationScenario(): ParticipationScenario {
  if (typeof window === "undefined") return "default";

  const requested = new URLSearchParams(window.location.search).get("state");
  const match = SCENARIOS.find((scenario) => scenario === requested);

  return match ?? "default";
}

export class ParticipationRequestError extends Error implements AppError {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "ParticipationRequestError";
    this.code = code;
  }
}

/**
 * Turns a rejected participation request into customer-safe copy. Provider
 * payloads, stack traces and raw database errors are never surfaced
 * (frontend-contracts.md §4).
 */
export function resolveErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ParticipationRequestError ? error.message : fallback;
}

const NETWORK_DELAY_MS = 700;

/** Resolves after a simulated roundtrip, or never settles in the `loading` scenario. */
function simulateRoundtrip<T>(scenario: ParticipationScenario, value: T): Promise<T> {
  if (scenario === "loading") {
    return new Promise<T>(() => {
      /* Intentionally never settles so the pending presentation stays visible. */
    });
  }

  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(value), NETWORK_DELAY_MS);
  });
}

function unavailable(message: string): ParticipationRequestError {
  return new ParticipationRequestError("TEMPORARILY_UNAVAILABLE", message);
}

/* ------------------------------------------------------------------ reviews */

const PUBLISHED_REVIEWS: PerfumeReviewsDto["reviews"] = [
  {
    id: "rev_01",
    perfumeId: "p1",
    author: { displayName: "Amara T." },
    rating: 5,
    body: "The bergamot opening is genuinely bright rather than sharp, and it settles into a warm, clean base after about an hour. Longevity on my skin is a full working day.",
    submittedAt: "2026-08-21T09:14:00.000Z",
    moderationStatus: "PUBLISHED",
    verifiedPurchase: true,
  },
  {
    id: "rev_02",
    perfumeId: "p1",
    author: { displayName: "Daniel R." },
    rating: 4,
    body: "Beautifully balanced and not at all cloying. I would have liked slightly more projection in colder weather, but the quality of the materials is obvious.",
    submittedAt: "2026-08-14T17:42:00.000Z",
    moderationStatus: "PUBLISHED",
    verifiedPurchase: true,
  },
  {
    id: "rev_03",
    perfumeId: "p1",
    author: { displayName: "Sofia L." },
    rating: 5,
    body: "Bought this after the fragrance quiz recommended it and it was an exact match for what I was describing. The neroli stays present without turning soapy.",
    submittedAt: "2026-07-30T11:05:00.000Z",
    moderationStatus: "PUBLISHED",
    verifiedPurchase: true,
  },
];

const OWN_PENDING_REVIEW: CustomerPendingReview = {
  id: "rev_own_01",
  perfumeId: "p1",
  author: { displayName: "You" },
  rating: 4,
  body: "A refined, wearable composition. The dry-down is where it really becomes interesting.",
  submittedAt: "2026-09-04T08:20:00.000Z",
  moderationStatus: "PENDING_MODERATION",
  verifiedPurchase: true,
};

type CustomerPendingReview = NonNullable<PerfumeReviewsDto["ownPendingReview"]>;

export async function fetchPerfumeReviews(
  perfumeId: string,
  scenario: ParticipationScenario = "default"
): Promise<PerfumeReviewsDto> {
  if (scenario === "error") {
    await simulateRoundtrip(scenario, null);
    throw unavailable("Reviews are temporarily unavailable.");
  }

  if (scenario === "empty") {
    return simulateRoundtrip(scenario, {
      perfumeId,
      eligibility: {
        canSubmit: true,
        reason: "ELIGIBLE",
        existingReviewId: null,
      },
      summary: { averageRating: null, publishedCount: 0 },
      reviews: [],
      ownPendingReview: null,
    });
  }

  if (scenario === "ineligible") {
    return simulateRoundtrip(scenario, {
      perfumeId,
      eligibility: {
        canSubmit: false,
        reason: "NO_VERIFIED_PURCHASE",
        existingReviewId: null,
      },
      summary: { averageRating: 4.7, publishedCount: PUBLISHED_REVIEWS.length },
      reviews: PUBLISHED_REVIEWS,
      ownPendingReview: null,
    });
  }

  if (scenario === "pending") {
    return simulateRoundtrip(scenario, {
      perfumeId,
      eligibility: {
        canSubmit: false,
        reason: "REVIEW_UNDER_MODERATION",
        existingReviewId: OWN_PENDING_REVIEW.id,
      },
      summary: { averageRating: 4.7, publishedCount: PUBLISHED_REVIEWS.length },
      reviews: PUBLISHED_REVIEWS,
      ownPendingReview: OWN_PENDING_REVIEW,
    });
  }

  return simulateRoundtrip(scenario, {
    perfumeId,
    eligibility: { canSubmit: true, reason: "ELIGIBLE", existingReviewId: null },
    summary: { averageRating: 4.7, publishedCount: PUBLISHED_REVIEWS.length },
    reviews: PUBLISHED_REVIEWS,
    ownPendingReview: null,
  });
}

export async function submitPerfumeReview(
  request: ReviewSubmissionRequest,
  scenario: ParticipationScenario = "default"
): Promise<ReviewSubmissionResult> {
  if (scenario === "error" || scenario === "submit-error") {
    await simulateRoundtrip(scenario, null);
    throw unavailable("Your review could not be submitted. Please try again.");
  }

  return simulateRoundtrip(scenario, {
    review: {
      id: `rev_${request.idempotencyKey}`,
      perfumeId: request.perfumeId,
      author: { displayName: "You" },
      rating: request.rating,
      body: request.body,
      submittedAt: new Date().toISOString(),
      moderationStatus: "PENDING_MODERATION",
      verifiedPurchase: true,
    },
    message:
      "Thank you. Your review has been received and is awaiting moderation before it appears publicly.",
  });
}

/* ------------------------------------------------------------------ loyalty */

const LOYALTY_HISTORY: LoyaltyOverviewDto["history"] = [
  {
    id: "lp_06",
    kind: "REFERRAL_BONUS",
    points: 250,
    description: "Referral bonus for a completed first order",
    occurredAt: "2026-09-01T10:12:00.000Z",
    orderReference: null,
  },
  {
    id: "lp_05",
    kind: "EARNED",
    points: 520,
    description: "Points earned on a completed order",
    occurredAt: "2026-08-22T14:38:00.000Z",
    orderReference: "PAL-2026-004182",
  },
  {
    id: "lp_04",
    kind: "REDEEMED",
    points: -500,
    description: "Redeemed for a boutique discount",
    occurredAt: "2026-08-05T09:02:00.000Z",
    orderReference: "PAL-2026-003977",
  },
  {
    id: "lp_03",
    kind: "EARNED",
    points: 360,
    description: "Points earned on a completed order",
    occurredAt: "2026-07-19T16:25:00.000Z",
    orderReference: "PAL-2026-003641",
  },
  {
    id: "lp_02",
    kind: "ADJUSTMENT",
    points: 50,
    description: "Goodwill adjustment applied by the boutique team",
    occurredAt: "2026-07-02T11:47:00.000Z",
    orderReference: null,
  },
  {
    id: "lp_01",
    kind: "EARNED",
    points: 180,
    description: "Points earned on a completed order",
    occurredAt: "2026-06-11T13:09:00.000Z",
    orderReference: "PAL-2026-003210",
  },
];

export async function fetchLoyaltyOverview(
  scenario: ParticipationScenario = "default"
): Promise<LoyaltyOverviewDto> {
  if (scenario === "error") {
    await simulateRoundtrip(scenario, null);
    throw unavailable("Your loyalty balance is temporarily unavailable.");
  }

  if (scenario === "empty") {
    return simulateRoundtrip(scenario, {
      summary: {
        availablePoints: 0,
        lifetimePoints: 0,
        redemptionRule: {
          pointsRequired: 500,
          rewardLabel: "$25 boutique credit",
        },
        redeemable: false,
      },
      history: [],
    });
  }

  return simulateRoundtrip(scenario, {
    summary: {
      availablePoints: 860,
      lifetimePoints: 1360,
      redemptionRule: {
        pointsRequired: 500,
        rewardLabel: "$25 boutique credit",
      },
      redeemable: true,
    },
    history: LOYALTY_HISTORY,
  });
}

/* ------------------------------------------------------------- subscription */

const SUBSCRIPTION_CHANNEL = {
  channelLabel: "Palermo boutique updates",
  description:
    "Occasional emails about new releases, restocks and boutique events. You can opt out at any time, and this does not create a recurring order.",
};

export async function fetchSubscriptionState(
  scenario: ParticipationScenario = "default"
): Promise<SubscriptionStateDto> {
  if (scenario === "error") {
    await simulateRoundtrip(scenario, null);
    throw unavailable("Your subscription preference is temporarily unavailable.");
  }

  if (scenario === "subscribed") {
    return simulateRoundtrip(scenario, {
      ...SUBSCRIPTION_CHANNEL,
      status: "OPTED_IN",
      updatedAt: "2026-08-28T07:30:00.000Z",
    });
  }

  return simulateRoundtrip(scenario, {
    ...SUBSCRIPTION_CHANNEL,
    status: "OPTED_OUT",
    updatedAt: null,
  });
}

export async function updateSubscriptionState(
  nextStatus: SubscriptionStatus,
  scenario: ParticipationScenario = "default"
): Promise<SubscriptionStateDto> {
  if (scenario === "error") {
    await simulateRoundtrip(scenario, null);
    throw unavailable("Your subscription preference could not be updated.");
  }

  return simulateRoundtrip(scenario, {
    ...SUBSCRIPTION_CHANNEL,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  });
}

/* ----------------------------------------------------------------- referral */

const REFERRAL_REWARDS: ReferralOverviewDto["rewards"] = [
  {
    id: "ref_04",
    inviteeLabel: "a***a@example.com",
    status: "AWARDED",
    pointsAwarded: 250,
    updatedAt: "2026-09-01T10:12:00.000Z",
  },
  {
    id: "ref_03",
    inviteeLabel: "j***n@example.com",
    status: "QUALIFIED",
    pointsAwarded: 250,
    updatedAt: "2026-08-27T18:44:00.000Z",
  },
  {
    id: "ref_02",
    inviteeLabel: "m***e@example.com",
    status: "PENDING",
    pointsAwarded: null,
    updatedAt: "2026-08-19T12:03:00.000Z",
  },
  {
    id: "ref_01",
    inviteeLabel: "k***s@example.com",
    status: "EXPIRED",
    pointsAwarded: null,
    updatedAt: "2026-06-30T08:15:00.000Z",
  },
];

const REFERRAL_BASELINE = {
  code: "PALERMO-8F3QK2",
  shareUrl: "https://palermo.example.com/join?ref=PALERMO-8F3QK2",
  rewardRuleLabel:
    "Earn 250 loyalty points when someone you invite completes their first order.",
};

export async function fetchReferralOverview(
  scenario: ParticipationScenario = "default"
): Promise<ReferralOverviewDto> {
  if (scenario === "error") {
    await simulateRoundtrip(scenario, null);
    throw unavailable("Your referral details are temporarily unavailable.");
  }

  if (scenario === "empty") {
    return simulateRoundtrip(scenario, {
      ...REFERRAL_BASELINE,
      rewards: [],
    });
  }

  return simulateRoundtrip(scenario, {
    ...REFERRAL_BASELINE,
    rewards: REFERRAL_REWARDS,
  });
}
