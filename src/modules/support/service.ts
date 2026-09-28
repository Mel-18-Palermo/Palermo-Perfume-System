import type { ApiResult } from "../../contracts/common";
import type { SupportHistoryMessage } from "../../contracts/support";
import { publishedPolicyContext } from "../../content/published-policy";
import { failure, success } from "../../lib/api/result";
import type { PrismaClient } from "../../lib/db/generated/client";

export type SupportIntent = "PRODUCT" | "POLICY" | "ORDER" | "DELIVERY" | "FEEDBACK";
export interface SupportProvider { respond(input: Readonly<{ intent: SupportIntent; context: Readonly<Record<string, unknown>>; history: readonly SupportHistoryMessage[]; message: string }>): Promise<string>; }
export type SupportToolName = "order.lookup";
export interface SupportTool { readonly name: SupportToolName; invoke(input: Readonly<{ customerId: string; orderId: string }>): Promise<Readonly<{ orderNumber: string; status: string; shipment: Readonly<{ status: string; trackingReference: string | null }> | null }> | null>; }

const id = /^[0-9a-f-]{10,64}$/i;
export const supportIntents: readonly SupportIntent[] = ["PRODUCT", "POLICY", "ORDER", "DELIVERY", "FEEDBACK"];
export const supportToolAllowlist: readonly SupportToolName[] = ["order.lookup"];
const PRODUCT_CONTEXT_LIMIT = 100;
const SUPPORT_HISTORY_LIMIT = 8;
const SUPPORT_HISTORY_MESSAGE_LIMIT = 1_000;
type PublicVariantAvailability = "AVAILABLE" | "OUT_OF_STOCK";

function isPublicVariantAvailability(value: string): value is PublicVariantAvailability {
  return value === "AVAILABLE" || value === "OUT_OF_STOCK";
}

function supportHistory(value: unknown): readonly SupportHistoryMessage[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > SUPPORT_HISTORY_LIMIT) return null;
  const history: SupportHistoryMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const actor = (item as Record<string, unknown>)["actor"];
    const content = (item as Record<string, unknown>)["content"];
    if ((actor !== "CUSTOMER" && actor !== "ASSISTANT") || typeof content !== "string") return null;
    const normalized = content.trim();
    if (!normalized || normalized.length > SUPPORT_HISTORY_MESSAGE_LIMIT) return null;
    history.push({ actor, content: normalized });
  }
  return history;
}

export class OrderLookupSupportTool implements SupportTool {
  readonly name = "order.lookup" as const;
  constructor(private readonly db: PrismaClient) {}
  async invoke(input: Readonly<{ customerId: string; orderId: string }>) {
    return this.db.order.findFirst({ where: { id: input.orderId, customerId: input.customerId }, select: { orderNumber: true, status: true, shipment: { select: { status: true, trackingReference: true } } } });
  }
}

function within<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("support provider timeout")), timeoutMs);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

export class SupportService {
  private readonly tools: ReadonlyMap<SupportToolName, SupportTool>;
  constructor(private readonly db: PrismaClient, private readonly provider: SupportProvider, private readonly now: () => Date = () => new Date(), private readonly timeoutMs = 5_000, tools: readonly SupportTool[] = [new OrderLookupSupportTool(db)]) {
    this.tools = new Map(tools.map(tool => [tool.name, tool]));
  }

