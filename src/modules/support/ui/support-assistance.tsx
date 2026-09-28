"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal, ThumbsDown, ThumbsUp } from "lucide-react";
import type { Session } from "@/contracts/auth";
import type { OrderSummary } from "@/contracts/orders";
import type { SupportIntent } from "@/contracts/support";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { appendPendingTurn, completeTurn, failTurn, markRetryPending, recentSupportHistory, type CompactChatMessage } from "./compact-chat-state";

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

function CompactSupportAssistance({ session, sessionLoading }: Readonly<{ session: Session | null; sessionLoading: boolean }>) {
  const customer = session?.user?.role === "CUSTOMER" ? session.user : null;
  const [intent, setIntent] = useState<SupportIntent>("PRODUCT");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [orders, setOrders] = useState<readonly OrderSummary[] | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<readonly CompactChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const nextMessageId = useRef(0);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const canUseOrderContext = customer !== null && supportsOrderContext(intent);

  useEffect(() => {
    let active = true;
    if (!canUseOrderContext) return () => { active = false; };
    void api.orders.list({ page: 1, pageSize: 20 }).then(result => {
      if (!active) return;
      if (result.ok) setOrders(result.data.items);
      else setOrdersError(result.error.message);
    });
    return () => { active = false; };
  }, [canUseOrderContext]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = "auto";
    composer.style.height = `${Math.min(composer.scrollHeight, 144)}px`;
  }, [message]);

  function changeIntent(nextIntent: SupportIntent): void {
    setIntent(nextIntent);
    setOrderId("");
    setOrders(null);
    setOrdersError(null);
  }

  async function ask(retry?: CompactChatMessage): Promise<void> {
    const question = retry?.content ?? message.trim();
    if (pending || !question) return;
    const requestId = retry?.id ?? `support-${nextMessageId.current++}`;
    const requestIntent = retry?.intent ?? intent;
    const requestOrderId = retry?.orderId ?? (canUseOrderContext && orderId ? orderId : undefined);
    setPending(true);
    if (retry) {
      setTranscript(items => markRetryPending(items, requestId));
    } else {
      setTranscript(items => appendPendingTurn(items, { requestId, question, intent: requestIntent, ...(requestOrderId ? { orderId: requestOrderId } : {}) }));
      setMessage("");
    }

    const result = await api.support.ask({
      intent: requestIntent,
      message: question,
      ...(requestOrderId ? { orderId: requestOrderId } : {}),
      history: recentSupportHistory(transcript),
    });
    setPending(false);
    setTranscript(items => result.ok
      ? completeTurn(items, requestId, result.data.conversationId, result.data.reply)
      : failTurn(items, requestId, result.error.message));
  }

  async function sendFeedback(chat: CompactChatMessage, rating: number): Promise<void> {
    if (!chat.conversationId || chat.feedback === "sending" || chat.feedback === "sent") return;
    setTranscript(items => items.map(item => item.id === chat.id ? { ...item, feedback: "sending" } : item));
    const result = await api.support.feedback({ conversationId: chat.conversationId, rating });
    setTranscript(items => items.map(item => item.id === chat.id ? { ...item, feedback: result.ok ? "sent" : "error" } : item));
  }

  return (
    <section aria-labelledby="compact-support-heading" className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border pb-3">
        <p id="compact-support-heading" className="text-xs leading-5 text-text-muted">AI-assisted information. The concierge cannot take payments, issue refunds, or change orders or delivery.</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <label htmlFor="compact-support-intent" className="sr-only">Support topic</label>
          <select id="compact-support-intent" value={intent} onChange={event => changeIntent(event.target.value as SupportIntent)} className="min-h-11 min-w-0 rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {intents.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <span className="shrink-0 text-xs text-text-muted">{sessionLoading ? "Checking account" : customer ? "Customer session" : "Public support"}</span>
        </div>
        {supportsOrderContext(intent) && !customer && <p role="status" className="mt-2 text-xs leading-5 text-text-muted">Sign in to include your own order or delivery context. Public support cannot access orders.</p>}
        {canUseOrderContext && <div className="mt-2">
          <label htmlFor="compact-support-order" className="block text-xs font-medium text-text">Related order (optional)</label>
          {orders === null && !ordersError && <div role="status" aria-label="Loading your orders" className="mt-1"><Skeleton className="h-11" /></div>}
          {ordersError && <p role="alert" className="mt-1 text-xs text-danger">Your orders are unavailable: {ordersError}</p>}
          {orders && <select id="compact-support-order" value={orderId} onChange={event => setOrderId(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="">No order context</option>{orders.map(order => <option key={order.id} value={order.id}>{order.orderNumber} · {order.status}</option>)}</select>}
        </div>}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto py-4" aria-live="polite" aria-label="Current conversation">
        {transcript.length === 0 ? <div className="py-3"><p className="max-w-[28rem] text-sm leading-6 text-text-muted">Ask about the public perfume catalogue, notes, or Palermo policy information.</p><div className="mt-4 flex flex-wrap gap-2">{["What perfumes do you sell?", "Which fragrances contain vanilla?", "Tell me about Saphire Chocolate."].map(prompt => <button key={prompt} type="button" onClick={() => setMessage(prompt)} className="min-h-11 rounded-full border border-border px-3 text-left text-xs text-text-muted transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{prompt}</button>)}</div></div> : <ol className="space-y-4">
          {transcript.map(chat => <li key={chat.id} className={chat.actor === "CUSTOMER" ? "ml-auto max-w-[85%] rounded-md rounded-br-sm bg-primary px-3 py-2 text-sm leading-6 text-primary-text sm:max-w-[78%]" : "max-w-[92%] border-l-2 border-accent px-3 text-sm leading-6 text-text sm:max-w-[86%]"}>
            <p className={`text-xs font-medium ${chat.actor === "CUSTOMER" ? "text-primary-text/75" : "text-text-muted"}`}>{chat.actor === "CUSTOMER" ? "You" : "Palermo concierge"}</p>
            {chat.state === "pending" ? <div role="status" aria-busy="true" className="mt-1 flex items-center gap-2 text-text-muted"><Skeleton className="h-3 w-12" /><span className="text-xs">Thinking</span></div> : <p className="mt-1 whitespace-pre-wrap break-words">{chat.content}</p>}
            {chat.state === "error" && <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => { void ask(chat); }}>Retry</Button>}
            {chat.actor === "ASSISTANT" && !chat.state && chat.conversationId && <div className="mt-2 flex items-center gap-1" aria-label="Rate this response">
              <span className="mr-1 text-xs text-text-muted">Helpful?</span>
              <Button type="button" size="icon" variant="ghost" className="h-10 min-h-10 w-10" disabled={chat.feedback === "sending" || chat.feedback === "sent"} onClick={() => { void sendFeedback(chat, 5); }} aria-label="This response was helpful" title="Helpful"><ThumbsUp className="h-4 w-4" aria-hidden="true" /></Button>
              <Button type="button" size="icon" variant="ghost" className="h-10 min-h-10 w-10" disabled={chat.feedback === "sending" || chat.feedback === "sent"} onClick={() => { void sendFeedback(chat, 1); }} aria-label="This response was not helpful" title="Not helpful"><ThumbsDown className="h-4 w-4" aria-hidden="true" /></Button>
              {chat.feedback === "sent" && <span role="status" className="text-xs text-text-muted">Thanks.</span>}
              {chat.feedback === "error" && <span role="alert" className="text-xs text-danger">Could not save feedback.</span>}
            </div>}
          </li>)}
        </ol>}
      </div>

      <form className="shrink-0 border-t border-border bg-surface pt-3" onSubmit={event => { event.preventDefault(); void ask(); }}>
        <label htmlFor="compact-support-message" className="sr-only">Message</label>
        <div className="relative"><textarea ref={composerRef} id="compact-support-message" value={message} maxLength={1000} rows={1} placeholder="Ask Palermo" onChange={event => setMessage(event.target.value)} onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void ask(); } }} className="block min-h-11 w-full resize-none rounded-md border border-border bg-surface py-2 pl-3 pr-14 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" /><Button type="submit" size="icon" className="!absolute bottom-0.5 right-0.5 h-10 min-h-10 w-10" isLoading={pending} disabled={!message.trim() || pending} aria-label="Send message"><SendHorizontal className="h-4 w-4" aria-hidden="true" /></Button></div>
        <p className="mt-1 text-xs text-text-muted">{message.length}/1000. Ctrl or Command + Enter sends.</p>
      </form>
    </section>
  );
}

function DetailedSupportAssistance({ session, sessionLoading = false }: Readonly<{ session: Session | null; sessionLoading?: boolean }>) {
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

export function SupportAssistance({ session, sessionLoading = false, compact = false }: Readonly<{ session: Session | null; sessionLoading?: boolean; compact?: boolean }>) {
  return compact
    ? <CompactSupportAssistance session={session} sessionLoading={sessionLoading} />
    : <DetailedSupportAssistance session={session} sessionLoading={sessionLoading} />;
}
