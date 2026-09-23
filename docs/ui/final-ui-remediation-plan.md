# Palermo Final UI/UX Remediation Plan

Status: **Phase 0 planning only — implementation requires approval**

## 1. Authority and scope

This plan extends, rather than replaces, `docs/ui/design-system.md`. The frozen typography (Inter), semantic palette, spacing scale, radii, component primitives, responsive widths, accessibility rules, and one existing icon library remain authoritative. `docs/ui/landing-page-implementation-plan.md` remains the authority for the established landing-page direction and is explicitly protected from this remediation.

Design read: customer surfaces are **editorial luxury commerce**; administrator surfaces are a **premium operational console**. Both are Palermo, not separate brands.

No wave may change authentication/session semantics, RBAC, WebAuthn, Stripe confirmation rules, recommendation selection authority, catalogue authority, or persistence/schema without a separately approved functional task.

## 2. Frozen design principles

1. **Product and decision first.** Customer imagery, fragrance identity, price, availability, and the next credible action lead; operational state, stock health, and workflows lead admin.
2. **Hierarchy before containers.** Use scale, spacing, column structure, `divide-y`, and rules before creating a surface. A border is not a substitute for visual hierarchy.
3. **One quiet shared system.** Use the design-system neutral palette, Inter, spacing, focus, semantic statuses, Button/Input/Alert/EmptyState/Skeleton primitives, and the existing Lucide icon dependency. Admin may use centrally-defined charcoal shell surfaces only if tokens are added centrally and meet contrast.
4. **Truthful interface.** Render only canonical data and supported operations. Never turn fallback/technical states into customer claims; never imply payment success before canonical confirmation.
5. **Responsive composition, not compression.** Mobile stacks in meaningful content order; desktop uses constrained grids. Tables scroll locally or convert to compact lists, never the page.
6. **State is a first-class screen.** Loading, empty, error, unavailable, permission, out-of-stock, and payment states use intentional structure and actionable recovery.

## 3. Card-usage rules

Cards remain appropriate only for:

- a bounded transactional unit (payment element, destructive control, confirmation);
- independent product inventory/commerce content where an image ratio and action need containment;
- explicit alert/empty state; or
- an operational panel with independently actionable content.

Cards must not be the default wrapper for page sections, metrics, address blocks, preference groups, order rows, or informational copy. Prefer a page background with rules, grid bands, image-led sections, `divide-y`, definition-style rows, and whitespace. Do not add gradients, glass effects, arbitrary shadows, local palette values, or new rounded-container variants to compensate.

## 4. Functional blockers — fix before dependent visual work

| Blocker | Narrow root cause observed | Required repair boundary | Dependency |
|---|---|---|---|
| Authenticated `/orders` can initially show sign-in | `OrderHistoryView` starts its order request independently of the session hydration request; an early 401 becomes the displayed state even when the session later resolves. | `src/app/orders/_components/order-history-view.tsx` and its direct test(s): gate order loading on resolved customer session or retry after it resolves. Preserve orders API and session behavior. | Must precede Orders presentation.
| Order history is undiscoverable | Customer header/mobile navigation expose Account but no authenticated Orders path. | `store-header.tsx`, `mobile-nav.tsx`, and possibly Account information architecture. | Must precede Orders visual polish.
| Admin Catalogue shows `Catalogue operation not found` | `createAdminHttpClient.listCatalogue()` supplies an input object, causing POST, while the route only serves `list` as GET and POST has no list branch. | `src/lib/admin/client.ts` plus direct admin client/route test. Encode list pagination in the GET query; do not change admin service/RBAC. | Must precede Admin catalogue work.

These repairs are functional-only and should have focused regression tests before visual changes in their dependent waves.

## 5. Global shell and navigation direction

### Customer shell

- Keep the protected landing direction intact.
- Refine non-landing header hierarchy around catalogue, consultation, account/orders, and cart; expose Orders only for an authenticated customer.
- Rebuild the footer as a restrained editorial closing band: Palermo wordmark, a concise supported brand statement, catalogue/consultation/account-or-orders/cart paths that actually exist, and legal/copyright text. Do not fabricate policies, social profiles, contact details, delivery promises, or feature links.
- Use a deliberate contained/full-bleed boundary already present in `CustomerShell`; each screen owns its composition without feature-local widths.

### Admin shell

- Retain `AdminSessionPreview` as the only client session boundary and retain existing sign-out behavior.
- Centralize a charcoal/near-charcoal shell treatment only through global tokens if approved; keep content surfaces neutral and semantic states recognisable.
- Group navigation as **Overview** (Dashboard), **Catalogue & stock** (Catalogue, Inventory), and **Administration** (Security, Promotions, Reviews, Reporting). Use the existing Lucide icons with text labels; title/identity/sign-out belong in one predictable shell region.
- Replace the current mobile menu disclosure with an accessible responsive drawer/sheet pattern using existing primitives, focus return, Escape, and active-route state.

