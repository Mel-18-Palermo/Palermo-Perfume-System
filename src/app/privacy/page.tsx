import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/policy-page";
import { PolicySections } from "@/components/policy/policy-sections";
import { publishedPolicies } from "@/content/published-policy";
export const metadata: Metadata = { title: "Privacy | Palermo Parfums", description: "How Palermo handles account, order, personalisation and support information." };
export default function PrivacyPage() {
  const policy = publishedPolicies.privacy;
  return <PolicyPage eyebrow={policy.eyebrow} title={policy.title} summary={policy.summary}><PolicySections policy={policy} /></PolicyPage>;
}
