import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import {
  configuredGateway,
  PaymentProviderUnavailableError,
  SandboxPaymentGateway,
  StripePaymentGateway,
  UnavailablePaymentGateway,
} from "../../src/modules/commerce/payment/service";
import { createPaymentHttpClient } from "../../src/lib/payment/client";

describe("Stripe payment transport", () => {
  it("verifies raw Stripe webhook signatures and maps PaymentIntent events", () => {
    const secret = "whsec_test_secret";
    const gateway = new StripePaymentGateway("sk_test_transport", secret);
    const payload = JSON.stringify({ id: "evt_test", object: "event", api_version: "2026-01-28.clover", created: 1, livemode: false, pending_webhooks: 1, request: null, type: "payment_intent.succeeded", data: { object: { id: "pi_test", object: "payment_intent", amount: 1200, currency: "aud", metadata: { paymentId: "payment-test", attemptSequence: "3" }, client_secret: "pi_test_secret" } } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(gateway.parseWebhook(payload, signature)).toEqual({ eventId: "evt_test", paymentId: "payment-test", status: "SUCCEEDED", providerReference: "pi_test", attemptSequence: 3 });
    expect(gateway.parseWebhook(payload, "invalid")).toBeNull();
  });

  it("returns the canonical client-safe payment response through the browser adapter", async () => {
    const client = createPaymentHttpClient(async () => new Response(JSON.stringify({ ok: true, data: { paymentId: "payment-test", providerReference: "pi_test", clientSecret: "pi_test_secret" } }), { headers: { "content-type": "application/json" } }));
    await expect(client.initiate({ orderId: "order-test" })).resolves.toEqual({ ok: true, data: { paymentId: "payment-test", providerReference: "pi_test", clientSecret: "pi_test_secret" } });
  });

  it("fails closed when deployed runtime Stripe configuration is incomplete", async () => {
    const missing = configuredGateway({});
    const partial = configuredGateway({ STRIPE_SECRET_KEY: "sk_test_present" });
    const production = configuredGateway({ STRIPE_SECRET_KEY: "sk_live_forbidden", STRIPE_WEBHOOK_SECRET: "whsec_present" });
    expect(missing).toBeInstanceOf(UnavailablePaymentGateway);
    expect(partial).toBeInstanceOf(UnavailablePaymentGateway);
    expect(production).toBeInstanceOf(UnavailablePaymentGateway);
    await expect(missing.createPayment({ paymentId: "payment", orderId: "order", amountMinor: 1200, currency: "AUD", attemptSequence: 1 }))
      .rejects.toBeInstanceOf(PaymentProviderUnavailableError);
  });

  it("requires explicit injection and an explicit secret for the deterministic sandbox", () => {
    expect(() => new SandboxPaymentGateway("")).toThrow("explicit sandbox webhook secret");
    expect(new SandboxPaymentGateway("test-only-secret")).toBeInstanceOf(SandboxPaymentGateway);
  });
});
