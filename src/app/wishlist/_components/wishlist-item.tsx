"use client";

import Image from "next/image";
import Link from "next/link";
import { HeartOff } from "lucide-react";
import type { MoneyValue } from "@/contracts/common";
import type { WishlistItem } from "@/contracts/wishlist";
import { Button } from "@/components/ui/button";

function formatMoney(value: MoneyValue): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: value.currency,
  }).format(value.amountMinor / 100);
}

export function WishlistItemRow({
  item,
  removing,
  onRemove,
}: Readonly<{
  item: WishlistItem;
  removing: boolean;
  onRemove: (perfumeId: string) => void;
}>) {
  const perfume = item.perfume;
  const title = perfume?.name ?? "Unavailable fragrance";

  return (
    <li className="grid gap-5 border-b border-border py-6 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:items-center">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-muted sm:w-[7.5rem]">
        {perfume?.imageUrl ? (
          <Image
            src={perfume.imageUrl}
            alt={perfume.name}
            fill
            className="object-cover"
            sizes="(max-width: 639px) 100vw, 120px"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-text-muted">
            Image unavailable
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-text-muted">
          {perfume?.primaryFamily.label ?? "No longer in the catalogue"}
        </p>
        <h2 className="mt-2 text-h3 tracking-tight text-text">{title}</h2>
        {perfume ? (
          <p className="mt-2 text-sm text-text-muted">
            From {formatMoney(perfume.priceFrom)}
            {perfume.intensity ? ` · ${perfume.intensity.label}` : ""}
          </p>
        ) : (
          <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">
            This fragrance has been removed from the catalogue. You can still remove it from your wishlist.
          </p>
        )}
        {!item.available && perfume ? (
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-warning">
            Currently unavailable to purchase
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
        {perfume ? (
          <Link
            href={`/product/${perfume.id}`}
            className="inline-flex min-h-11 items-center justify-center border border-text px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-text transition-colors hover:bg-text hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
          >
            View fragrance
          </Link>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          isLoading={removing}
          onClick={() => onRemove(item.perfumeId)}
          aria-label={`Remove ${title} from wishlist`}
          className="rounded-none"
        >
          <HeartOff className="h-4 w-4" aria-hidden="true" />
          Remove
        </Button>
      </div>
    </li>
  );
}