## 6. Exact screen targets

### Customer

| Screen | Target outcome | Data/authority guardrail |
|---|---|---|
| Catalogue | Preserve query/filter behavior and product grid; polish density, filtering hierarchy, and empty/error states only. | No catalogue service/contract rewrite. |
| Product detail | Preserve desktop media/detail composition; make variant, availability, price, quantity, and add-to-cart decision hierarchy clearer. Present notes as a three-layer editorial olfactory pyramid and suitability as restrained factual tags/rows. | Existing `PerfumeDetail`, variants, notes, suitability, cart flow only. |
| Consultation / quiz | Make the existing multi-question UI feel like a concise consultation and show progress/answers clearly. Expand question content only by adding approved quiz records/options referencing canonical families, intensities, notes, and suitability tags. | Do not invent scoring, preferences, weather data, or labels outside canonical IDs. |
| Recommendations | Image/product identity leads; show reason text as the service supplied it, with matching factual family/intensity. No score, confidence, invented match percentage, or fallback technical wording. | `RecommendationResult.items` and canonical catalogue summaries only. |
| Account | Recompose into profile/preferences, fragrance identity, addresses, and a distinct danger zone. Customer wording replaces implementation terminology such as `STALE`; retain all mutation/conflict/deactivation behavior. | Existing profile API, revision/conflict and deactivation flows only. |
| Cart / checkout | Product-led cart rows, quiet summary hierarchy, clear delivery/payment progression and recovery states; order summary is deliberate rather than a stack of generic cards. | Preserve cart revision, promotion, idempotency, Stripe mount, and canonical payment confirmation states. |
| Orders | Add discoverability; make date, total, status, and products readable before IDs. Detail shows canonical delivery/tracking progression when available. | Existing orders/tracking DTOs; no fake shipment steps. |
| Footer | Replace scaffold wording with a complete supported global close. | Existing live routes only. |

### Admin

| Screen | Target outcome | Data/authority guardrail |
|---|---|---|
| Shell/navigation | Grouped, icon-led operational IA, identity/sign-out placement, accessible mobile drawer. | `AdminSessionPreview` and existing session API remain canonical. |
| Dashboard | Operations overview: reporting-period context, orders/sales, stock-health priority, top-selling list as useful state rather than detached cards. | Existing `Dashboard` fields only. |
| Catalogue | First repair GET list defect; then improve scanability, status/action hierarchy, form/variant workflow and mobile table handling. | Existing admin API/service/RBAC only. |
| Inventory / batches | Surface stock risk through semantic status and compact scanning; make batch recording/release workflow clearer. | Existing inventory/batch endpoints and immutable release semantics. |
| Security | Present passkey enrollment as a genuine administrator-security capability with clear local status/errors. | Existing IdentitySession/WebAuthn endpoints; no security claims beyond the implementation. |
| Promotions / reviews / reporting | Intentional release states explaining availability without developer language; retain route/nav structure. | Do not invent management data/actions. |

## 7. Implementation waves and ownership boundaries

### Wave 1 — Functional foundations and route discoverability

**Goal:** resolve the three documented blockers before styling dependent screens.

**Permitted paths:**

- `src/app/orders/_components/order-history-view.tsx`
- `src/components/layout/store-header.tsx`
- `src/components/layout/mobile-nav.tsx`
- `src/lib/admin/client.ts`
- direct affected tests under `tests/unit/` and/or `tests/integration/`

**Protected:** all auth/WebAuthn/session files, order service semantics, admin route authorization, Stripe, Prisma, landing implementation.

**Acceptance:** authenticated direct `/orders` resolves orders after session hydration; Orders is visible only to authenticated customers; admin catalogue list uses the valid method/operation; regression tests prove each.

### Wave 2 — Shared composition and shell/footer

**Goal:** establish shared hierarchy rules without broad primitive churn.

**Permitted paths:**

- `src/components/layout/customer-shell.tsx`
- `src/components/layout/store-header.tsx`
- `src/components/layout/mobile-nav.tsx`
- `src/components/layout/store-footer.tsx`
- `src/app/admin/layout.tsx`
- `src/modules/administration/ui/admin-navigation.tsx`
- `src/modules/administration/ui/admin-responsive-navigation.tsx`
- `src/modules/administration/ui/admin-sections.ts`
- `src/modules/administration/ui/admin-session-preview.tsx`
- `src/app/globals.css` and `docs/ui/design-system.md` only if a centrally reviewed shell token is necessary

