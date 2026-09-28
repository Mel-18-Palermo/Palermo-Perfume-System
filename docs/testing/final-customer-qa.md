# Final customer UI/browser QA — production release candidate

- **Execution date:** 29 September 2026 (Melbourne)
- **Tested main baseline:** `090edc8c6165938927383b786e29c350313c4b6b`
- **Endpoint:** `https://www.palermoperfumes.store/`
- **Browser:** Playwright Chromium (headless)
- **Viewports exercised:** 375 × 812, 768 × 900, and 1440 × 900
- **Screenshots:** No new screenshots were required or captured.

## Result

**BLOCKED — do not merge as release QA evidence.** Public-route responsive checks were acceptable, but the locally configured demo customer credential was rejected by production as invalid or expired. Authenticated customer validation therefore could not be completed.

## Routes and observations

| Surface | Routes exercised | Result |
| --- | --- | --- |
| Public storefront | `/`, `/catalogue`, `/product/27100000-0000-4000-8000-000000001090`, `/quiz`, `/cart`, `/checkout`, `/support` | PASS for anonymous rendering at all three viewports: HTTP 200, no page-level horizontal overflow, reachable interactive controls, and no unexpected page errors. Checkout was presentation-only; no payment was started. |
| Legal | `/privacy`, `/terms`, `/shipping`, `/returns` | PASS at all three viewports under the same checks. |
| Signed-out navigation | `/account`, `/orders`, `/wishlist`, `/account/rewards`, `/participation` | Exercised. `/account` redirected to `/login?next=/account` in the signed-out session; `/participation` redirected to `/account/rewards`. Auth-dependent content is not claimed as verified. |
| Authenticated customer navigation | account, orders/tracking detail, wishlist, rewards/referrals/participation | NOT TESTED: the configured local customer password was submitted only to the production login form and production returned “The credentials or verification link are invalid or expired.” No account, order, or wishlist mutation was made. |
| Baran out-of-stock state | product detail | NOT TESTED: no safe, confirmed Baran identifier/state was established during this run. |

## Responsive, keyboard, and runtime checks

Each listed public route was opened at 375 px, 768 px, and 1440 px. `documentElement`/`body` page-width checks found no page-level horizontal overflow. All pages exposed reachable links, buttons, or form controls; the first `Tab` landed on a focusable control on every checked route. No clipping or overlap of critical controls was observed in the automated run.

No `pageerror` events were observed. Console errors were absent on the standard public routes. Signed-out catalogue/rewards runs returned an expected `401` from `/api/wishlist/get`; this is an authentication response, not recorded as an application crash. A transient `400` resource response appeared on some signed-out account navigation runs and was not treated as a successful authenticated check.

## Defects and limitations

1. **Release blocker:** production rejected the locally configured demo customer credential, preventing required authenticated customer, order/tracking, wishlist, rewards/referral, and safe checkout presentation verification.
2. No authenticated session was available, so order-detail/tracking and customer-only state assertions are deliberately **NOT TESTED**.
3. Error, loading, empty, and pending states were not manufactured against production. They are **NOT TESTED** unless described above.
4. Chromium was the sole fresh browser. Historical Edge claims and unsupported version/test-count/build claims have been removed.
