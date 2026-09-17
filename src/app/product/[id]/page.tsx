import * as React from "react";
import { ProductDetailShell } from "./product-detail-shell";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <ProductDetailShell id={id} />;
}