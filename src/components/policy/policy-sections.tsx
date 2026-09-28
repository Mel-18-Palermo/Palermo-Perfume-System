import Link from "next/link";
import type { PublishedPolicy, PublishedPolicyParagraph } from "@/content/published-policy";

function PolicyParagraph({ paragraph }: Readonly<{ paragraph: PublishedPolicyParagraph }>) {
  if (typeof paragraph === "string") return <p>{paragraph}</p>;
  return <p>{paragraph.map((part, index) => part.href
    ? <Link key={`${part.href}-${index}`} href={part.href}>{part.text}</Link>
    : <span key={index}>{part.text}</span>)}</p>;
}

export function PolicySections({ policy }: Readonly<{ policy: PublishedPolicy }>) {
  return policy.sections.map(section => <section key={section.heading}>
    <h2>{section.heading}</h2>
    {section.paragraphs.map((paragraph, index) => <PolicyParagraph key={index} paragraph={paragraph} />)}
  </section>);
}
