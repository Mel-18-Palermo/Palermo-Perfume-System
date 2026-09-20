import type { Metadata } from "next";
import { OrderHistoryView } from "./_components/order-history-view";

export const metadata: Metadata = {
  title: "Order History | Palermo Parfums",
  description: "Review your past Palermo orders and their current status.",
};

export default function OrdersPage() {
  return <OrderHistoryView />;
}
