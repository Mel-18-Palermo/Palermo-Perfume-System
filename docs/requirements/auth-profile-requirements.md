# Authentication and Profile Requirements Refinement

## Status

**Validated team SRS refinement — source ambiguities resolved by recorded project decisions D-001 through D-007, with stakeholder confirmation still available if later required.**

This document refines canonical requirements `FR-AUTH-001` through `FR-PROFILE-008`.

The supplied Palermo project brief provides the requirement names and source numbering, but it does not define detailed actors, preconditions, lifecycle rules, validation rules, acceptance criteria, or data models for these items. Those details below are therefore **development-team proposals** unless explicitly marked as source baseline.

### Priority rule for this refinement

All 15 requirements are classified as **MUST** by the development team because they are explicitly listed in the Palermo functional-requirement baseline and form the core customer account/profile capability. This MoSCoW priority is a team decision and is not stated by the source document.

### Actor rule for this refinement

The initial business actors used here are:

- **Visitor** — a person who is not currently authenticated.
- **Customer** — a registered customer using customer-facing functions.

External technical services such as an email provider are not treated as business actors in this requirements document. They may appear later as external systems in architecture, DFD, or sequence models.

---

# 1. Customer Registration and Authentication

## FR-AUTH-001 — Customer account registration

**Source #:** 1  
**Source baseline:** Customer account registration  
**Actor:** Visitor  
**Priority:** MUST  
**Refinement status:** Validated by D-003

### SRS requirement

The system shall allow a visitor to create a customer account by submitting a name, email address, and password.

### Preconditions

- The visitor is not authenticated.
- Registration is available.

### Success outcome

- A new customer account is created with an internal system identifier.
- The submitted email address becomes the unique customer login identifier.
- The account enters `PENDING_VERIFICATION`.
- The email-verification process can be initiated under `FR-AUTH-002`.

### Acceptance criteria

1. A visitor can submit name, email address, and password to register.
2. Missing or invalid required values are rejected and the account is not created.
3. The email address is normalised according to the approved authentication design and must be unique among customer login identifiers.
4. Duplicate customer registration using an existing unique email identifier is rejected.
5. The system creates an opaque internal customer identifier independent of the customer's email address.
6. A successful registration creates only one customer account for the submitted request.
7. The resulting account state is `PENDING_VERIFICATION`.
8. Additional profile, address, marketing, or fragrance-preference data is not required during registration.

### Dependencies

- `FR-AUTH-002`
- `FR-AUTH-006`
- Relevant authentication, input-validation, privacy, and security NFRs

### Data involved

- Internal customer identifier
- Name
- Email address
- Authentication credential
- Account status
- Verification status

### Decision

**D-003:** Registration requires only name, email, and password. Email is the unique customer login identifier; an opaque internal identifier is used for the customer record.

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Test cases: TBD

---

## FR-AUTH-002 — Customer email verification

**Source #:** 2  
**Source baseline:** Customer email verification  
**Actor:** Visitor / Customer  
**Priority:** MUST  
**Refinement status:** Validated by D-001

### SRS requirement

The system shall provide an email-verification process that verifies control of the email address associated with a newly registered customer account.

### Preconditions

- A customer account exists in `PENDING_VERIFICATION`.
- The account has an email address that requires verification.

### Success outcome

- The account email is recorded as verified.
- Successful verification triggers `FR-AUTH-006` account activation.

### Acceptance criteria

1. The system can initiate email verification for an eligible unverified customer account.
2. A valid verification action marks only the intended account email as verified.
3. An invalid, expired, or already-consumed verification credential does not verify an account.
4. Verification of one account cannot change the verification state of another account.
5. Repeating an already-completed verification does not create a duplicate customer account.
6. Failure of the external email-delivery mechanism does not falsely mark the email as verified.
7. Successful email verification triggers the approved automatic activation transition defined by `FR-AUTH-006`.

### Dependencies

- `FR-AUTH-001`
- `FR-AUTH-006`
- Approved email-delivery mechanism
- Relevant security/session NFRs

### Data involved

- Customer account identifier
- Email address
- Verification state
- Verification credential/reference
- Verification timestamps where required

### Decision

