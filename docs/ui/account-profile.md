# Account and Profile — UI Requirements

This document describes the minimum screens/states needed to support UC-AUTH-001 through UC-AUTH-006 and UC-PROFILE-001 through UC-PROFILE-005. It describes required states only — it does not define visual design, layout, or styling.

---

## Screen: Registration (UC-AUTH-001)
**Fields (approved):** name, email, password.
**States:**
- Empty form
- Validating
- Error — missing/invalid required values
- Error — duplicate email
- Success — account created, `PENDING_VERIFICATION` → redirect to Verification Pending screen

**Flag:** A password-confirmation field is not specified in the source baseline; not added here without confirmation.

---

## Screen: Email Verification (UC-AUTH-002)
**States:**
- Verification pending (post-registration)
- Verifying (credential being activated)
- Verified / activated — account is now `ACTIVE`
- Error — invalid or expired credential
- Error — already consumed credential (no duplicate activation)

---

## Screen: Login (UC-AUTH-003)
**Fields:** email, password.
**States:**
- Empty form
- Authenticating
- Error — invalid credentials
- Error — account not permitted to authenticate
- Authenticated — redirect to account home

**Flag:** Whether a `PENDING_VERIFICATION` account can attempt login before verification is an open decision in the source document — the UI should not assume a resolution.

---

## Screen: Logout (UC-AUTH-004)
**States:**
- Authenticated
- Logout requested
- Session invalidated — redirect to public/Visitor view

---

## Screen: Password Reset (UC-AUTH-005)
**Step 1 — Request Reset**
- Empty form (account identifier/email)
- Submitted — generic confirmation shown regardless of account eligibility (no disclosure of account existence)

**Step 2 — Set New Password** (via reset credential/link)
- Empty form
- Validating (credential + password policy)
- Error — invalid/expired/already-used credential
- Error — password does not meet policy
- Success — redirect to Login

**Flag:** Exact password policy is not defined in the source baseline; the UI must not hardcode assumed rules until the policy is finalised.

---

## Screen: Account Deactivation (UC-AUTH-006)
**States:**
- Confirmation prompt (shown only when authenticated and `ACTIVE`)
- Deactivating
- Deactivated — session ended, redirect to public/Visitor view
- Error — account not owned by requester / account not `ACTIVE`

**Flag:** No reactivation screen exists — reactivation is out of scope per D-002.

---

## Screen: Profile Management (UC-PROFILE-001)
**States:**
- View — approved fields only
- Edit
- Validating
- Error — invalid values
- Saved

**Flag:** The full list of approved editable profile fields beyond registration data and the address/fragrance-preference modules is not fully enumerated in the source.

---

## Screen: Delivery Address (UC-PROFILE-002)
**States:**
- Empty (no address saved)
- Add/Edit form
- Validating
- Error — invalid required values
- Saved (one current address only)
- Remove — subject to approved checkout rules (exact rule not defined in source)

---

## Screen: Billing Address (UC-PROFILE-003)
**States:**
- Same-as-delivery toggle (on/off)
- Separate address form (shown when toggle is off)
- Validating
- Error — invalid required values
- Saved

**Note:** This screen must never include payment-card fields; card data is explicitly excluded from billing-address management.

---

## Screen: Fragrance Preferences (UC-PROFILE-004)
**States:**
- Empty/optional fields
- Select favourite notes (multi-select, optional)
- Select preferred intensity (single-select, optional)
- Record sensitivity/avoidance notes (optional, non-medical)
- Validating
- Error — invalid/unsupported values
- Saved

---

## Screen: Fragrance Identity (UC-PROFILE-005)
**States:**
- Not yet generated — insufficient positive preference input
- Generate requested
- Generated — shows primary fragrance family and explanation
- Stale / needs regeneration — shown after a relevant preference change
- Regenerate

**Flag:** The exact fragrance-family taxonomy shown here is a later design decision per D-007.
