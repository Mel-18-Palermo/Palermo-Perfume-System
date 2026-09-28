import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/policy-page";
import { PolicySections } from "@/components/policy/policy-sections";
import { publishedPolicies } from "@/content/published-policy";
export const metadata: Metadata = { title: "Returns & Refunds | Palermo Parfums", description: "Current Palermo cancellation, return and refund boundaries." };
export default function ReturnsPage() {
  const policy = publishedPolicies.returns;
  return <PolicyPage eyebrow={policy.eyebrow} title={policy.title} summary={policy.summary}><PolicySections policy={policy} /></PolicyPage>;
}
