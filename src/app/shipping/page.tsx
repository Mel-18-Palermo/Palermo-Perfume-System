import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/policy-page";
import { publishedPolicies } from "@/content/published-policy";
export const metadata: Metadata = { title: "Shipping & Delivery | Palermo Parfums", description: "How Palermo delivery options, charges and tracking work." };
export default function ShippingPage() {
  const policy = publishedPolicies.shipping;
  return <PolicyPage eyebrow={policy.eyebrow} title={policy.title} summary={policy.summary}>{policy.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}</PolicyPage>;
}
