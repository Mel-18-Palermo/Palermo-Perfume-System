import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { StripePaymentGateway } from "../../src/modules/commerce/payment/service";
import { createPaymentHttpClient } from "../../src/lib/payment/client";

describe("Stripe payment transport", () => {
  it("verifies raw Stripe webhook signatures and maps PaymentIntent events", () => {
    const secret = "whsec_test_secret";
    const gateway = new StripePaymentGateway("sk_test_transport", secret);
    const payload = JSON.stringify({ id: "evt_test", object: "event", api_version: "2026-01-28.clover", created: 1, livemode: false, pending_webhooks: 1, request: null, type: "payment_intent.succeeded", data: { object: { id: "pi_test", object: "payment_intent", amount: 1200, currency: "aud", metadata: { paymentId: "payment-test" }, client_secret: "pi_test_secret" } } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(gateway.parseWebhook(payload, signature)).toEqual({ paymentId: "payment-test", status: "SUCCEEDED", providerReference: "pi_test" });
    expect(gateway.parseWebhook(payload, "invalid")).toBeNull();
  });

  it("returns the canonical client-safe payment response through the browser adapter", async () => {
    const client = createPaymentHttpClient(async () => new Response(JSON.stringify({ ok: true, data: { paymentId: "payment-test", providerReference: "pi_test", clientSecret: "pi_test_secret" } }), { headers: { "content-type": "application/json" } }));
    await expect(client.initiate({ orderId: "order-test" })).resolves.toEqual({ ok: true, data: { paymentId: "payment-test", providerReference: "pi_test", clientSecret: "pi_test_secret" } });
  });
});
