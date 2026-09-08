# Checkout authority

Checkout is customer-only and revalidates the active cart, current variant prices, promotion, saved addresses, delivery method, and available stock in one server transaction. A successful initiation creates a placed order, pending payment attempt, and short inventory reservations; it never marks payment complete. The customer id plus idempotency key safely replays an identical request.
