import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { OrderStatus, PaymentStatus } from "@/contracts/orders";
import type { ShipmentStatus } from "@/contracts/tracking";

const orderStatusLabels: Readonly<Record<OrderStatus, string>> = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
};
const orderStatusVariants: Readonly<Record<OrderStatus, NonNullable<BadgeProps["variant"]>>> = {
  PLACED: "neutral",
  CONFIRMED: "info",
  PROCESSING: "warning",
  SHIPPED: "accent",
  DELIVERED: "success",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={orderStatusVariants[status]}>{orderStatusLabels[status]}</Badge>;
}

const paymentStatusLabels: Readonly<Record<PaymentStatus, string>> = {
  PENDING: "Payment pending",
  SUCCEEDED: "Paid",
  FAILED: "Payment failed",
  EXPIRED: "Payment expired",
};
const paymentStatusVariants: Readonly<Record<PaymentStatus, NonNullable<BadgeProps["variant"]>>> = {
  PENDING: "warning",
  SUCCEEDED: "success",
  FAILED: "danger",
  EXPIRED: "neutral",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={paymentStatusVariants[status]}>{paymentStatusLabels[status]}</Badge>;
}

const shipmentStatusLabels: Readonly<Record<ShipmentStatus, string>> = {
  PENDING: "Awaiting dispatch",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
};
const shipmentStatusVariants: Readonly<Record<ShipmentStatus, NonNullable<BadgeProps["variant"]>>> = {
  PENDING: "neutral",
  DISPATCHED: "info",
  IN_TRANSIT: "warning",
  DELIVERED: "success",
};

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return <Badge variant={shipmentStatusVariants[status]}>{shipmentStatusLabels[status]}</Badge>;
}
