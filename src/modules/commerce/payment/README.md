# Payment boundary

The payment service exposes a provider-shaped sandbox adapter, stores only provider references, and finalises a pending order inside one transaction after a verified callback. Duplicate successful callbacks are idempotent; card data is never accepted or persisted.
