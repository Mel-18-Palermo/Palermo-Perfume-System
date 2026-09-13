# QA #281 — Responsive, accessibility and browser QA (implemented surfaces)

Status: **Executed and evidenced**

Linked issue: #281 (P1, Sprint 3 hardening). Dependency #272 (mid-project integrated demo/CI/preview verification) is still open at the time of this run.

## 1. Scope actually implemented on `main`

Before executing checks, the merged state of `main` was inspected directly rather than assuming the full customer/admin surface set described in `docs/testing/nfr-validation-profile.txt` exists yet. At the commit this QA was run against (`main` @ `95d052c`), the only routes present are:

- `/` — application scaffold home page
- `/admin` — dashboard (placeholder, "not connected yet")
- `/admin/catalogue` — real interactive UI (list/create/edit/variant management) against canonical mocks
- `/admin/inventory` — placeholder
- `/admin/promotions` — placeholder
- `/admin/reporting` — placeholder
- `/admin/reviews` — placeholder

**Known limitation / out of scope for this run:** the customer-facing surfaces listed in the NFR profile as "key customer pages" (catalogue/discovery, product detail, cart, checkout entry, account/profile, order/tracking view) are not present on `main` — they exist only on separate, unmerged feature branches. They could not be QA'd here because they are not part of the implemented surface this issue is scoped to ("implemented customer/admin surfaces"). This should be re-run once those branches merge and #272 is verified.

## 2. Environment

- Local development server (`pnpm dev`, Next.js 16.3.3 / Turbopack), no live database configured in this environment.
- Admin surfaces render against the canonical mock adapter (`createMockApi`) already wired into `AdminSessionPreview` (dev-mode) and `admin-catalogue-api.ts` (unconditional), so this is a full, representative render of the real component tree and mock data — not a stub.
- Tooling: Playwright 1.56.1 driving Chromium, Firefox and WebKit; `@axe-core/playwright` 4.10.2 for automated WCAG 2.2 AA scanning. Installed in an isolated scratch directory, not added to the project's dependencies.
- Application commit under test: `95d052c` (`main`) plus the one fix described below.
- Date: 2026-09-13.

## 3. Responsive matrix (375 / 768 / 1440)

All 7 routes loaded at all 3 required widths. For every combination: no horizontal page scroll (`document.documentElement.scrollWidth` never exceeded `clientWidth`), no console/page errors.

| Route | 375 | 768 | 1440 |
|---|---|---|---|
| `/` | ✅ | ✅ | ✅ |
| `/admin` | ✅ | ✅ | ✅ |
| `/admin/catalogue` | ✅ | ✅ | ✅ |
| `/admin/inventory` | ✅ | ✅ | ✅ |
| `/admin/promotions` | ✅ | ✅ | ✅ |
| `/admin/reporting` | ✅ | ✅ | ✅ |
| `/admin/reviews` | ✅ | ✅ | ✅ |

## 4. Automated accessibility scan (axe-core, WCAG 2.2 AA ruleset)

### 4.1 Page-load scan (7 routes × 3 widths = 21 runs)

Zero Critical, Serious, or other-severity violations across every route/width combination.

### 4.2 Interactive-state scan (admin catalogue, 1440px)

The page-load scan alone doesn't reach client-side view transitions, so the catalogue's create form, edit form, and archive confirmation dialog were also driven and scanned directly:

| State | Before fix | After fix |
|---|---|---|
| Create-perfume form | 1 **Serious**: `color-contrast` | 0 |
| Edit-perfume form | 1 **Serious**: `color-contrast` | 0 |
| Archive confirmation dialog | 0 | 0 |

Native `<dialog>`/`showModal()` behaviour was also verified directly: focus moves inside the dialog on open, stays trapped there, and `Escape` closes it and returns focus to the triggering control — all confirmed programmatically (`activeInDialog: true`, `dialogClosedByEscape: true`).

## 5. Defect found and fixed

**Defect:** `color-contrast` (Serious) on the perfume create/edit form's disabled "Daypart, season, longevity, projection" section.