**Protected:** customer/admin auth behavior, landing structure, feature-specific state machines, `Card`/`Button` shared implementation unless a documented central system need is separately approved.

### Wave 3 — Customer discovery and commerce presentation

**Goal:** create editorial consultation, recommendations, catalogue polish, product, cart, checkout, account, and order experience using Wave 2 rules.

**Work packages (one owner per package):**

1. Consultation/recommendations: `prisma/quiz-data.ts` (only after canonical-dimension audit), `fragrance-quiz-view.tsx`, focused discovery tests.
2. Catalogue/product: `catalogue-view.tsx`, `perfume-detail-view.tsx`, `src/app/product/[id]/product-detail-shell.tsx` if needed, focused catalogue/cart tests.
3. Account/orders: `customer-account.tsx`, `src/app/orders/_components/*`, account/order tests.
4. Cart/checkout: `cart-view.tsx`, `checkout/presentation/checkout-page.tsx`, checkout tests.

**Protected:** `src/app/page.tsx` landing composition; catalogue/recommendation/commerce services and contracts; payment integration; schema unless a separate approved data task is needed. No two work packages edit shared layout/primitives concurrently.

### Wave 4 — Admin operational console

**Goal:** apply operational hierarchy after Wave 2 has frozen the shell.

**Work packages:**

1. Dashboard/inventory/batches: `admin-dashboard.tsx`, `admin-inventory.tsx`, `admin-production-batches.tsx`.
2. Catalogue/forms: `src/app/admin/catalogue/page.tsx`, `ui/catalogue/*`.
3. Security/release states: `admin-passkey-enrollment.tsx`, `src/app/admin/security/page.tsx`, `admin-placeholder.tsx`, `src/app/admin/{promotions,reviews,reporting}/page.tsx`.

**Protected:** admin auth/session/WebAuthn API/service, permission guards, inventory/catalogue/reporting services, Prisma. No dashboard/inventory owner edits shell navigation while the shell owner is active.

### Wave 5 — Integrated evidence and accessibility remediation

**Goal:** resolve cross-screen regressions, interaction defects, responsive overflow, focus, keyboard and reduced-motion issues.

**Permitted paths:** only defects demonstrated by evidence from Waves 1–4; update tests and docs evidence references. No scope expansion or redesign of Login, Signup, or landing.

## 8. Responsive acceptance criteria per changed screen

Every changed screen must have capture and manual interaction evidence at 375px, 768px, and 1440px.

| Width | Required evidence |
|---|---|
| 375px | No page horizontal overflow; customer content stacks image/product/action in decision order; admin uses drawer/list/table-local-scroll intentionally; no clipped labels; 44px interactive controls; quiz options and checkout controls remain comfortably usable. |
| 768px | Deliberate intermediate grids (catalogue 2–3 columns where data allows); forms and order summaries remain readable; admin controls wrap without truncating state or actions; shell/navigation adapts rather than squeezes. |
| 1440px | Customer text constrained to reading/page widths, product media given visual prominence, stable product/detail or checkout-summary columns; admin persistent grouped navigation and dense scanable tables; no overly wide forms or metric bands. |

Across widths: visible keyboard focus, semantic headings/landmarks, icon accessible names, no color-only status, WCAG 2.2 AA contrast, reduced-motion behavior, and correct loading/error/empty state.

## 9. Evidence and validation requirements

Each package supplies:

1. direct focused tests for functional changes and state transitions;
2. `git diff --check`, lint, typecheck, and the relevant test command;
3. 375/768/1440 screenshots of the changed surface;
4. one representative non-happy-state screenshot (loading, empty, error, unavailable, out-of-stock, conflict, or permission state);
5. keyboard/focus and touch-target verification notes;
6. explicit list of canonical data fields used and confirmation that no unsupported content was added.

At each major-wave gate, run one comprehensive validation pass appropriate to the changed domain. Report environmental blockers (e.g. database DNS or Google Fonts network) accurately; do not alter unrelated infrastructure to bypass them.

## 10. Known implementation conflicts to resolve deliberately

- The frozen system says card usage is supported, while the final direction prohibits card-default layout. This is not a token conflict: retain `Card` for bounded units, remove feature-level overuse during screen work.
- The design-system admin navigation priority predates the new Security route. Update that documentation only when Wave 2 freezes grouped IA.
- The landing plan’s required catalogue/quiz/product routes now exist, but its image-asset constraints and protected landing composition remain separate from this remediation.
- Current quiz seed data contains one family selector. A meaningful consultation requires approved new quiz records backed by existing canonical IDs; this is a constrained data change, not a presentational-only edit, and must be approved as part of Wave 3 package 1.
- Existing product images may be null. Editorial image-led layouts must provide dignified no-image compositions and must not introduce unapproved external imagery.
