# Final administrator UI/browser QA — production release candidate

- **Execution date:** 29 September 2026 (Melbourne)
- **Tested main baseline:** `090edc8c6165938927383b786e29c350313c4b6b`
- **Endpoint:** `https://www.palermoperfumes.store/admin`
- **Browser:** Playwright Chromium (headless)
- **Viewports exercised:** 375 × 812, 768 × 900, and 1440 × 900
- **Screenshots:** No new screenshots were required or captured.

## Result

**BLOCKED — do not merge as release QA evidence.** The admin login and signed-out route guards behaved responsively, but no locally configured administrator demo password was available. Authenticated administrator surfaces could not be verified without inventing credentials or changing production data.

## Routes and observations

| Surface | Routes exercised | Result |
| --- | --- | --- |
| Admin login | `/admin/login` | PASS at all three viewports: HTTP 200, no page-level horizontal overflow, reachable controls, first `Tab` reached a focusable control, and no page errors or console errors. |
| Signed-out route guards | `/admin`, `/admin/catalogue`, `/admin/inventory`, `/admin/orders`, `/admin/reviews`, `/admin/promotions`, `/admin/reporting` | PASS at all three viewports: each route redirected to `/admin/login?next=…`; the resulting login screen had no page-level overflow or unexpected runtime error. |
| Authenticated administrator navigation | dashboard, catalogue, inventory, production batches/batch inventory, orders, reviews, promotions/content, reporting | NOT TESTED: `PALERMO_DEMO_ADMIN_PASSWORD` was not configured locally. No credentials were fabricated and no production data was mutated. |

## Responsive, keyboard, and runtime checks

The login screen and each signed-out protected-route redirect were exercised at 375 px, 768 px, and 1440 px. `documentElement`/`body` page-width checks found no page-level horizontal overflow. The first `Tab` reached a focusable login control on every run. No `pageerror` or unexpected console-error event was observed.

## Defects and limitations

1. **Release blocker:** authenticated administrator acceptance scope, including dashboard, catalogue, inventory/batches, orders, reviews, promotions/content, reporting, and authenticated navigation, remains **NOT TESTED** because the required local demo admin credential is unavailable.
2. Loading, empty, error/retry, and pending states were not manufactured against production and remain **NOT TESTED**.
3. Chromium was the sole fresh browser. Historical Edge claims and unsupported version/test-count/build claims have been removed.
