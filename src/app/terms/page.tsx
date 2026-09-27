import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/policy-page";
import { publishedPolicies } from "@/content/published-policy";
export const metadata: Metadata = { title: "Terms & Conditions | Palermo Parfums", description: "Terms for using the Palermo catalogue, account and ordering experience." };
export default function TermsPage() {
  const policy = publishedPolicies.terms;
  return <PolicyPage eyebrow={policy.eyebrow} title={policy.title} summary={policy.summary}>{policy.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}</PolicyPage>;
}
