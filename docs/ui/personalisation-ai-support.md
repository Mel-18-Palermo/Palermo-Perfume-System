# UI Specification: Personalisation, Discovery Quiz, Recommendations, and AI Support

## Overview and Traceability

This specification defines the UI layout, interactive components, state handling, and error/fallback states for:
- Product Customisation (`FR-PERSONAL-001`–`004`, `D-027`, `D-028`)
- Layering & Sample Set Builder (`FR-PERSONAL-005`–`006`, `D-029`, `D-030`)
- Fragrance Discovery Quiz & AI Recommendations (`FR-PERSONAL-007`–`008`, `D-031`–`033`, `D-094`, `D-101`)
- AI Customer Support Chat & Feedback (`FR-SUPPORT-001`–`008`, `D-048`–`056`, `D-099`)

---

## 1. Product Customisation UI

Located within the Perfume Product Detail Page (PDP) as an expandable modular panel prior to the "Add to Cart" action.

### Components and Controls
- **Customisation Toggle:** Checkbox or tabbed control enabling custom options on administrator-configured eligible product variants (`D-028`).
- **Engraving Input:**
  - Text input field bounded by system-configured character limits.
  - Live character counter displaying current count against configured maximum (`X / Max`).
  - Visual bottle preview overlay indicating text placement.
- **Personalised Label Input:**
  - Text input field bounded by system-configured character limits.
  - Font style selector populated from approved system typography choices.
- **Gift Message & Packaging:**
  - Text area for gift message bounded by configured character constraints.
  - Radio card selection for available gift packaging options displaying dynamic packaging fees.

### State Handling & UI Boundaries
- **Default State:** Customisation fields collapsed; standard variant pricing displayed.
- **Ineligible Variant State:** If an actor selects a variant configured as ineligible for customisation by an administrator, customisation controls are disabled with an inline explanatory badge: *"Customisation options are not available for this selected variant."*
- **Validation Error State:** Inline error styling and descriptive validation messages if unsupported characters or lengths exceeding system configuration are entered. "Add to Cart" is disabled until valid input is provided.

---

## 2. Fragrance Layering & Sample Set Builder UI

### A. Layering Guide Component
- Embedded on PDPs beneath fragrance composition notes.
- **Pairing Cards:** Displays verified compatible catalogue perfumes derived from deterministic fragrance attribute matching (`D-029`).
- **Application Sequence Tag:** Displays structured step badges indicating recommended application order (e.g., Base Layer, Accent Layer).
- **Quick Action:** Single CTA to add complementary fragrance combinations directly to the cart.

### B. Sample Set Builder (`/sample-set-builder`)
- **Progress Tracker:** Visual progress header displaying current selection against the configured bundle size requirement (`[ Scents Selected: X / Configured Bundle Size ]`) (`D-030`).
- **Catalogue Grid:** Filterable card list of administrator-configured sample-size variants with dynamic stock badges and an "Add to Box" action.
- **Tray Bar (Sticky Bottom):** Visual slot tray showing chosen sample thumbnails, current count, and a "Remove" control on each slot.
- **Cart Action:** "Add Sample Set to Cart" button remains disabled until the exact configured required number of distinct sample variants is selected.

---

## 3. Fragrance Discovery Quiz & AI Recommendation UI

### A. Quiz Interface (`/quiz`)
- **Step-by-Step Stepper:** Progress indicator reflecting the approved multi-step discovery flow (e.g., Olfactory Preferences, Mood, Occasion, Avoided Notes) (`D-031`).
- **Option Cards:** Accessible, selectable cards with clear iconography, note badges, and textual descriptions.
- **Navigation Controls:** "Previous", "Next", and optional "Skip" actions for non-mandatory preference steps.

### B. AI Recommendations Results View
- **AI Transparency Banner:** Clearly visible badge identifying results as AI-curated suggestions based on submitted quiz preferences (`D-032`).
- **Authoritative Catalogue Match Cards:**
  - Master product identity, authoritative title, real-time price, and live availability rendered directly from Palermo catalogue records (`D-094`, `D-101`).
  - **Conversational Rationale:** Distinct AI blurb explaining why the perfume matches the submitted quiz traits.
  - **Fragrance Breakdown:** Visual tags highlighting matching scent families and overlapping fragrance notes.
  - Primary CTAs: "View Details" and "Add to Cart".
- **Save Profile Action (Authenticated Customers):** Action prompt allowing registered customers to persist quiz attributes to their Fragrance Profile.

### C. AI Failure, Timeout & Fallback State
- **Degraded Service Alert (D-033):** If the AI recommendation service experiences a network failure, timeout, safety rejection, or invalid output format:
  - System displays an informational notification banner: *"AI reasoning is temporarily unavailable. Displaying top fragrance matches directly from our catalogue."*
  - Recommendations render using deterministic attribute filtering over active catalogue stock.
  - Complete catalogue navigation, cart operations, and checkout workflows remain 100% available and functional.

---

## 4. AI Support Assistant Interface (Floating Chat Widget)

### A. Widget Structure
- **Floating Launcher Button:** Fixed bottom-right launcher button with assistant icon and toggle state.
- **Chat Window Header:** Header displaying "Palermo Support Assistant", availability indicator, and minimise/close controls.
- **Message List:**
  - **Assistant Bubble:** Styled message card marked with the Palermo Assistant avatar and clear "AI Assistant" attribution badge.
  - **User Bubble:** Right-aligned customer message container.
  - **Interactive Quick Prompts:** Pre-configured query chips for standard intents (`"Where is my order?"`, `"Explain Fragrance Families"`, `"Store Return Policy"`).
- **Input Area:** Sanitised text input field bounded by system validation constraints and Send action.

### B. Contextual Intent UI Blocks
- **Order Status Card (Authenticated Customers Only, D-049, D-050):**
  - Renders an inline factual summary card containing authoritative Order ID, fulfilment status badge, estimated delivery timeframe, and direct courier tracking link.
- **Store Policy Summary Card:**
  - Displays concise policy points with interactive links to official policy pages.
  - Explicit disclaimer banner: *"AI assistant cannot authorise returns, cancel orders, or process financial refunds."*

### C. Feedback Collection Component
- **Trigger:** Thumbs up/down or feedback icon attached to each assistant response bubble (`D-054`, `D-056`).
- **Feedback Popover / Modal:**
  - Structured rating control (e.g., 1–5 stars or helpful/unhelpful toggle).
  - Optional text input for qualitative customer commentary.
  - Action buttons: "Submit Feedback" (explicit confirmation required to record entry) and "Cancel".
  - Dismissing the popover without submitting discards unsubmitted text without logging partial records.

### D. System Safety, Boundary & Offline States
- **Authentication Prompt Card:** If an unauthenticated visitor requests order or shipment details, render a prompt with a direct "Log In" link before displaying order metadata (`D-050`).
- **Out-of-Scope / Safety Rejection Message (D-055):**
  - Standard polite boundary response: *"I can only assist with Palermo fragrances, product recommendations, and general store policies."*
- **Assistant Unavailable / Offline State (D-055):**
  - If the AI support service is unreachable or encounters repeated timeouts:
  - Input field is cleanly disabled with a descriptive placeholder.
  - Notice card displays: *"Our virtual assistant is currently offline. Please refer to our [Help Centre & FAQ] or reach our support team directly."*
  - Storefront browsing, cart interactions, and checkout proceed normally without interruption.
