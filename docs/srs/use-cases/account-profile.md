# Account and Profile — Use Case Specifications

Scope: FR-AUTH-001 through FR-AUTH-007, FR-PROFILE-001 through FR-PROFILE-008
Decisions applied: D-001 through D-009
Actors used: Visitor, Customer (per canonical actor registry)

---

## UC-AUTH-001 — Register Account

**Primary Actor:** Visitor
**Mapped FR ID(s):** FR-AUTH-001

**Preconditions**
- The visitor is not authenticated.
- Registration is available.

**Trigger**
Visitor submits name, email address, and password to create a customer account.

**Main Success Flow**
1. Visitor opens registration and enters name, email address, and password.
2. System validates the submitted values.
3. System normalises the email address and confirms it is unique among customer login identifiers.
4. System creates a new customer account with an opaque internal identifier.
5. System sets the account status to `PENDING_VERIFICATION`.
6. System initiates the email-verification process (UC-AUTH-002).
7. Visitor is informed that the account was created and verification is pending.

**Alternate / Exception Flows**
- **A1 — Missing/invalid values:** Submission is rejected; no account is created.
- **A2 — Duplicate email:** Registration is rejected because the email is already a unique login identifier.
- **A3 — Unsupported extra data submitted:** Address, marketing, or fragrance-preference data is not required or accepted during registration.

**Postconditions**
- Success: exactly one new customer account exists in `PENDING_VERIFICATION`, with a unique internal ID and unique email.
- Failure: no account is created; system state is unchanged.

**Flags:** Exact password policy is not defined in the source baseline (noted as a downstream design item) — not invented here.

---

## UC-AUTH-002 — Verify Email

**Primary Actor:** Customer (account in `PENDING_VERIFICATION`)
**Mapped FR ID(s):** FR-AUTH-002, FR-AUTH-006

**Preconditions**
- A customer account exists in `PENDING_VERIFICATION`.
- The account has an email address requiring verification.

**Trigger**
Customer activates the verification credential/link delivered by the email service.

**Main Success Flow**
1. Customer receives a verification credential via the email delivery service.
2. Customer activates the verification credential.
3. System validates the credential.
4. System marks the account email as verified.
5. System automatically triggers activation (FR-AUTH-006): account transitions `PENDING_VERIFICATION` → `ACTIVE`.
6. Customer is informed the account is active and can log in.

**Alternate / Exception Flows**
- **A1 — Invalid/expired/already-consumed credential:** Verification fails; account remains `PENDING_VERIFICATION`.
- **A2 — Email-delivery failure:** The email is not falsely marked verified.
- **A3 — Repeat verification of an already-verified account:** Does not create a duplicate account or duplicate activation.

**Postconditions**
- Success: email is verified and account state is `ACTIVE`.
- Failure: account remains `PENDING_VERIFICATION`.

**Note:** Per D-001 and D-009, account activation (FR-AUTH-006) is an automatic, system-triggered transition embedded in this use case, not an independent actor-driven use case.

---

## UC-AUTH-003 — Log In

**Primary Actor:** Customer
**Mapped FR ID(s):** FR-AUTH-003

**Preconditions**
- A customer account exists.
- The account is in a state permitted to authenticate.

**Trigger**
Customer submits login credentials.

**Main Success Flow**
1. Customer enters email and password.
2. System validates the credentials.
3. System confirms the account is in a state permitted to authenticate.
4. System establishes an authenticated session per approved session-management rules.
5. Customer gains access to protected customer functions.

**Alternate / Exception Flows**
- **A1 — Invalid credentials:** Authentication fails; no session is created; no sensitive detail is exposed.
- **A2 — Account not permitted to authenticate:** Access is denied.

**Postconditions**
- Success: an authenticated customer session exists; no administrator privileges are granted.
- Failure: no session is created.

**Flags:** Whether a `PENDING_VERIFICATION` account may log in before verification is an open decision in the source document (referenced there as `REQ-AUTH-002`) — carried forward as an open question, not resolved here.

---

## UC-AUTH-004 — Log Out