**D-001:** Email verification and account activation remain separate requirements. Verification confirms control of the registered email address; successful verification automatically triggers account activation. No manual administrator approval is required unless later requested by the stakeholder.

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- External system: Email delivery service — technology TBD
- Test cases: TBD

---

## FR-AUTH-003 — Customer login

**Source #:** 3  
**Source baseline:** Customer login  
**Proposed actor:** Visitor  
**Proposed priority:** MUST  
**Refinement status:** Proposed

### SRS requirement

The system shall allow an eligible registered customer to authenticate using the approved customer credentials.

### Preconditions

- A customer account exists.
- The account is in a state permitted to authenticate.

### Success outcome

- The customer is authenticated.
- An authorised customer session is established according to the approved session-management rules.

### Proposed acceptance criteria

1. Valid credentials for an eligible customer account authenticate successfully.
2. Invalid credentials do not authenticate the user.
3. A customer account in a state that is not permitted to authenticate is denied access.
4. Authentication failure does not expose credentials or sensitive internal account details.
5. Successful login creates an authenticated customer context that can be used by protected customer functions.
6. Login does not grant administrator privileges unless those privileges are independently authorised by the system.

### Dependencies

- `FR-AUTH-001`
- `FR-AUTH-002` if verification is required before login
- `FR-AUTH-006`
- `FR-AUTH-007`
- Authentication, authorisation, security, and session NFRs

### Data involved

- Customer account identifier
- Authentication credential
- Account status
- Verification status
- Session state

### Open decisions

- `REQ-AUTH-002`

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Test cases: TBD

---

## FR-AUTH-004 — Customer logout

**Source #:** 4  
**Source baseline:** Customer logout  
**Proposed actor:** Customer  
**Proposed priority:** MUST  
**Refinement status:** Proposed

### SRS requirement

The system shall allow an authenticated customer to terminate their current authenticated session.

### Preconditions

- The customer has an active authenticated session.

### Success outcome

- The current authenticated session is no longer usable for protected customer actions.

### Proposed acceptance criteria

1. An authenticated customer can request logout.
2. After successful logout, the current session cannot be used to access protected customer functions.
3. Logout does not modify the customer's account data, profile data, orders, or preferences.
4. A logged-out user is required to authenticate again before accessing protected customer functions.

### Dependencies

- `FR-AUTH-003`
- Session-management NFRs

### Data involved

- Session identifier/state
- Customer account identifier

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Test cases: TBD

---

## FR-AUTH-005 — Password reset

**Source #:** 5  
**Source baseline:** Password reset  
**Proposed actor:** Visitor / Customer  
**Proposed priority:** MUST  
**Refinement status:** Proposed

### SRS requirement

The system shall provide an account-recovery process that allows an eligible customer to replace a forgotten or unusable password using an approved password-reset mechanism.

### Preconditions

- An eligible customer account exists.
- The customer cannot or does not wish to use the current password.

### Success outcome

- The customer's authentication credential is updated through the approved recovery process.
- Previously issued reset credentials cannot be reused after successful completion.

### Proposed acceptance criteria

1. A customer can initiate the approved password-reset process.
2. A valid reset credential allows the customer to set a replacement password that satisfies the approved password policy.
3. Invalid, expired, or already-used reset credentials do not change the password.
4. A successful password reset affects only the intended customer account.
5. The reset flow does not disclose sensitive authentication information.
6. The system provides a safe outcome when a reset is requested for an account identifier that is not eligible for reset.

### Dependencies

- `FR-AUTH-001`
- Approved authentication mechanism
- Approved email/recovery mechanism
- Security and session-management NFRs

### Data involved

- Customer account identifier
- Reset credential/reference
- Authentication credential
- Reset status/timestamps where required

### Open decisions

- Exact authentication provider and password policy are technical decisions to be defined later and should not be invented as client requirements.

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- External system: Recovery/email service — technology TBD
- Test cases: TBD

---

## FR-AUTH-006 — Customer account activation

**Source #:** 6  
**Source baseline:** Customer account activation  
**Trigger:** Successful email verification  
**Priority:** MUST  
**Refinement status:** Validated by D-001

### SRS requirement

The system shall automatically activate an eligible customer account after successful verification of its registered email address.

### Preconditions

