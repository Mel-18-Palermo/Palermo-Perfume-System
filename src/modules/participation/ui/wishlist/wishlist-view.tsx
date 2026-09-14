"use client";

import * as React from "react";
import Link from "next/link";
import type { WishlistItem } from "@/contracts/wishlist";
import { api } from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { WishlistItemCard } from "./wishlist-item";

/** Matches Button's primary/md classes; a real anchor is required for navigation semantics. */
const primaryLinkStyles =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export type WishlistLoadState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error"; message: string }
  | { status: "ready"; items: readonly WishlistItem[] };

export interface WishlistViewProps {
  /** Renders a fixed state instead of fetching. QA/preview only; the real route never sets this. */
  previewState?: WishlistLoadState;
}

export function WishlistView({ previewState }: WishlistViewProps = {}) {
  const [state, setState] = React.useState<WishlistLoadState>(previewState ?? { status: "loading" });
  const [reloadToken, setReloadToken] = React.useState(0);
  const [pendingRemovals, setPendingRemovals] = React.useState<ReadonlySet<string>>(new Set());
  const [actionError, setActionError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (previewState) return;
    let ignore = false;

    void api.wishlist.get(undefined).then(result => {
      if (ignore) return;
      if (!result.ok) {
        setState(
          result.error.code === "UNAUTHENTICATED" || result.error.code === "FORBIDDEN"
            ? { status: "signed-out" }
            : { status: "error", message: result.error.message },
        );
        return;
      }
      setState({ status: "ready", items: result.data.items });
    });

    return () => {
      ignore = true;
    };
  }, [reloadToken, previewState]);

  const retry = () => {
    setState({ status: "loading" });
    setReloadToken(token => token + 1);
  };

  const handleRemove = (perfumeId: string) => {
    setActionError(null);
    setPendingRemovals(current => new Set(current).add(perfumeId));

    void api.wishlist.remove({ perfumeId }).then(result => {
      setPendingRemovals(current => {
        const next = new Set(current);
        next.delete(perfumeId);
        return next;
      });

      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }
      setState({ status: "ready", items: result.data.items });
    });
  };

  return (
    <section aria-labelledby="wishlist-heading" className="space-y-6">
      <div>
        <h1 id="wishlist-heading" className="text-h1 font-bold text-text">
          Wishlist
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Perfumes you have saved to consider later.
        </p>
      </div>

      {actionError ? (
        <Alert variant="danger" title="Could not update your wishlist">
          {actionError}
        </Alert>
      ) : null}

      {state.status === "loading" ? (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="sr-only">Loading your wishlist…</span>
          {[0, 1, 2].map(key => (
            <div key={key} className="space-y-3 rounded-lg border border-border p-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : null}

      {state.status === "signed-out" ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-muted/30 p-8 text-center">
          <h2 className="text-h3 text-text">Sign in to view your wishlist</h2>
          <p className="mx-auto mt-1 max-w-[var(--container-form)] text-sm text-text-muted">
            Your wishlist is saved to your account so it is available on any device.
          </p>
          <Link href="/login" className={`mt-4 ${primaryLinkStyles}`}>
            Sign in
          </Link>
        </div>
      ) : null}

      {state.status === "error" ? (
        <ErrorState
          title="Could not load your wishlist"
          message={state.message}
          onRetry={retry}
        />
      ) : null}

      {state.status === "ready" && state.items.length === 0 ? (
        <EmptyState
          title="Your wishlist is empty"
          description="Save perfumes you love while browsing the catalogue and they will appear here."
          action={
            <Link href="/" className={primaryLinkStyles}>
              Browse the catalogue
            </Link>
          }
        />
      ) : null}

      {state.status === "ready" && state.items.length > 0 ? (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-live="polite"
        >
          {state.items.map(item => (
            <WishlistItemCard
              key={item.perfumeId}
              item={item}
              isRemoving={pendingRemovals.has(item.perfumeId)}
              onRemove={handleRemove}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
