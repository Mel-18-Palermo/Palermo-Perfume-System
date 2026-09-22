"use client";

import * as React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api";
import type { WishlistItem } from "@/contracts/wishlist";

type LoadState = "loading" | "loaded" | "error";

export function WishlistClient() {
  const [state, setState] = React.useState<LoadState>("loading");
  const [items, setItems] = React.useState<readonly WishlistItem[]>([]);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setState("loading");
    setErrorMessage("");
    const result = await api.wishlist.get();
    if (result.ok) {
      setItems(result.data.items);
      setState("loaded");
    } else {
      setErrorMessage(result.error.message);
      setState("error");
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleRemove(perfumeId: string) {
    setRemovingId(perfumeId);
    const result = await api.wishlist.remove({ perfumeId });
    setRemovingId(null);
    if (result.ok) {
      setItems(result.data.items);
    } else {
      setErrorMessage(result.error.message);
    }
  }

  if (state === "loading") {
    return (
      <div className="space-y-4" aria-live="polite" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 w-full animate-pulse rounded-lg bg-surface-muted" />
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <EmptyState
        title="We couldn't load your wishlist"
        description={errorMessage || "Something went wrong. Please try again."}
        action={<Button onClick={load}>Try again</Button>}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your wishlist is empty"
        description="Perfumes you save will appear here."
        action={
          <a href="/">
            <Button>Browse perfumes</Button>
          </a>
        }
      />
    );
  }

  return (
    <ul className="space-y-4" aria-label="Your wishlist">
      {items.map((item) => {
        const perfume = item.perfume;

        // The referenced perfume may no longer exist (e.g. archived from the
        // catalogue after being wishlisted). Render a safe fallback instead
        // of crashing on null fields.
        if (perfume === null) {
          return (
            <li key={item.perfumeId}>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className="h-16 w-16 rounded-md bg-surface-muted flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      This item is no longer available
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      The perfume may have been removed from the catalogue.
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="ghost"
                    size="sm"
                    isLoading={removingId === item.perfumeId}
                    onClick={() => handleRemove(item.perfumeId)}
                    aria-label="Remove unavailable item from wishlist"
                  >
                    Remove
                  </Button>
                </CardFooter>
              </Card>
            </li>
          );
        }

        return (
          <li key={item.perfumeId}>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                {perfume.imageUrl ? (
                  <img
                    src={perfume.imageUrl}
                    alt={perfume.name}
                    className="h-16 w-16 rounded-md object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="h-16 w-16 rounded-md bg-surface-muted flex-shrink-0"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <a
                    href={`/product/${perfume.id}`}
                    className="text-sm font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                  >
                    {perfume.name}
                  </a>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {perfume.primaryFamily.label}
                  </p>
                  <p className="text-sm text-foreground mt-1">
                    {(perfume.priceFrom.amountMinor / 100).toFixed(2)}{" "}
                    {perfume.priceFrom.currency}
                  </p>
                  {!item.available && (
                    <p className="text-xs font-medium text-danger mt-1" role="status">
                      Currently unavailable
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <a href={`/product/${perfume.id}`}>
                  <Button variant="outline" size="sm" disabled={!item.available}>
                    View product
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={removingId === item.perfumeId}
                  onClick={() => handleRemove(item.perfumeId)}
                  aria-label={`Remove ${perfume.name} from wishlist`}
                >
                  Remove
                </Button>
              </CardFooter>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
