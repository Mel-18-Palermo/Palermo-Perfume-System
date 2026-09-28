# Synthetic imported demo history

`pnpm demo:populate-history` is an owner-operated, additive population tool for the controlled Palermo Production demo schema. It is not part of application startup, builds, migrations, CI deployment, `db:seed`, or `demo:reset`.

The `presentation-v1` profile generates deterministic synthetic `.test` customers, Victorian-style addresses, imported orders/items/payments/invoices/shipments/tracking, purchase-qualified reviews, wishlists, and current active carts. Its stable IDs derive from `palermo-demo-history:presentation-v1`; the seed changes attributes and distribution, never ownership identity.

Historical commerce ends immediately before the minimum `Perfume.createdAt` for every product in `approvedCatalogueManifest`. It is explicitly imported legacy history at catalogue cutover. Consequently it never writes `InventoryBalance`, `InventoryMovement`, `InventoryReservation`, `ProductionBatch`, availability, loyalty/referral, Auth/session, or Support records. `DEMO_HISTORY_IMPORT` is a narrowly constrained payment provider identity, distinct from live `STRIPE_SANDBOX` checkout records.

Dry run against the configured Production demo target:

```sh
pnpm demo:populate-history -- --profile=presentation-v1 --seed=20260928 --as-of=2026-09-28T04:30:00.000Z
```

Mutation additionally requires `--target=palermo_prod --apply --confirm=synthetic-demo-production`, the configured project reference, matching database host/user, verified TLS, and a non-Vercel process. Existing owned rows must exactly match; otherwise the tool fails closed and never rewrites or deletes data.
