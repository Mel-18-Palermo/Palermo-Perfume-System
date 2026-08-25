# Final SRS Section 1 — Introduction, Scope, Limitations and Assumptions

## Purpose of this source

This document provides the canonical technical source for Final SRS Section 1.

It is based on:

- the supplied Palermo Project 38 client brief;
- the current canonical functional and non-functional requirement registries;
- approved development-team decisions `D-001` through `D-111`;
- the approved derived-requirements registry for the four named modules that did not receive a complete numbered source-FR breakdown;
- the current SRS-only repository baseline.

It replaces stale interim technical assumptions where those assumptions conflict with the approved Final SRS baseline.

The assessed report editor may rewrite or condense this material while preserving its technical meaning and source/derived distinctions.

---

# 1 Introduction

## 1.1 Background of Study

Online perfume retail has a particular limitation compared with physical perfume shopping: customers cannot directly smell or test a fragrance before deciding whether it suits their preferences.

The Palermo project brief identifies common limitations in conventional perfume e-commerce systems. Existing systems typically focus on displaying products, accepting online purchases and managing orders, while providing only basic search/category filtering and generic recommendations such as best-selling or related products. The brief also identifies limited support for richer fragrance-discovery experiences such as fragrance preference analysis, fragrance identity profiles, perfume layering guidance and AI-assisted customer support.

The Palermo Online Perfume Selling System is intended to address this gap by combining normal e-commerce capability with structured fragrance discovery, personalisation and controlled AI-assisted functions.

The system therefore covers two related needs:

1. improve the customer's online fragrance-shopping experience; and
2. improve Palermo's operational management of products, inventory, customers, orders, promotions and reporting.

The project is a responsive web-based capstone system. It is designed around an approved modular-monolith architecture using Next.js and TypeScript with Prisma and Supabase PostgreSQL. External payment, email and AI functions are accessed behind controlled integration boundaries. Baseline delivery/tracking is demonstrated through an internal delivery simulator rather than a production courier integration.

The Final SRS distinguishes clearly between:

- requirements explicitly listed in the Palermo brief;
- development-team decisions that refine ambiguous behaviour; and
- approved derived requirements for modules named by Palermo but not supplied with a complete numbered functional-requirement breakdown.

This distinction is maintained throughout requirements, use cases, diagrams, data design, traceability and testing.

---

## 1.2 Purpose of Project

The purpose of the Palermo Online Perfume Selling System is to provide a secure, intelligent and user-friendly online platform through which customers can discover, personalise and purchase Palermo perfume products while enabling Palermo administrators to manage the supporting business operations.

From the customer perspective, the system is intended to support:

- account registration, verification and profile management;
- public perfume catalogue browsing and structured discovery;
- fragrance preferences and a generated Fragrance Identity;
- perfume comparison and virtual fragrance information;
- perfume customisation and layering guidance;
- fragrance quiz and AI-assisted recommendations;
- cart and wishlist management;
- authenticated checkout and online payment;
- order, invoice, shipment and delivery-status access;
- reviews, loyalty and referral functions within the approved bounded scope;
- AI-assisted customer support and feedback.

From the business/administrator perspective, the system is intended to support:

- perfume, variant, collection and fragrance-data management;
- variant-level inventory and production-batch management;
- promotion and promotional-content management;
- review moderation;
- administrator account and role-based access control;
- audit and backup management;
- dashboard/reporting functions;
- AI-assisted promotional-video generation with administrator review before approval.

The project also aims to provide a technically controlled foundation for privacy, security, transaction integrity, accessibility, testing and later implementation traceability.

---

## 1.3 Objectives of the Project

The project objectives are to:

