# Use Case Specifications: Personalisation, Quiz, Recommendations, and AI Support

## Scope and Traceability Summary

- **Functional Requirements Covered:** FR-PERSONAL-001 through FR-PERSONAL-008, FR-SUPPORT-001 through FR-SUPPORT-008[cite: 2]
- **Applicable Decisions:** D-008, D-027, D-028, D-029, D-030, D-031, D-032, D-033, D-048, D-049, D-050, D-051, D-052, D-053, D-054, D-055, D-056, D-094, D-101[cite: 2]
- **Primary Actors:** Visitor, Customer[cite: 2]
- **External Systems:** AI service/API[cite: 2]

---
## Global System Flow: Personalisation & Support Intent Routing

```mermaid
flowchart TD
    Start([User Interaction]) --> Branch{Select Workflow}

    Branch -->|PDP Customisation| UC1[UC-PERS-01: Customise Perfume Item]
    Branch -->|Layering Guide| UC2[UC-PERS-02: Get Layering Guidance]
    Branch -->|Sample Set| UC3[UC-PERS-03: Assemble Sample Set]
    Branch -->|Fragrance Quiz| UC4[UC-PERS-04: Complete Quiz & Recommendations]
    Branch -->|AI Support Chat| ChatRouting{Support Intent Gate}

    ChatRouting -->|Fragrance / Notes / Policy| UC5[UC-SUPP-01: Public AI Assistance]
    ChatRouting -->|Order / Delivery Status| AuthCheck{Is Customer Authenticated?}
    ChatRouting -->|Feedback Action| UC7[UC-SUPP-03: Submit Feedback]

    AuthCheck -->|Yes: Verified Owner| UC6[UC-SUPP-02: Authenticated Order Enquiry]
    AuthCheck -->|No: Unauthenticated| PromptLogin[Prompt Customer Login]

    UC1 --> Cart[(Shopping Cart Metadata)]
    UC3 --> Cart
    UC4 --> RecView[Display Verified Catalogue Matches]
    UC5 --> ChatUI[Render Bounded Response]
    UC6 --> ChatUI
    UC7 --> AuditDB[(Feedback & Audit Store)]
```
## UC-PERS-01: Customise Perfume Item (Label, Engraving, Gift Message, and Packaging)

- **Primary Actor:** Visitor / Customer[cite: 2]
- **Traceability:** FR-PERSONAL-001, FR-PERSONAL-002, FR-PERSONAL-003, FR-PERSONAL-004[cite: 2]
- **Decisions:** D-027, D-028[cite: 2]
- **Preconditions:**
  1. The actor is viewing an active perfume product variant eligible for customisation.[cite: 2]
- **Postconditions:**
  1. The selected customisations (label text, engraving text, gift message, gift packaging) are validated and attached to the target item in the cart.[cite: 2]
  2. Master catalogue/variant records remain completely unmodified.[cite: 2]

### Main Success Scenario
1. Actor views an eligible perfume variant and selects one or more customisation options:[cite: 2]
   - Personalised label text.[cite: 2]
   - Bottle engraving text.[cite: 2]
   - Gift message text.[cite: 2]
   - Gift packaging selection.[cite: 2]
2. Actor inputs custom text and selects packaging options within allowed character/format constraints.[cite: 2]
3. System validates input against length, permitted character sets, and variant eligibility rules.[cite: 2]
4. Actor adds the configured perfume item to the shopping cart.[cite: 2]
5. System persists the customisation payload directly as cart item metadata.[cite: 2]

### Extensions (Alternative / Failure Flows)
- **3a. Selected variant is ineligible for requested customisation:**
  1. System disables ineligible customisation fields and displays an explanatory restriction notice.[cite: 2]
  2. Actor modifies selection to eligible options or proceeds without customisation.[cite: 2]
- **3b. Text input exceeds maximum character limit or fails validation:**
  1. System displays inline validation errors highlighting character limits.[cite: 2]
  2. Actor corrects the input before adding the item to the cart.[cite: 2]

---

## UC-PERS-02: Get Deterministic Perfume Layering Recommendations

- **Primary Actor:** Visitor / Customer[cite: 2]
- **Traceability:** FR-PERSONAL-005[cite: 2]
- **Decisions:** D-029[cite: 2]
- **Preconditions:**
  1. Actor is viewing a perfume detail page or fragrance preference profile.[cite: 2]
- **Postconditions:**
  1. Deterministic layering combinations matching the target perfume are displayed with structured layering steps.[cite: 2]

### Main Success Scenario
1. Actor requests layering combination guidance for a selected perfume.[cite: 2]
2. System runs deterministic compatibility logic over approved catalogue fragrance attributes.[cite: 2]
3. System returns verified compatible catalogue perfumes along with application sequence guidance.[cite: 2]
4. Actor reviews compatible layering products and can navigate to their product pages or add them to the cart.[cite: 2]

---

## UC-PERS-03: Assemble Personalised Sample Set

- **Primary Actor:** Visitor / Customer[cite: 2]
- **Traceability:** FR-PERSONAL-006[cite: 2]
- **Decisions:** D-030[cite: 2]
- **Preconditions:**
  1. The catalogue contains eligible sample-size variants.[cite: 2]
