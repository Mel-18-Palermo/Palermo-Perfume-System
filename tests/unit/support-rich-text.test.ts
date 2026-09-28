import { describe, expect, it } from "vitest";
import { parseSupportRichText } from "../../src/modules/support/ui/support-rich-text";

const candy = { id: "product-candy", slug: "candy", name: "Candy", href: "/product/product-candy", priceLabel: "AUD $35.00" };

describe("support rich text", () => {
  it("parses the limited assistant Markdown subset without exposing emphasis markers", () => {
    expect(parseSupportRichText("**Candy** is _fruity_.\n\n- Bright\n- Playful", [candy])).toEqual([
      { type: "paragraph", lines: [[{ type: "strong", value: "Candy" }, { type: "text", value: " is " }, { type: "emphasis", value: "fruity" }, { type: "text", value: "." }]] },
      { type: "unordered-list", items: [[{ type: "text", value: "Bright" }], [{ type: "text", value: "Playful" }]] },
    ]);
  });

  it("only treats server-verified Palermo product hrefs as links", () => {
    const blocks = parseSupportRichText("[View Candy](/product/product-candy) and [external](https://example.test).", [candy]);
    expect(blocks).toEqual([{ type: "paragraph", lines: [[
      { type: "link", label: "View Candy", href: "/product/product-candy" },
      { type: "text", value: " and " },
      { type: "text", value: "external" },
      { type: "text", value: "." },
    ]] }]);
  });
});
