# UI documentation

This directory combines current implementation guidance with frozen UI/SRS and presentation evidence. It is not a live feature-status register.

- [`design-system.md`](design-system.md) — shared visual tokens, responsive widths and component rules.
- [`catalogue-discovery.md`](catalogue-discovery.md), [`cart-order-delivery.md`](cart-order-delivery.md), [`account-profile.md`](account-profile.md), [`personalisation-ai-support.md`](personalisation-ai-support.md), and [`admin-derived-modules.md`](admin-derived-modules.md) — UI/SRS specifications by area.
- [`final-srs-ui-evidence-map.md`](final-srs-ui-evidence-map.md) — report evidence mapping.
- [`final-ui-remediation-plan.md`](final-ui-remediation-plan.md) and [`landing-page-implementation-plan.md`](landing-page-implementation-plan.md) — dated planning/remediation records; preserve their historical context.

Current browser clients use the shared contracts and server API boundaries described in [`../development/frontend-contracts.md`](../development/frontend-contracts.md). UI must not treat browser state as authority for payment, price, stock, order state or administrator permission.
