export type PublishedPolicy = Readonly<{
  eyebrow: string;
  title: string;
  summary: string;
  sections: readonly Readonly<{ heading: string; paragraphs: readonly string[] }>[];
}>;

/**
 * Customer-facing policy copy shared by the published policy pages and the
 * bounded support context. Keep this as the source of truth for policy facts.
 */
export const publishedPolicies = {
  privacy: {
    eyebrow: "Customer information",
    title: "Privacy",
    summary: "How Palermo uses and protects the information needed to provide accounts, fragrance guidance, orders, delivery and support.",
    sections: [
      { heading: "Information Palermo uses", paragraphs: ["Palermo uses the information you provide for your customer account, saved addresses, fragrance preferences, quiz and recommendation activity, wishlist, orders, reviews, rewards and support conversations. Visitor carts and recommendation sessions use opaque temporary identifiers.", "Payment details are entered through the configured payment provider. Palermo stores payment status and provider references, not raw card numbers or security codes."] },
      { heading: "Why it is used", paragraphs: ["Information is used to authenticate accounts, personalise fragrance discovery, maintain carts and wishlists, process and track orders, provide customer-owned order context to support, publish moderated reviews, protect the service and keep required transaction and audit records."] },
      { heading: "Access and service providers", paragraphs: ["Account-specific data is restricted by authentication and ownership checks. Administrative access requires separate server-side permissions. Palermo relies on configured providers for authentication, payment and AI-assisted support; only the context required for the approved task is shared."] },
      { heading: "Retention and account deactivation", paragraphs: ["Project baseline periods include 30 days for visitor cart/session state, 90 days for application logs, 180 days for support conversations, 12 months for account-linked recommendation history, and 24 months for order, invoice and payment-reference records. Backups roll for 30 days. These are project controls and require owner/legal confirmation before production launch.", "Account deactivation immediately affects access, but it is distinct from deletion. Editable profile information is reviewed for deletion or anonymisation while transaction, invoice and audit records may remain for their documented retention purpose."] },
      { heading: "Choices and questions", paragraphs: ["You can update profile, address, preference and Palermo updates settings from your account. Use Palermo support for a privacy question or a request concerning your account; the project does not publish an unverified contact address."] },
    ],
  },
  terms: {
    eyebrow: "Store terms",
    title: "Terms & Conditions",
    summary: "The operating terms reflected by Palermo’s current customer and commerce capabilities.",
    sections: [
      { heading: "Using Palermo", paragraphs: ["Catalogue descriptions, prices and availability are presented from Palermo’s current records. Recommendations and AI-assisted support provide guidance only and do not replace the customer’s own judgment. Do not misuse accounts, attempt unauthorised access or submit unlawful content."] },
      { heading: "Accounts", paragraphs: ["Customers are responsible for the credentials used to access their account and for keeping saved profile and delivery information accurate. Sessions may expire or be invalidated after logout, password or security events, or account deactivation."] },
      { heading: "Orders and payment", paragraphs: ["Adding an item to a cart does not reserve stock. Palermo revalidates stock, current prices, promotions, addresses and delivery options during checkout. An order is not represented as paid until the payment provider result has been verified by the server. Repeated submissions are protected against duplicate business effects."] },
      { heading: "Delivery, cancellation and returns", paragraphs: ["The selected delivery method, displayed delivery information and charge are confirmed with the order. Eligible pre-shipment orders can record a cancellation request; a request does not itself delete the order, confirm cancellation or create a refund. See Shipping & Delivery and Returns & Refunds."] },
      { heading: "Service availability", paragraphs: ["Some configured services, including payment or AI support providers, may be unavailable. Palermo reports those states truthfully and does not treat a failed or pending provider response as success."] },
    ],
  },
  shipping: {
    eyebrow: "Client services",
    title: "Shipping & Delivery",
    summary: "Delivery options and charges are shown from the methods available for your order at checkout.",
    sections: [
      { heading: "Delivery options", paragraphs: ["At checkout, signed-in customers choose from the active delivery methods currently configured for the order. The method name, displayed delivery information and charge are shown before payment and saved with the order."] },
      { heading: "Timing", paragraphs: ["Palermo does not currently publish a guaranteed dispatch or delivery time. Use the information shown with the selected delivery method and the order’s tracking status. Provider or operational delays remain possible."] },
      { heading: "Tracking", paragraphs: ["Each baseline order uses one shipment record. When tracking is available, the Orders area shows the order-owned tracking reference and controlled status events. Tracking access requires the signed-in customer who owns the order."] },
      { heading: "Addresses and changes", paragraphs: ["Checkout uses the saved delivery address selected for the order and preserves an order snapshot. Review it before placing the order. The support concierge can explain status information but cannot change an order or delivery."] },
    ],
  },
  returns: {
    eyebrow: "Client services",
    title: "Returns & Refunds",
    summary: "Palermo records eligible cancellation requests, while return and refund outcomes require support review under confirmed business policy.",
    sections: [
      { heading: "Cancellation requests", paragraphs: ["An authenticated customer may request cancellation for an eligible order before shipment through the order experience. This records a request safely and does not delete the order, silently change its status or automatically issue a refund."] },
      { heading: "Returns and exchanges", paragraphs: ["The current system does not provide an automatic self-service return or exchange approval flow. Contact Palermo support with the relevant signed-in order context so the request can be reviewed. Do not send an item without confirmed instructions."] },
      { heading: "Refunds", paragraphs: ["No refund entitlement, amount, timing or payment outcome is promised by the current project policy. The concierge cannot approve or issue refunds, take payments, or change orders. Any confirmed financial action must follow an approved business process and verified payment state."] },
      { heading: "Information to provide", paragraphs: ["Use your signed-in order history so support can access only orders belonging to you. Describe the request without entering card details, passwords or authentication codes."] },
    ],
  },
} as const satisfies Readonly<Record<string, PublishedPolicy>>;

export function publishedPolicyContext(): readonly Readonly<{ title: string; summary: string; sections: readonly Readonly<{ heading: string; paragraphs: readonly string[] }>[] }>[] {
  return Object.values(publishedPolicies).map(policy => ({
    title: policy.title,
    summary: policy.summary,
    sections: policy.sections,
  }));
}
