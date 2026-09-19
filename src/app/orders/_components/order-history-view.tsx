"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PackageSearch } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";
import type { AppError } from "@/contracts/common";
import type { OrderSummary } from "@/contracts/orders";
import { formatDate, formatMoney } from "./format";
import { ordersPresentationApi } from "./orders-api-client";
import { OrderStatusBadge, PaymentStatusBadge } from "./status-badges";

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

  React.useEffect(() => {
    let active = true;
    async function loadShell() {
      const [sessionResult, cartResult] = await Promise.all([
        ordersPresentationApi.auth.getSession(),
        ordersPresentationApi.cart.get(),
      ]);
      if (!active) return;
      setShell({
        session: sessionResult.ok ? sessionResult.data : null,
        cart: cartResult.ok ? cartResult.data : null,
      });
    }
    void loadShell();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    let active = true;
    async function run() {
      setIsLoading(true);
      setError(null);
      const result = await ordersPresentationApi.orders.list({ page, pageSize: PAGE_SIZE });
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
  }, [page, reloadToken]);

  return (
    <CustomerShell cart={shell.cart} session={shell.session}>
      <div className="mx-auto max-w-[var(--container-page)]">
        <h1 className="text-h1 text-text">Order history</h1>
        <p className="mt-1 text-sm text-text-muted">Review orders placed on your account and their current status.</p>

        <div className="mt-6 space-y-4">
          {isLoading && (
            <div className="space-y-4" aria-busy="true" aria-label="Loading orders">
              {[0, 1, 2].map(key => (
                <Skeleton key={key} className="h-28 w-full" />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <ErrorState
              title="We couldn't load your orders"
              message={error.message}
              onRetry={() => setReloadToken(current => current + 1)}
            />
          )}

          {!isLoading && !error && items && items.length === 0 && (
            <EmptyState
              icon={<PackageSearch className="h-5 w-5" aria-hidden="true" />}
              title="No orders yet"
              description="Orders you place will appear here with their status and tracking."
              action={
                <Button variant="outline" size="sm" onClick={() => router.push("/catalogue")}>
                  Browse the catalogue
                </Button>
              }
            />
          )}

          {!isLoading && !error && items && items.length > 0 && (
            <>
              <ul className="space-y-4">
                {items.map(order => (
                  <li key={order.id}>
                    <Card>
                      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-text">{order.orderNumber}</p>
                          <p className="mt-0.5 text-xs text-text-muted">Placed {formatDate(order.placedAt)}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <OrderStatusBadge status={order.status} />
                            <PaymentStatusBadge status={order.paymentStatus} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
                          <span className="text-sm font-semibold text-text">{formatMoney(order.total)}</span>
                          <Button variant="outline" size="sm" onClick={() => router.push(`/orders/${order.id}`)}>
                            View order
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
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