- **Postconditions:**
  1. A bounded bundle of selected sample variants is validated and added to the cart as a single sample-set item.[cite: 2]

### Main Success Scenario
1. Actor navigates to the Sample Set Builder.[cite: 2]
2. System presents all currently available and eligible sample-sized perfume variants.[cite: 2]
3. Actor selects the fixed required number of sample variants to complete the bundle.[cite: 2]
4. System validates variant availability, bundle size, and duplicate rules.[cite: 2]
5. Actor adds the completed sample set to the shopping cart.[cite: 2]
---

## UC-PERS-04: Complete Fragrance Discovery Quiz and Receive Recommendations

- **Primary Actor:** Visitor / Customer[cite: 2]
- **External System:** AI service/API[cite: 2]
- **Traceability:** FR-PERSONAL-007, FR-PERSONAL-008[cite: 2]
- **Decisions:** D-031, D-032, D-033, D-094, D-101[cite: 2]
- **Preconditions:**
  1. Fragrance discovery quiz questions and answer mappings are approved in the system.[cite: 2]
- **Postconditions:**
  1. Completed quiz responses are evaluated.[cite: 2]
  2. If authenticated, the Customer may optionally persist the quiz results to their fragrance profile.[cite: 2]
  3. AI-generated perfume recommendations with explanations are displayed to the actor.[cite: 2]

### Main Success Scenario
1. Actor starts the Fragrance Discovery Quiz.[cite: 2]
2. System displays structured, multi-step questions.[cite: 2]
3. Actor completes all required quiz steps and submits responses.[cite: 2]
4. System extracts structured preference attributes and queries catalogue candidates.[cite: 2]
5. System transmits the minimised context to the AI service/API.[cite: 2]
6. AI service returns ranked perfume candidates with conversational rationale.[cite: 2]
7. System validates that all recommended items exist in the active catalogue.[cite: 2]
8. System renders the recommendations clearly labeled as AI-generated suggestions.[cite: 2]

---

## UC-SUPP-01: Interact with AI Perfume Support Assistant

- **Primary Actor:** Visitor / Customer[cite: 2]
- **External System:** AI service/API[cite: 2]
- **Traceability:** FR-SUPPORT-001, FR-SUPPORT-002, FR-SUPPORT-003, FR-SUPPORT-006, FR-SUPPORT-007[cite: 2]
- **Decisions:** D-048, D-049, D-050, D-051, D-052, D-053, D-055, D-056, D-094[cite: 2]
- **Preconditions:**
  1. Chat assistant widget is accessible.[cite: 2]
- **Postconditions:**
  1. System provides bounded answers regarding fragrance notes, general recommendations, or published policies.[cite: 2]

### Main Success Scenario
1. Actor opens the AI support chat and enters an enquiry.[cite: 2]
2. System identifies the enquiry intent against approved support intents.[cite: 2]
3. System provides relevant canonical knowledge base or catalogue context to the AI service.[cite: 2]
4. AI service synthesises a clear, conversational response.[cite: 2]
5. System presents the response with appropriate interactive product/policy links.[cite: 2]

---

## UC-SUPP-02: Authenticated Order and Delivery Enquiry

- **Primary Actor:** Customer[cite: 2]
- **External System:** AI service/API[cite: 2]
- **Traceability:** FR-SUPPORT-004, FR-SUPPORT-005, FR-SUPPORT-007[cite: 2]
- **Decisions:** D-049, D-050, D-051, D-099, D-101[cite: 2]
- **Preconditions:**
  1. Actor is logged in as an ACTIVE Customer.[cite: 2]
- **Postconditions:**
  1. Authorised, ownership-verified order or delivery status is retrieved and explained.[cite: 2]

### Main Success Scenario
1. Customer enters an enquiry regarding their recent order or shipment status into the AI chat.[cite: 2]
2. System identifies intent as ORDER_STATUS or DELIVERY_ENQUIRY.[cite: 2]
3. System verifies customer authentication and queries internal order records for that Customer ID only.[cite: 2]
4. Server-side tool returns minimised, factual order metadata.[cite: 2]
5. AI assistant formats the data into a helpful response.[cite: 2]
6. Customer reviews the order status and direct tracking link.[cite: 2]

---

## UC-SUPP-03: Submit Support and AI Feedback

- **Primary Actor:** Visitor / Customer[cite: 2]
- **Traceability:** FR-SUPPORT-008[cite: 2]
- **Decisions:** D-054, D-056[cite: 2]
- **Preconditions:**
  1. Actor has interacted with the AI assistant or completed a recommendation flow.[cite: 2]
- **Postconditions:**
  1. Official feedback record is stored with rating and optional comments upon explicit confirmation.[cite: 2]

### Main Success Scenario
1. Actor clicks the feedback action on a chat response or recommendation result.[cite: 2]
2. System displays a feedback modal/form requesting rating and optional comments.[cite: 2]
3. Actor completes the form and clicks Submit Feedback.[cite: 2]
4. System validates the feedback payload and records the entry.[cite: 2]
5. System displays a confirmation message.[cite: 2]
