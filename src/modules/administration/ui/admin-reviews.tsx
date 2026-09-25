"use client";

import { useEffect, useState } from "react";
import type { ReviewModerationRecord } from "@/contracts/reviews";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminMilestoneApi } from "./admin-milestone-api";

type ReviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: readonly ReviewModerationRecord[]; hasMore: boolean };

const labels = {
  PENDING: "Pending",
  APPROVED: "Approved",
  HIDDEN: "Hidden",
  REMOVED: "Removed",
} as const;

export function AdminReviews() {
  const [state, setState] = useState<ReviewState>({ status: "loading" });
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getAdminMilestoneApi().listReviews({ page, pageSize: 20 });
        if (!active) return;
        setState(result.ok
          ? { status: "ready", items: result.data.items, hasMore: result.data.hasMore }
          : { status: "error", message: result.error.message });
      } catch {
        if (active) setState({ status: "error", message: "Review moderation is temporarily unavailable." });
      }
    }

    void load();
    return () => { active = false; };
  }, [page, reloadToken]);

  function reload() {
    setActionError(null);
    setState({ status: "loading" });
    setReloadToken(value => value + 1);
  }

  async function moderate(reviewId: string, status: "APPROVED" | "HIDDEN" | "REMOVED") {
    if (actionId) return;
    setActionId(reviewId);
    setActionError(null);
    const result = await getAdminMilestoneApi().moderateReview({ reviewId, status });
    setActionId(null);
    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }
    reload();
  }

  return (
    <section aria-labelledby="reviews-heading" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="reviews-heading" className="text-h2 font-semibold">Review moderation</h2>
          <p className="mt-2 text-sm text-text-muted">Review text and moderation states are persisted. Only permitted administrator actions are available.</p>
        </div>
        <Button variant="outline" onClick={reload} disabled={state.status === "loading" || actionId !== null}>Refresh reviews</Button>
      </div>

      {actionError && <p role="alert" className="rounded-md border border-danger/30 bg-danger-background/40 p-3 text-sm text-danger">{actionError}</p>}

      {state.status === "loading" && (
        <div role="status" aria-busy="true" className="space-y-3">
          <span className="sr-only">Loading review moderation queue…</span>
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}

      {state.status === "error" && <ErrorState title="Could not load reviews" message={state.message} onRetry={reload} />}

      {state.status === "ready" && (
        state.items.length === 0 ? (
          <EmptyState title="No reviews to moderate" description="There are no persisted reviews on this page." />
        ) : (
          <div className="space-y-4">
            {state.items.map(review => (
              <Card key={review.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold">{review.perfume.name}</h3>
                    <p className="mt-1 text-sm text-text-muted">{review.rating} of 5 · {labels[review.status]} · Submitted {new Date(review.createdAt).toLocaleDateString("en-AU")}</p>
                  </div>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium">{labels[review.status]}</span>
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6">{review.text}</p>
                <div className="mt-5 flex flex-wrap gap-2" aria-label={`Moderate review for ${review.perfume.name}`}>
                  <Button type="button" size="sm" onClick={() => { void moderate(review.id, "APPROVED"); }} isLoading={actionId === review.id} disabled={actionId !== null || review.status === "APPROVED"}>Approve</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { void moderate(review.id, "HIDDEN"); }} isLoading={actionId === review.id} disabled={actionId !== null || review.status === "HIDDEN"}>Hide</Button>
                  <Button type="button" size="sm" variant="danger" onClick={() => { void moderate(review.id, "REMOVED"); }} isLoading={actionId === review.id} disabled={actionId !== null || review.status === "REMOVED"}>Remove</Button>
                </div>
              </Card>
            ))}
            {state.hasMore && <Button type="button" variant="outline" onClick={() => { setState({ status: "loading" }); setPage(value => value + 1); }}>Next page</Button>}
          </div>
        )
      )}
    </section>
  );
}
