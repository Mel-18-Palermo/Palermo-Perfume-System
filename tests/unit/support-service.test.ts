import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { PrismaClient } from "../../src/lib/db/generated/client";
import {
  SupportService,
  type SupportProvider,
  type SupportTool,
  supportIntents,
  supportToolAllowlist,
} from "../../src/modules/support/service";

const customer = "27300000-0000-4000-8000-000000000001";
const otherCustomer = "27300000-0000-4000-8000-000000000002";
const ownOrder = "27300000-0000-4000-8000-000000000003";
const otherOrder = "27300000-0000-4000-8000-000000000004";
const conversationId = "27300000-0000-4000-8000-000000000005";

function database(conversationOwner: string | null = customer) {
  return {
    supportConversation: {
      create: vi.fn(async () => ({ id: conversationId })),
      findFirst: vi.fn(async ({ where }: { where: { customerId: string | null } }) =>
        where.customerId === conversationOwner ? { id: conversationId } : null),
    },
    supportMessage: { create: vi.fn(async () => ({ id: "message" })) },
    supportFeedback: { create: vi.fn(async () => ({ id: "feedback" })) },
  } as unknown as PrismaClient;
}

const provider = (respond: SupportProvider["respond"] = async () => "Safe support reply"): SupportProvider => ({ respond });
const fixedNow = () => new Date("2026-09-24T00:00:00.000Z");

