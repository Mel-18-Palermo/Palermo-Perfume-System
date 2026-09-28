import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PolicySections } from "../../src/components/policy/policy-sections";
import { publishedPolicies, publishedPolicyContext } from "../../src/content/published-policy";

function renderPolicy(policy: typeof publishedPolicies[keyof typeof publishedPolicies]): string {
  return renderToStaticMarkup(createElement(PolicySections, { policy }));
}

describe("published policy content", () => {
  it("renders the policy links from the shared structured source", () => {
    expect(renderPolicy(publishedPolicies.privacy)).toContain('<a href="/support">Palermo support</a>');
    expect(renderPolicy(publishedPolicies.returns)).toContain('<a href="/support">Palermo support</a>');

    const terms = renderPolicy(publishedPolicies.terms);
    expect(terms).toContain('<a href="/shipping">Shipping &amp; Delivery</a>');
    expect(terms).toContain('<a href="/returns">Returns &amp; Refunds</a>');
  });

  it("flattens structured links before supplying policy facts to support", () => {
    const terms = publishedPolicyContext().find(policy => policy.title === "Terms & Conditions");
    expect(terms?.sections.find(section => section.heading === "Delivery, cancellation and returns")?.paragraphs).toEqual([
      "The selected delivery method, displayed delivery information and charge are confirmed with the order. Eligible pre-shipment orders can record a cancellation request; a request does not itself delete the order, confirm cancellation or create a refund. See Shipping & Delivery and Returns & Refunds.",
    ]);
  });
});
