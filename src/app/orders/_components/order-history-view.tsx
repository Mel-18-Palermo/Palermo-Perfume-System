"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, PackageSearch } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";
import type { AppError } from "@/contracts/common";
import type { OrderSummary } from "@/contracts/orders";
import { formatDate, formatMoney } from "./format";
import { OrderErrorView } from "./order-error-view";
import { canLoadOrderHistory } from "./order-history-session";
import { safeResult } from "./safe-result";

const orderStatusLabels = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
} as const;

const paymentStatusLabels = {
  PENDING: "Payment pending",
  SUCCEEDED: "Paid",
  FAILED: "Payment failed",
  EXPIRED: "Payment expired",
} as const;

const PAGE_SIZE = 10;

export function OrderHistoryView() {
  const router = useRouter();
  const [shell, setShell] = React.useState<{ session: Session | null; cart: CartDto | null }>({
    session: null,
    cart: null,
  });
  const [page, setPage] = React.useState(1);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [items, setItems] = React.useState<readonly OrderSummary[] | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [error, setError] = React.useState<AppError | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSessionResolved, setIsSessionResolved] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    async function loadShell() {
      const sessionResult = await safeResult(() => api.auth.getSession());
      if (active) {
        setShell(current => ({ ...current, session: sessionResult.ok ? sessionResult.data : null }));
        setIsSessionResolved(true);
      }

      const cartResult = await safeResult(() => api.cart.get());
      if (active) {
        setShell(current => ({ ...current, cart: cartResult.ok ? cartResult.data : null }));
      }
    }
    void loadShell();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    let active = true;
    async function run() {
      if (!isSessionResolved) return;

      setIsLoading(true);
      setError(null);

      if (!canLoadOrderHistory(shell.session, isSessionResolved)) {
        if (active) {
          setItems(null);
          setHasMore(false);
          setError({ code: "UNAUTHENTICATED", message: "Sign in to view your orders." });
          setIsLoading(false);
        }
        return;
      }

      const result = await safeResult(() => api.orders.list({ page, pageSize: PAGE_SIZE }));
      if (!active) return;
      if (result.ok) {
        setItems(result.data.items);
        setHasMore(result.data.hasMore);
      } else {
        setError(result.error);
      }
      setIsLoading(false);
    }
    void run();
    return () => {
      active = false;
    };
  }, [isSessionResolved, page, reloadToken, shell.session]);

  return (
    <CustomerShell cart={shell.cart} session={shell.session}>
      <div className="mx-auto max-w-[var(--container-page)]">
        <h1 className="text-h1 tracking-tight text-text">Your purchases</h1>
        <p className="mt-1 text-sm text-text-muted">A record of your Palermo fragrances.</p>

        <div className="mt-7">
          {isLoading && (
            <div className="space-y-0 border-t border-border" aria-busy="true" aria-label="Loading orders">
              {[0, 1, 2].map(key => (
                <div key={key} className="grid gap-4 border-b border-border py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="space-y-3"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-36" /></div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && error && (
            <OrderErrorView
              error={error}
              loginHref="/login?next=/orders"
              onRetry={() => setReloadToken(current => current + 1)}
            />
          )}

          {!isLoading && !error && items && items.length === 0 && (
            <div className="border-y border-border py-12 sm:py-16">
              <PackageSearch className="h-5 w-5 text-text-muted" aria-hidden="true" />
              <h2 className="mt-4 text-h2 tracking-tight text-text">No purchases yet</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">When you find a fragrance that feels like yours, it will appear here.</p>
              <Button className="mt-6" variant="outline" size="sm" onClick={() => router.push("/catalogue")}>Browse the catalogue</Button>
            </div>
          )}

          {!isLoading && !error && items && items.length > 0 && (
            <>
              <ul className="border-t border-border">
                {items.map(order => (
                  <li key={order.id} className="border-b border-border">
                    <button
                      type="button"
                      onClick={() => router.push(`/orders/${order.id}`)}
                      className="group grid w-full gap-5 py-6 text-left transition-colors hover:bg-surface-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="text-h3 font-medium tracking-tight text-text">{order.primaryItemTitle ?? "Palermo purchase"}</p>
                        <p className="mt-1 text-sm text-text-muted">
                          {order.itemCount > 1 ? `${order.itemCount} fragrances` : "1 fragrance"} <span aria-hidden="true">·</span> Placed {formatDate(order.placedAt)}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                          <span><span className="font-medium text-text">Order status:</span> {orderStatusLabels[order.status]}</span>
                          <span>{paymentStatusLabels[order.paymentStatus]}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-5 sm:flex-col sm:items-end sm:gap-2">
                        <span className="text-base font-medium text-text">{formatMoney(order.total)}</span>
                        <span className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-text">View purchase <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" aria-hidden="true" /></span>
                      </div>
                      <span className="sr-only">, reference {order.orderNumber}</span>
                    </button>
                  </li>
                ))}
              </ul>

              {(page > 1 || hasMore) && (
                <nav className="flex items-center justify-between pt-2" aria-label="Order history pagination">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(current => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-text-muted">Page {page}</span>
                  <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(current => current + 1)}>
                    Next
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </CustomerShell>
  );
}
