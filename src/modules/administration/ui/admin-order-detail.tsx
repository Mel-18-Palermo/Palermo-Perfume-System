"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, PackageX, RefreshCw } from "lucide-react";
import type { AdminOrderDetail, AdminShipmentState } from "@/contracts/admin";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminMilestoneApi } from "./admin-milestone-api";

type DetailState =
  | { status: "loading" }
  | { status: "error"; code: string; message: string }
  | { status: "ready"; order: AdminOrderDetail };

const orderLabels = { PLACED: "Placed", CONFIRMED: "Confirmed", PROCESSING: "Processing", SHIPPED: "Shipped", DELIVERED: "Delivered" } as const;
const paymentLabels = { PENDING: "Pending", SUCCEEDED: "Paid", FAILED: "Failed", EXPIRED: "Expired" } as const;
const shipmentLabels: Readonly<Record<AdminShipmentState, string>> = { NOT_CREATED: "Not created", PENDING: "Awaiting dispatch", DISPATCHED: "Dispatched", IN_TRANSIT: "In transit", DELIVERED: "Delivered" };

function variant(status: string): NonNullable<BadgeProps["variant"]> {
  if (status === "SUCCEEDED" || status === "DELIVERED") return "success";
  if (status === "FAILED") return "danger";
  if (status === "PROCESSING" || status === "PENDING" || status === "IN_TRANSIT") return "warning";
  if (status === "CONFIRMED" || status === "DISPATCHED") return "info";
  return "neutral";
}

function money(value: AdminOrderDetail["total"]): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: value.currency }).format(value.amountMinor / 100);
}

