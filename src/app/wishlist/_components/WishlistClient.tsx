"use client";

import * as React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api";
import type { WishlistItem } from "@/contracts/wishlist";

type LoadState = "loading" | "loaded" | "error";

// NOTE: adjust this one line if the canonical contract names the field differently.
function isUnavailable(item: WishlistItem): boolean {
  return item.perfume.isAvailable === false;
}

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
    setErrorMessage("");
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
          <Button onClick={() => window.location.assign("/catalogue")}>
            Browse perfumes
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}

      <ul className="space-y-4" aria-label="Your wishlist">
        {items.map((item) => {
          const unavailable = isUnavailable(item);
          const removing = removingId === item.perfumeId;

          return (
            <li key={item.perfumeId}>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  {item.perfume.imageUrl ? (
                    <img
                      src={item.perfume.imageUrl}
                      alt={item.perfume.name}
                      className="h-16 w-16 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="h-16 w-16 rounded-md bg-surface-muted flex-shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    
                      href={`/catalogue/${item.perfume.slug}`}
                      className="text-sm font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                    >
                      {item.perfume.name}
                    </a>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.perfume.primaryFamily.label}
                    </p>
                    {unavailable ? (
                      <p className="text-xs font-medium text-red-600 mt-1">
                        Currently unavailable
                      </p>
                    ) : null}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 px-4 pb-4 pt-0">
                  <Button
                    variant="outline"
                    onClick={() => handleRemove(item.perfumeId)}
                    disabled={removing}
                    aria-label={`Remove ${item.perfume.name} from wishlist`}
                  >
                    {removing ? "Removing…" : "Remove"}
                  </Button>
                </CardFooter>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
