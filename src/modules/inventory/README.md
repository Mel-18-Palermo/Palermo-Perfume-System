# Inventory authority

Inventory mutations are server-side and attributable. Reservation updates use conditional balance writes, commit/release transitions are idempotent, movements carry unique references, and production batches can be released once by an administrator with `inventory:manage`. Raw-material planning and ERP workflows are outside this boundary.
