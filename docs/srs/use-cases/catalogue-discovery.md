# Catalogue, Discovery and Virtual Fragrance — Use-Case Specification

## Scope

This document refines the following approved requirements without adding new business scope:

- `FR-PRODUCT-001`–`FR-PRODUCT-010`
- `FR-COLLECTION-001`–`FR-COLLECTION-008`
- `FR-DISCOVERY-001`–`FR-DISCOVERY-010`
- `FR-VIRTUAL-001`–`FR-VIRTUAL-007`
- Decisions `D-010`, `D-012`–`D-026`

Canonical actors are **Visitor**, **Customer**, and **Administrator**. No external service is required by this work package.

## Use-case index

| ID | Use case | Primary actor(s) | Requirement coverage |
|---|---|---|---|
| `UC-CAT-001` | Manage perfume products | Administrator | `FR-PRODUCT-001`–`FR-PRODUCT-005` |
| `UC-CAT-002` | Manage sellable perfume variants | Administrator | `FR-PRODUCT-006`–`FR-PRODUCT-010` |
| `UC-CAT-003` | Manage perfume collections | Administrator | `FR-COLLECTION-001`–`FR-COLLECTION-004` |
| `UC-CAT-004` | Manage fragrance notes and primary family | Administrator | `FR-COLLECTION-005`–`FR-COLLECTION-008` |
| `UC-DISC-001` | Browse perfume catalogue | Visitor, Customer | `FR-DISCOVERY-001` |
| `UC-DISC-002` | Search perfume catalogue | Visitor, Customer | `FR-DISCOVERY-002` |
| `UC-DISC-003` | Filter perfume catalogue | Visitor, Customer | `FR-DISCOVERY-003`–`FR-DISCOVERY-008` |
| `UC-DISC-004` | View weather-based suggestions | Visitor, Customer | `FR-DISCOVERY-009` |
| `UC-DISC-005` | Compare perfumes | Visitor, Customer | `FR-DISCOVERY-010`, `FR-VIRTUAL-007` |
| `UC-VIRT-001` | Explore fragrance wheel | Visitor, Customer | `FR-VIRTUAL-001` |
| `UC-VIRT-002` | View fragrance note journey | Visitor, Customer | `FR-VIRTUAL-002` |
| `UC-VIRT-003` | View fragrance performance and suitability | Visitor, Customer | `FR-VIRTUAL-003`–`FR-VIRTUAL-006` |

---

## `UC-CAT-001` — Manage perfume products

**Primary actor:** Administrator  
**Goal:** Create and maintain the shared descriptive record for a perfume.

**Preconditions**
- Administrator is authenticated and authorised for catalogue management.
- Controlled fragrance-family data required by the product already exists where applicable.

**Trigger**
- Administrator chooses to create, edit, archive, or manage images for a perfume.

**Main success flow**
1. Administrator opens the catalogue-management area.
2. Administrator creates a perfume or selects an existing perfume.
3. Administrator enters or updates the perfume description and approved shared product information.
4. Administrator manages perfume images.
5. System validates the submitted information.
6. System saves the perfume.
7. The updated active perfume becomes available to public catalogue functions.

**Alternative / exception flows**
- If required information is invalid or missing, the system rejects the change and identifies the fields requiring correction.
- If the Administrator chooses product deletion, the system archives the perfume rather than physically deleting it (`D-013`).
- An archived perfume is excluded from new public discovery and purchase but remains available for historical integrity.
- Variant-specific values such as bottle size, concentration, SKU, price, and sellable availability are not edited here; they are handled by `UC-CAT-002`.

**Postconditions**
- Product shared information is created or updated, or the product is logically archived.
- No historical order information is destroyed.

---

## `UC-CAT-002` — Manage sellable perfume variants

**Primary actor:** Administrator  
**Goal:** Maintain the sellable variants belonging to a perfume.

**Preconditions**
- Administrator is authenticated and authorised.
- Parent perfume exists.

**Trigger**
- Administrator opens variant management for a perfume.

**Main success flow**
1. System shows the variants belonging to the selected perfume.
2. Administrator creates or edits a variant.
3. Administrator maintains bottle size, concentration, SKU, price, and availability for that variant.
4. System validates the submitted variant data.
5. System saves the variant.
6. Public catalogue surfaces reflect the current variant information.

**Alternative / exception flows**
- Duplicate or invalid SKU is rejected.
- Invalid price or required variant data is rejected.
- A variant marked unavailable may remain discoverable but cannot be purchased (`D-018`).
- Shared perfume description, family, notes, and collection membership are not duplicated into the variant record (`D-014`).

**Postconditions**
- Variant-level sellable data is current and associated with one parent perfume.

---

## `UC-CAT-003` — Manage perfume collections

**Primary actor:** Administrator  
**Goal:** Create and maintain reusable perfume collections.

