# Catalogue, Discovery and Virtual Fragrance — UI Requirements

## Purpose

Define the minimum user-interface surfaces needed to satisfy issue #163. This document describes screens, states, and visible behaviour only. It does not define database schema, APIs, or implementation architecture.

## Actor access

| Surface | Visitor | Customer | Administrator |
|---|---:|---:|---:|
| Public catalogue | Yes | Yes | Yes, as a public user |
| Search and filtering | Yes | Yes | Yes, as a public user |
| Product / virtual-fragrance view | Yes | Yes | Yes, as a public user |
| Comparison | Yes | Yes | Yes, as a public user |
| Fragrance wheel | Yes | Yes | Yes, as a public user |
| Catalogue administration | No | No | Authorised only |

## Public UI

### `UI-CAT-001` — Catalogue

**Supports:** `UC-DISC-001`, `UC-DISC-002`, `UC-DISC-003`, `UC-DISC-004`

Required elements:
- perfume result list/grid;
- keyword search;
- filters for fragrance note, fragrance family, price range, intensity, occasion, and mood;
- a separate weather-category suggestion control;
- clear controls to apply and clear selected criteria;
- current variant availability visible before purchase-oriented navigation;
- action to open a perfume;
- action to add two or three perfumes to comparison.

Required states:
- loading;
- normal results;
- no results;
- data unavailable/error;
- perfume/variant unavailable for purchase.

Rules:
- archived perfumes must not appear;
- unavailable variants may remain discoverable but must be visibly unavailable;
- no brand filter;
- search/filtering is structured and does not present itself as AI;
- weather suggestions must not imply live weather unless a future approved source provides it.

### `UI-CAT-002` — Perfume detail and virtual-fragrance view

**Supports:** `UC-DISC-001`, `UC-VIRT-002`, `UC-VIRT-003`

Required elements:
- perfume name, description, and images;
- primary fragrance family;
- reusable top, middle/heart, and base notes presented in note-journey order;
- sellable variants with bottle size, concentration, price, and availability;
- controlled longevity classification;
- controlled projection classification;
- daytime/evening suitability;
- seasonal suitability;
- consolidated virtual scent-profile presentation;
- action to add the perfume to comparison.

Required states:
- loading;
- normal;
- variant unavailable;
- optional catalogue metadata missing;
- general error.

Rules:
- shared perfume information and variant information must be visually distinguishable;
- no fabricated note timing;
- no unsupported numerical longevity/projection prediction;
- virtual scent information must not claim to reproduce or guarantee physical scent perception.

### `UI-CAT-003` — Perfume comparison

**Supports:** `UC-DISC-005`

Required elements:
- exactly two or three comparison columns/cards;
- clear perfume identification;
- primary family;
- note structure;
- available variant information;
- longevity and projection classifications;
- daytime/evening and seasonal suitability;
- virtual scent-profile information;
- action to remove a perfume or open its detail view.

Required states:
- insufficient selections;
- valid two-perfume comparison;
- valid three-perfume comparison;
- selected perfume no longer available for comparison;
- general error.

Rules:
- no automatic "best perfume" or subjective winner;
- comparison uses approved structured data only.

### `UI-CAT-004` — Interactive fragrance wheel

**Supports:** `UC-VIRT-001`

Required elements:
- visual representation of the canonical fragrance families;
- selectable family;
- visible selected-family state;
- associated active perfumes for the selected family;
- action to open an associated perfume.

Required states:
- normal;
- family selected;
- family with no active perfumes;
- data unavailable/error.

Rules:
- the wheel is navigation/discovery, not an AI recommendation interface;
- family names come from the canonical controlled vocabulary.

## Administrator UI

### `UI-ADMIN-CAT-001` — Perfume catalogue management

**Supports:** `UC-CAT-001`, `UC-CAT-002`

Required elements:
- product list with active/archived visibility;
- create-perfume action;
- edit shared description and image information;
- primary product status/archive action;
- variant list under each perfume;
- variant controls for bottle size, concentration, SKU, price, and availability;
- clear save/cancel actions;
- visible validation feedback.

Required states:
- list loading;
- empty catalogue;
- create;
- edit;
- validation error;
- save success;
- archive confirmation;
- save failure.

Rules:
- "delete" behaviour must be presented as logical archive, not destructive deletion;
- variant-level data must not be presented as shared perfume data;
- restoring archived products is not promised by this work package.

### `UI-ADMIN-CAT-002` — Collections

**Supports:** `UC-CAT-003`

Required elements:
- collection list;
- create/edit collection;
- approved collection classification;
- perfume membership selector;
- current membership display;
- save/cancel actions.

Required states:
- normal;
- create;
- edit;
- no matching perfumes;
- validation error;
- save success/failure.

Rules:
- general, seasonal, and limited-edition collections share one management model;
- a perfume may belong to multiple collections.

### `UI-ADMIN-CAT-003` — Fragrance classification

**Supports:** `UC-CAT-004`

Required elements:
- one primary fragrance-family selector;
- reusable fragrance-note selector;
- separate top, middle/heart, and base assignment areas;
- current assignments;
- save/cancel actions.

Required states:
- normal;
- missing required primary family;
- invalid assignment;
- save success/failure.

Rules:
- exactly one primary family for an active perfume;
- notes are reused from canonical note records;
- top/middle/base are assignment roles rather than separate copies of a note.

## UI traceability

| UI surface | Use cases | Main requirements |
|---|---|---|
| `UI-CAT-001` Catalogue | `UC-DISC-001`–`UC-DISC-004` | `FR-DISCOVERY-001`–`FR-DISCOVERY-009` |
| `UI-CAT-002` Detail / virtual profile | `UC-DISC-001`, `UC-VIRT-002`, `UC-VIRT-003` | `FR-VIRTUAL-002`–`FR-VIRTUAL-006` |
| `UI-CAT-003` Comparison | `UC-DISC-005` | `FR-DISCOVERY-010`, `FR-VIRTUAL-007` |
| `UI-CAT-004` Fragrance wheel | `UC-VIRT-001` | `FR-VIRTUAL-001` |
| `UI-ADMIN-CAT-001` Catalogue management | `UC-CAT-001`, `UC-CAT-002` | `FR-PRODUCT-001`–`FR-PRODUCT-010` |
| `UI-ADMIN-CAT-002` Collections | `UC-CAT-003` | `FR-COLLECTION-001`–`FR-COLLECTION-004` |
| `UI-ADMIN-CAT-003` Classification | `UC-CAT-004` | `FR-COLLECTION-005`–`FR-COLLECTION-008` |

## Boundaries

No database fields, API routes, framework components, visual brand system, AI search, brand filtering, or external weather integration are defined here. Exact visual styling remains a later UI implementation decision.
