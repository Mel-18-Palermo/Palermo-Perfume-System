# Use Case Specifications: Personalisation, Quiz, Recommendations, and AI Support

## Scope and Traceability Summary

- **Functional Requirements Covered:** FR-PERSONAL-001 through FR-PERSONAL-008, FR-SUPPORT-001 through FR-SUPPORT-008
- **Applicable Decisions:** D-008, D-027, D-028, D-029, D-030, D-031, D-032, D-033, D-048, D-049, D-050, D-051, D-052, D-053, D-054, D-055, D-056, D-094, D-101
- **Primary Actors:** Visitor, Customer
- **External Systems:** AI service/API

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
