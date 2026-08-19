# Authentication and Profile Requirements Refinement

## Status

**Working SRS refinement — pending team/supervisor/client validation.**

This document refines canonical requirements `FR-AUTH-001` through `FR-PROFILE-008`.

The supplied Palermo project brief provides the requirement names and source numbering, but it does not define detailed actors, preconditions, lifecycle rules, validation rules, acceptance criteria, or data models for these items. Those details below are therefore **development-team proposals** unless explicitly marked as source baseline.

### Priority rule for this refinement

All 15 requirements are proposed as **MUST** because they are explicitly listed in the Palermo functional-requirement baseline and form the core customer account/profile capability. This MoSCoW priority is a team proposal and is not stated by the source document.

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
**Proposed actor:** Visitor  
**Proposed priority:** MUST  
**Refinement status:** Proposed

### SRS requirement

The system shall allow a visitor to create a customer account by submitting the approved registration information.

### Preconditions

- The visitor is not authenticated.
- Registration is available.

### Success outcome

- A new customer account is created.
- The account enters the approved initial account state.
- The email-verification process can be initiated under `FR-AUTH-002`.

### Proposed acceptance criteria

1. A visitor can submit all approved required registration fields.
2. Missing or invalid required values are rejected and the account is not created.
3. The configured unique customer-account identifier cannot create a duplicate active account.
4. A successful registration creates only one customer account for the submitted registration request.
5. The created account is associated only with the registering customer.
6. Successful registration makes the account eligible for the approved verification/activation process.

### Dependencies

- `FR-AUTH-002`
- `FR-AUTH-006`
- Relevant authentication, input-validation, privacy, and security NFRs

### Data involved

- Approved registration fields — exact field set pending decision
- Account identifier
- Account status
- Verification status

### Open decisions

- `REQ-AUTH-001`
- `REQ-AUTH-002`

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Test cases: TBD

---

## FR-AUTH-002 — Customer email verification

**Source #:** 2  
**Source baseline:** Customer email verification  
**Proposed actor:** Visitor / Customer  
**Proposed priority:** MUST  
**Refinement status:** Proposed

### SRS requirement

The system shall provide an email-verification process that allows the email address associated with a customer account to be verified.

### Preconditions

- A customer account exists.
- The account has an email address that requires verification.

### Success outcome

- The account email is recorded as verified.
- The account can proceed according to the approved account-lifecycle rules.

### Proposed acceptance criteria

1. The system can initiate verification for an eligible unverified customer email.
2. A valid verification action marks the corresponding email address as verified.
3. An invalid, expired, or already-consumed verification credential does not verify another account.
4. Verification of one account cannot change the verification state of another account.
5. Repeating an already-completed verification does not create a duplicate customer account.
6. Failure of the external email-delivery mechanism does not falsely mark the email as verified.

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

### Open decisions

- `REQ-AUTH-002`

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
**Proposed actor:** Customer  
**Proposed priority:** MUST  
**Refinement status:** OPEN — lifecycle meaning must be confirmed

### SRS requirement

The system shall support activation of a customer account according to the approved customer-account lifecycle.

### Preconditions

- A customer account exists.
- The account is in an approved state from which activation is permitted.

### Success outcome

- The account enters the approved active state.

### Proposed acceptance criteria

1. Only an account in an approved activation-eligible state can be activated.
2. Successful activation changes only the intended customer's account state.
3. Invalid account-state transitions are rejected.
4. Activation does not create a second customer account.
5. The resulting active account can use only the functions permitted by its authenticated role and verification state.

### Dependencies

- `FR-AUTH-001`
- `FR-AUTH-002`
- `FR-AUTH-007`

### Data involved

- Customer account identifier
- Account status
- Verification status
- Account-state timestamps where required

### Open decisions

- `REQ-AUTH-002`

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Test cases: TBD

---

## FR-AUTH-007 — Customer account deactivation

**Source #:** 7  
**Source baseline:** Customer account deactivation  
**Proposed actor:** Customer  
**Proposed priority:** MUST  
**Refinement status:** OPEN — deactivation lifecycle must be confirmed

### SRS requirement

The system shall allow an authorised customer to request deactivation of their own customer account according to the approved account-lifecycle and data-retention rules.

### Preconditions

- The customer is authenticated.
- The account is in a state from which customer-requested deactivation is permitted.

