"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PackageX } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";
import type { AppError } from "@/contracts/common";
import type { OrderDetail } from "@/contracts/orders";
import type { ShipmentTrackingDto } from "@/contracts/tracking";
import { formatDate, formatMoney } from "@/app/orders/_components/format";
import { OrderErrorView } from "@/app/orders/_components/order-error-view";
import { safeResult } from "@/app/orders/_components/safe-result";
import { TrackingTimeline } from "@/app/orders/_components/tracking-timeline";

export interface OrderDetailViewProps {
  orderId: string;
}

type OrderState =
  | { status: "loading" }
  | { status: "error"; error: AppError }
  | { status: "ready"; order: OrderDetail };

type TrackingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: AppError }
  | { status: "ready"; tracking: ShipmentTrackingDto };

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

export function OrderDetailView({ orderId }: OrderDetailViewProps) {
  const router = useRouter();
  const [shell, setShell] = React.useState<{ session: Session | null; cart: CartDto | null }>({
    session: null,
    cart: null,
  });
  const [orderState, setOrderState] = React.useState<OrderState>({ status: "loading" });
  const [trackingState, setTrackingState] = React.useState<TrackingState>({ status: "idle" });
  const [reloadToken, setReloadToken] = React.useState(0);
  const [trackingReloadToken, setTrackingReloadToken] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    async function run() {
      setOrderState({ status: "loading" });
      const result = await safeResult(() => api.orders.get({ id: orderId }));
      if (!active) return;
      if (result.ok) {
        setOrderState({ status: "ready", order: result.data });
      } else {
        setOrderState({ status: "error", error: result.error });
      }
    }
    void run();
    return () => {
      active = false;
    };
  }, [orderId, reloadToken]);

  const shipmentId = orderState.status === "ready" ? orderState.order.shipmentId : null;
  const readyOrderId = orderState.status === "ready" ? orderState.order.id : null;

  React.useEffect(() => {
    if (!readyOrderId) return;
    let active = true;
    async function run(resolvedOrderId: string) {
      if (!shipmentId) {
        setTrackingState({ status: "idle" });
        return;
      }
      setTrackingState({ status: "loading" });
      const result = await safeResult(() => api.tracking.get({ orderId: resolvedOrderId }));
      if (!active) return;
      if (result.ok) {
        setTrackingState({ status: "ready", tracking: result.data });
      } else {
        setTrackingState({ status: "error", error: result.error });
      }
    }
    void run(readyOrderId);
    return () => {
      active = false;
    };
  }, [readyOrderId, shipmentId, trackingReloadToken]);

  React.useEffect(() => {
    let active = true;
    async function loadShell() {
      const [sessionResult, cartResult] = await Promise.all([
        safeResult(() => api.auth.getSession()),
        safeResult(() => api.cart.get()),
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

  return (
    <CustomerShell cart={shell.cart} session={shell.session}>
      <div className="mx-auto max-w-[var(--container-page)]">
        <Button variant="ghost" size="sm" onClick={() => router.push("/orders")} className="-ml-3">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to orders
        </Button>

        {orderState.status === "loading" && (
          <div className="mt-6 space-y-0 border-t border-border" aria-busy="true" aria-label="Loading order">
            <div className="py-7"><Skeleton className="h-8 w-64" /><Skeleton className="mt-3 h-4 w-40" /></div>
            <div className="border-y border-border py-7"><Skeleton className="h-48 w-full" /></div>
          </div>
        )}

        {orderState.status === "error" && orderState.error.code === "NOT_FOUND" && (
          <div className="mt-6 border-y border-border py-12 sm:py-16">
            <PackageX className="h-5 w-5 text-text-muted" aria-hidden="true" />
            <h1 className="mt-4 text-h2 tracking-tight text-text">Purchase unavailable</h1>
            <p className="mt-2 text-sm text-text-muted">This purchase does not exist or is not available on your account.</p>
            <Button className="mt-6" variant="outline" size="sm" onClick={() => router.push("/orders")}>Back to purchases</Button>
          </div>
        )}

        {orderState.status === "error" && orderState.error.code !== "NOT_FOUND" && (
          <div className="mt-4">
            <OrderErrorView
              error={orderState.error}
              loginHref={`/login?next=/orders/${encodeURIComponent(orderId)}`}
              onRetry={() => setReloadToken(current => current + 1)}
            />
          </div>
        )}

        {orderState.status === "ready" && (
          <div className="mt-6">
            <header className="border-b border-border pb-7">
              <p className="text-xs font-medium text-text-muted">Your purchase</p>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <h1 className="text-h1 tracking-tight text-text">{orderState.order.items[0]?.title ?? "Palermo purchase"}</h1>
                <span className="text-sm font-medium text-text">{orderStatusLabels[orderState.order.status]}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
                <span>Placed {formatDate(orderState.order.placedAt)}</span>
                <span>{paymentStatusLabels[orderState.order.paymentStatus]}</span>
                <span>Reference {orderState.order.orderNumber}</span>
              </div>
              {orderState.order.cancellationRequest && (
                <Alert variant="warning" title="Cancellation requested" className="mt-3">
                  Requested {formatDate(orderState.order.cancellationRequest.requestedAt)}. This does not change the
                  order status shown above until confirmed.
                </Alert>
              )}
            </header>

            <section className="grid gap-8 border-b border-border py-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
              <div>
                <p className="text-xs font-medium text-text-muted">Fragrances</p>
                <ul className="mt-4 divide-y divide-border">
                  {orderState.order.items.map(item => (
                    <li key={item.id} className="flex items-start justify-between gap-5 py-5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-h3 font-medium tracking-tight text-text">{item.title}</p>
                        <p className="mt-1 text-sm text-text-muted">SKU {item.sku} <span aria-hidden="true">·</span> Quantity {item.quantity}</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-text">{formatMoney(item.unitPrice)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <dl className="self-start border-t border-border pt-4 text-sm">
                <div className="flex justify-between gap-4 py-1.5 text-text-muted"><dt>Subtotal</dt><dd>{formatMoney(orderState.order.subtotal)}</dd></div>
                <div className="flex justify-between gap-4 py-1.5 text-text-muted"><dt>Discount</dt><dd>{formatMoney(orderState.order.discountTotal)}</dd></div>
                <div className="mt-2 flex justify-between gap-4 border-t border-border pt-3 font-medium text-text"><dt>Total</dt><dd>{formatMoney(orderState.order.total)}</dd></div>
              </dl>
            </section>

            <section className="border-b border-border py-8">
              <p className="text-xs font-medium text-text-muted">Fulfilment</p>
              <h2 className="mt-3 text-h2 tracking-tight text-text">Current delivery state</h2>
              <div className="mt-5 max-w-2xl">
                {trackingState.status === "idle" && (
                  <p className="text-sm text-text-muted">
                    Tracking is not available for this purchase yet. It will appear once it is dispatched.
                  </p>
                )}
                {trackingState.status === "loading" && (
                  <div className="space-y-3" aria-busy="true" aria-label="Loading tracking">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                )}
                {trackingState.status === "error" && (
                  <OrderErrorView
                    error={trackingState.error}
                    loginHref={`/login?next=/orders/${encodeURIComponent(orderId)}`}
                    onRetry={() => setTrackingReloadToken(current => current + 1)}
                  />
                )}
                {trackingState.status === "ready" && <TrackingTimeline tracking={trackingState.tracking} />}
              </div>
            </section>

            <section className="grid gap-8 border-b border-border py-8 sm:grid-cols-2 sm:gap-12">
              <div>
                <p className="text-xs font-medium text-text-muted">Delivery to</p>
                <div className="mt-3 text-sm leading-6 text-text-muted">
                  <p className="font-medium text-text">{orderState.order.deliveryAddress.recipientName}</p>
                  <p>{orderState.order.deliveryAddress.line1}</p>
                  {orderState.order.deliveryAddress.line2 && <p>{orderState.order.deliveryAddress.line2}</p>}
                  <p>{orderState.order.deliveryAddress.suburb} {orderState.order.deliveryAddress.state} {orderState.order.deliveryAddress.postcode}</p>
                  <p>{orderState.order.deliveryAddress.country}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-text-muted">Delivery method</p>
                <p className="mt-3 text-sm font-medium text-text">{orderState.order.deliveryMethod.name}</p>
                {orderState.order.deliveryMethod.displayInformation && <p className="mt-1 text-sm leading-6 text-text-muted">{orderState.order.deliveryMethod.displayInformation}</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
