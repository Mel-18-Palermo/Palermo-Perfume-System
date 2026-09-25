"use client";

import { useEffect, useState } from "react";
import type { Session } from "@/contracts/auth";
import type { OrderSummary } from "@/contracts/orders";
import type { SupportIntent } from "@/contracts/support";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

const intents: readonly Readonly<{ value: SupportIntent; label: string; hint: string }>[] = [
  { value: "PRODUCT", label: "Product guidance", hint: "Notes, concentration and suitability" },
  { value: "POLICY", label: "Policy information", hint: "Approved support and returns information" },
  { value: "ORDER", label: "Order help", hint: "Your own order status only" },
  { value: "DELIVERY", label: "Delivery help", hint: "Your own delivery status only" },
  { value: "FEEDBACK", label: "Feedback", hint: "Share a store or service concern" },
];

type Reply = Readonly<{ conversationId: string; question: string; reply: string }>;

function supportsOrderContext(intent: SupportIntent): boolean {
  return intent === "ORDER" || intent === "DELIVERY";
}

export function SupportAssistance({ session, sessionLoading = false }: Readonly<{ session: Session | null; sessionLoading?: boolean }>) {
  const customer = session?.user?.role === "CUSTOMER" ? session.user : null;
  const [intent, setIntent] = useState<SupportIntent>("PRODUCT");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [orders, setOrders] = useState<readonly OrderSummary[] | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<Reply | null>(null);
  const [feedback, setFeedback] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const canUseOrderContext = customer !== null && supportsOrderContext(intent);

  useEffect(() => {
    let active = true;
    if (!canUseOrderContext) {
      return () => { active = false; };
    }

    async function loadOrders() {
      const result = await api.orders.list({ page: 1, pageSize: 20 });
      if (!active) return;
      if (result.ok) {
        setOrders(result.data.items);
      } else {
        setOrdersError(result.error.message);
      }
    }

    void loadOrders();
    return () => { active = false; };
  }, [canUseOrderContext]);

  async function ask(): Promise<void> {
    if (pending || !message.trim()) return;
    setPending(true);
    setError(null);
    setFeedback("idle");
    const result = await api.support.ask({
      intent,
      message: message.trim(),
      ...(canUseOrderContext && orderId ? { orderId } : {}),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setReply({ conversationId: result.data.conversationId, question: message.trim(), reply: result.data.reply });
    setMessage("");
  }

  async function sendFeedback(rating: number): Promise<void> {
    if (!reply || feedback === "sending") return;
    setFeedback("sending");
    const result = await api.support.feedback({ conversationId: reply.conversationId, rating });
    setFeedback(result.ok ? "sent" : "error");
  }

  return (
    <section aria-labelledby="support-heading" className="mx-auto max-w-[var(--container-page)] space-y-6">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Palermo support</p>
        <h1 id="support-heading" className="mt-3 text-h1 tracking-tight text-text">Ask the fragrance concierge</h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">Get product, policy, order, delivery or service guidance from Palermo’s AI-assisted support experience.</p>
      </header>

      <aside className="rounded-lg border border-border bg-surface-muted p-5" aria-labelledby="support-disclosure-heading">
        <h2 id="support-disclosure-heading" className="font-semibold">AI assistance, with clear limits</h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">The concierge can provide information only. It cannot issue refunds, take payments, change orders, or make delivery changes. Order and delivery context is available only to signed-in customers and is checked on the server.</p>
      </aside>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-h2 tracking-tight text-text">Start a conversation</h2>
              <p className="mt-1 text-sm text-text-muted">{sessionLoading ? "Checking your account…" : customer ? `Signed in as ${customer.displayName}.` : "You can ask a public support question without signing in."}</p>
            </div>
            <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium">{sessionLoading ? "Checking session" : customer ? "Customer session" : "Public support"}</span>
          </div>

          <form className="mt-6 space-y-5" onSubmit={event => { event.preventDefault(); void ask(); }}>
            <fieldset>
              <legend className="text-sm font-medium">What do you need help with?</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {intents.map(item => (
                  <label key={item.value} className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${intent === item.value ? "border-primary bg-surface-muted" : "border-border"}`}>
                    <input type="radio" name="support-intent" value={item.value} checked={intent === item.value} onChange={() => { setIntent(item.value); setOrderId(""); setOrders(null); setOrdersError(null); }} className="mt-1" />
                    <span><span className="block font-medium">{item.label}</span><span className="mt-1 block text-xs text-text-muted">{item.hint}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>

            {supportsOrderContext(intent) && !customer && <p role="status" className="rounded-md border border-border bg-surface-muted p-3 text-sm text-text-muted">Sign in to include your own order or delivery context. Public support does not access orders.</p>}

            {canUseOrderContext && (
              <div>
                <label htmlFor="support-order" className="block text-sm font-medium">Related order (optional)</label>
                <p className="mt-1 text-xs text-text-muted">Only orders belonging to your signed-in account are offered to the support service.</p>
                {orders === null && !ordersError && <div role="status" aria-label="Loading your orders" className="mt-3"><Skeleton className="h-11" /></div>}
                {ordersError && <p role="alert" className="mt-3 text-sm text-danger">Your orders are unavailable: {ordersError}</p>}
                {orders && <select id="support-order" value={orderId} onChange={event => setOrderId(event.target.value)} className="mt-3 min-h-11 w-full rounded-md border border-border bg-surface px-3"><option value="">No order context</option>{orders.map(order => <option key={order.id} value={order.id}>{order.orderNumber} · {order.status}</option>)}</select>}
              </div>
            )}

            <div>
              <label htmlFor="support-message" className="block text-sm font-medium">Your message</label>
              <textarea id="support-message" required maxLength={1000} value={message} onChange={event => setMessage(event.target.value)} rows={6} placeholder="Tell us what you would like help with." className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-3 leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
              <p className="mt-1 text-right text-xs text-text-muted">{message.length}/1000</p>
            </div>
            <Button type="submit" isLoading={pending} disabled={!message.trim() || pending}>Ask the concierge</Button>
          </form>

          {pending && <div role="status" aria-busy="true" className="mt-6 space-y-3"><span className="sr-only">Waiting for the concierge response…</span><Skeleton className="h-16" /></div>}
          {error && <div className="mt-6"><ErrorState title="The concierge could not respond" message={error} onRetry={() => { void ask(); }} /></div>}

          {reply && <section className="mt-6 space-y-4 border-t border-border pt-6" aria-labelledby="support-response-heading">
            <h2 id="support-response-heading" className="text-h3 font-semibold">Conversation</h2>
            <div className="rounded-lg border border-border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-muted">You</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{reply.question}</p></div>
            <div className="rounded-lg bg-surface-muted p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Palermo concierge</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{reply.reply}</p></div>
            <div className="flex flex-wrap items-center gap-3" aria-label="Rate this response">
              <p className="text-sm font-medium">Was this response helpful?</p>
              <Button type="button" size="sm" variant="outline" disabled={feedback === "sending" || feedback === "sent"} onClick={() => { void sendFeedback(5); }}>Yes</Button>
              <Button type="button" size="sm" variant="outline" disabled={feedback === "sending" || feedback === "sent"} onClick={() => { void sendFeedback(1); }}>No</Button>
              {feedback === "sent" && <p role="status" className="text-sm text-text-muted">Thank you for your feedback.</p>}
              {feedback === "error" && <p role="alert" className="text-sm text-danger">Feedback could not be saved. Please try again later.</p>}
            </div>
          </section>}
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="text-h3 font-semibold">Supported topics</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-text-muted">
              <li>Fragrance notes, intensity and product guidance</li>
              <li>Approved policy information</li>
              <li>Your own order and delivery status</li>
              <li>Store and service feedback</li>
            </ul>
          </Card>
          {!customer && <Card className="p-5"><h2 className="text-h3 font-semibold">Need order help?</h2><p className="mt-2 text-sm leading-6 text-text-muted">Sign in to let support use your own order or delivery context. We never ask public visitors for an order identifier here.</p></Card>}
        </aside>
      </div>
    </section>
  );
}
