"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { WishlistItem } from "@/contracts/wishlist";
import type { MoneyValue } from "@/contracts/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

function formatPrice(money: MoneyValue): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: money.currency,
  }).format(money.amountMinor / 100);
}

export interface WishlistItemCardProps {
  item: WishlistItem;
  isRemoving: boolean;
  onRemove: (perfumeId: string) => void;
}

/** A wishlist row's perfume is null once the product is delisted; that state has no product page. */
export function WishlistItemCard({ item, isRemoving, onRemove }: WishlistItemCardProps) {
  const { perfume } = item;
  const isDelisted = perfume === null;
  const isUnavailable = isDelisted || !item.available;
  const name = perfume?.name ?? "Perfume no longer available";

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative h-64 w-full shrink-0 overflow-hidden bg-surface-muted">
        {perfume?.imageUrl ? (
          <Image
            src={perfume.imageUrl}
            alt={perfume.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-text-muted">
            {isDelisted ? "No longer available" : "No image available"}
          </div>
        )}
        {isUnavailable ? (
          <Badge
            variant={isDelisted ? "danger" : "warning"}
            className="absolute left-2 top-2"
          >
            {isDelisted ? "No longer available" : "Currently unavailable"}
          </Badge>
        ) : null}
      </div>

      <CardContent className="flex flex-1 flex-col gap-1">
        {perfume ? (
          <p className="text-xs uppercase tracking-wide text-text-muted">
            {perfume.primaryFamily.label}
          </p>
        ) : null}
        <h3 className="text-base font-semibold text-text">{name}</h3>
        {perfume ? (
          <p className="mt-1 text-sm text-text-muted">From {formatPrice(perfume.priceFrom)}</p>
        ) : (
          <p className="mt-1 text-sm text-text-muted">
            This perfume has been removed from the catalogue and can no longer be viewed or purchased.
          </p>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        {perfume ? (
          <Link
            href={`/product/${perfume.id}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            View product
          </Link>
        ) : (
          <span className="text-xs text-text-muted">No product page available</span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          isLoading={isRemoving}
          onClick={() => onRemove(item.perfumeId)}
          aria-label={`Remove ${name} from wishlist`}
        >
          Remove
        </Button>
      </CardFooter>
    </Card>
  );
}