**Preconditions**
- Administrator is authenticated and authorised.
- Perfumes to be assigned already exist.

**Trigger**
- Administrator opens collection management.

**Main success flow**
1. Administrator creates a collection or selects an existing collection.
2. Administrator maintains the collection name and its approved classification.
3. Administrator adds or removes perfumes from the collection.
4. System validates the changes.
5. System saves the collection and its perfume membership.

**Alternative / exception flows**
- A perfume may belong to multiple collections (`D-017`).
- General, seasonal, and limited-edition collections use the same collection model; they are classifications rather than separate subsystems.
- Removing a perfume from one collection does not remove or archive the perfume.

**Postconditions**
- Collection details and membership are updated without changing the underlying perfume records.

---

## `UC-CAT-004` — Manage fragrance notes and primary family

**Primary actor:** Administrator  
**Goal:** Maintain the fragrance classification data used by catalogue, discovery, virtual experience, and later recommendation functions.

**Preconditions**
- Administrator is authenticated and authorised.
- Target perfume exists.

**Trigger**
- Administrator opens fragrance classification for a perfume.

**Main success flow**
1. System displays the perfume's current primary fragrance family and note assignments.
2. Administrator selects exactly one primary family from the controlled family vocabulary.
3. Administrator assigns reusable fragrance notes to the top, middle, or base role.
4. System validates the assignments.
5. System saves the classification.

**Alternative / exception flows**
- The same fragrance note may be reused across multiple perfumes.
- Top, middle, and base are relationship roles, not separate note records (`D-015`).
- The system rejects a change that would leave an active perfume without exactly one primary family (`D-016`).

**Postconditions**
- The perfume has one primary family and its approved note-layer assignments.

---

## `UC-DISC-001` — Browse perfume catalogue

**Primary actors:** Visitor, Customer  
**Goal:** Browse active perfumes without requiring authentication.

**Preconditions**
- Public catalogue is available.

**Trigger**
- Actor opens the catalogue.

**Main success flow**
1. System lists active catalogue perfumes.
2. Each result presents enough approved information to identify the perfume and its available variants.
3. Actor opens a perfume to view its catalogue and virtual-fragrance information.
4. System presents current variant availability.

**Alternative / exception flows**
- Archived perfumes are excluded from public discovery (`D-013`).
- An unavailable variant may be visible for discovery but must be clearly shown as unavailable for purchase (`D-018`).
- If no perfumes match the current view, the system shows an empty result state rather than an error.

**Postconditions**
- Actor can continue to product details, search, filtering, comparison, or virtual-fragrance functions.

---

## `UC-DISC-002` — Search perfume catalogue

**Primary actors:** Visitor, Customer  
**Goal:** Find active perfumes using keyword search.

**Preconditions**
- Public catalogue is available.

**Trigger**
- Actor submits a search term.

**Main success flow**
1. Actor enters a keyword.
2. System searches approved catalogue metadata.
3. System excludes archived perfumes.
4. System returns matching perfumes.
5. Actor may open a result or combine the result set with approved filters.

**Alternative / exception flows**
- Empty search input returns the normal catalogue view.
- No matches produce a clear zero-results state.
- Search does not require AI (`D-018`).

**Postconditions**
- A result set is displayed without changing catalogue data.

---

## `UC-DISC-003` — Filter perfume catalogue

**Primary actors:** Visitor, Customer  
**Goal:** Narrow catalogue results using approved structured criteria.

**Preconditions**
- Public catalogue is available.

**Trigger**
- Actor selects one or more filters.

**Main success flow**
1. System offers the source-defined criteria: fragrance note, fragrance family, price range, intensity, occasion, and mood.
2. Actor selects one or more values.
3. System applies the criteria together to active catalogue data.
4. System returns matching perfumes.
5. Actor may adjust or clear the filters.

**Alternative / exception flows**
- No matching perfumes produces a clear empty state.
- Unavailable variants may remain discoverable but are shown as unavailable for purchase.
- No brand filter is introduced.
- Weather-based suggestions are handled separately by `UC-DISC-004`.
- Filtering is deterministic structured catalogue logic; AI is not required (`D-018`, `D-019`).

**Postconditions**
- The result set reflects the selected approved criteria.

---

## `UC-DISC-004` — View weather-based suggestions

**Primary actors:** Visitor, Customer  
**Goal:** View perfumes associated with an approved weather category.

**Preconditions**
- Weather suitability metadata exists for catalogue perfumes.

**Trigger**
- Actor selects an approved weather category or the system receives an approved category from a future input source.

**Main success flow**
1. System receives the approved weather category.
2. System deterministically maps that category to perfume suitability metadata.
3. System returns matching active perfumes.
4. Actor may open, compare, or further filter the results.

**Alternative / exception flows**
- If no category is available, the system does not fabricate weather context.
- An external weather service is not a baseline dependency or actor.
- AI is not required for the mapping (`D-020`).

