# UI Specification: Personalisation, Discovery Quiz, Recommendations, and AI Support

## Overview and Traceability

This specification defines the UI layout, interactive components, state handling, and error/fallback states for:
- Product Customisation (`FR-PERSONAL-001`–`004`, `D-027`, `D-028`)
- Layering & Sample Set Builder (`FR-PERSONAL-005`–`006`, `D-029`, `D-030`)
- Fragrance Discovery Quiz & AI Recommendations (`FR-PERSONAL-007`–`008`, `D-031`–`033`, `D-094`)
- AI Customer Support Chat & Feedback (`FR-SUPPORT-001`–`008`, `D-048`–`056`)

---

## 1. Product Customisation UI

Located within the Perfume Product Detail Page (PDP) as an expandable accordion or modular panel prior to the "Add to Cart" action.

### Components and Controls
- **Customisation Toggle:** Checkbox or tabbed control enabling custom options on eligible variants.
- **Engraving Input:**
  - Text input field (Max 25 characters, alphanumeric and basic punctuation only).
  - Live character counter (`X / 25`).
  - Live bottle visualizer overlay previewing the text position.
- **Personalised Label Input:**
  - Text input field (Max 30 characters).
  - Font style selector from approved dropdown list.
- **Gift Message & Packaging:**
  - Text area for gift message (Max 150 characters).
  - Radio card selection for gift box options with packaging price indicator.

### State Handling & UI Boundaries
- **Default State:** Customisation fields collapsed; base product price displayed.
- **Ineligible Variant State:** If a user selects an ineligible size/variant (e.g., 10ml travel spray), customisation toggles are disabled with an inline tooltip: *"Engraving and custom labels are only available on 50ml and 100ml bottles."*
- **Validation Error State:** Red inline border and error text if prohibited characters or excess lengths are entered. "Add to Cart" button is disabled until resolved.

---

## 2. Fragrance Layering & Sample Set Builder UI

### A. Layering Guide Component
- Embedded on PDPs beneath fragrance notes.
- **Pairing Cards:** Shows complementary perfume cards labeled *"Best Layered With"*.
- **Application Sequence Badge:** Displays clear order tags: `Step 1: Base (Apply First)` and `Step 2: Accent (Apply Over)`.
- **Quick Action:** "Add Both to Cart" combination button.

### B. Sample Set Builder (`/sample-set-builder`)
- **Progress Tracker:** Visual step header indicating selected slots: `[ Scents Selected: 3 / 5 ]`.
- **Catalogue Grid:** Filterable card list of eligible sample variants with an "Add to Box" button.
- **Tray Bar (Sticky Bottom):** Shows 5 circular slots filled with chosen sample thumbnails and a "Remove" icon on each.
- **Cart Action:** "Add Sample Box to Cart" enabled only when `Slots Filled == 5`.

---

## 3. Fragrance Discovery Quiz & AI Recommendation UI

### A. Quiz Interface (`/quiz`)
- **Step-by-Step Stepper:** Clean progress bar showing steps 1 through 5 (Vibe/Mood, Preferred Notes, Intensity, Occasion, Sensitivities/Avoidance).
- **Option Cards:** Large, keyboard-accessible clickable cards with clear icons and labels.
- **Navigation:** "Previous", "Next", and "Skip" (where allowed).

### B. AI Recommendations Results View
- **AI Disclaimer Banner:** Distinct badge at the top: *"✨ AI-Curated Recommendations based on your quiz profile"*.
- **Recommendation Cards:**
  - Perfume title, image, price, and matching fragrance family.
  - **"Why this matches you" callout:** AI-generated reasoning tailored to user's selected notes/mood.
  - **Match Confidence / Note Breakdown:** Visual indicators of overlapping notes.
  - Primary CTA: "View Perfume" / "Add to Cart".
- **Save Profile Action (Customers only):** Banner prompting *"Save these results to your Fragrance Identity"*.

### C. AI Failure & Fallback State
- **Degraded Service Notice:** If the AI recommendation API times out or errors, render an info alert: *"We couldn't generate custom AI insights right now, but here are top matches from our catalogue based on your selected notes."*
- **Fallback Content:** Standard deterministic filtered grid of matching perfumes without AI text blurbs.

---

## 4. AI Support Assistant Interface (Floating Chat Widget)

### A. Widget Structure
- **Floating Launcher Button:** Bottom-right fixed button with chat bubble icon.
- **Chat Window Header:** Title ("Palermo Scent & Support Assistant"), status indicator (Online / Offline), and Close button.
- **Message List:**
  - **Assistant Bubble:** Identified with Palermo AI avatar and clear *"AI Assistant"* badge.
  - **User Bubble:** Distinct right-aligned background.
  - **System Prompt / Quick Replies:** Interactive chips for common queries (`"Track My Order"`, `"Explain Woody Notes"`, `"Return Policy"`).
- **Input Area:** Text input, character limit indicator (max 500 characters), and Send button.

### B. Contextual Intent UI Blocks
- **Order Tracking Card (Authenticated):**
  - Renders inline order summary card with Order Number, Date, Status Badge (`SHIPPED`), and Courier Tracking Link.
- **Public Policy Card:**
  - Renders concise policy summary bullet points with a direct link: `[View Full Return Policy]`.
  - Displays explicit note: *"Assistant cannot process returns or issue refunds directly."*

### C. Feedback Collection Modal / Inline Component
- **Trigger:** Thumbs Up / Thumbs Down icons attached to assistant response bubbles.
- **Feedback Popover:**
  - 1–5 Star Rating or binary Helpful/Not Helpful toggle.
  - Optional multi-line text input: *"How can we improve this answer?"*
  - Explicit CTA: "Submit Feedback" button (discarded if dismissed without clicking submit).
  - Success state: Inline badge showing *"Thank you for your feedback!"*.

### D. System & Error States
- **Authentication Required Banner:** If an unauthenticated visitor requests order status:
  - *"Please [Log In] to view your order and shipment details."*
- **Assistant Unavailable / Offline State:**
  - If the AI service fails to respond within timeout limits:
  - Input field disabled.
  - Alert banner inside chat: *"Our AI assistant is temporarily unavailable. Please visit our [FAQ Page] or check back shortly."*