### Success outcome

- The customer account enters the approved deactivated state.
- The deactivated account can no longer perform functions that require an active customer account.

### Proposed acceptance criteria

1. A customer can request deactivation only for their own account.
2. A successful deactivation changes the account to the approved deactivated state.
3. A deactivated account cannot authenticate or perform protected customer actions unless the approved lifecycle explicitly allows reactivation.
4. Deactivation does not silently delete business records that must be retained for legitimate order, invoice, audit, or legal purposes.
5. Existing authenticated sessions are handled according to the approved deactivation policy.
6. Reactivation, if permitted, follows the approved activation process rather than creating a new customer account.

### Dependencies

- `FR-AUTH-003`
- `FR-AUTH-004`
- `FR-AUTH-006`
- Privacy, retention, audit, and session-management NFRs

### Data involved

- Customer account identifier
- Account status
- Deactivation timestamp/reason where approved
- Session state
- Retained customer-related records

### Open decisions

- `REQ-AUTH-003`

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
**Proposed actor:** Customer  
**Proposed priority:** MUST  
**Refinement status:** Proposed with address-model decision pending

### SRS requirement

The system shall allow an authenticated customer to manage delivery-address information associated with their own account according to the approved address model.

### Preconditions

- The customer is authenticated.

### Success outcome

- Valid delivery-address changes are stored and are available to customer functions that require delivery information.

### Proposed acceptance criteria

1. A customer can create delivery-address information allowed by the approved address model.
2. A customer can view their own stored delivery-address information.
3. A customer can update their own stored delivery-address information.
4. A customer can remove delivery-address information when removal is permitted by the approved order/data-retention rules.
5. Invalid required address values are rejected.
6. A customer cannot access another customer's saved delivery-address information.
7. Changing saved address information does not silently alter immutable delivery details already recorded for a confirmed order.

### Dependencies

- `FR-AUTH-003`
- `FR-ORDER-001`
- Delivery/order requirements
- Privacy and data-integrity NFRs

### Data involved

- Customer account identifier
- Approved delivery-address fields
- Address record identifier if multiple-address support is approved

### Open decisions

- `REQ-PROFILE-001`

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Test cases: TBD

---

## FR-PROFILE-003 — Billing address management

**Source #:** 10  
**Source baseline:** Billing address management  
**Proposed actor:** Customer  
**Proposed priority:** MUST  
**Refinement status:** Proposed with address-model decision pending

### SRS requirement

The system shall allow an authenticated customer to manage billing-address information associated with their own account according to the approved billing and payment model.

### Preconditions

- The customer is authenticated.

### Success outcome

- Valid billing-address changes are stored for the customer where billing-address storage is required by the approved checkout/payment design.

### Proposed acceptance criteria

1. A customer can create billing-address information permitted by the approved address model.
2. A customer can view their own stored billing-address information.
3. A customer can update their own stored billing-address information.
4. A customer can remove billing-address information when removal is permitted.
5. Invalid required billing-address values are rejected.
6. A customer cannot access another customer's stored billing-address information.
7. Customer profile storage does not store payment-card numbers or security codes as part of billing-address management.

### Dependencies

- `FR-AUTH-003`
- `FR-ORDER-002`
- Approved payment sandbox design
- Privacy and payment/security NFRs

### Data involved

- Customer account identifier
- Approved billing-address fields
- Address record identifier if multiple-address support is approved

### Open decisions

- `REQ-PROFILE-001`

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Test cases: TBD

---

## FR-PROFILE-004 — Fragrance preference profile creation

**Source #:** 11  
**Source baseline:** Fragrance preference profile creation  
**Proposed actor:** Customer  
**Proposed priority:** MUST  
**Refinement status:** Proposed

### SRS requirement

The system shall allow an authenticated customer to create a fragrance preference profile containing the approved fragrance-preference fields.

### Preconditions

- The customer is authenticated.

### Success outcome

- A fragrance preference profile is associated with the authenticated customer.

### Proposed acceptance criteria

1. An authenticated customer can create a fragrance preference profile for their own account.
2. The profile accepts only the approved fragrance-preference fields.
3. Optional preference fields can be left unanswered where the approved SRS marks them optional.
4. The system explains the purpose of collected fragrance-preference information at the point required by the approved privacy design.
5. Invalid submitted values are rejected without creating corrupt preference data.
6. A customer cannot create or modify a fragrance preference profile belonging to another customer.

