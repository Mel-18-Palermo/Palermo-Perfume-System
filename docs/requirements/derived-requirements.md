# Derived Requirements Registry

> These requirements are **development-team-derived SRS scope** for modules explicitly named by Palermo but not supplied with a complete numbered functional-requirement breakdown. They must remain distinguishable from the 91 explicitly listed source entries.

## Inventory and Production Batch Management

| ID | Derived requirement | Decision |
|---|---|---|
| `DER-INVENTORY-001` | Track inventory at sellable perfume-variant level and calculate available stock using on-hand and reserved/committed quantities. | `D-067` |
| `DER-INVENTORY-002` | Record inventory changes through attributable inventory movements containing quantity delta, source/reason, reference, and timestamp. | `D-068` |
| `DER-INVENTORY-003` | Allow authorised administrators to record finished-perfume production batches associated with sellable variants. | `D-069` |
| `DER-INVENTORY-004` | Add production-batch quantity to sellable inventory only through an authorised batch-release workflow that applies the movement once. | `D-070` |
| `DER-INVENTORY-005` | Allow administrators to view variant stock and identify variants at/below configured low-stock thresholds. | `D-071` |
| `DER-INVENTORY-006` | Use atomic inventory reservation/commitment controls that prevent allocation beyond available stock and safely release failed/expired reservations. | `D-072` |

## Customer Reviews and Fragrance Community

| ID | Derived requirement | Decision |
|---|---|---|
| `DER-REVIEW-001` | Allow an authenticated customer to submit one rating and short text review for a perfume they have purchased; reviews are publicly visible subject to admin moderation. | `D-073` |
| `DER-COMMUNITY-001` | Treat the shared public review space as the baseline community capability; replies, likes, follows, DMs, and community feeds are excluded. | `D-074` |

## Loyalty, Subscription and Referral Management

| ID | Derived requirement | Decision |
|---|---|---|
| `DER-LOYALTY-001` | Award simple loyalty points for qualifying completed orders and allow redemption according to administrator-configured rules; tiers are excluded. | `D-075` |
| `DER-SUBSCRIPTION-001` | Allow customers to opt in to/out of a basic subscription record; recurring billing and automatic recurring perfume orders are excluded. | `D-076` |
| `DER-REFERRAL-001` | Provide an authenticated customer with a unique referral code/link and allow configured loyalty rewards after a qualifying referral. | `D-077` |

## Promotions and Social Media Content Management

| ID | Derived requirement | Decision |
|---|---|---|
| `DER-PROMO-001` | Allow authorised administrators to create/manage promotion codes with basic discount, active status/date, and eligibility rules. | `D-078` |
| `DER-SOCIAL-001` | Allow authorised administrators to create/manage promotional-content records intended for social media without implementing a full scheduling platform. | `D-079` |
| `DER-SOCIAL-002` | Support AI-assisted promotional-video generation with admin preview and approve/reject control using approved/copyright-safe assets; automatic posting is excluded. | `D-080` |

## Status

All entries in this file are **Approved development-team-derived SRS requirements** and must be labelled as such in traceability, use cases, issues, tests, and the final SRS.