**Primary Actor:** Customer
**Mapped FR ID(s):** FR-AUTH-004

**Preconditions**
- Customer has an active authenticated session.

**Trigger**
Customer requests logout.

**Main Success Flow**
1. Customer requests logout.
2. System invalidates the current authenticated session.
3. The session can no longer be used for protected customer actions.

**Alternate / Exception Flows**
- None defined in the source baseline beyond the main flow.

**Postconditions**
- Session is invalidated; account data, profile data, orders and preferences remain unmodified.

---

## UC-AUTH-005 — Reset Password

**Primary Actor:** Visitor / Customer
**Mapped FR ID(s):** FR-AUTH-005

**Preconditions**
- An eligible customer account exists.
- The customer cannot or does not wish to use the current password.

**Trigger**
Customer initiates the password-reset process.

**Main Success Flow**
1. Customer initiates password reset (submits account identifier/email).
2. System issues a reset credential via the approved recovery mechanism.
3. Customer uses the valid credential to submit a replacement password.
4. System validates the replacement password against the approved password policy.
5. System updates the authentication credential for the intended account.
6. The used reset credential cannot be reused.

**Alternate / Exception Flows**
- **A1 — Invalid/expired/already-used credential:** Password is not changed.
- **A2 — Reset requested for an ineligible/non-existent identifier:** System returns a safe, non-disclosing outcome.

**Postconditions**
- Success: only the intended account's credential is updated.
- Failure: no credential change; no sensitive information disclosed.

**Flags:** Exact authentication provider and password policy are explicitly listed in the source as later technical decisions.

---

## UC-AUTH-006 — Deactivate Account

**Primary Actor:** Customer
**Mapped FR ID(s):** FR-AUTH-007

**Preconditions**
- Customer is authenticated.
- Customer account is `ACTIVE`.

**Trigger**
Customer requests deactivation of their own account.

**Main Success Flow**
1. Customer requests account deactivation.
2. System confirms the account belongs to the requesting customer and is `ACTIVE`.
3. System transitions the account `ACTIVE` → `DEACTIVATED`.
4. System invalidates all existing authenticated sessions for that customer.
5. Historical records required for retention (orders, invoices, payment references, audit records) remain preserved.

**Alternate / Exception Flows**
- **A1 — Attempt to deactivate another customer's account:** Rejected.
- **A2 — Account not `ACTIVE`:** Deactivation does not apply.

**Postconditions**
- Account is `DEACTIVATED` and cannot authenticate.
- Deactivation is not deletion. Reactivation is out of scope per D-002 and is not included in this use case.

---

## UC-PROFILE-001 — Manage Customer Profile

**Primary Actor:** Customer
**Mapped FR ID(s):** FR-PROFILE-001

**Preconditions**
- Customer is authenticated.
- A customer profile exists or can be initialised.

**Trigger**
Customer views or edits approved editable profile fields.

**Main Success Flow**
1. Customer requests to view their profile.
2. System returns the customer's own approved profile information.
3. Customer edits one or more approved editable fields.
4. System validates the changes.
5. System stores valid changes against the authenticated customer's profile.

**Alternate / Exception Flows**
- **A1 — Invalid changes:** Rejected without corrupting previously stored valid data.
- **A2 — Attempt to view/modify another customer's profile:** Denied.
- **A3 — Fields outside the approved profile model:** Not accepted as profile data.

**Postconditions**
- Valid changes persist and are visible on subsequent authenticated requests.

**Flags:** The complete list of "approved editable fields" beyond registration data and the address/fragrance-preference modules covered by other use cases is not fully enumerated in the source — to be confirmed, not invented.

---

## UC-PROFILE-002 — Manage Delivery Address

**Primary Actor:** Customer
**Mapped FR ID(s):** FR-PROFILE-002

**Preconditions**
- Customer is authenticated.

**Trigger**
Customer creates, views, updates, or removes their current delivery address.

**Main Success Flow**
1. Customer submits delivery-address details.
2. System validates required values.
3. System stores the address as the customer's one current delivery address.
4. At order placement, the current delivery address is copied into the order as an immutable snapshot.