1. provide a secure and user-friendly responsive web application for Palermo customers and administrators;
2. allow customers to register, verify, authenticate and manage approved account/profile information;
3. provide public perfume catalogue browsing, keyword search and the source-defined fragrance discovery criteria;
4. help customers understand and compare fragrances through fragrance-family, note-journey, performance/suitability and virtual scent-profile information;
5. support personalised fragrance discovery through customer preferences, Fragrance Identity, layering guidance, sample-set assembly, structured quiz results and bounded AI-assisted recommendations;
6. provide a controlled commerce flow covering cart, wishlist, promotion validation, authenticated checkout, Stripe sandbox payment, invoice generation, cancellation request and order status;
7. maintain accurate variant-level inventory through reservation, movement and production-batch controls that prevent duplicate or over-allocated stock effects;
8. provide shipment tracking and delivery confirmation through the approved internal delivery simulator for the capstone baseline;
9. provide bounded customer-support AI capable of fragrance/product/policy assistance and authenticated order/delivery enquiries without making AI authoritative for Palermo business facts;
10. provide protected administrator functions for catalogue, inventory, promotion, review, account/RBAC, audit, backup and business reporting;
11. support approved review/community, loyalty, subscription opt-in/out, referral and promotional-content functions without expanding into unapproved social-network, recurring-billing or marketing-automation scope;
12. support AI-assisted promotional-video generation using approved/copyright-safe assets with explicit administrator preview and approve/reject control;
13. protect customer, payment and business information through server-authoritative access control, validation, privacy/data-minimisation and safe provider integration;
14. produce measurable test criteria and complete traceability from approved requirements through design, implementation and test evidence.

These objectives describe the approved capstone system direction. They do not claim that application implementation or acceptance testing has already been completed.

---

## 1.4 Project Scope and Limitations

### 1.4.1 In-scope system capabilities

The Palermo client brief names the following sixteen modules:

1. Customer Registration and Authentication
2. Customer Profile and Fragrance Identity
3. Perfume Product Management
4. Perfume Collection and Fragrance Notes Management
5. Product Discovery and Smart Search
6. Virtual Fragrance Experience
7. Perfume Customisation and Personalisation
8. Shopping Cart and Wishlist Management
9. Order and Payment Management
10. Delivery and Order Tracking
11. Inventory and Production Batch Management
12. Customer Reviews and Fragrance Community
13. Loyalty, Subscription and Referral Management
14. Customer Support and AI Assistance
15. Promotions and Social Media Content Management
16. Admin Dashboard

The source brief provides 91 explicitly listed functional-requirement entries because source number 78 is duplicated.

The four named modules without a complete numbered source-FR breakdown are:

- Inventory and Production Batch Management;
- Customer Reviews and Fragrance Community;
- Loyalty, Subscription and Referral Management;
- Promotions and Social Media Content Management.

Their approved baseline behaviours are therefore maintained as separate `DER-*` development-team-derived requirements rather than being presented as client-numbered source FRs.

### 1.4.2 Customer-facing scope

Customer/Visitor scope includes, where applicable:

- registration and email verification;
- login, logout, password reset and account deactivation;
- customer profile and one current delivery/billing address model;
- fragrance preferences and deterministic Fragrance Identity generation;
- public catalogue browsing;
- keyword search;
- filtering by fragrance note, fragrance family, price range, intensity, occasion and mood;
- deterministic weather-category suggestions;
- perfume comparison;
- fragrance wheel;
- note journey;
- controlled longevity, projection and suitability information;
- virtual scent-profile representation;
- label, engraving, gift-message and packaging customisation for eligible variants;
- deterministic perfume-layering guidance;
- bounded personalised sample sets;
- structured fragrance discovery quiz;
- AI-assisted perfume recommendations over approved catalogue candidates;
- Visitor temporary cart and authenticated Customer cart;
- account-specific wishlist;
- promotional-code application;
- authenticated checkout;
- online card payment through Stripe test/sandbox mode;
- digital invoice access;
- pre-shipment cancellation request;
- delivery-method selection;
- shipment tracking and delivery confirmation;
- verified-purchase review capability;
- simple loyalty points;
- basic subscription opt-in/out;
- referral code/link;
- generic and authenticated AI-assisted support;
- explicit customer feedback submission.

### 1.4.3 Administrator scope

