/**
 * Presentation helpers for the participation module (Issue #278).
 *
 * These map server-owned states onto copy and design-system badge variants.
 * They perform no eligibility, moderation, loyalty or referral calculation.
 */

import type {
  LoyaltyEntryKind,
  ReferralRewardStatus,
  ReviewEligibilityReason,
} from "./participation-contracts";

type BadgeVariant =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface StatusPresentation {
  label: string;
  variant: BadgeVariant;
}

// en-GB gives consistently abbreviated months for the same D MMM YYYY order.
const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(isoDate: string): string {
  const parsed = new Date(isoDate);

  return Number.isNaN(parsed.getTime()) ? "Date unavailable" : DATE_FORMATTER.format(parsed);
}

export function formatPoints(points: number): string {
  return `${points.toLocaleString("en-AU")} pts`;
}

/** Signed presentation of a server-calculated ledger delta. */
export function formatSignedPoints(points: number): string {
  const sign = points > 0 ? "+" : "";

  return `${sign}${points.toLocaleString("en-AU")} pts`;
}

/**
 * Copy for each server-supplied ineligibility reason. The reason itself is
 * decided by the review service (#275); this only renders it.
 */
export const REVIEW_INELIGIBILITY_COPY: Record<
  Exclude<ReviewEligibilityReason, "ELIGIBLE">,
  { title: string; message: string }
> = {
  NOT_AUTHENTICATED: {
    title: "Sign in to write a review",
    message:
      "Reviews can only be written by signed-in customers who have purchased this perfume.",
  },
  NO_VERIFIED_PURCHASE: {
    title: "Only verified purchasers can review",
    message:
      "You can write a review for this perfume once one of your orders containing it has been completed.",
  },
  ALREADY_REVIEWED: {
    title: "You have already reviewed this perfume",
    message:
      "Each customer may publish one review per perfume. Your existing review is shown with the public reviews below once approved.",
  },
  REVIEW_UNDER_MODERATION: {
    title: "Your review is awaiting moderation",
    message:
      "You cannot submit another review for this perfume while your current one is being reviewed by the Palermo team.",
  },
};

export const LOYALTY_ENTRY_PRESENTATION: Record<LoyaltyEntryKind, StatusPresentation> = {
  EARNED: { label: "Earned", variant: "success" },
  REDEEMED: { label: "Redeemed", variant: "neutral" },
  REFERRAL_BONUS: { label: "Referral bonus", variant: "accent" },
  ADJUSTMENT: { label: "Adjustment", variant: "info" },
};

export const REFERRAL_STATUS_PRESENTATION: Record<
  ReferralRewardStatus,
  StatusPresentation & { description: string }
> = {
  PENDING: {
    label: "Pending",
    variant: "warning",
    description: "Invitation accepted, first order not yet completed.",
  },
  QUALIFIED: {
    label: "Qualified",
    variant: "info",
    description: "First order completed. Points are being applied.",
  },
  AWARDED: {
    label: "Awarded",
    variant: "success",
    description: "Points have been added to your loyalty balance.",
  },
  EXPIRED: {
    label: "Expired",
    variant: "neutral",
    description: "This invitation lapsed before a qualifying order.",
  },
};
