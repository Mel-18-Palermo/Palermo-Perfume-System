# Deterministic discovery

`DiscoveryService` preserves the structured quiz and persistence introduced by
PR #313. The active quiz definition supplies question order, required flags,
selection bounds and approved options. Submitted answers are validated against
that exact quiz version. A successful `generate` call persists the completed
attempt, selected responses and a fallback recommendation run in one transaction.
The result is deterministic apart from the new run identity and timestamp.

Mood, occasion and weather suggestions accept an **active suitability tag ID**
of the matching controlled category. There is no hard-coded vocabulary or live
weather lookup. `getCandidateContext` resolves quiz option values to active
family, intensity, note and suitability records, then returns at most twelve
current public catalogue candidates in stable match-count/name/ID order. The
match count is internal ordering only; no percentage or performance claim is
returned. Candidates require an active perfume and visible variant, so an
unpriced perfume cannot acquire a synthetic zero price. No provider is called.

`getFragranceWheel` returns active families and their active visible perfumes.
`getVirtualScentProfile` returns the approved family, ordered top/middle/base
notes, controlled longevity and projection labels when present, and
occasion/mood/weather/daypart/season tags. Missing layers and classifications
remain empty or `null`. These values describe catalogue metadata; they do not
reproduce a physical scent or supply evaporation times.

`getLayeringSuggestions` uses the conservative D-029 rule in `rules.ts`:
both perfumes must have the same active family, active intensity, exact
longevity classification and at least one shared active note. Missing data
produces no pairing. Different characteristics are not recommended. The
returned guidance describes application order only, without guaranteeing
compatibility or scent perception.

Synthetic evidence from the integration suite:

| Input | Deterministic result |
| --- | --- |
| Quiz v1, “Which fragrance family?”, option `Citrus` | Candidate `Demo Citrus`, family `Citrus`, current configured price AUD 120.00; attempt and fallback run persisted. |
| `Demo Citrus` with synthetic middle `Jasmine`, base `Musk`, longevity `Moderate`, projection `Soft`, evening and summer tags | Virtual profile with top `Bergamot`, middle `Jasmine`, base `Musk`, the two classifications and controlled suitability tags. |

The added notes, tags and classifications in the second row exist only inside
the disposable integration-test schema and are removed by the test. No fake
catalogue records are created in application code.
