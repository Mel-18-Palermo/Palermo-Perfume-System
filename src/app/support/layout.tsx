import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Support | Palermo",
  description: "Ask Palermo support for product, policy, order, delivery or service guidance.",
};

export default function SupportLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
