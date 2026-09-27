import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/policy-page";
import { publishedPolicies } from "@/content/published-policy";
export const metadata: Metadata = { title: "Returns & Refunds | Palermo Parfums", description: "Current Palermo cancellation, return and refund boundaries." };
export default function ReturnsPage() {
  const policy = publishedPolicies.returns;
  return <PolicyPage eyebrow={policy.eyebrow} title={policy.title} summary={policy.summary}>{policy.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}</PolicyPage>;
}