Administrator scope includes authorised management of:

- perfume products and images;
- sellable variants including bottle size, concentration, SKU, price and availability;
- collections;
- fragrance-family and fragrance-note assignments;
- customisation eligibility;
- variant-level inventory and low-stock information;
- finished-perfume production batches;
- promotion codes;
- public review moderation;
- promotional-content records;
- AI-assisted promotional-video generation and approval/rejection;
- administrator accounts and role-based permissions;
- dashboard and reporting information;
- audit-history access;
- approved backup operations/status.

Administrator access remains authenticated, server-authorised and least privilege.

### 1.4.4 Technical scope

The approved technical baseline is:

- responsive web application;
- Next.js + TypeScript modular monolith;
- React user interface through Next.js;
- Prisma data-access/migration layer;
- Supabase PostgreSQL relational database;
- Stripe sandbox/test payment integration;
- email delivery behind an integration adapter;
- AI capability behind an integration adapter;
- internal delivery simulator behind a replaceable delivery-provider boundary;
- seeded non-real development/test/demo data;
- GitHub issue → branch → pull request → review → rebase-merge workflow.

The exact authentication provider, AI provider/model, email provider, hosting provider, deployment platform, JavaScript package manager and runtime versions are not frozen by Section 1 unless separately approved later.

### 1.4.5 Scope limitations and explicit exclusions

The Final SRS baseline has the following limitations/exclusions:

- The capstone baseline is a responsive web application; native Android and native iOS applications are not included.
- Guest checkout is not included. A Visitor may maintain a temporary cart, but an eligible authenticated Customer is required before order placement.
- Stripe is used in test/sandbox mode. The project does not process real financial transactions for the capstone demonstration.
- Palermo never stores raw payment-card numbers or CVV/CVC.
- Baseline delivery uses an internal delivery simulator. A production courier integration, split shipment, partial fulfilment and multi-warehouse fulfilment are not included.
- Cancellation is a request for an eligible pre-shipment order. Refund, exchange, return authorisation and other financial-remedy workflows are not invented without approved business rules.
- Production Batch Management covers finished-perfume batches. Raw-material procurement, formulation, manufacturing scheduling and ERP functionality are not included.
- Community functionality is limited to public perfume reviews with moderation. Replies, likes, follows, direct messages and community feeds are not included.
- Loyalty uses simple points only; tiers/VIP schemes are not included.
- Subscription capability is basic opt-in/out. Recurring Stripe billing and automatic recurring perfume orders are not included.
- Referral capability is bounded to a unique code/link and configured qualifying rewards; multi-level affiliate/referral schemes are not included.
- Promotional-content management does not make Palermo a social-media scheduler. Automatic posting and scheduling to external social networks are not included.
- AI does not replace authoritative Palermo catalogue, price, stock, order, payment, policy or delivery data.
- AI failure must not block normal catalogue or commerce functions.
- AI features do not receive unrestricted database access or arbitrary customer histories.
- Fragrance sensitivity is non-medical preference/avoidance information; medical or health-condition data is not collected for this purpose.
- Weather-based suggestions use approved weather categories and deterministic suitability mappings. A live external weather service is not required for the baseline.
- Exact tax/GST treatment is not invented where business rules are not supplied.
- Exact production deployment availability/SLA, zero-data-loss recovery and enterprise-scale observability are not promised.
- The final demonstration uses controlled seeded data and sandbox/simulated integrations; demonstration behaviour must not be represented as live production operation.

### 1.4.6 Important correction to the Interim SRS

The Interim SRS contained several early technical assumptions that are no longer the approved Final SRS baseline.

The Final SRS must not repeat the following as current facts:

- standalone React frontend + standalone Node.js backend architecture;
- fixed Vercel/Render hosting;
- rule-based-only recommendation scope with AI recommendations excluded;
- production courier tracking as a required baseline integration.

The approved Final SRS instead uses the current decisions documented in the canonical decision register.

---

## 1.5 Project Assumptions