- A customer account exists in `PENDING_VERIFICATION`.
- `FR-AUTH-002` has successfully verified the account email.

### Success outcome

- The customer account transitions from `PENDING_VERIFICATION` to `ACTIVE`.
- The account becomes eligible for customer login under `FR-AUTH-003`.

### Acceptance criteria

1. Only a `PENDING_VERIFICATION` account with successfully verified email can transition to `ACTIVE`.
2. Successful activation changes only the intended customer's account state.
3. Invalid account-state transitions are rejected.
4. Activation does not create a second customer account.
5. No manual administrator approval is required for normal customer activation.
6. An `ACTIVE` account can authenticate only through the approved login process and receives only customer-authorised privileges.

### Dependencies

- `FR-AUTH-001`
- `FR-AUTH-002`
- `FR-AUTH-003`
- `FR-AUTH-007`

### Data involved

- Customer account identifier
- Account status
- Verification status
- Account-state timestamps where required

### Decision

**D-001:** Activation is an automatic lifecycle transition following successful email verification.

### Traceability

- Use case: TBD
- UI: No independent customer action required; verification flow may communicate activation outcome
- Data entities: TBD
- Test cases: TBD

---

## FR-AUTH-007 — Customer account deactivation

**Source #:** 7  
**Source baseline:** Customer account deactivation  
**Actor:** Customer  
**Priority:** MUST  
**Refinement status:** Validated by D-002

### SRS requirement

The system shall allow an authenticated customer to deactivate their own active customer account, after which the account shall be marked `DEACTIVATED` and its active authenticated sessions invalidated.

### Preconditions

- The customer is authenticated.
- The customer account is `ACTIVE`.

### Success outcome

- The customer account transitions from `ACTIVE` to `DEACTIVATED`.
- Existing authenticated sessions for that customer are invalidated.
- The account cannot authenticate while deactivated.

### Acceptance criteria

1. A customer can request deactivation only for their own account.
2. A successful deactivation changes the account state from `ACTIVE` to `DEACTIVATED`.
3. A deactivated account cannot authenticate or perform protected customer actions.
4. Existing authenticated sessions are invalidated as part of the deactivation process.
5. Deactivation does not silently delete historical order, invoice, payment-reference, or audit records that must be retained.
6. Profile/personal-data retention or deletion is governed separately by the approved privacy and DPIA rules.
7. Reactivation is not included in the current approved behaviour and remains unspecified unless later requested and approved.

### Dependencies

- `FR-AUTH-003`
- `FR-AUTH-004`
- Privacy, retention, audit, and session-management NFRs

### Data involved

- Customer account identifier
- Account status
- Deactivation timestamp where required
- Session state
- Retained customer-related business records

### Decision

**D-002:** Deactivation is customer self-service for an authenticated `ACTIVE` account. It is not account deletion. Reactivation is not silently added to scope.

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Test cases: TBD

---

# 2. Customer Profile and Fragrance Identity

## FR-PROFILE-001 — Customer profile management

**Source #:** 8  
**Source baseline:** Customer profile management  
**Proposed actor:** Customer  
**Proposed priority:** MUST  
**Refinement status:** Proposed

### SRS requirement

The system shall allow an authenticated customer to view and update the approved editable information in their own customer profile.

### Preconditions

- The customer is authenticated.
- A customer profile exists or can be initialised for the account.

### Success outcome

- Valid profile changes are stored for the authenticated customer.

### Proposed acceptance criteria

1. An authenticated customer can view their own approved profile information.
2. The customer can update fields defined as editable by the approved profile model.
3. Invalid profile changes are rejected without corrupting previously stored valid profile data.
4. A customer cannot view or modify another customer's private profile through customer-facing functions.
5. Successful changes remain available after a subsequent authenticated request.
6. Fields not included in the approved profile model are not silently accepted as profile data.

### Dependencies

- `FR-AUTH-003`
- Relevant validation, authorisation, privacy, and integrity NFRs

### Data involved

- Customer account identifier
- Approved profile fields
- Profile update timestamps where required

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Test cases: TBD

---

## FR-PROFILE-002 — Delivery address management

**Source #:** 9  
**Source baseline:** Delivery address management  
**Actor:** Customer  
**Priority:** MUST  
**Refinement status:** Validated by D-004