- **File:** `src/modules/administration/ui/catalogue/admin-perfume-form.tsx`
- **Root cause:** `opacity-60` was applied to the whole `<fieldset>` (legend, explanatory paragraph, and the disabled `<select>` together). That compounded with the paragraph's own `text-text-muted` token, pushing its effective contrast below the WCAG AA threshold for normal text.
- **Fix:** moved `opacity-60` from the `<fieldset>` onto the `<select>` alone. The disabled control still reads as visually inactive; the informational label and paragraph are restored to full, compliant contrast. Presentation-only change — no business logic, contract, or schema touched.
- **Verification:** re-ran the interactive-state axe scan; the violation is gone on both the create and edit forms (they share this component). Before/after screenshots captured at 1440px.

No other Critical/Serious findings were produced by any scan in this run, so no other fixes were made. Nothing was rewritten outside this bounded change.

## 6. Browser-family smoke matrix

Chromium (proxy for Chrome and Edge, both Chromium-based), Firefox, and WebKit (proxy for Safari — no Windows/macOS Edge or real Safari engine is available in this Linux/macOS sandbox) against all 7 routes:

| Engine | Routes checked | Result |
|---|---|---|
| Chromium (Chrome/Edge proxy) | 7/7 | 200 OK, non-empty render, 0 page errors |
| Firefox | 7/7 | 200 OK, non-empty render, 0 page errors |
| WebKit (Safari proxy) | 7/7 | 200 OK, non-empty render, 0 page errors |

**Limitation:** this environment cannot run real Microsoft Edge or Apple Safari; Chromium and WebKit are the closest available engine-level proxies. A real Edge/Safari pass should still be done on an actual Windows/macOS machine or via the team's usual cross-browser device access before final sign-off.

## 7. Keyboard / focus checklist

Performed on `/admin` and `/admin/catalogue` (the only surfaces with real interactive content):

- Skip-to-content link is the first tab stop, is visible on focus, and correctly moves focus to `#admin-content` on activation.
- Full tab order through the admin shell (skip link → nav items in section order → page actions → table row actions) is linear and logical, with a visible focus outline on every stop; no keyboard trap.
- Catalogue archive confirmation dialog: focus moves into the dialog on open, stays there while open (native `<dialog>` behaviour), and `Escape` closes it and returns focus to the row's "Archive" button.
- Mobile admin nav toggle (375px): operable with `Enter` (not only click), `aria-expanded` updates correctly, and `Escape` closes the menu and returns focus to the toggle button.

No keyboard defects found.

## 8. Loading / empty / error presentation

Verified on `/admin/catalogue` (the one surface with real async data loading) by temporarily toggling its mock composition's scenario flags, screenshotting, then reverting — no source change shipped from this step:

- **Loading:** skeleton rows with `aria-busy`/`aria-live` and an `sr-only` label.
- **Empty:** `AdminEmptyState` ("No perfumes yet") with a clear next action.
- **Error:** `AdminErrorState` with a retry action; scanned with axe — 0 violations.

## 9. Validation run

- `pnpm lint` — pass
- `pnpm typecheck` — pass
- `pnpm test` — 51/51 pass
- `pnpm build` — pass

## 10. Reporting summary

- **Scope tested:** all 7 routes actually present on `main` (home + 6 admin routes), at 375/768/1440px, across Chromium/Firefox/WebKit, plus the admin catalogue's interactive sub-states (create, edit, archive dialog, loading, empty, error).
- **Result:** 1 Serious accessibility defect found and fixed (contrast); 0 remaining Critical/Serious findings; 0 horizontal-scroll defects; 0 keyboard defects; 0 browser-smoke failures.
- **Known limitations:**
  - Customer-facing surfaces (catalogue/discovery, product detail, cart, checkout, account/profile, order/tracking) are not yet merged to `main` and were out of scope for this run — re-run once merged.
  - No live database is configured in this environment; admin surfaces were validated against their existing canonical-mock rendering path, which is how they already run in development.
  - Real Edge and Safari were not available; Chromium and WebKit stood in as engine-level proxies.
- **Recommendation:** safe to proceed for the currently-merged surface; schedule a follow-up QA pass once the outstanding customer-facing branches merge and #272's integrated demo/preview is verified.