The following assumptions are used for the current Final SRS baseline.

### A-01 — Palermo product and brand information

Palermo is expected to provide, or approve project-use versions of, the product and brand information required for the capstone system, such as perfume names/descriptions, product images, logos, fragrance information and approved promotional claims.

Where real client content is unavailable for development/test/demo, the project may use clearly non-real seeded/demo content rather than inventing it as verified Palermo production data.

### A-02 — Authorised promotional assets

AI-assisted promotional content assumes that the assets supplied to the generation workflow are owned, licensed or otherwise approved for project use.

Administrator approval remains required before generated promotional media is treated as approved content.

### A-03 — Controlled catalogue/reference data

The project assumes that controlled catalogue data such as fragrance families, fragrance notes, suitability tags, variant information and eligible customisation options can be seeded/configured for the capstone environment.

Exact vocabularies may be refined during implementation without silently creating new business scope.

### A-04 — External provider availability is not guaranteed

Stripe, email and AI integrations depend on their respective provider/service availability during integration testing and demonstration.

The architecture therefore isolates providers behind Palermo-owned interfaces/adapters, and deterministic mocks/stubs may be used where appropriate for controlled tests.

### A-05 — Payment remains non-production

Payment demonstrations use Stripe test/sandbox mode and test credentials.

No real customer card information or real settlement is required.

### A-06 — Delivery is simulated for the baseline

The Final SRS assumes an internal delivery simulator will provide controlled shipment references, status transitions and delivery-confirmation events for the baseline capstone system.

A real courier/provider account is not required.

### A-07 — Development/test/demo data is synthetic

Development, testing, screenshots and demonstration use seeded non-real customer and business data where possible.

Real customer personal information, real payment-card data, real authentication secrets and production database exports are not required.

### A-08 — Customer identity and ownership can be enforced

The system assumes that the final chosen authentication/session implementation can provide reliable customer and administrator identity to server-side authorisation controls.

The exact authentication provider is not assumed in Section 1.

### A-09 — Browser access

Users are assumed to access the system through a current supported desktop, tablet or mobile web browser with network access.

The project does not assume native mobile-app installation.

### A-10 — Administrator responsibility

Administrator users are assumed to have appropriate authority to maintain the Palermo records/functions made available to their assigned role.

The application must still enforce server-side permission checks; the system does not rely on trust in UI visibility alone.

### A-11 — AI is advisory

AI recommendations, support responses and generated promotional outputs are assumed to be advisory/presentational outputs bounded by Palermo-approved data and controls.

Palermo application data remains authoritative for product, price, stock, payment, order, delivery and approved policy facts.

### A-12 — Final SRS scope freeze

Application implementation is assumed to begin from the reviewed/frozen SRS v1.0 baseline.

After freeze, new business functionality requires a documented change decision; bug fixes and implementation-detail refinement do not automatically create new SRS scope.

### A-13 — Capstone-scale validation environment

Performance, availability, scalability, recovery, usability and other measurable NFRs are evaluated using the documented capstone test/staging profile.

These validation targets are not assumed to represent a commercial production SLA.

### A-14 — Repeatable demonstration environment

The final demonstration assumes the project can reset/reseed controlled data and use sandbox/simulated providers so approved behaviours can be demonstrated repeatedly without production customer or financial activity.

---

## Section 1 consistency rules for report assembly

When Section 1 is rewritten for the Final SRS report:

- do not introduce additional actors or modules;
- do not describe the four `DER-*` module requirements as numbered client requirements;
- do not promise guest checkout;
- do not promise real courier integration;
- do not promise refund/return/exchange processing;
- do not describe subscription as recurring payment;
- do not describe community as a social network;
- do not describe AI as authoritative for Palermo business facts;
- do not claim the application has already been implemented or tested;
- do not reintroduce the stale React + standalone Node backend assumption;
- do not freeze hosting/authentication/provider/version choices that remain open;
- preserve the capstone/sandbox/simulated nature of payment, delivery and final demonstration.