### SRS requirement

The system shall allow an authenticated customer to create, view, update, and remove one current delivery address associated with their own account.

### Preconditions

- The customer is authenticated.

### Success outcome

- Valid current delivery-address information is stored for the customer.
- When an order is placed, the applicable delivery address is copied into that order as an immutable order-address snapshot.

### Acceptance criteria

1. A customer can maintain at most one current saved delivery address in their profile.
2. The customer can view and update their own current delivery address.
3. The customer can remove the saved delivery address when permitted by the approved checkout rules.
4. Invalid required address values are rejected.
5. A customer cannot access another customer's saved delivery address.
6. Changing the current profile delivery address does not alter delivery-address snapshots stored against previously confirmed orders.
7. Checkout can use the current saved delivery address as the initial delivery address when available.

### Dependencies

- `FR-AUTH-003`
- `FR-ORDER-001`
- Delivery/order requirements
- Privacy and data-integrity NFRs

### Data involved

- Customer account identifier
- Current delivery-address fields
- Immutable order-address snapshot at order placement

### Decision

**D-004:** One current delivery address is stored per customer; historical orders preserve independent immutable address snapshots.

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Test cases: TBD

---

## FR-PROFILE-003 — Billing address management

**Source #:** 10  
**Source baseline:** Billing address management  
**Actor:** Customer  
**Priority:** MUST  
**Refinement status:** Validated by D-004

### SRS requirement

The system shall allow an authenticated customer to create, view, update, and remove one current billing address associated with their own account, with the option to use the current delivery address as the billing address.

### Preconditions

- The customer is authenticated.

### Success outcome

- Valid current billing-address information is stored where a separate billing address is required.
- When an order is placed, the applicable billing details are copied into that order as an immutable order-address snapshot.

### Acceptance criteria

1. A customer can maintain at most one current saved billing address in their profile.
2. The customer can choose to use the current delivery address as the billing address.
3. The customer can maintain a separate current billing address when required.
4. Invalid required billing-address values are rejected.
5. A customer cannot access another customer's stored billing address.
6. Changing the current profile billing address does not alter billing-address snapshots stored against previously confirmed orders.
7. Customer profile storage does not store payment-card numbers or security codes as part of billing-address management.

### Dependencies

- `FR-AUTH-003`
- `FR-ORDER-002`
- Approved payment sandbox design
- Privacy and payment/security NFRs

### Data involved

- Customer account identifier
- Current billing-address fields
- Same-as-delivery indicator where used
- Immutable order-address snapshot at order placement

### Decision

**D-004:** One current billing address is stored per customer; billing may reuse the delivery address; historical orders preserve independent immutable address snapshots.

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Test cases: TBD

---

## FR-PROFILE-004 — Fragrance preference profile creation

**Source #:** 11  
**Source baseline:** Fragrance preference profile creation  
**Actor:** Customer  
**Priority:** MUST  
**Refinement status:** Validated by D-005

### SRS requirement

The system shall allow an authenticated customer to maintain a fragrance preference profile containing the source-defined preference categories: favourite fragrance notes, preferred perfume intensity, and optional fragrance-sensitivity/avoidance information.

### Preconditions

- The customer is authenticated.

### Success outcome

- A fragrance preference profile is associated with the authenticated customer.
- The customer's generated Fragrance Identity is treated as system-generated output rather than manually entered preference data.

### Acceptance criteria

1. An authenticated customer can create a fragrance preference profile for their own account.
2. The profile contains only the approved preference categories and later explicitly approved additions.
3. Favourite notes, preferred intensity, and fragrance sensitivity/avoidance fields are optional at profile level.
4. The system does not require address, marketing, demographic, or unrelated personal information to create the fragrance preference profile.
5. Invalid submitted values are rejected without corrupting previously stored valid preference data.
6. A customer cannot create or modify another customer's fragrance preference profile.
7. The generated Fragrance Identity is not accepted as customer-entered profile input.

### Dependencies

- `FR-AUTH-003`
- `FR-PROFILE-005`
- `FR-PROFILE-006`
- `FR-PROFILE-007`
- `FR-PROFILE-008`
- Privacy, validation, authorisation, and integrity NFRs

### Data involved

