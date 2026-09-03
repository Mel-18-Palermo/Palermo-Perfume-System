"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
  feedback?: "helpful" | "unhelpful" | null;
}

const BOUNDED_INTENT_HINTS = [
  "What is your order dispatch timeframe?",
  "Tell me about the formulation of Sicilian Bergamot",
  "What is Palermo's exchange policy?",
  "How should I store Extrait de Parfum?",
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg_sys_0",
    sender: "system",
    text: "Palermo AI Concierge. This automated assistant offers general guidance on formulations, house policies, and order timelines. The AI concierge cannot process payments, execute refunds, or alter active orders.",
    timestamp: "10:00 AM",
  },
  {
    id: "msg_init_1",
    sender: "assistant",
    text: "Welcome to Palermo Parfums Customer Care. How may I assist with your fragrance selection, formulation notes, or boutique inquiries today?",
    timestamp: "10:00 AM",
  },
];

export function SupportChatView() {
  const [isSignedIn, setIsSignedIn] = React.useState<boolean>(true);
  const [messages, setMessages] = React.useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [errorState, setErrorState] = React.useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const generateMockResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes("dispatch") || q.includes("shipping") || q.includes("delivery")) {
      return "All bespoke orders are hand-bottled and dispatched via insured courier within 1-2 business days from Melbourne. Standard transit requires 3-5 business days nationally, with complimentary express shipping on orders over $300 AUD.";
    }

    if (q.includes("refund") || q.includes("return") || q.includes("cancel") || q.includes("exchange")) {
      return "Unopened flacons in original presentation packaging with safety seals intact are eligible for complimentary exchange or return within 14 calendar days. Please note: as an AI concierge, I cannot modify orders or trigger refunds directly. To request return authorization, please lodge a ticket with our human concierge desk at support@palermoperfumes.com.";
    }

    if (q.includes("bergamot") || q.includes("formulation") || q.includes("sicilian")) {
      return "Sicilian Bergamot is blended at Extrait de Parfum concentration (30% pure fragrance oil). It features early-harvest Calabrian bergamot zest, Mediterranean marine sea salt, and a soft base of white musk and coastal driftwood.";
    }

    if (q.includes("store") || q.includes("storage") || q.includes("shelf")) {
      return "To preserve complex natural aromatics, store your flacon upright away from direct UV sunlight and humidity fluctuations. Stored below 22°C, an Extrait de Parfum maintains formulation integrity for up to 36 months.";
    }

    return "Thank you for inquiring. Our team of certified perfumers crafts each extract using traditional French-Italian maceration standards. For bespoke requests or account adjustments, please reach out directly to customer support.";
  };

  const handleSendMessage = async (textToSend: string, isRetry: boolean = false) => {
    const cleanText = textToSend.trim();
    if (!cleanText || isLoading) return;

    setErrorState(null);
    setLastFailedMessage(null);

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (!isRetry) {
      const userMsg: ChatMessage = {
        id: `usr_${Date.now()}`,
        sender: "user",
        text: cleanText,
        timestamp: now,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputText("");
    }

    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const reply: ChatMessage = {
        id: `asst_${Date.now()}`,
        sender: "assistant",
        text: generateMockResponse(cleanText),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        feedback: null,
      };

      setMessages((prev) => [...prev, reply]);
    } catch {
      setErrorState("Concierge service connection lost. Your message was not transmitted.");
      setLastFailedMessage(cleanText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateError = () => {
    setErrorState("Concierge gateway timeout. Unable to reach customer assistance service.");
    setLastFailedMessage("How do I speak with a representative?");
  };

  const handleFeedback = (messageId: string, rating: "helpful" | "unhelpful") => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, feedback: rating } : msg))
    );
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="neutral" className="text-xs">Palermo Concierge</Badge>
            <Badge variant={isSignedIn ? "accent" : "neutral"} className="text-xs">
              {isSignedIn ? "Signed-In Customer" : "Guest / Public Session"}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Customer Support & AI Assistance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Get instant guidance on formulations, order status inquiries, and house policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSignedIn((prev) => !prev)}
            aria-label="Toggle user session state"
          >
            Switch to {isSignedIn ? "Guest Mode" : "Signed-In"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSimulateError}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Simulate Error
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-3.5 text-xs text-foreground flex items-start gap-2">
        <span className="font-semibold uppercase tracking-wider text-accent shrink-0">Notice:</span>
        <p className="text-muted-foreground leading-relaxed">
          You are chatting with an <strong className="text-foreground">Automated AI Concierge</strong> trained on Palermo fragrance specifications and customer service knowledge bases. The AI cannot initiate refunds, authorize returns, or access financial data.
        </p>
      </div>

      {errorState && (
        <Alert variant="danger" className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-sm">Connection Interrupted</p>
            <p className="text-xs">{errorState}</p>
          </div>
          {lastFailedMessage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSendMessage(lastFailedMessage, true)}
              className="shrink-0 text-xs border-destructive/30 hover:bg-destructive/10"
            >
              Retry Transmission
            </Button>
          )}
        </Alert>
      )}

      <Card className="mt-6 flex flex-col h-[520px]">
        <CardHeader className="py-3 border-b border-border bg-surface-muted/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Concierge Channel
            </CardTitle>
            <span className="text-[11px] text-muted-foreground">
              {isSignedIn ? "Authenticated ID: CUST-84920" : "Session: Guest Visitor"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            if (msg.sender === "system") {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className="inline-block rounded-md bg-surface-muted px-3 py-1 text-[11px] text-muted-foreground border border-border">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isUser = msg.sender === "user";

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[11px] font-medium text-foreground">
                    {isUser ? (isSignedIn ? "You (Neil Legaspi)" : "You (Guest)") : "Palermo Concierge"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
                    isUser
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface-muted border border-border text-foreground"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>

                {!isUser && msg.id !== "msg_init_1" && (
                  <div className="flex items-center gap-2 mt-1 px-1 text-[11px] text-muted-foreground">
                    <span>Was this response helpful?</span>
                    {msg.feedback ? (
                      <span className="font-semibold text-accent capitalize">
                        ✓ Marked as {msg.feedback}
                      </span>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg.id, "helpful")}
                          className="px-1.5 py-0.5 rounded hover:bg-surface-muted text-foreground transition-colors"
                          aria-label="Mark helpful"
                        >
                          👍 Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg.id, "unhelpful")}
                          className="px-1.5 py-0.5 rounded hover:bg-surface-muted text-foreground transition-colors"
                          aria-label="Mark unhelpful"
                        >
                          👎 No
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start flex-col">
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[11px] font-medium text-foreground">Palermo Concierge</span>
                <span className="text-[10px] text-muted-foreground">Writing...</span>
              </div>
              <div className="rounded-lg p-3 bg-surface-muted border border-border text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        <div className="px-4 py-2 border-t border-border bg-surface-muted/20 flex flex-wrap gap-1.5">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider self-center mr-1">
            Suggested Prompts:
          </span>
          {BOUNDED_INTENT_HINTS.map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => handleSendMessage(hint)}
              disabled={isLoading}
              className="text-[11px] rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all text-left"
            >
              {hint}
            </button>
          ))}
        </div>

        <CardFooter className="p-3 border-t border-border bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage(inputText);
            }}
            className="flex w-full gap-2"
          >
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about formulation notes, house policies, or dispatch timelines..."
              disabled={isLoading}
              className="flex-1 text-sm"
            />
            <Button type="submit" disabled={isLoading || !inputText.trim()}>
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </form>
        </CardFooter>
      </Card>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between rounded-lg border border-border p-4 gap-3 text-xs text-muted-foreground">
        <div>
          <p className="font-semibold text-foreground">Require Return Authorization or Account Adjustments?</p>
          <p>Complex transactional requests are resolved directly by Palermo human customer associates.</p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm" className="shrink-0">
            Return to Catalogue
          </Button>
        </Link>
      </div>
    </div>
  );
}