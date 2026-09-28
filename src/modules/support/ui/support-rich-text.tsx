import Link from "next/link";
import type { ReactNode } from "react";
import type { SupportProductReference } from "@/contracts/support";

type InlineToken = Readonly<
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "emphasis"; value: string }
  | { type: "link"; label: string; href: string }
>;

export type SupportRichTextBlock = Readonly<
  | { type: "paragraph"; lines: readonly (readonly InlineToken[])[] }
  | { type: "unordered-list"; items: readonly (readonly InlineToken[])[] }
  | { type: "ordered-list"; items: readonly (readonly InlineToken[])[] }
>;

const inlineMarkdown = /\[([^\]]+)\]\(([^\s)]+)\)|(\*\*|__)(.+?)\3|(\*|_)(.+?)\5/g;
const unorderedList = /^[-+*]\s+(.+)$/;
const orderedList = /^\d+\.\s+(.+)$/;

function inlineTokens(value: string, allowedHrefs: ReadonlySet<string>): readonly InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;
  for (const match of value.matchAll(inlineMarkdown)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ type: "text", value: value.slice(cursor, index) });
    const [source, linkLabel, href, strongMarker, strongValue, emphasisMarker, emphasisValue] = match;
    if (linkLabel && href) tokens.push(allowedHrefs.has(href) ? { type: "link", label: linkLabel, href } : { type: "text", value: linkLabel });
    else if (strongMarker && strongValue) tokens.push({ type: "strong", value: strongValue });
    else if (emphasisMarker && emphasisValue) tokens.push({ type: "emphasis", value: emphasisValue });
    else tokens.push({ type: "text", value: source });
    cursor = index + source.length;
  }
  if (cursor < value.length) tokens.push({ type: "text", value: value.slice(cursor) });
  return tokens;
}

/** Parses only the small support-response subset. Raw HTML is never interpreted. */
export function parseSupportRichText(value: string, products: readonly SupportProductReference[] = []): readonly SupportRichTextBlock[] {
  const allowedHrefs = new Set(products.map(product => product.href));
  const blocks: SupportRichTextBlock[] = [];
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  let index = 0;
  while (index < lines.length) {
    if (!lines[index]?.trim()) { index += 1; continue; }
    const unordered = lines[index]?.match(unorderedList);
    const ordered = lines[index]?.match(orderedList);
    if (unordered || ordered) {
      const listType = unordered ? "unordered-list" : "ordered-list";
      const matcher = unordered ? unorderedList : orderedList;
      const items: (readonly InlineToken[])[] = [];
      while (index < lines.length) {
        const item = lines[index]?.match(matcher);
        if (!item?.[1]) break;
        items.push(inlineTokens(item[1], allowedHrefs));
        index += 1;
      }
      blocks.push({ type: listType, items });
      continue;
    }
    const paragraph: (readonly InlineToken[])[] = [];
    while (index < lines.length && lines[index]?.trim() && !lines[index]?.match(unorderedList) && !lines[index]?.match(orderedList)) {
      paragraph.push(inlineTokens(lines[index] ?? "", allowedHrefs));
      index += 1;
    }
    blocks.push({ type: "paragraph", lines: paragraph });
  }
  return blocks;
}

function renderTokens(tokens: readonly InlineToken[]): ReactNode[] {
  return tokens.map((token, index) => {
    if (token.type === "strong") return <strong key={index} className="font-semibold">{token.value}</strong>;
    if (token.type === "emphasis") return <em key={index}>{token.value}</em>;
    if (token.type === "link") return <Link key={index} href={token.href} className="font-medium text-text underline decoration-border-strong underline-offset-4 transition-colors hover:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">{token.label}</Link>;
    return token.value;
  });
}

export function SupportRichText({ content, products = [] }: Readonly<{ content: string; products?: readonly SupportProductReference[] }>) {
  return <div className="space-y-2.5">{parseSupportRichText(content, products).map((block, index) => {
    if (block.type === "paragraph") return <p key={index}>{block.lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{renderTokens(line)}</span>)}</p>;
    const List = block.type === "unordered-list" ? "ul" : "ol";
    return <List key={index} className={block.type === "unordered-list" ? "list-disc space-y-1 pl-5 marker:text-text-muted" : "list-decimal space-y-1 pl-5 marker:text-text-muted"}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderTokens(item)}</li>)}</List>;
  })}</div>;
}

export function SupportProductLinks({ products }: Readonly<{ products: readonly SupportProductReference[] }>) {
  if (!products.length) return null;
  return <div className="mt-3 flex flex-wrap gap-2" aria-label="Recommended fragrances">
    {products.map(product => <Link key={product.id} href={product.href} className="inline-flex min-h-9 items-center rounded-sm border border-border px-2.5 text-xs font-medium text-text transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label={`View ${product.name}`}>
      <span>View {product.name}</span>{product.priceLabel && <span className="ml-2 border-l border-border pl-2 tabular-nums text-text-muted">{product.priceLabel}</span>}
    </Link>)}
  </div>;
}