- Customer account identifier
- Favourite fragrance-note references
- Preferred perfume intensity
- Optional fragrance-sensitivity/avoidance data
- Generated Fragrance Identity output

### Decision

**D-005:** The persistent preference profile is limited to source-defined preference categories. Input fields are optional at profile level; Fragrance Identity is generated output.

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Test cases: TBD

---

## FR-PROFILE-005 — Favourite fragrance note selection

**Source #:** 12  
**Source baseline:** Favourite fragrance note selection  
**Proposed actor:** Customer  
**Proposed priority:** MUST  
**Refinement status:** Proposed

### SRS requirement

The system shall allow an authenticated customer to select and maintain favourite fragrance notes within their fragrance preference profile.

### Preconditions

- The customer is authenticated.
- Approved fragrance-note options are available.

### Success outcome

- The customer's selected favourite fragrance notes are stored in their fragrance preference profile.

### Proposed acceptance criteria

1. The customer can select one or more approved fragrance notes as favourites when the approved model allows multiple selections.
2. The customer can view their current favourite-note selections.
3. The customer can change or remove previous favourite-note selections.
4. Only valid fragrance-note references are stored.
5. Favourite-note changes affect only the authenticated customer's preference profile.
6. The system handles a customer having no selected favourite notes when the field is optional.

### Dependencies

- `FR-PROFILE-004`
- Product/fragrance-note data requirements

### Data involved

- Customer preference profile
- Fragrance-note identifiers
- Preference relationship data

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Test cases: TBD

---

## FR-PROFILE-006 — Preferred perfume intensity selection

**Source #:** 13  
**Source baseline:** Preferred perfume intensity selection  
**Proposed actor:** Customer  
**Proposed priority:** MUST  
**Refinement status:** Proposed

### SRS requirement

The system shall allow an authenticated customer to select and maintain a preferred perfume intensity within their fragrance preference profile using the approved intensity values.

### Preconditions

- The customer is authenticated.
- The approved perfume-intensity options have been defined.

### Success outcome

- The selected perfume-intensity preference is stored for the authenticated customer.

### Proposed acceptance criteria

1. The customer can select an approved perfume-intensity value.
2. The customer can view their current intensity preference.
3. The customer can change or clear the preference when the field is optional.
4. Values outside the approved intensity set are rejected.
5. The preference is stored only against the authenticated customer's profile.

### Dependencies

- `FR-PROFILE-004`
- Product intensity/concentration data requirements

### Data involved

- Customer preference profile
- Approved intensity value

### Open decisions

- Exact customer-facing intensity vocabulary must be defined consistently with catalogue/product data.

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Test cases: TBD

---

## FR-PROFILE-007 — Fragrance sensitivity recording

**Source #:** 14  
**Source baseline:** Fragrance sensitivity recording  
**Actor:** Customer  
**Priority:** MUST  
**Refinement status:** Validated by D-006

### SRS requirement

The system shall allow an authenticated customer to optionally record fragrance characteristics or fragrance notes they prefer to avoid due to personal sensitivity or preference.

### Preconditions

- The customer is authenticated.
- Approved fragrance-note/avoidance values are available.

### Success outcome

- Optional non-medical fragrance-avoidance information is stored for the authenticated customer.

### Acceptance criteria

1. The customer can record one or more approved fragrance characteristics or fragrance notes to avoid.
2. The customer can view, update, and remove their own stored avoidance information.
3. The field may remain unanswered.
4. A customer cannot access another customer's avoidance information.
5. The application does not request or require medical diagnoses, medical history, medications, allergy diagnoses, or other health-condition information under this requirement.
6. The avoidance information may be used by approved recommendation/identity logic only as a negative preference or exclusion signal.
7. Invalid or unsupported values are rejected according to the approved fragrance-note data model.

### Dependencies

- `FR-PROFILE-004`
- Fragrance-note catalogue requirements
- Privacy, authorisation, validation, and data-minimisation NFRs

### Data involved

- Customer preference profile
- Approved fragrance-note/characteristic avoidance references
- Non-medical preference classification

### Decision

**D-006:** “Fragrance sensitivity” is implemented as optional non-medical fragrance avoidance/preference data. Medical and health-condition data is outside this requirement.

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- DPIA item: TBD
- Test cases: TBD

