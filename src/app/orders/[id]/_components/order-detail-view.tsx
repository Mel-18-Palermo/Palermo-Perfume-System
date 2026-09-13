"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PackageX } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
import { OrderStatusBadge, PaymentStatusBadge } from "@/app/orders/_components/status-badges";
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
          <div className="mt-4 space-y-4" aria-busy="true" aria-label="Loading order">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {orderState.status === "error" && orderState.error.code === "NOT_FOUND" && (
          <div className="mt-4">
            <EmptyState
              icon={<PackageX className="h-5 w-5" aria-hidden="true" />}
              title="Order not found"
              description="This order does not exist or is not on your account."
              action={
                <Button variant="outline" size="sm" onClick={() => router.push("/orders")}>
                  Back to order history
                </Button>
              }
            />
          </div>
        )}

        {orderState.status === "error" && orderState.error.code !== "NOT_FOUND" && (
          <div className="mt-4">
            <OrderErrorView error={orderState.error} onRetry={() => setReloadToken(current => current + 1)} />
          </div>
        )}

        {orderState.status === "ready" && (
          <div className="mt-4 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-h1 text-text">{orderState.order.orderNumber}</h1>
                <OrderStatusBadge status={orderState.order.status} />
                <PaymentStatusBadge status={orderState.order.paymentStatus} />
              </div>
              <p className="mt-1 text-sm text-text-muted">Placed {formatDate(orderState.order.placedAt)}</p>
              {orderState.order.cancellationRequest && (
                <Alert variant="warning" title="Cancellation requested" className="mt-3">
                  Requested {formatDate(orderState.order.cancellationRequest.requestedAt)}. This does not change the
                  order status shown above until confirmed.
                </Alert>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {orderState.order.items.map(item => (
                    <li key={item.id} className="flex items-center justify-between gap-4 p-5">
                      <div>
                        <p className="text-sm font-medium text-text">{item.title}</p>
                        <p className="mt-0.5 text-xs text-text-muted">
                          SKU {item.sku} &middot; Qty {item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-text">{formatMoney(item.unitPrice)}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-1 border-t border-border p-5 text-sm">
                  <div className="flex items-center justify-between text-text-muted">
                    <span>Subtotal</span>
                    <span>{formatMoney(orderState.order.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-text-muted">
                    <span>Discount</span>
                    <span>{formatMoney(orderState.order.discountTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold text-text">
                    <span>Total</span>
                    <span>{formatMoney(orderState.order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Delivery address</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-text-muted">
                  <p className="text-text">{orderState.order.deliveryAddress.recipientName}</p>
                  <p>{orderState.order.deliveryAddress.line1}</p>
                  {orderState.order.deliveryAddress.line2 && <p>{orderState.order.deliveryAddress.line2}</p>}
                  <p>
                    {orderState.order.deliveryAddress.suburb} {orderState.order.deliveryAddress.state}{" "}
                    {orderState.order.deliveryAddress.postcode}
                  </p>
                  <p>{orderState.order.deliveryAddress.country}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Delivery method</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-text-muted">
                  <p className="text-text">{orderState.order.deliveryMethod.name}</p>
                  {orderState.order.deliveryMethod.displayInformation && (
                    <p>{orderState.order.deliveryMethod.displayInformation}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Shipment tracking</CardTitle>
              </CardHeader>
              <CardContent>
                {trackingState.status === "idle" && (
                  <p className="text-sm text-text-muted">
                    Tracking is not available for this order yet. It appears once the order is dispatched.
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
                    onRetry={() => setTrackingReloadToken(current => current + 1)}
                  />
                )}
                {trackingState.status === "ready" && <TrackingTimeline tracking={trackingState.tracking} />}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
