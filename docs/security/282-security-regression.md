# Security, Privacy and Transaction Regression — Issue #282

Date: 24 September 2026

## Scope

Regression review of the frozen Palermo trust boundaries after completion of the current backend feature set.

Reviewed areas:

- authentication and RBAC
- customer/admin object ownership
- secret exposure and sensitive logging
- server-side input validation
- Stripe webhook and payment authority
- checkout/payment idempotency
- inventory reservation and movement concurrency
- AI context and tool boundaries
- retention-sensitive persistence
- development/preview/production separation

## Findings

| Severity | Area | Finding | Result |
| --- | --- | --- | --- |
| None confirmed | Auth/RBAC | Authoritative principal, permission and customer-scoped ownership checks are present on reviewed protected paths. | No remediation required |
| None confirmed | Payments/checkout | Stripe-signed provider events remain authoritative for payment success. Finalisation is transactional and replay-safe; browser state cannot independently mark payment successful. | No remediation required |
| None confirmed | Inventory | Reservation, release, movement and payment-finalisation paths use guarded transactional updates and existing concurrency regression coverage. | No remediation required |
| None confirmed | AI boundaries | Support exposes only bounded intents and `order.lookup` for customer-owned orders. Promotional AI content requires explicit review before approval. Recommendation AI has no unrestricted database/tool authority. | No remediation required |
| None confirmed | Secrets/logging | Scoped production-code scan found no confirmed logging or committed exposure of credentials, session material, Stripe secrets, passwords or raw sensitive provider context. | No remediation required |
| None confirmed | Retention/environment | Support conversations carry expiry metadata. Demo/reset operations remain guarded to explicit development/preview targets and fail closed for production. | No remediation required |

## Trust-boundary checklist

- Auth/RBAC: PASS
- Customer ownership: PASS
- Admin permission enforcement: PASS
- Secret exposure review: PASS
- High-risk input validation: PASS
- Stripe webhook authority: PASS
- Payment replay/idempotency: PASS
- Inventory concurrency: PASS
- AI tool/context boundaries: PASS
- Sensitive logging review: PASS
- Retention metadata: PASS
- Preview/production separation: PASS

## Validation

Executed locally from `fix/282-security-regression`:

- `pnpm db:generate` — PASS
- `pnpm typecheck` — PASS
- `pnpm lint` — PASS
- `pnpm test` — PASS
- `pnpm test:db` — PASS
- `pnpm build` — PASS

The repository does not define a dedicated dependency/security audit command in `package.json` or the CI workflow. CI performs locked dependency installation, type checking, linting, unit/contract tests, isolated PostgreSQL integration tests and a production build.

## Result

No confirmed project-attributable Critical or High security, privacy or transaction defect was identified in the scoped regression.

No production code was changed under issue #282.
