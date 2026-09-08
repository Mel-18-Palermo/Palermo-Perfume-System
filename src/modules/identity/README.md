# Identity foundation

Issue #244 implements FR-AUTH-001–007, D-001–003, D-008–009,
D-057–059 and D-084. Supabase Auth owns password hashing, email verification and
single-use recovery credentials. Palermo owns account eligibility, sessions and
database-backed administrator authorization. Customer registration takes only
name, email and password; metadata never grants administrative authority.

## Endpoints

All responses use `ApiResult<T>` and `Cache-Control: no-store`. POST requests need
JSON and an `Origin` header matching the requested application origin. Errors
contain safe codes/messages and an `x-request-id`; internal errors log only the
correlation identifier and code.

| Method/path | Input | Result |
| --- | --- | --- |
| POST `/api/auth/register` | name, email, password | PENDING_VERIFICATION |
| POST `/api/auth/verify` | token (Supabase signup token hash) | ACTIVE |
| POST `/api/auth/login` | email, password | Customer Session and HttpOnly cookie |
| POST `/api/auth/admin-login` | email, password | Admin Session and HttpOnly cookie |
| GET `/api/auth/session` | session cookie | Session, or user:null |
| POST `/api/auth/logout` | `{}` and cookie | Acknowledgement; cookie cleared |
| POST `/api/auth/deactivate` | `{}` and customer cookie | Acknowledgement; all customer sessions invalidated |
| POST `/api/auth/request-password-reset` | email | Acknowledgement |
| POST `/api/auth/complete-password-reset` | token (recovery hash), password | Acknowledgement; all customer sessions invalidated |

`api.auth.*` now uses the real browser HTTP adapter. Admin login and deactivation
are explicit server endpoints for subsequent admin/profile integration. UI pages
are outside this issue. No browser receives a Supabase access/refresh token or
service key. Local cURL callers must send `Origin: http://localhost:3000` and keep
cookie jars/verification credentials in ignored local files; never use verbose
logging with credentials.

## Lifecycle and authorization

Registration atomically claims a normalized unique email, creates a pending
customer and binds its provider UUID. Provider failure removes the unbound local
claim. Email verification activates only the matching pending customer. A hosted
Supabase confirmation can also be reconciled at password login after the provider
proves verification. Deactivated accounts cannot reactivate through either path.

Passwords require at least 12 characters and at most 72 UTF-8 bytes to respect
the provider's bcrypt input boundary. They are never stored in application tables.
Sessions use 32 random bytes, with only SHA-256 hashes stored in `IdentitySession`.
The cookie is HttpOnly, SameSite=Lax, Path=/ and Secure with a `__Host-` name in
production. Sessions have an absolute 24-hour expiry. Each protected request
rechecks current account eligibility and credential version in PostgreSQL; this
also rejects credentials issued concurrently with deactivation or reset.

`requireCustomer(token)` enforces customer identity. Every admin operation must
call `requirePermission(token, permissionCode)` server-side. The current active
admin, active role and explicit permission assignments come from the database on
every request. No wildcard, email convention, browser role or provider metadata
can grant access. No administrative account creation, role mutation or reactivation
endpoint is exposed here; later admin-management services must add permission
checks and audit records under D-059. Initial admin provisioning is owner-controlled.

Logout deletes the current application session; deactivation invalidates every
session and preserves the customer/history. Reset requests for unknown or
ineligible customers return the same acknowledgement. A valid recovery token
must match an active customer; sessions are revoked before and after replacement,
and provider recovery-session state is discarded. No recovery session becomes an
ordinary application login.

## Environment and email delivery

Normal server routes need `DATABASE_URL`, `DATABASE_CA_FILE`, `SUPABASE_URL` and
`SUPABASE_ANON_KEY`. They do not use `SUPABASE_SERVICE_ROLE_KEY`. Retrieve project
keys using the authenticated Supabase CLI and write them directly to `.env.local`;
never print them. Deploy only isolated Preview runtime credentials to Preview.

Supabase email confirmation must stay enabled (`mailer_autoconfirm=false`).
Configure the provider's Site URL and allowed redirect URLs for the intended
local/Preview UI before enabling customer email flows. Default provider-hosted
signup links verify email and then return to the configured Site URL; password
login reconciles activation. Custom UI verification/recovery screens can consume
the token hash sent by the corresponding Supabase email template and POST it to
these endpoints. Keep signup and recovery token types separate.

Supabase's built-in email service is restricted to project-team recipients and
has strict limits. Public visitor registration/reset delivery requires an approved
SMTP provider configured in Supabase. No SMTP credential is committed or assumed.
Email-delivery failures must remain failures, never successful verification.
The generated-link smoke test below verifies provider semantics without sending
email; it does **not** prove SMTP delivery or an integrated UI redirect journey.

## Validation

- `pnpm test`: unit/contract and strict HTTP-response validation.
- `pnpm test:db`: clean migrations, synthetic seed and identity lifecycle/RBAC/
  HTTP security tests in disposable `palermo_test`; no production target.
- `pnpm auth:check`: explicit owner-only live Supabase check using generated
  signup/recovery links and temporary `.test` customer/admin identities. Requires
  isolated development/preview DB and the local service role key. Tests real
  verification replay, password login/reset, logout, deactivation and default-deny
  admin sessions. Deletes its synthetic identities; prints no credentials and
  sends no emails. Never include this command in ordinary builds or CI.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`.

References: [Supabase password auth](https://supabase.com/docs/guides/auth/passwords),
[email templates](https://supabase.com/docs/guides/auth/auth-email-templates),
[password security](https://supabase.com/docs/guides/auth/password-security),
[sign-out semantics](https://supabase.com/docs/reference/javascript/auth-signout).
