import type { Metadata } from "next";
import { OrderDetailView } from "./_components/order-detail-view";

export const metadata: Metadata = {
  title: "Order Detail | Palermo Parfums",
  description: "View order items, delivery details and shipment tracking.",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailView orderId={id} />;
}
