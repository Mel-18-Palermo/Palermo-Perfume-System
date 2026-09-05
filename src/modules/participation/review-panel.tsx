"use client";

import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

import type { PerfumeReviewsDto } from "./participation-contracts";
import { formatDate, REVIEW_INELIGIBILITY_COPY } from "./participation-format";
import {
  fetchPerfumeReviews,
  readParticipationScenario,
  resolveErrorMessage,
  submitPerfumeReview,
} from "./participation-service";
import { RatingDisplay, RatingInput } from "./rating-stars";

const REVIEW_BODY_MIN_LENGTH = 20;
const REVIEW_BODY_MAX_LENGTH = 600;

type PanelStatus = "loading" | "ready" | "error";

/**
 * Textarea styling is intentionally kept module-local: `src/components/ui` holds
 * shared primitives and #278 does not permit shared primitive changes. It reuses
 * the exact token classes of `components/ui/input.tsx` so there is no new design
 * token or feature-local colour. Promoting it to a shared `Textarea` primitive is
 * a follow-up that needs design-system owner approval.
 */
const TEXTAREA_BASE_CLASSES =
  "w-full rounded-md border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

interface ReviewPanelProps {
  perfumeId: string;
  perfumeName: string;
}

function ReviewListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading reviews</span>
      {[0, 1, 2].map((row) => (
        <div key={row} className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function ReviewPanel({ perfumeId, perfumeName }: ReviewPanelProps) {
  const [status, setStatus] = React.useState<PanelStatus>("loading");
  const [data, setData] = React.useState<PerfumeReviewsDto | null>(null);
  const [loadErrorMessage, setLoadErrorMessage] = React.useState<string | null>(null);

  const [rating, setRating] = React.useState<number>(0);
  const [body, setBody] = React.useState<string>("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = React.useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const load = React.useCallback(() => {
    fetchPerfumeReviews(perfumeId, readParticipationScenario())
      .then((result) => {
        setData(result);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        setLoadErrorMessage(
          resolveErrorMessage(error, "Reviews could not be loaded right now.")
        );
        setStatus("error");
      });
  }, [perfumeId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleRetry = () => {
    setStatus("loading");
    setLoadErrorMessage(null);
    load();
  };

  const handleSubmit =(event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    const trimmedBody = body.trim();

    if (rating < 1) {
      setFormError("Select a rating between 1 and 5 stars.");
      return;
    }

    if (trimmedBody.length < REVIEW_BODY_MIN_LENGTH) {
      setFormError(
        `Write at least ${REVIEW_BODY_MIN_LENGTH} characters so other customers get useful context.`
      );
      return;
    }

    setFormError(null);
    setSubmitErrorMessage(null);
    setIsSubmitting(true);

    submitPerfumeReview(
      {
        perfumeId,
        rating,
        body: trimmedBody,
        // Prevents a retry from creating a second review (frontend-contracts.md §18).
        idempotencyKey: `${perfumeId}-${Date.now()}`,
      },
      readParticipationScenario()
    )
      .then((result) => {
        setSubmitMessage(result.message);
        setRating(0);
        setBody("");
        // The server owns the resulting moderation and eligibility state.
        setData((current) =>
          current === null
            ? current
            : {
                ...current,
                eligibility: {
                  canSubmit: false,
                  reason: "REVIEW_UNDER_MODERATION",
                  existingReviewId: result.review.id,
                },
                ownPendingReview: result.review,
              }
        );
      })
      .catch((error: unknown) => {
        // Entered data is preserved so a recoverable failure is not punishing.
        setSubmitErrorMessage(
          resolveErrorMessage(error, "Your review could not be submitted.")
        );
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const bodyRemaining = REVIEW_BODY_MAX_LENGTH - body.length;

  return (
    <section aria-labelledby="customer-reviews-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="customer-reviews-heading"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          Customer reviews
        </h2>
        {status === "ready" && data !== null && (
          <div className="flex flex-wrap items-center gap-3">
            <RatingDisplay
              value={data.summary.averageRating}
              label={`average rating for ${perfumeName}`}
            />
            <span className="text-xs text-muted-foreground">
              {data.summary.publishedCount === 1
                ? "1 published review"
                : `${data.summary.publishedCount} published reviews`}
            </span>
          </div>
        )}
      </div>

      {status === "loading" && <ReviewListSkeleton />}

      {status === "error" && (
        <ErrorState
          title="Reviews are unavailable"
          message={loadErrorMessage ?? "Reviews could not be loaded right now."}
          onRetry={handleRetry}
        />
      )}

      {status === "ready" && data !== null && (
        <div className="space-y-6">
          {/* Moderation / pending presentation for the customer's own review. */}
          {data.ownPendingReview !== null && (
            <Alert variant="warning" title="Your review is awaiting moderation">
              Submitted {formatDate(data.ownPendingReview.submittedAt)}. It will appear in
              the public list once the Palermo team has approved it.
              <blockquote className="mt-2 border-l-2 border-warning/40 pl-3 italic break-words">
                {data.ownPendingReview.body}
              </blockquote>
            </Alert>
          )}

          {submitMessage !== null && data.ownPendingReview === null && (
            <Alert variant="success" title="Review received">
              {submitMessage}
            </Alert>
          )}

          {data.eligibility.canSubmit ? (
            <Card>
              <CardHeader>
                <CardTitle>Write a review</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {submitErrorMessage !== null && (
                    <Alert variant="danger" title="Your review was not submitted">
                      {submitErrorMessage} Your rating and text have been kept so you can
                      try again.
                    </Alert>
                  )}

                  <RatingInput
                    name="review-rating"
                    value={rating}
                    onChange={(next) => {
                      setRating(next);
                      setFormError(null);
                    }}
                    disabled={isSubmitting}
                    {...(formError !== null ? { describedBy: "review-form-error" } : {})}
                  />

                  <div className="w-full space-y-1.5">
                    <label
                      htmlFor="review-body"
                      className="block text-xs font-medium text-foreground"
                    >
                      Your review <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="review-body"
                      name="review-body"
                      rows={5}
                      value={body}
                      maxLength={REVIEW_BODY_MAX_LENGTH}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        setBody(event.target.value);
                        setFormError(null);
                      }}
                      aria-invalid={formError !== null && rating >= 1}
                      aria-describedby={
                        formError !== null ? "review-form-error" : "review-body-help"
                      }
                      placeholder="How does it wear through the day? What stood out to you?"
                      className={`${TEXTAREA_BASE_CLASSES} resize-y ${
                        formError !== null && rating >= 1
                          ? "border-danger focus:ring-danger"
                          : "border-border"
                      }`}
                    />
                    <p id="review-body-help" className="text-xs text-muted-foreground">
                      {REVIEW_BODY_MIN_LENGTH} characters minimum. {bodyRemaining} remaining.
                    </p>
                  </div>

                  {formError !== null && (
                    <p id="review-form-error" role="alert" className="text-xs text-danger">
                      {formError}
                    </p>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Reviews are public and are checked by the Palermo team before they
                      appear.
                    </p>
                    <Button
                      type="submit"
                      size="lg"
                      isLoading={isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      Submit review
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            data.eligibility.reason !== "ELIGIBLE" &&
            // The dedicated moderation notice above already covers this case.
            data.ownPendingReview === null && (
              <Alert
                variant="info"
                title={REVIEW_INELIGIBILITY_COPY[data.eligibility.reason].title}
              >
                {REVIEW_INELIGIBILITY_COPY[data.eligibility.reason].message}
              </Alert>
            )
          )}

          {/* Public review list. */}
          {data.reviews.length === 0 ? (
            <EmptyState
              title="No reviews yet"
              description={`${perfumeName} has not been reviewed yet. If you have purchased it, yours would be the first.`}
            />
          ) : (
            <ul className="space-y-3">
              {data.reviews.map((review) => (
                <li key={review.id}>
                  <Card>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {review.author.displayName}
                          </span>
                          {review.verifiedPurchase && (
                            <Badge variant="success">Verified purchase</Badge>
                          )}
                        </div>
                        <time
                          dateTime={review.submittedAt}
                          className="text-xs text-muted-foreground"
                        >
                          {formatDate(review.submittedAt)}
                        </time>
                      </div>

                      <RatingDisplay
                        value={review.rating}
                        label={`rating by ${review.author.displayName}`}
                      />

                      <p className="text-sm leading-relaxed text-muted-foreground break-words">
                        {review.body}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