**Alternate / Exception Flows**
- **A1 — Invalid required values:** Rejected.
- **A2 — Removal:** Permitted only when allowed by approved checkout rules (exact rule not defined in source).
- **A3 — Access to another customer's address:** Denied.

**Postconditions**
- Customer has at most one current delivery address.
- Address snapshots on past confirmed orders remain unaffected by later profile changes.

---

## UC-PROFILE-003 — Manage Billing Address

**Primary Actor:** Customer
**Mapped FR ID(s):** FR-PROFILE-003

**Preconditions**
- Customer is authenticated.

**Trigger**
Customer creates, views, updates, or removes their current billing address, optionally reusing the delivery address.

**Main Success Flow**
1. Customer chooses to reuse the current delivery address as billing, or submits a separate billing address.
2. System validates required values if a separate address is submitted.
3. System stores the one current billing address (or the same-as-delivery indicator).
4. At order placement, applicable billing details are copied into the order as an immutable snapshot.

**Alternate / Exception Flows**
- **A1 — Invalid required values:** Rejected.
- **A2 — Access to another customer's billing address:** Denied.
- **A3 — Payment-card numbers/security codes:** Never stored as part of this use case.

**Postconditions**
- Customer has at most one current billing address, or a same-as-delivery flag.
- Billing snapshots on past confirmed orders remain unaffected by later changes.

---

## UC-PROFILE-004 — Manage Fragrance Preferences

**Primary Actor:** Customer
**Mapped FR ID(s):** FR-PROFILE-004, FR-PROFILE-005, FR-PROFILE-006, FR-PROFILE-007

**Preconditions**
- Customer is authenticated.
- Approved fragrance-note and intensity options are available.

**Trigger**
Customer creates or updates favourite notes, preferred intensity, and/or optional sensitivity/avoidance data.

**Main Success Flow**
1. Customer selects favourite fragrance notes (optional, one or more).
2. Customer selects a preferred perfume intensity from approved values (optional).
3. Customer optionally records non-medical fragrance characteristics/notes to avoid.
4. System validates all submitted values against approved reference data.
5. System stores the fragrance preference profile against the authenticated customer.

**Alternate / Exception Flows**
- **A1 — Invalid/unsupported values:** Rejected without corrupting previously stored valid data.
- **A2 — All fields left blank:** Permitted; each field is optional.
- **A3 — Access to another customer's preference profile:** Denied.
- **A4 — Medical/health-condition data:** Not requested or accepted under this use case.

**Postconditions**
- The fragrance preference profile reflects only approved, validated categories.
- The generated Fragrance Identity (UC-PROFILE-005) is never accepted back as customer-entered input.

---

## UC-PROFILE-005 — Generate Fragrance Identity

**Primary Actor:** Customer
**Mapped FR ID(s):** FR-PROFILE-008

**Preconditions**
- Customer is authenticated.
- At least one approved positive preference input exists (a favourite note or a preferred intensity).
- The approved Fragrance Identity rule set is available.

**Trigger**
Customer requests generation, or a relevant preference change marks the identity for regeneration.

**Main Success Flow**
1. System reads the customer's approved fragrance preference data.
2. System applies the deterministic, rule-based classification.
3. System determines a primary fragrance family/profile using the canonical fragrance-family vocabulary.
4. System generates a customer-facing explanation based on contributing preferences.
5. System associates the result with the customer's profile.
6. Customer views their current generated Fragrance Identity.

**Alternate / Exception Flows**
- **A1 — No positive preference input:** System does not fabricate an identity; informs the customer that more input is needed.
- **A2 — Relevant preference inputs change after generation:** The current identity is marked stale/for regeneration rather than silently replaced.
- **A3 — Re-run with unchanged inputs and the same rule version:** Produces a consistent result.

**Postconditions**
- Success: a primary fragrance family/profile and explanation are stored and viewable.
- Failure: no identity is generated; customer is informed why.

**Flags:** Exact fragrance-family taxonomy and scoring weights are a later design decision per D-007 and are not defined here.
