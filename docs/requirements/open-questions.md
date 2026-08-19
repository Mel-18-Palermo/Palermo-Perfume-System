# Open Requirements Questions

This register records ambiguities and omissions in the supplied Palermo project requirements. Do not silently resolve these by assumption.

## REQ-GAP-001 - Inventory and Production Batch Management

**Source status:** Module is explicitly named, but no complete numbered functional-requirement breakdown is supplied.

**Decision needed:** Confirm the minimum client-required inventory and production-batch capabilities before SRS v1.0 freeze.

**Status:** Open

## REQ-GAP-002 - Customer Reviews and Fragrance Community

**Source status:** Module is explicitly named, but no complete numbered functional-requirement breakdown is supplied.

**Decision needed:** Confirm whether the final system requires reviews only, community interactions, moderation, or another defined subset.

**Status:** Open

## REQ-GAP-003 - Loyalty, Subscription and Referral Management

**Source status:** Module is explicitly named, but no complete numbered functional-requirement breakdown is supplied.

**Decision needed:** Confirm minimum loyalty, subscription and referral behaviour before SRS v1.0 freeze.

**Status:** Open

## REQ-GAP-004 - Promotions and Social Media Content Management

**Source status:** Module is explicitly named. The project brief separately describes AI-assisted promotional video generation, including administrator preview/approval and authorised/copyright-safe assets, but the module is not integrated into the numbered functional-requirement list.

**Decision needed:** Convert the confirmed promotional-content expectations into explicit functional requirements and identify what is required for the final client demo.

**Status:** Open

## REQ-GAP-005 - Duplicate source requirement number 78

**Source status:** The supplied functional-requirement list uses source number 78 for both `Customer feedback collection` and `Total sales dashboard`.

**Resolution:** Preserve both as separate canonical IDs. Do not renumber the source document; use canonical IDs throughout the new SRS.

**Status:** Resolved for internal traceability

## REQ-AUTH-001 - Registration field set and customer account identifier

**Related requirements:** `FR-AUTH-001`, `FR-AUTH-003`, `FR-AUTH-005`

**Source status:** The supplied brief names account registration, login and password reset but does not define the registration fields or the unique customer-account identifier.

**Decision needed:** Confirm the required registration fields and whether email is the unique customer login/account identifier.

**Status:** Open

## REQ-AUTH-002 - Relationship between email verification and account activation

**Related requirements:** `FR-AUTH-002`, `FR-AUTH-003`, `FR-AUTH-006`

**Source status:** Email verification and customer account activation are listed as separate functional requirements, but the source does not define whether verification itself activates the account or whether activation is a separate state transition.

**Decision needed:** Define the initial customer-account states and the exact transition from registration to verified and active status, including whether login is allowed before verification.

**Status:** Open

## REQ-AUTH-003 - Account deactivation and reactivation lifecycle

**Related requirements:** `FR-AUTH-006`, `FR-AUTH-007`

**Source status:** Account activation and account deactivation are listed, but the source does not define who initiates deactivation, whether a customer may reactivate, what happens to existing sessions, or how retained business records are handled.

**Decision needed:** Confirm self-service versus administrator-controlled deactivation, session termination behaviour, reactivation rules, and retention of profiles/orders/invoices after deactivation.

**Status:** Open

## REQ-PROFILE-001 - Delivery and billing address model

**Related requirements:** `FR-PROFILE-002`, `FR-PROFILE-003`

**Source status:** Delivery address management and billing address management are listed, but the source does not define whether each customer stores one address or multiple saved addresses, required address fields, default-address behaviour, or whether billing addresses must be persisted.

**Decision needed:** Define address cardinality, approved address fields, default-selection behaviour, and whether billing-address persistence is required for the sandbox payment design.

**Status:** Open

## REQ-PROFILE-002 - Fragrance preference profile field set

**Related requirements:** `FR-PROFILE-004`, `FR-PROFILE-005`, `FR-PROFILE-006`, `FR-PROFILE-007`

**Source status:** The brief names fragrance preference profile creation and several preference categories but does not define the complete profile field set.

**Decision needed:** Define the approved preference fields, which are optional versus required, and the allowed values or catalogue relationships for each field.

**Status:** Open

## REQ-PROFILE-003 - Optionality and minimum profile completion

**Related requirements:** `FR-PROFILE-004`, `FR-PROFILE-008`

**Source status:** The project documentation recommends making fragrance-profile fields optional wherever possible, but the minimum information required to generate a fragrance identity is not defined.

**Decision needed:** Define which profile fields may remain blank and the minimum approved input set required before a fragrance identity can be generated.

**Status:** Open

## REQ-PROFILE-004 - Meaning and privacy classification of fragrance sensitivity

**Related requirements:** `FR-PROFILE-007`

**Source status:** The brief requires fragrance sensitivity recording but does not define whether this means non-medical scent avoidance/preferences or collection of allergy, health, or other sensitive information.

**Decision needed:** Define the allowed sensitivity data, prohibit unapproved medical data collection, and confirm the required DPIA/privacy controls before implementation.

**Status:** Open

## REQ-PROFILE-005 - Fragrance Identity algorithm contract

**Related requirements:** `FR-PROFILE-008`, `FR-PERSONAL-007`, `FR-PERSONAL-008`

**Source status:** The project requires customer fragrance identity generation and separately lists a fragrance discovery quiz and AI-based recommendations, but it does not define the exact Fragrance Identity inputs, scoring rules, output labels, regeneration rules, or relationship to the later quiz/recommendation features.

**Decision needed:** Define the minimum inputs, identity taxonomy/output, scoring or rule approach, persistence behaviour, regeneration trigger, and relationship between Fragrance Identity, discovery quiz, and AI recommendations.

**Status:** Open