describe("bounded support assistance", () => {
  it("keeps public policy help generic and rejects public order access", async () => {
    let context: Readonly<Record<string, unknown>> | undefined;
    const db = database();
    const service = new SupportService(db, provider(async input => { context = input.context; return "Policy answer"; }), fixedNow);

    await expect(service.ask({ intent: "POLICY", message: "What is your returns policy?" })).resolves.toEqual({ ok: true, data: { conversationId, reply: "Policy answer" } });
    expect(context).toEqual({ policy: "Approved policy information is available through Palermo support." });
    await expect(service.ask({ intent: "ORDER", message: "Show order", orderId: ownOrder })).resolves.toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("returns only an authenticated customer's owned order and does not disclose another customer's order", async () => {
    const lookup: SupportTool = {
      name: "order.lookup",
      invoke: vi.fn(async (input: { customerId: string; orderId: string }) => input.customerId === customer && input.orderId === ownOrder
        ? { orderNumber: "PAL-273", status: "SHIPPED", shipment: { status: "IN_TRANSIT", trackingReference: "TRACK-273" } }
        : null),
    };
    let context: Readonly<Record<string, unknown>> | undefined;
    const service = new SupportService(database(), provider(async input => { context = input.context; return "Order answer"; }), fixedNow, 100, [lookup]);

    await expect(service.ask({ customerId: customer, intent: "ORDER", message: "Where is it?", orderId: ownOrder })).resolves.toEqual({ ok: true, data: { conversationId, reply: "Order answer" } });
    expect(context).toMatchObject({ order: { orderNumber: "PAL-273", status: "SHIPPED" } });
    await expect(service.ask({ customerId: customer, intent: "ORDER", message: "Show theirs", orderId: otherOrder })).resolves.toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(lookup.invoke).toHaveBeenLastCalledWith({ customerId: customer, orderId: otherOrder });
  });

  it("enforces the explicit tool allowlist and exposes no commerce action tools", async () => {
    const service = new SupportService(database(), provider(), fixedNow);
    expect(supportIntents).toEqual(["PRODUCT", "POLICY", "ORDER", "DELIVERY", "FEEDBACK"]);
    expect(supportToolAllowlist).toEqual(["order.lookup"]);
    expect(supportToolAllowlist).not.toContain("payment.refund" as never);
    expect(supportToolAllowlist).not.toContain("order.cancel" as never);
    expect(supportToolAllowlist).not.toContain("inventory.mutate" as never);
    await expect(service.ask({ customerId: customer, intent: "ORDER", message: "Cancel it", orderId: ownOrder, tool: "order.cancel" })).resolves.toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("keeps the support intent inventory limited to the approved five values", () => {
    expect(supportIntents).toEqual(["PRODUCT", "POLICY", "ORDER", "DELIVERY", "FEEDBACK"]);
    const schema = readFileSync(new URL("../../prisma/schema.prisma", import.meta.url), "utf8");
    expect(schema).toMatch(/enum SupportIntent \{\s+PRODUCT\s+POLICY\s+ORDER\s+DELIVERY\s+FEEDBACK\s+\}/);
    const migration = readFileSync(new URL("../../prisma/migrations/202609240004_support_assistance/migration.sql", import.meta.url), "utf8");
    expect(migration).toContain("CREATE TYPE \"SupportIntent\" AS ENUM ('PRODUCT', 'POLICY', 'ORDER', 'DELIVERY', 'FEEDBACK')");
  });

  it("handles an order lookup failure without leaking its error", async () => {
    const lookup: SupportTool = {
      name: "order.lookup",
      invoke: vi.fn(async () => { throw new Error("order lookup secret detail"); }),
    };

    const result = await new SupportService(database(), provider(), fixedNow, 100, [lookup]).ask({ customerId: customer, intent: "ORDER", message: "Where is it?", orderId: ownOrder });

    expect(result).toEqual({ ok: false, error: { code: "TEMPORARILY_UNAVAILABLE", message: "This service is temporarily unavailable. Try again later." } });
    expect(JSON.stringify(result)).not.toContain("order lookup secret detail");
  });

  it.each([
    ["provider exception", async () => { throw new Error("provider secret detail"); }],
    ["malformed provider output", async () => ({ unexpected: true }) as unknown as string],
  ])("handles %s with a safe application failure", async (_name, respond) => {
    const result = await new SupportService(database(), provider(respond), fixedNow, 100).ask({ intent: "PRODUCT", message: "Need help" });
    expect(result).toEqual({ ok: false, error: { code: "TEMPORARILY_UNAVAILABLE", message: "This service is temporarily unavailable. Try again later." } });
    expect(JSON.stringify(result)).not.toContain("provider secret detail");
  });

  it("handles provider timeout safely", async () => {
    const result = await new SupportService(database(), provider(() => new Promise(() => undefined)), fixedNow, 5).ask({ intent: "PRODUCT", message: "Need help" });
    expect(result).toMatchObject({ ok: false, error: { code: "TEMPORARILY_UNAVAILABLE" } });
  });

  it("captures feedback only for the matching authenticated conversation owner", async () => {
    const db = database(customer);
    const service = new SupportService(db, provider(), fixedNow);
    await expect(service.feedback(customer, conversationId, 5, "Useful")).resolves.toEqual({ ok: true, data: null });
    await expect(service.feedback(otherCustomer, conversationId, 5)).resolves.toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    await expect(service.feedback(undefined, conversationId, 5)).resolves.toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(db.supportFeedback.create).toHaveBeenCalledWith({ data: { conversationId, rating: 5, comment: "Useful" } });
  });

  it("accepts anonymous feedback only for an anonymous conversation", async () => {
    const anonymousDb = database(null);
    const service = new SupportService(anonymousDb, provider(), fixedNow);

    await expect(service.feedback(undefined, conversationId, 4, "Helpful")).resolves.toEqual({ ok: true, data: null });
    await expect(service.feedback(customer, conversationId, 4)).resolves.toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(anonymousDb.supportFeedback.create).toHaveBeenCalledWith({ data: { conversationId, rating: 4, comment: "Helpful" } });
  });

  it("persists deterministic thirty-day expiry metadata without logging request content", async () => {
    const db = database();
    const service = new SupportService(db, provider(), fixedNow);
    await service.ask({ customerId: customer, intent: "PRODUCT", message: "  private message  " });
    expect(db.supportConversation.create).toHaveBeenCalledWith({ data: { customerId: customer, expiresAt: new Date("2026-10-24T00:00:00.000Z") } });
    expect(db.supportMessage.create).toHaveBeenCalledWith({ data: { conversationId, actor: "CUSTOMER", intent: "PRODUCT", content: "private message" } });
    const source = readFileSync(new URL("../../src/modules/support/service.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/console\.(?:log|info|warn|error)|logger\./);
  });
});