function date(value: string): string {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function Personalisation({ item }: { item: AdminOrderDetail["items"][number] }) {
  const values: readonly (readonly [string, string | null])[] = [
    ["Personalised label", item.personalisation.personalisedLabel],
    ["Engraving", item.personalisation.engravingName],
    ["Gift message", item.personalisation.giftMessage],
    ["Gift packaging", item.personalisation.giftPackagingId],
  ] as const;
  const present = values.filter((entry): entry is readonly [string, string] => entry[1] !== null);
  if (!present.length) return null;
  return <dl className="mt-3 grid gap-2 text-sm text-text-muted">{present.map(([label, value]) => <div key={label} className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)]"><dt>{label}</dt><dd className="break-words text-text">{value}</dd></div>)}</dl>;
}

export function AdminOrderDetailView({ orderId }: { orderId: string }) {
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<DetailState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await getAdminMilestoneApi().getOrder({ id: orderId });
        if (!active) return;
        setState(result.ok ? { status: "ready", order: result.data } : { status: "error", code: result.error.code, message: result.error.message });
      } catch {
        if (active) setState({ status: "error", code: "TEMPORARILY_UNAVAILABLE", message: "Order details are temporarily unavailable." });
      }
    }
    void load();
    return () => { active = false; };
  }, [orderId, reloadToken]);

  const reload = () => { setState({ status: "loading" }); setReloadToken(value => value + 1); };
  const shipment = state.status === "ready" ? state.order.shipment : null;

  return (
    <section aria-labelledby="order-detail-heading" className="space-y-6">
      <Link href="/admin/orders" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to orders</Link>

      {state.status === "loading" && <div role="status" aria-busy="true" className="space-y-4"><span className="sr-only">Loading order details…</span><Skeleton className="h-28" /><Skeleton className="h-56" /><Skeleton className="h-48" /></div>}

      {state.status === "error" && state.code === "NOT_FOUND" && <Card className="p-8 text-center"><PackageX className="mx-auto h-6 w-6 text-text-muted" aria-hidden="true" /><h1 className="mt-4 text-h2 font-semibold">Order unavailable</h1><p className="mt-2 text-sm text-text-muted">This order could not be found.</p><Link href="/admin/orders" className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline">Return to orders</Link></Card>}
      {state.status === "error" && state.code !== "NOT_FOUND" && <ErrorState title="Could not load this order" message={state.message} onRetry={reload} />}

      {state.status === "ready" && (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <div>
              <p className="text-sm text-text-muted">Order {state.order.orderNumber}</p>
              <h1 id="order-detail-heading" className="mt-2 text-h1 font-semibold">{state.order.customer.name}</h1>
              <p className="mt-1 break-all text-sm text-text-muted">{state.order.customer.email}</p>
              <p className="mt-3 text-sm text-text-muted">Placed {date(state.order.placedAt)}</p>
            </div>
            <Button variant="outline" onClick={reload}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh</Button>
          </header>

          {state.order.cancellationRequest && <Alert variant="warning" title="Cancellation requested">Requested {date(state.order.cancellationRequest.requestedAt)}. The existing order status remains unchanged.</Alert>}

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-5"><p className="text-sm text-text-muted">Order status</p><div className="mt-3"><Badge variant={variant(state.order.status)}>{orderLabels[state.order.status]}</Badge></div></Card>
            <Card className="p-5"><p className="text-sm text-text-muted">Payment</p><div className="mt-3"><Badge variant={variant(state.order.paymentStatus)}>{paymentLabels[state.order.paymentStatus]}</Badge></div>{state.order.paymentReference && <p className="mt-3 break-all text-xs text-text-muted">Reference {state.order.paymentReference}</p>}</Card>
            <Card className="p-5"><p className="text-sm text-text-muted">Shipment</p><div className="mt-3"><Badge variant={variant(state.order.shipmentState)}>{shipmentLabels[state.order.shipmentState]}</Badge></div>{state.order.trackingPresent && <p className="mt-3 text-xs text-text-muted">Tracking reference recorded</p>}</Card>
          </div>

          <section aria-labelledby="items-heading" className="border-b border-border pb-6">
            <h2 id="items-heading" className="text-h2 font-semibold">Order items</h2>
            <div className="mt-4 space-y-3">
              {state.order.items.map(item => <Card key={item.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h3 className="text-h3 font-semibold">{item.title}</h3><p className="mt-1 break-words text-sm text-text-muted">SKU {item.sku} · Quantity {item.quantity}</p></div><div className="text-right text-sm"><p className="font-medium">{money(item.lineTotal)}</p><p className="mt-1 text-text-muted">{money(item.unitPrice)} each</p></div></div><Personalisation item={item} /></Card>)}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section aria-labelledby="delivery-heading"><h2 id="delivery-heading" className="text-h2 font-semibold">Delivery snapshot</h2><Card className="mt-4 p-5 text-sm leading-6"><p className="font-medium">{state.order.deliveryAddress.recipientName}</p><p>{state.order.deliveryAddress.line1}</p>{state.order.deliveryAddress.line2 && <p>{state.order.deliveryAddress.line2}</p>}<p>{state.order.deliveryAddress.suburb} {state.order.deliveryAddress.state} {state.order.deliveryAddress.postcode}</p><p>{state.order.deliveryAddress.country}</p></Card></section>
            <section aria-labelledby="totals-heading"><h2 id="totals-heading" className="text-h2 font-semibold">Totals</h2><Card className="mt-4 p-5"><dl className="space-y-3 text-sm"><div className="flex justify-between gap-4 text-text-muted"><dt>Subtotal</dt><dd>{money(state.order.subtotal)}</dd></div><div className="flex justify-between gap-4 text-text-muted"><dt>Discount</dt><dd>{money(state.order.discountTotal)}</dd></div><div className="flex justify-between gap-4 text-text-muted"><dt>Delivery</dt><dd>{money(state.order.deliveryCharge)}</dd></div><div className="flex justify-between gap-4 border-t border-border pt-3 font-semibold"><dt>Total</dt><dd>{money(state.order.total)}</dd></div></dl></Card></section>
          </div>

          <section aria-labelledby="tracking-heading" className="border-t border-border pt-6">
            <h2 id="tracking-heading" className="text-h2 font-semibold">Shipment and tracking</h2>
            {shipment ? (
              <div className="mt-4">
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-sm text-text-muted">Current shipment state</p><div className="mt-2"><Badge variant={variant(shipment.state)}>{shipmentLabels[shipment.state]}</Badge></div></div>
                    {shipment.trackingReference && <p className="break-all text-sm text-text-muted">Tracking {shipment.trackingReference}</p>}
                  </div>
                  {shipment.deliveredAt && <p className="mt-4 text-sm text-text-muted">Delivered {date(shipment.deliveredAt)}</p>}
                  <ol className="mt-5 space-y-4" aria-label="Tracking timeline">
                    {shipment.events.length ? shipment.events.map((event, index) => (
                      <li key={`${event.occurredAt}-${event.description}`} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3">
                        <div className="flex flex-col items-center"><span className="mt-1 h-3 w-3 rounded-full border-2 border-primary bg-surface" aria-hidden="true" />{index < shipment.events.length - 1 && <span className="mt-1 min-h-8 w-px bg-border" aria-hidden="true" />}</div>
                        <div><p className="font-medium">{shipmentLabels[event.status]}</p><p className="mt-1 text-sm text-text-muted">{event.description}</p><p className="mt-1 text-xs text-text-muted">{date(event.occurredAt)}</p></div>
                      </li>
                    )) : <li className="text-sm text-text-muted">No tracking events have been recorded.</li>}
                  </ol>
                </Card>
              </div>
            ) : <Card className="mt-4 p-5"><p className="text-sm text-text-muted">A shipment has not been created for this order.</p></Card>}
          </section>
        </>
      )}
    </section>
  );
}
