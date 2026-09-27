import type { Metadata } from "next";
import { OrderDetailView } from "./_components/order-detail-view";

export const metadata: Metadata = {
  title: "Order Detail | Palermo Parfums",
  description: "View order items, delivery details and shipment tracking.",
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirmed?: string | string[] }>;
}) {
  const { id } = await params;
  const { confirmed } = await searchParams;
  return <OrderDetailView orderId={id} confirmed={confirmed === "1"} />;
}
