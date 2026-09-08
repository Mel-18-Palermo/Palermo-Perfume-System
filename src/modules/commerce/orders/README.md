# Order history authority

Order queries are scoped to the authenticated customer and read immutable item/address/delivery snapshots. Invoices are created only after a succeeded payment. Cancellation records a request before shipment and never deletes, refunds, or silently changes an order state.