### Dependencies

- `FR-AUTH-003`
- `FR-PROFILE-005`
- `FR-PROFILE-006`
- `FR-PROFILE-007`
- `FR-PROFILE-008`
- Privacy, validation, authorisation, and integrity NFRs

### Data involved

- Customer account identifier
- Approved fragrance-preference fields
- Preference-profile status/timestamps where required

### Open decisions

- `REQ-PROFILE-002`
- `REQ-PROFILE-003`

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
**Proposed actor:** Customer  
**Proposed priority:** MUST  
**Refinement status:** OPEN — privacy/data meaning must be confirmed

### SRS requirement

The system shall allow an authenticated customer to record, update, and remove approved fragrance-sensitivity information in their own fragrance preference profile.

### Preconditions

- The customer is authenticated.
- The project has defined what information qualifies as an approved fragrance-sensitivity field.

### Success outcome

- Approved sensitivity information is stored for the authenticated customer according to the approved privacy design.

### Proposed acceptance criteria

1. The customer can record fragrance-sensitivity information using only the approved input model.
2. The customer can view, update, or remove their own stored sensitivity information.
3. The field can remain unanswered when the approved SRS treats sensitivity information as optional.
4. The system provides the required privacy explanation at the point of collection.
5. A customer cannot access another customer's sensitivity information.
6. The application does not solicit additional medical or health information unless such collection is explicitly approved through the SRS and DPIA.
7. Invalid or unsupported sensitivity values are rejected according to the approved data model.

### Dependencies

- `FR-PROFILE-004`
- DPIA/privacy decisions
- Privacy, authorisation, validation, and data-minimisation NFRs

### Data involved

- Customer preference profile
- Approved sensitivity field(s)
- Data classification — pending decision

### Open decisions

- `REQ-PROFILE-004`

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
**Proposed actor:** Customer  
**Proposed priority:** MUST  
**Refinement status:** OPEN — identity inputs/output rules must be defined

### SRS requirement

The system shall generate a customer fragrance identity from the approved fragrance-preference inputs using the approved Fragrance Identity rules.

### Preconditions

- The customer has supplied the minimum approved input set required to generate a fragrance identity.
- The approved Fragrance Identity rules are available.

### Success outcome

- A fragrance identity result is generated for the customer.
- The result is associated with the customer's profile according to the approved data model.

### Proposed acceptance criteria

1. A customer who has supplied the minimum required inputs can request or trigger fragrance-identity generation according to the approved user flow.
2. The generation process uses only approved profile inputs and the approved identity rules.
3. The generated identity is stored or displayed only for the intended customer unless an approved administrative/reporting requirement states otherwise.
4. If required inputs are missing, the system does not fabricate an identity and instead indicates that additional approved information is required.
5. Re-running generation with unchanged approved inputs and the same rule version produces a consistent result where the approved algorithm is deterministic.
6. A customer can view their current generated fragrance identity.
7. Changes to preference data cause identity regeneration only according to the approved lifecycle rule.

### Dependencies

- `FR-PROFILE-004`
- `FR-PROFILE-005`
- `FR-PROFILE-006`
- `FR-PROFILE-007` only if sensitivity data is approved as an identity input
- `FR-PERSONAL-007`
- `FR-PERSONAL-008`
- Recommendation and data-integrity requirements

### Data involved

- Customer preference profile
- Approved Fragrance Identity inputs
- Identity result/label
- Identity rule/version identifier where required

### Open decisions

- `REQ-PROFILE-005`

### Traceability

- Use case: TBD
- UI: TBD
- Data entities: TBD
- Sequence model: TBD
- Test cases: TBD

---

# Validation Summary

## Proposed priority

All requirements in this document: **MUST — pending stakeholder validation**.

## Proposed actors

- Visitor
- Customer

## Requirements that cannot be fully frozen yet

- `FR-AUTH-006` — activation meaning
- `FR-AUTH-007` — deactivation/reactivation and retention lifecycle
- `FR-PROFILE-002` / `FR-PROFILE-003` — exact saved-address model
- `FR-PROFILE-007` — meaning and privacy classification of fragrance sensitivity
- `FR-PROFILE-008` — identity inputs, output taxonomy, and generation lifecycle

The unresolved decisions are recorded in the project-wide `open-questions.md`.
