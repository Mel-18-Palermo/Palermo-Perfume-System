# Public catalogue service

Issue #247 implements the public catalogue boundary for Visitor and Customer.
`CatalogueService` is the only database query authority for public perfume list,
detail and filter data. The route adapters are read-only and return the canonical
contract shapes.

`ACTIVE` perfumes with an active sellable variant are public. Archived perfumes,
unknown IDs and inactive filter vocabulary are excluded. Variant availability is
derived from both catalogue availability and inventory (`AVAILABLE`,
`OUT_OF_STOCK`, `UNAVAILABLE`); unavailable variants are omitted from public
detail results. Prices use integer minor units and the catalogue currency returned
by the stored variant data.

Search is bounded structured text over perfume name, slug and description.
Filters are ANDed across groups and ORed within each group: note, family,
collection, price range, intensity, occasion, mood and weather. Brand filtering,
AI ranking, arbitrary SQL fragments and client-provided ordering are unavailable.
Results use deterministic name/id ordering and bounded page sizes.

Endpoints:

- `GET /api/catalogue` — paginated summaries.
- `GET /api/catalogue/:id` — public detail.
- `GET /api/catalogue?filters=true` — active filter vocabulary.

No admin writes, cart, checkout or recommendation provider is included. The
service does not call external providers. Integration tests exercise list/detail,
filter combinations, archive/status isolation, malformed input and seeded query
latency; the 42-test suite completes within the configured 120-second hook budget.
