# Customer profile authority

`ProfileService` is the server owner for authenticated customer profile data. It scopes every read and write to the authenticated customer id, maintains one current delivery and billing address per type, and uses optimistic `profile-N` revisions for mutations.

Fragrance preferences accept approved catalogue note and intensity ids plus optional non-medical avoidance text. Identity generation is deterministic: the first approved favourite-note match wins, with preferred intensity as the fallback. Preference changes mark an existing identity stale; generation requires a positive note or intensity input and records the canonical catalogue family and explanation.
