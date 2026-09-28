import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/policy-page";
import { PolicySections } from "@/components/policy/policy-sections";
import { publishedPolicies } from "@/content/published-policy";
export const metadata: Metadata = { title: "Shipping & Delivery | Palermo Parfums", description: "How Palermo delivery options, charges and tracking work." };
export default function ShippingPage() {
  const policy = publishedPolicies.shipping;
  return <PolicyPage eyebrow={policy.eyebrow} title={policy.title} summary={policy.summary}><PolicySections policy={policy} /></PolicyPage>;
}