**Postconditions**
- Actor sees suggestions explainable by approved structured suitability data.

---

## `UC-DISC-005` — Compare perfumes

**Primary actors:** Visitor, Customer  
**Goal:** Compare two or three active perfumes using approved catalogue data.

**Preconditions**
- At least two active perfumes have been selected.

**Trigger**
- Actor opens comparison.

**Main success flow**
1. System accepts two or three selected active perfumes.
2. System presents their approved structured attributes side by side.
3. System includes fragrance-family, note, variant, performance, suitability, and virtual scent-profile information where available.
4. Actor reviews differences and may open any compared perfume.

**Alternative / exception flows**
- Fewer than two or more than three selections are rejected with a clear correction.
- Archived perfumes cannot enter a new comparison.
- The comparison does not generate an unsupported subjective winner (`D-021`).
- Virtual scent-profile comparison is a representation of approved data, not a reproduction or guarantee of physical scent (`D-026`).

**Postconditions**
- Actor receives a side-by-side comparison without catalogue data being changed.

---

## `UC-VIRT-001` — Explore fragrance wheel

**Primary actors:** Visitor, Customer  
**Goal:** Explore the canonical fragrance-family vocabulary visually.

**Preconditions**
- Canonical fragrance families exist.

**Trigger**
- Actor opens the fragrance wheel.

**Main success flow**
1. System displays the canonical fragrance families in an interactive wheel.
2. Actor selects a family.
3. System displays the selected family and associated active perfumes.
4. Actor may open one of those perfumes.

**Alternative / exception flows**
- A family with no active perfumes displays an empty state.
- The wheel is a discovery interface and does not claim to be a recommendation engine (`D-022`).

**Postconditions**
- Actor can navigate from a family to associated catalogue perfumes.

---

## `UC-VIRT-002` — View fragrance note journey

**Primary actors:** Visitor, Customer  
**Goal:** Understand the ordered fragrance-note structure of a perfume.

**Preconditions**
- Selected perfume has approved note assignments.

**Trigger**
- Actor opens the note-journey view.

**Main success flow**
1. System retrieves the perfume's note assignments.
2. System displays top notes first, then middle/heart notes, then base notes.
3. Actor may inspect the notes associated with each stage.

**Alternative / exception flows**
- Missing note layers are shown as unavailable rather than invented.
- The system does not fabricate precise evaporation or performance timings (`D-023`).

**Postconditions**
- Actor sees an ordered representation of approved note data.

---

## `UC-VIRT-003` — View fragrance performance and suitability

**Primary actors:** Visitor, Customer  
**Goal:** View approved virtual-fragrance characteristics for a perfume.

**Preconditions**
- Selected perfume has relevant approved catalogue metadata.

**Trigger**
- Actor opens the perfume's virtual-fragrance information.

**Main success flow**
1. System presents the perfume's controlled longevity classification.
2. System presents its controlled projection-strength classification.
3. System presents daytime/evening suitability.
4. System presents seasonal suitability.
5. System presents the consolidated virtual scent profile from approved catalogue data.

**Alternative / exception flows**
- Missing data is shown as unavailable.
- Longevity and projection are controlled classifications, not unsupported numerical predictions (`D-024`).
- Suitability uses controlled multi-value metadata (`D-025`).
- The virtual profile does not claim to reproduce physical scent or guarantee perception (`D-026`).

**Postconditions**
- Actor sees the approved virtual-fragrance representation for the perfume.

---

## Requirement traceability

| Requirement(s) | Use case |
|---|---|
| `FR-PRODUCT-001`–`FR-PRODUCT-005` | `UC-CAT-001` |
| `FR-PRODUCT-006`–`FR-PRODUCT-010` | `UC-CAT-002` |
| `FR-COLLECTION-001`–`FR-COLLECTION-004` | `UC-CAT-003` |
| `FR-COLLECTION-005`–`FR-COLLECTION-008` | `UC-CAT-004` |
| `FR-DISCOVERY-001` | `UC-DISC-001` |
| `FR-DISCOVERY-002` | `UC-DISC-002` |
| `FR-DISCOVERY-003`–`FR-DISCOVERY-008` | `UC-DISC-003` |
| `FR-DISCOVERY-009` | `UC-DISC-004` |
| `FR-DISCOVERY-010` | `UC-DISC-005` |
| `FR-VIRTUAL-001` | `UC-VIRT-001` |
| `FR-VIRTUAL-002` | `UC-VIRT-002` |
| `FR-VIRTUAL-003`–`FR-VIRTUAL-006` | `UC-VIRT-003` |
| `FR-VIRTUAL-007` | `UC-DISC-005` |

## Explicit boundaries

This work package does **not** define database schema, APIs, AI search, brand filtering, multiple primary families, real-time weather integration, new catalogue attributes, or application code. Any missing business rule must be raised for central SRS review rather than invented locally.
