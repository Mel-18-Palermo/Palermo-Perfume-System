# Final customer UI/browser QA — production release candidate

- **Execution date:** 29 September 2026 (Melbourne)
- **Tested main baseline:** `2dd4faa6a54ec060c04f71b68b3bf9bd5c4ac702` (documentation-only advance from the application release candidate)
- **Endpoint:** `https://www.palermoperfumes.store/`
- **Browser:** Playwright Chromium (headless)
- **Viewports exercised:** 375 × 812, 768 × 900, and 1440 × 900
- **Screenshots:** No new screenshots were required or captured.

## Result

**PASS — no release-blocking customer UI defect found in the exercised scope.** All listed read-only routes returned HTTP 200, had no page-level horizontal overflow, retained reachable interactive controls, and emitted no unexpected console or page errors at every viewport.

## Routes and observations

| Surface | Routes exercised | Result |
| --- | --- | --- |
| Public storefront | `/`, `/catalogue`, `/product/27100000-0000-4000-8000-000000001090`, `/quiz`, `/cart`, `/checkout`, `/support` | PASS. Checkout was presentation-only; no payment was initiated. |
| Legal | `/privacy`, `/terms`, `/shipping`, `/returns` | PASS. |
| Authenticated customer | `/account`, `/orders`, `/orders/24200000-0000-4000-8000-000000000041`, `/wishlist`, `/account/rewards`, `/participation` | PASS using the supplied demo customer account. The existing `DEMO-001` order detail opened read-only at all viewports. `/participation` resolves to the rewards surface. |
| Baran availability | `/product/27100000-0000-4000-8000-000000001090` | PASS: the known out-of-stock/unavailable state rendered at all viewports without overflow or runtime error. |
| Signed-out navigation | account, rewards, and protected links | PASS for route-guard presentation; expected sign-in redirects and the signed-out wishlist `401` response were not treated as application errors. |

## Accessibility, runtime, and limitations

The first `Tab` reached a focusable link or button on every exercised route at each viewport. No clipping or overlap of critical controls was observed during the automated pass. No `pageerror` event was observed. The only signed-out console error captured was the expected `401` from `/api/wishlist/get`.

The quiz consultation screen and answer controls rendered at all viewports. Full recommendation submission was not used as release evidence because it did not complete within the production-run time budget. Loading, forced error/retry, empty, and pending states were not manufactured against production. Chromium was the sole fresh browser; no Edge, test-count, build-count, or historical-run claim is retained.
