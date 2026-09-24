import type { ApiResult } from "../../contracts/common";
import { failure, success } from "../../lib/api/result";
import type { PrismaClient } from "../../lib/db/generated/client";

export type SupportIntent = "PRODUCT" | "POLICY" | "ORDER" | "DELIVERY" | "FEEDBACK";
export interface SupportProvider { respond(input: Readonly<{ intent: SupportIntent; context: Readonly<Record<string, unknown>>; message: string }>): Promise<string>; }
export type SupportToolName = "order.lookup";
export interface SupportTool { readonly name: SupportToolName; invoke(input: Readonly<{ customerId: string; orderId: string }>): Promise<Readonly<{ orderNumber: string; status: string; shipment: Readonly<{ status: string; trackingReference: string | null }> | null }> | null>; }
const id = /^[0-9a-f-]{10,64}$/i;
const allowed: readonly SupportIntent[] = ["PRODUCT", "POLICY", "ORDER", "DELIVERY", "FEEDBACK"];
const allowedTools: readonly SupportToolName[] = ["order.lookup"];

export class OrderLookupSupportTool implements SupportTool {
  readonly name = "order.lookup" as const;
  constructor(private readonly db: PrismaClient) {}
  async invoke(input: Readonly<{ customerId: string; orderId: string }>) {
    return this.db.order.findFirst({ where: { id: input.orderId, customerId: input.customerId }, select: { orderNumber: true, status: true, shipment: { select: { status: true, trackingReference: true } } } });
  }
}

function within<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_resolve, reject) => setTimeout(() => reject(new Error("support provider timeout")), timeoutMs))]);
}

export class SupportService {
  private readonly tools: ReadonlyMap<SupportToolName, SupportTool>;
  constructor(private readonly db: PrismaClient, private readonly provider: SupportProvider, private readonly now: () => Date = () => new Date(), private readonly timeoutMs = 5_000, tools: readonly SupportTool[] = [new OrderLookupSupportTool(db)]) {
    this.tools = new Map(tools.map(tool => [tool.name, tool]));
  }
  async ask(input: Readonly<{ customerId?: string; intent: SupportIntent; message: string; orderId?: string; tool?: string }>): Promise<ApiResult<{ reply: string }>> {
    if (!allowed.includes(input.intent) || !input.message.trim() || input.message.length > 1000 || (input.customerId && !id.test(input.customerId)) || (input.orderId && !id.test(input.orderId))) return failure("VALIDATION_ERROR");
    if (input.tool && !allowedTools.includes(input.tool as SupportToolName)) return failure("FORBIDDEN");
    const context: Record<string, unknown> = {};
    if (input.intent === "POLICY") context.policy = "Approved policy information is available through Palermo support.";
    if (input.orderId) {
      if (!input.customerId || !["ORDER", "DELIVERY"].includes(input.intent)) return failure("FORBIDDEN");
      const tool = this.tools.get("order.lookup");
      if (!tool) return failure("TEMPORARILY_UNAVAILABLE");
      const order = await tool.invoke({ customerId: input.customerId, orderId: input.orderId });
      if (!order) return failure("FORBIDDEN");
      context.order = order;
    }
    const conversation = await this.db.supportConversation.create({ data: { customerId: input.customerId ?? null, expiresAt: new Date(this.now().getTime() + 30 * 24 * 60 * 60 * 1000) } });
    await this.db.supportMessage.create({ data: { conversationId: conversation.id, actor: "CUSTOMER", intent: input.intent, content: input.message.trim() } });
    try {
      const reply: unknown = await within(this.provider.respond({ intent: input.intent, context, message: input.message.trim() }), this.timeoutMs);
      if (typeof reply !== "string" || !reply.trim() || reply.length > 4000) throw new Error("invalid provider output");
      await this.db.supportMessage.create({ data: { conversationId: conversation.id, actor: "ASSISTANT", intent: input.intent, content: reply.trim() } });
      return success({ reply: reply.trim() });
    } catch { return failure("TEMPORARILY_UNAVAILABLE"); }
  }
  async feedback(customerId: string | undefined, conversationId: string, rating: number, comment?: string): Promise<ApiResult<null>> {
    if (!id.test(conversationId) || !Number.isInteger(rating) || rating < 1 || rating > 5 || (comment?.length ?? 0) > 1000 || (customerId && !id.test(customerId))) return failure("VALIDATION_ERROR");
    const conversation = await this.db.supportConversation.findFirst({ where: { id: conversationId, customerId: customerId ?? null }, select: { id: true } });
    if (!conversation) return failure("FORBIDDEN");
    await this.db.supportFeedback.create({ data: { conversationId, customerId: customerId ?? null, rating, comment: comment?.trim() || null } });
    return success(null);
  }
}