---

## FR-PROFILE-008 — Customer fragrance identity generation

**Source #:** 15  
**Source baseline:** Customer fragrance identity generation  
**Actor:** Customer  
**Priority:** MUST  
**Refinement status:** Validated by D-007

### SRS requirement

The system shall generate a customer's Fragrance Identity using a deterministic, rule-based classification derived from the customer's approved fragrance preference data.

### Preconditions

- The customer is authenticated.
- At least one approved positive preference input exists: one favourite fragrance note or a preferred perfume intensity.
- The approved Fragrance Identity rule set is available.

### Success outcome

- A primary fragrance-family/profile result is generated for the customer.
- The result includes a customer-facing explanation derived from contributing approved preferences.
- The generated identity is associated with the customer's profile.

### Acceptance criteria

1. Fragrance Identity generation requires at least one positive preference input.
2. Sensitivity/avoidance information alone is insufficient to generate an identity.
3. Generation uses only approved preference inputs and the approved deterministic rule set.
4. The result identifies a primary fragrance family/profile using the canonical fragrance-family vocabulary once that vocabulary is frozen.
5. The result provides an explanation based on contributing approved preferences.
6. The system does not infer medical, psychological, personality, or demographic characteristics from the preference data.
7. If minimum required input is missing, the system does not fabricate an identity and indicates that additional positive preference information is required.
8. Re-running generation with unchanged approved inputs and the same rule version produces a consistent result.
9. When relevant preference inputs change, the current identity is marked for regeneration rather than silently replaced.
10. The customer can view their current generated Fragrance Identity.

### Dependencies

- `FR-PROFILE-004`
- `FR-PROFILE-005`
- `FR-PROFILE-006`
- `FR-PROFILE-007`
- Fragrance-family catalogue requirements
- `FR-PERSONAL-007`
- `FR-PERSONAL-008`
- Recommendation and data-integrity requirements

### Data involved

- Customer preference profile
- Approved Fragrance Identity inputs
- Primary identity family/profile
- Customer-facing explanation
- Identity rule/version identifier
- Identity freshness/stale state

### Decision

**D-007:** Fragrance Identity is deterministic and rule-based. Exact family taxonomy and scoring weights remain a later design decision and must reuse the canonical catalogue/fragrance-family vocabulary.

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Sequence model: TBD
- Test cases: TBD

---

# Validation Summary

## Approved project decisions

| Decision | Resolution |
|---|---|
| `D-001` | Successful email verification automatically activates a `PENDING_VERIFICATION` customer account; no normal administrator approval step. |
| `D-002` | Authenticated customers may self-deactivate an `ACTIVE` account; sessions are invalidated; deactivation is not deletion; reactivation is not currently added to scope. |
| `D-003` | Registration requires name, email, and password only; email is the unique login identifier; customer records use an opaque internal identifier. |
| `D-004` | One current delivery address and one current billing address per customer; billing may reuse delivery; confirmed orders store immutable address snapshots. |
| `D-005` | Fragrance preference profile contains favourite notes, preferred intensity, and optional non-medical sensitivity/avoidance data; profile input fields are optional; Fragrance Identity is generated output. |
| `D-006` | Fragrance sensitivity means non-medical fragrance avoidance/preference data; medical/health-condition data is not collected under this requirement. |
| `D-007` | Fragrance Identity uses deterministic rule-based classification, requires at least one positive preference input, and does not silently regenerate when source preferences change. |

## Priority

All requirements in this document: **MUST — development-team delivery classification.**

## Business actors used by these requirements

- Visitor
- Customer

`FR-AUTH-006` is a system-triggered lifecycle transition rather than a separate actor-driven use case.

## Remaining downstream design items

These do not block the AUTH + PROFILE functional baseline, but must be defined consistently in later SRS work:

- exact password policy and authentication-provider choice;
- exact address-field schema;
- canonical fragrance-note and fragrance-family vocabularies;
- exact Fragrance Identity family taxonomy and deterministic scoring weights;
- privacy/DPIA retention rules for deactivated accounts;
- use-case, UI, entity, sequence, and test traceability.

AUTH + PROFILE requirements are now ready to feed the actor/use-case modelling stage.
