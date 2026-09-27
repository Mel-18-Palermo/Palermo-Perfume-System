"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import type { AdminOrderSummary } from "@/contracts/admin";
import type { Page } from "@/contracts/common";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminMilestoneApi } from "./admin-milestone-api";

type OrdersState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Page<AdminOrderSummary> };

const orderLabels = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
} as const;
const paymentLabels = {
  PENDING: "Pending",
  SUCCEEDED: "Paid",
  FAILED: "Failed",
  EXPIRED: "Expired",
} as const;
const shipmentLabels = {
  NOT_CREATED: "Not created",
  PENDING: "Awaiting dispatch",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
} as const;

function statusVariant(status: string): NonNullable<BadgeProps["variant"]> {
  if (status === "SUCCEEDED" || status === "DELIVERED") return "success";
  if (status === "FAILED") return "danger";
  if (status === "PROCESSING" || status === "PENDING" || status === "IN_TRANSIT") return "warning";
  if (status === "CONFIRMED" || status === "DISPATCHED") return "info";
  return "neutral";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatMoney(value: AdminOrderSummary["total"]): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: value.currency }).format(value.amountMinor / 100);
}

function Statuses({ order }: { order: AdminOrderSummary }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant={statusVariant(order.status)}>{orderLabels[order.status]}</Badge>
      <Badge variant={statusVariant(order.paymentStatus)}>{paymentLabels[order.paymentStatus]}</Badge>
      <Badge variant={statusVariant(order.shipmentState)}>{shipmentLabels[order.shipmentState]}</Badge>
      <Badge variant={order.trackingPresent ? "accent" : "neutral"}>{order.trackingPresent ? "Tracking present" : "No tracking"}</Badge>
    </div>
  );
}

function OrderCard({ order }: { order: AdminOrderSummary }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/admin/orders/${encodeURIComponent(order.id)}`} className="inline-flex min-h-11 items-center text-h3 font-semibold text-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {order.orderNumber}
          </Link>
          <p className="mt-1 break-words text-sm text-text-muted">{order.customer.name}</p>
          <p className="break-all text-sm text-text-muted">{order.customer.email}</p>
        </div>
        <p className="text-sm font-semibold text-text">{formatMoney(order.total)}</p>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div><dt className="text-text-muted">Placed</dt><dd className="mt-1 break-words font-medium text-text">{formatDate(order.placedAt)}</dd></div>
        <div><dt className="text-text-muted">Order total</dt><dd className="mt-1 font-medium text-text">{formatMoney(order.total)}</dd></div>
      </dl>
      <div className="mt-5"><Statuses order={order} /></div>
      <Link href={`/admin/orders/${encodeURIComponent(order.id)}`} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        View order <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Card>
  );
}

export function AdminOrders() {
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<OrdersState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await getAdminMilestoneApi().listOrders({ page, pageSize: 20 });
        if (!active) return;
        setState(result.ok ? { status: "ready", data: result.data } : { status: "error", message: result.error.message });
      } catch {
        if (active) setState({ status: "error", message: "Orders are temporarily unavailable." });
      }
    }
    void load();
    return () => { active = false; };
  }, [page, reloadToken]);

  function reload() {
    setState({ status: "loading" });
    setReloadToken(value => value + 1);
  }

  function changePage(nextPage: number) {
    setState({ status: "loading" });
    setPage(nextPage);
  }

  return (
    <section aria-labelledby="orders-heading" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="orders-heading" className="text-h2 font-semibold">Orders</h1>
          <p className="mt-2 max-w-reading text-sm text-text-muted">Read-only order, payment and delivery information for operational support.</p>
        </div>
        <Button variant="outline" onClick={reload} disabled={state.status === "loading"}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh orders
        </Button>
      </div>

      {state.status === "loading" && (
        <div role="status" aria-busy="true" className="space-y-3">
          <span className="sr-only">Loading orders…</span>
          <Skeleton className="h-44 xl:h-16" />
          <Skeleton className="h-44 xl:h-16" />
          <Skeleton className="h-44 xl:h-16" />
        </div>
      )}

      {state.status === "error" && <ErrorState title="Could not load orders" message={state.message} onRetry={reload} />}

      {state.status === "ready" && (state.data.items.length === 0 ? (
        <EmptyState title="No orders found" description="There are no orders on this page." />
      ) : (
        <>
          <div className="space-y-4 xl:hidden">
            {state.data.items.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
          <div className="hidden overflow-hidden rounded-lg border border-border xl:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Orders with customer, payment and shipment information</caption>
              <thead className="bg-surface-muted text-text-muted">
                <tr>
                  <th scope="col" className="p-4 font-medium">Order</th>
                  <th scope="col" className="p-4 font-medium">Customer</th>
                  <th scope="col" className="p-4 font-medium">Placed</th>
                  <th scope="col" className="p-4 font-medium">Total</th>
                  <th scope="col" className="p-4 font-medium">Order</th>
                  <th scope="col" className="p-4 font-medium">Payment</th>
                  <th scope="col" className="p-4 font-medium">Shipment</th>
                  <th scope="col" className="p-4 font-medium">Tracking</th>
                </tr>
              </thead>
              <tbody>
                {state.data.items.map(order => (
                  <tr key={order.id} className="border-t border-border align-top">
                    <th scope="row" className="p-4 font-semibold"><Link href={`/admin/orders/${encodeURIComponent(order.id)}`} className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{order.orderNumber}</Link></th>
                    <td className="p-4"><p className="font-medium text-text">{order.customer.name}</p><p className="mt-1 break-all text-text-muted">{order.customer.email}</p></td>
                    <td className="p-4 text-text-muted">{formatDate(order.placedAt)}</td>
                    <td className="p-4 font-medium">{formatMoney(order.total)}</td>
                    <td className="p-4"><Badge variant={statusVariant(order.status)}>{orderLabels[order.status]}</Badge></td>
                    <td className="p-4"><Badge variant={statusVariant(order.paymentStatus)}>{paymentLabels[order.paymentStatus]}</Badge></td>
                    <td className="p-4"><Badge variant={statusVariant(order.shipmentState)}>{shipmentLabels[order.shipmentState]}</Badge></td>
                    <td className="p-4"><Badge variant={order.trackingPresent ? "accent" : "neutral"}>{order.trackingPresent ? "Present" : "None"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ))}

      {state.status === "ready" && state.data.items.length > 0 && (
        <nav aria-label="Orders pagination" className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" disabled={state.data.page <= 1} onClick={() => changePage(state.data.page - 1)}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Previous</Button>
          <span className="text-sm text-text-muted">Page {state.data.page}</span>
          <Button variant="outline" disabled={!state.data.hasMore} onClick={() => changePage(state.data.page + 1)}>Next <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
        </nav>
      )}
    </section>
  );
}
