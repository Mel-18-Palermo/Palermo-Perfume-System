"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PackageX } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session } from "@/contracts/auth";
import type { CartDto } from "@/contracts/cart";
import type { AppError } from "@/contracts/common";
import type { OrderDetail } from "@/contracts/orders";
import type { ShipmentTrackingDto } from "@/contracts/tracking";
import { formatDate, formatMoney } from "@/app/orders/_components/format";
import { ordersPresentationApi } from "@/app/orders/_components/orders-api-client";
import { OrderStatusBadge, PaymentStatusBadge } from "@/app/orders/_components/status-badges";
import { TrackingTimeline } from "@/app/orders/_components/tracking-timeline";

export interface OrderDetailViewProps {
  orderId: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: AppError }
  | { status: "ready"; order: OrderDetail; tracking: ShipmentTrackingDto | null };

export function OrderDetailView({ orderId }: OrderDetailViewProps) {
  const router = useRouter();
  const [shell, setShell] = React.useState<{ session: Session | null; cart: CartDto | null }>({
    session: null,
    cart: null,
  });
  const [state, setState] = React.useState<LoadState>({ status: "loading" });
  const [reloadToken, setReloadToken] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    async function run() {
      setState({ status: "loading" });
      const orderResult = await ordersPresentationApi.orders.get({ id: orderId });
      if (!active) return;
      if (!orderResult.ok) {
        setState({ status: "error", error: orderResult.error });
        return;
      }
      const order = orderResult.data;
      if (!order.shipmentId) {
        setState({ status: "ready", order, tracking: null });
        return;
      }
      const trackingResult = await ordersPresentationApi.tracking.get({ orderId: order.id });
      if (!active) return;
      setState({ status: "ready", order, tracking: trackingResult.ok ? trackingResult.data : null });
    }
    void run();
    return () => {
      active = false;
    };
  }, [orderId, reloadToken]);

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

  return (
    <CustomerShell cart={shell.cart} session={shell.session}>
      <div className="mx-auto max-w-[var(--container-page)]">
        <Button variant="ghost" size="sm" onClick={() => router.push("/orders")} className="-ml-3">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to orders
        </Button>

        {state.status === "loading" && (
          <div className="mt-4 space-y-4" aria-busy="true" aria-label="Loading order">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {state.status === "error" && state.error.code === "NOT_FOUND" && (
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

        {state.status === "error" && state.error.code !== "NOT_FOUND" && (
          <div className="mt-4">
            <ErrorState
              title="We couldn't load this order"
              message={state.error.message}
              onRetry={() => setReloadToken(current => current + 1)}
            />
          </div>
        )}

        {state.status === "ready" && (
          <div className="mt-4 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-h1 text-text">{state.order.orderNumber}</h1>
                <OrderStatusBadge status={state.order.status} />
                <PaymentStatusBadge status={state.order.paymentStatus} />
              </div>
              <p className="mt-1 text-sm text-text-muted">Placed {formatDate(state.order.placedAt)}</p>
              {state.order.cancellationRequest && (
                <Alert variant="warning" title="Cancellation requested" className="mt-3">
                  Requested {formatDate(state.order.cancellationRequest.requestedAt)}. This does not change the order
                  status shown above until confirmed.
                </Alert>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {state.order.items.map(item => (
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
                    <span>{formatMoney(state.order.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-text-muted">
                    <span>Discount</span>
                    <span>{formatMoney(state.order.discountTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold text-text">
                    <span>Total</span>
                    <span>{formatMoney(state.order.total)}</span>
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
                  <p className="text-text">{state.order.deliveryAddress.recipientName}</p>
                  <p>{state.order.deliveryAddress.line1}</p>
                  {state.order.deliveryAddress.line2 && <p>{state.order.deliveryAddress.line2}</p>}
                  <p>
                    {state.order.deliveryAddress.suburb} {state.order.deliveryAddress.state}{" "}
                    {state.order.deliveryAddress.postcode}
                  </p>
                  <p>{state.order.deliveryAddress.country}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Delivery method</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-text-muted">
                  <p className="text-text">{state.order.deliveryMethod.name}</p>
                  {state.order.deliveryMethod.displayInformation && <p>{state.order.deliveryMethod.displayInformation}</p>}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Shipment tracking</CardTitle>
              </CardHeader>
              <CardContent>
                {state.tracking ? (
                  <TrackingTimeline tracking={state.tracking} />
                ) : (
                  <p className="text-sm text-text-muted">
                    Tracking is not available for this order yet. It appears once the order is dispatched.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}
