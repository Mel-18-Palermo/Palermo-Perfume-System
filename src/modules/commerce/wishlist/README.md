# Wishlist authority

Wishlist rows are account-owned `(customerId, perfumeId)` pairs. The service requires an authenticated customer, makes repeated adds and removes idempotent, and returns current catalogue summaries with availability flags. Anonymous persistence and sharing are intentionally outside this boundary.
