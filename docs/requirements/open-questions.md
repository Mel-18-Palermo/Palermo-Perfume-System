# Open Requirements Questions

This register records ambiguities and omissions in the supplied Palermo project requirements. Development-team decisions may resolve an ambiguity for the SRS baseline but must not be presented as source-supplied detail.

## REQ-GAP-001 - Inventory and Production Batch Management

**Source status:** Module is explicitly named, but no complete numbered functional-requirement breakdown is supplied.

**Resolution:** Development-team-derived minimum scope is defined by `DER-INVENTORY-001` through `DER-INVENTORY-006` and decisions `D-067` through `D-072`.

**Status:** Resolved for SRS baseline as derived scope; not source-numbered client requirements.
## REQ-GAP-002 - Customer Reviews and Fragrance Community

**Source status:** Module is explicitly named, but no complete numbered functional-requirement breakdown is supplied.

**Resolution:** Development-team-derived minimum scope is defined by `DER-REVIEW-001`, `DER-COMMUNITY-001`, `D-073`, and `D-074`. The baseline community feature is the public review space only.

**Status:** Resolved for SRS baseline as derived scope; not source-numbered client requirements.
## REQ-GAP-003 - Loyalty, Subscription and Referral Management

**Source status:** Module is explicitly named, but no complete numbered functional-requirement breakdown is supplied.

**Resolution:** Development-team-derived minimum scope is defined by `DER-LOYALTY-001`, `DER-SUBSCRIPTION-001`, `DER-REFERRAL-001`, and decisions `D-075` through `D-077`.

**Status:** Resolved for SRS baseline as derived scope; not source-numbered client requirements.
## REQ-GAP-004 - Promotions and Social Media Content Management

**Source status:** Module is explicitly named. The project brief separately describes AI-assisted promotional video generation, including administrator preview/approval and authorised/copyright-safe assets, but the module is not integrated into the numbered functional-requirement list.

**Resolution:** Development-team-derived minimum scope is defined by `DER-PROMO-001`, `DER-SOCIAL-001`, `DER-SOCIAL-002`, and decisions `D-078` through `D-080`.

**Status:** Resolved for SRS baseline as derived scope; not source-numbered client requirements.
## REQ-GAP-005 - Duplicate source requirement number 78

**Source status:** The supplied functional-requirement list uses source number 78 for both `Customer feedback collection` and `Total sales dashboard`.

**Resolution:** Preserve both as separate canonical IDs. Do not renumber the source document; use canonical IDs throughout the new SRS.

**Status:** Resolved for internal traceability

## REQ-AUTH-001 - Registration field set and customer account identifier

**Related requirements:** `FR-AUTH-001`, `FR-AUTH-003`, `FR-AUTH-005`

**Resolution:** Registration requires name, email address, and password only. Email is the unique customer login identifier; the customer record uses an opaque internal identifier. Additional profile information is collected through the relevant profile requirements.

**Decision:** `D-003`

**Status:** Resolved for SRS baseline


## REQ-AUTH-002 - Relationship between email verification and account activation

**Related requirements:** `FR-AUTH-002`, `FR-AUTH-003`, `FR-AUTH-006`

**Resolution:** Newly registered accounts enter `PENDING_VERIFICATION`. Successful email verification automatically transitions the eligible account to `ACTIVE`. Normal customer activation does not require administrator approval. Login is permitted only for an eligible `ACTIVE` account.

**Decision:** `D-001`

**Status:** Resolved for SRS baseline


## REQ-AUTH-003 - Account deactivation and reactivation lifecycle

**Related requirements:** `FR-AUTH-006`, `FR-AUTH-007`

**Resolution:** An authenticated customer may self-deactivate their own `ACTIVE` account. Deactivation changes the account to `DEACTIVATED`, invalidates active sessions, and blocks login. Deactivation is not deletion; historical business records remain subject to approved retention rules. Reactivation is not added to current scope unless later requested and approved.

**Decision:** `D-002`

**Status:** Resolved for SRS baseline; detailed retention remains a DPIA design item


## REQ-PROFILE-001 - Delivery and billing address model

**Related requirements:** `FR-PROFILE-002`, `FR-PROFILE-003`

**Resolution:** Each customer may maintain one current delivery address and one current billing address. Billing may reuse the delivery address. Confirmed orders store immutable delivery/billing address snapshots so later profile edits do not change historical order records.

**Decision:** `D-004`

**Status:** Resolved for SRS baseline; exact address fields remain a data-design item


## REQ-PROFILE-002 - Fragrance preference profile field set

**Related requirements:** `FR-PROFILE-004`, `FR-PROFILE-005`, `FR-PROFILE-006`, `FR-PROFILE-007`

**Resolution:** The persistent preference profile is limited to the source-defined categories: favourite fragrance notes, preferred perfume intensity, and optional fragrance sensitivity/avoidance information. Fragrance Identity is generated system output rather than manually entered preference data.

**Decision:** `D-005`

**Status:** Resolved for SRS baseline


## REQ-PROFILE-003 - Optionality and minimum profile completion

**Related requirements:** `FR-PROFILE-004`, `FR-PROFILE-008`

**Resolution:** Preference-profile input fields are optional at profile level. Fragrance Identity generation requires at least one positive preference input: one favourite fragrance note or a preferred perfume intensity. Sensitivity/avoidance information alone is insufficient.

**Decisions:** `D-005`, `D-007`

**Status:** Resolved for SRS baseline


## REQ-PROFILE-004 - Meaning and privacy classification of fragrance sensitivity

**Related requirements:** `FR-PROFILE-007`

**Resolution:** Fragrance sensitivity is treated as optional non-medical fragrance avoidance/preference data. The system will not request or require medical diagnoses, medical history, medications, allergy diagnoses, or other health-condition information under this requirement.

**Decision:** `D-006`

**Status:** Resolved for SRS baseline


## REQ-PROFILE-005 - Fragrance Identity algorithm contract

**Related requirements:** `FR-PROFILE-008`, `FR-PERSONAL-007`, `FR-PERSONAL-008`

**Resolution:** Fragrance Identity uses deterministic rule-based classification derived from approved positive preferences, with avoidance data acting only as a negative/exclusion signal. It produces a primary fragrance-family/profile result plus an explanation. Relevant profile changes mark the identity for regeneration rather than silently replacing it.

**Decision:** `D-007`

**Remaining design item:** Exact family taxonomy and scoring weights must reuse the canonical fragrance-family vocabulary once catalogue requirements are refined.

**Status:** Resolved for SRS functional baseline; scoring details deferred to system design

