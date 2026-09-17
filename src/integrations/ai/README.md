# Bounded recommendation provider boundary

`RecommendationProvider` is the only contract an AI implementation needs to
fulfil. `AiRecommendationService` obtains the validated candidate context from
`DiscoveryService`; it does not query Prisma, invoke tools, or read account,
address, order, payment, support, or inventory state. A provider receives this
redacted JSON shape only:

```json
{
  "quiz": {
    "id": "<quiz-id>",
    "version": "<version>",
    "answers": [{ "questionId": "<question-id>", "optionIds": ["<option-id>"] }]
  },
  "preferences": {
    "families": [{ "id": "<id>", "label": "<label>" }],
    "intensities": [{ "id": "<id>", "label": "<label>" }],
    "notes": [{ "id": "<id>", "label": "<label>" }],
    "suitability": {
      "occasion": [], "mood": [], "weather": [], "daypart": [], "season": []
    }
  },
  "candidates": [{
    "perfume": { "id": "<candidate-id>", "name": "<name>", "slug": "<slug>", "priceFrom": { "amountMinor": 12000, "currency": "AUD" } },
    "notes": [],
    "suitability": { "occasion": [], "mood": [], "weather": [], "daypart": [], "season": [] }
  }]
}
```

The provider may return only `{ recommendations: [{ perfumeId, reason }] }`.
Unknown candidate IDs, extra fields, empty output, malformed values, medical or
unsupported performance claims, timeouts and provider errors all use the
existing persisted deterministic `DiscoveryService.generate` fallback. Provider
output never changes catalogue facts or commerce state. The deterministic mock
is explicitly injected for tests; no live provider call or credentials were
used for this issue.