  private async productContext(): Promise<Readonly<{ catalogueScope: string; products: readonly Readonly<{ name: string; slug: string; description: string; family: string; intensity: string | null; audiences: readonly string[]; notes: readonly Readonly<{ layer: string; name: string }>[]; variants: readonly Readonly<{ bottleSize: string; concentration: string; price: Readonly<{ amountMinor: number; currency: string }>; availability: "AVAILABLE" | "OUT_OF_STOCK" }>[] }>[]}>> {
    const products = await this.db.perfume.findMany({
      where: {
        status: "ACTIVE",
        primaryFamily: { active: true },
        variants: { some: { availability: { in: ["AVAILABLE", "OUT_OF_STOCK"] } } },
      },
      select: {
        name: true,
        slug: true,
        description: true,
        primaryFamily: { select: { name: true } },
        intensity: { select: { name: true } },
        notes: { where: { note: { active: true } }, select: { layer: true, note: { select: { name: true } } }, orderBy: [{ layer: "asc" }, { note: { name: "asc" } }] },
        collections: { where: { collection: { active: true } }, select: { collection: { select: { name: true } } }, orderBy: { collection: { name: "asc" } } },
        variants: { where: { availability: { in: ["AVAILABLE", "OUT_OF_STOCK"] } }, select: { bottleSize: true, concentration: true, priceMinor: true, currency: true, availability: true }, orderBy: [{ priceMinor: "asc" }, { bottleSize: "asc" }, { concentration: "asc" }] },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: PRODUCT_CONTEXT_LIMIT,
    });
    return {
      catalogueScope: "This is the complete bounded list of Palermo's currently public perfume catalogue. Palermo does not sell items outside this list.",
      products: products.map(product => ({
        name: product.name,
        slug: product.slug,
        description: product.description,
        family: product.primaryFamily.name,
        intensity: product.intensity?.name ?? null,
        audiences: product.collections.map(({ collection }) => collection.name),
        notes: product.notes.map(({ layer, note }) => ({ layer, name: note.name })),
        variants: product.variants.flatMap(variant => !isPublicVariantAvailability(variant.availability) ? [] : [{
          bottleSize: variant.bottleSize,
          concentration: variant.concentration,
          price: { amountMinor: variant.priceMinor, currency: variant.currency },
          availability: variant.availability,
        }]),
      })),
    };
  }

  async ask(input: Readonly<{ customerId?: string; history?: unknown; intent: SupportIntent; message: string; orderId?: string; tool?: string }>): Promise<ApiResult<{ conversationId: string; reply: string }>> {
    const history = supportHistory(input.history);
    if (!history || !supportIntents.includes(input.intent) || !input.message.trim() || input.message.length > 1_000 || (input.customerId && !id.test(input.customerId)) || (input.orderId && !id.test(input.orderId))) return failure("VALIDATION_ERROR");
    if (input.tool && !supportToolAllowlist.includes(input.tool as SupportToolName)) return failure("FORBIDDEN");
    const context: Record<string, unknown> = {};
    try {
      if (input.intent === "PRODUCT") context.product = await this.productContext();
    } catch {
      return failure("TEMPORARILY_UNAVAILABLE");
    }
    if (input.intent === "POLICY") context.policy = publishedPolicyContext();
    if (input.orderId) {
      if (!input.customerId || !["ORDER", "DELIVERY"].includes(input.intent)) return failure("FORBIDDEN");
      const tool = this.tools.get("order.lookup");
      if (!tool) return failure("TEMPORARILY_UNAVAILABLE");
      let order: Awaited<ReturnType<SupportTool["invoke"]>>;
      try {
        order = await tool.invoke({ customerId: input.customerId, orderId: input.orderId });
      } catch {
        return failure("TEMPORARILY_UNAVAILABLE");
      }
      if (!order) return failure("FORBIDDEN");
      context.order = order;
    }
    const conversation = await this.db.supportConversation.create({ data: { customerId: input.customerId ?? null, expiresAt: new Date(this.now().getTime() + 30 * 24 * 60 * 60 * 1_000) } });
    await this.db.supportMessage.create({ data: { conversationId: conversation.id, actor: "CUSTOMER", intent: input.intent, content: input.message.trim() } });
    try {
      const reply: unknown = await within(this.provider.respond({ intent: input.intent, context, history, message: input.message.trim() }), this.timeoutMs);
      if (typeof reply !== "string" || !reply.trim() || reply.length > 4_000) throw new Error("invalid provider output");
      await this.db.supportMessage.create({ data: { conversationId: conversation.id, actor: "ASSISTANT", intent: input.intent, content: reply.trim() } });
      return success({
        conversationId: conversation.id,
        reply: reply.trim(),
      });
    } catch { return failure("TEMPORARILY_UNAVAILABLE"); }
  }
  async feedback(customerId: string | undefined, conversationId: string, rating: number, comment?: string): Promise<ApiResult<null>> {
    if (!id.test(conversationId) || !Number.isInteger(rating) || rating < 1 || rating > 5 || (comment?.length ?? 0) > 1_000 || (customerId && !id.test(customerId))) return failure("VALIDATION_ERROR");
    const conversation = await this.db.supportConversation.findFirst({ where: { id: conversationId, customerId: customerId ?? null }, select: { id: true } });
    if (!conversation) return failure("FORBIDDEN");
    await this.db.supportFeedback.create({ data: { conversationId, rating, comment: comment?.trim() || null } });
    return success(null);
  }
}
