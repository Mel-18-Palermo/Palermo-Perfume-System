# Palermo Editorial-Commerce Landing Page — Implementation Plan

Status: **Planning only — do not implement in this milestone**

Reference reviewed: the current Australian BLEU DE CHANEL category page and a full-page desktop screenshot supplied on 20 September 2026. The reference is used only for structural principles: image-led storytelling, sparse commerce, generous vertical rhythm, and campaign modules inserted between product groups. Palermo branding, content, tokens, components, and data remain authoritative.

## 1. Current Palermo baseline

### Reusable application foundations

- The frozen design system already supplies the intended restrained palette, Inter typography, spacing scale, wide container, focus treatment, and responsive validation widths.
- `CustomerShell`, `StoreHeader`, `MobileNav`, and `StoreFooter` already provide session, cart, responsive navigation, and the Palermo wordmark.
- Header, mobile navigation, and footer links already point to `/catalogue`.
- The catalogue contract exposes real product identity, primary family, lead image, starting price, intensity, variants, notes, suitability, collections, and availability.
- `api.catalogue.list()` and `api.catalogue.getFilters()` can populate product bands and fragrance-family navigation without duplicating catalogue facts in landing-page content.
- Catalogue URL parameters already support `family`, `collection`, `note`, `intensity`, `occasion`, `mood`, and `weather`, so editorial links can land in a meaningful filtered catalogue state.
- The recommendation backend and HTTP client already expose the active quiz and recommendation generation. There is no customer-facing `/quiz` page yet.

### Current limitations

- The catalogue UI currently occupies `/`; no `src/app/catalogue/page.tsx` route exists despite shell links targeting `/catalogue`.
- Only two synthetic catalogue products are seeded: Demo Citrus and Demo Woody.
- Both seeded products have `imageUrl: null`; no `PerfumeImage` records are seeded.
- There are no customer-facing raster images in `public/` after removal of the abandoned GLB.
- The current product-card link convention targets `/product/{id}`, but no public product-detail route exists in this checkout. Landing work must not conceal or expand that separate route dependency.
- `CustomerShell` always constrains and pads its `<main>`, which prevents full-bleed campaign sections without a small shell-level layout option.

## 2. Reference principles to carry forward

The reference page uses the following repeatable rhythm:

1. a full-width cinematic campaign image with minimal overlay copy;
2. a short, centred brand/product premise;
3. compact category navigation and filters;
4. a sparse three-column product band dominated by pack photography;
5. an editorial campaign module interrupting the commerce sequence;
6. further product bands separated by another large campaign story;
7. service/discovery modules near the end of the page.

Palermo should adopt the rhythm, not the visual identity. In particular:

- keep Palermo's warm neutral palette and Inter type system;
- use product and campaign photography as the primary visual layer;
- avoid CHANEL-style naming, monochrome brand codes, exact spacing, or copied layouts;
- keep accessible text sizes and controls even where the reference uses extremely small commerce copy;
- avoid decorative effects, animation-led spectacle, and dense card chrome.

## 3. Proposed page section sequence

### 1. Existing customer header

Use the current Palermo customer header and its existing account/cart state. The Palermo logo continues to link to `/`; Catalogue links to `/catalogue`.

### 2. Campaign hero

Purpose: establish Palermo before presenting UI.

- Full-bleed art-directed campaign photograph.
- Eyebrow: `PALERMO`.
- Headline: `Fragrance, reimagined.`
- One primary text-style action: `Explore fragrances` → `/catalogue`.
- Optional secondary text action only after the quiz UI exists: `Find your fragrance` → `/quiz`.
- No carousel, video autoplay, floating controls, or decorative effect layer.

### 3. Editorial premise

Purpose: give the image context without turning the hero into a text-heavy banner.

- One short heading and 2–3 lines of approved Palermo brand copy.
- Reading width capped by the existing `--container-reading` token.
- Static campaign content; no catalogue facts or unsupported fragrance claims.

### 4. Explore by fragrance family

Purpose: translate the reference page's category selectors into Palermo's actual discovery model.

- Render families from `api.catalogue.getFilters()`.
- Each family uses a square editorial thumbnail, family label, and link to `/catalogue?family={familyId}`.
- Show only families returned by the live catalogue service.
- At the current seed state this produces Citrus and Woody; the component must scale to additional families without hard-coded names.

### 5. Featured fragrance band A

Purpose: introduce commerce early while allowing imagery to dominate.

- Up to three real products from `api.catalogue.list()`.
- Product photography occupies most of each item; UI chrome is removed.
- Visible factual content: product name, primary family, starting price, and one clear product/detail action.
- Preserve availability behavior from the catalogue; do not display unavailable products as purchasable.
- For the initial seed state render the two unique products without placeholders or duplication.

### 6. Editorial fragrance focus

Purpose: interrupt the product sequence with one large campaign story.

- Desktop split composition: concise copy on one side and a tall campaign/product photograph on the other.
- Mobile composition: image first, followed by copy and action.
- The selected perfume identity, family, and price must come from catalogue data; campaign headline/body copy and image selection are approved static content.
- Link to the product-detail route when that route exists. Until then, use `Explore the catalogue` → `/catalogue`; do not ship a dead product link.

### 7. Featured fragrance band B — conditional

Purpose: resume commerce after the interruption.

- Render the next three unique active products.
- Never repeat products from band A.
- Omit the entire section when there are not enough additional products. With the current two-item seed, this section does not render.

### 8. Recommendation campaign

Purpose: transition from browsing to guided discovery.

- Large landscape image paired with a compact heading, short explanation, and `Find your fragrance` action.
- The action targets `/quiz` only when the existing recommendation flow has a customer UI route.
- Until `/quiz` exists, render `Explore by family` linking to `/catalogue`, or hold the module behind a feature flag. Do not point users to the recommendations API directly.
- Recommendation results continue to use authoritative catalogue products and the existing fallback semantics.

### 9. Complete-catalogue close

Purpose: give visitors a simple exit from the curated landing sequence.

- Restrained heading and one action: `View all fragrances` → `/catalogue`.
- No additional campaign artwork is required.

### 10. Existing footer

Reuse the current customer footer. A later content pass may replace scaffold copy, but that is not required to establish the landing-page composition.

## 4. Content hierarchy

The order of emphasis should be:

1. campaign image;
2. Palermo headline;
3. product pack photography;
4. fragrance or family name;
5. short editorial explanation;
6. starting price and availability;
7. restrained text action.

Product cards should not use badges, bordered card containers, or multiple competing controls on the landing page. Those controls remain appropriate in the full catalogue. Landing items are editorial previews of real catalogue records, not a replacement for catalogue filtering or product detail.

## 5. Required image assets

No current repository image can be reused for the customer landing page. Report diagrams are documentation artifacts, and the removed GLB must not be converted into campaign imagery.

### Minimum campaign asset set

| Asset | Required crop | Recommended source size | Purpose and safe area |
|---|---:|---:|---|
| `landing-hero-desktop` | 16:6 panoramic | 2880×1080 | Primary campaign scene. Keep a calm text-safe zone on the left third and the main subject off-centre. |
| `landing-hero-mobile` | 4:5 portrait | 1600×2000 | Independently art-directed mobile hero; do not rely on a centre crop of the panoramic image. Keep lower-left copy readable. |
| `landing-focus-desktop` | 4:5 portrait | 1600×2000 | Tall product/campaign still for the editorial fragrance focus. Subject should fill the frame and support adjacent copy. |
| `landing-focus-mobile` | 3:4 portrait | 1500×2000 | Mobile-specific focus crop with no essential detail near edges. |
| `landing-recommendation-desktop` | 16:9 landscape | 2400×1350 | Atmospheric discovery image with space for adjacent or overlaid short copy. |
| `landing-recommendation-mobile` | 4:5 portrait | 1600×2000 | Mobile discovery composition; should work above the copy rather than behind long text. |

### Catalogue photography

| Asset | Required crop | Recommended source size | Quantity |
|---|---:|---:|---:|
| Primary product packshot | 4:5 | 1600×2000 | One per active perfume. Two are immediately required for Demo Citrus and Demo Woody. |
| Fragrance-family thumbnail | 1:1 | 1000×1000 | One per live family. Two are immediately required for Citrus and Woody. |

Packshots should use a consistent camera, background treatment, scale, and contact shadow. They should be attached through `PerfumeImage` records so the landing and catalogue consume the same approved source. Family thumbnails are campaign/navigation assets and may remain in a small static landing-content manifest keyed by family ID.

### Later asset expansion

If the live catalogue grows to six or more photographed products, create one additional campaign interruption pair:

- desktop 3:2 image at 2400×1600;
- mobile 4:5 image at 1600×2000.

Do not create this optional pair for the two-product seed state.

## 6. Responsive composition

### Desktop — 1440px

- Header remains at its existing height and behavior.
- Hero spans the viewport width and approximately 72–82vh, using the 16:6 campaign asset with short copy positioned in its safe area.
- Editorial premise uses a narrow centred reading column with 64–96px vertical spacing.
- Family navigation is a centred row with generous gaps and no enclosing card.
- Product bands use three columns within the existing 1360px wide container; imagery receives substantially more height than product copy.
- Editorial focus uses an asymmetric 5/7 or 6/6 split, not two equal cards.
- Recommendation campaign is a large landscape module, followed by a simple text close.

### Tablet — 768px

- Hero uses the desktop asset only when its subject and copy remain uncropped; otherwise switch to the portrait source with `<picture>`.
- Family navigation wraps to two columns.
- Product bands use two columns.
- Editorial focus may remain split if both columns remain readable; otherwise stack image then copy.

### Mobile — 375px

- Use the independently composed 4:5 hero image and a minimum 70svh hero area.
- Keep overlay copy to eyebrow, headline, and one action.
- Stack family navigation and product items in one column; do not introduce a carousel.
- Product image appears before all product text.
- Stack every campaign module image-first, followed by text on the page background.
- Preserve 16px gutters, 44px interaction targets, visible focus, and no horizontal overflow.

## 7. Real catalogue data boundaries

Use live catalogue data for:

- fragrance-family labels and filter IDs;
- product names and IDs;
- lead product images;
- primary fragrance family;
- starting price and currency;
- intensity when displayed;
- current product/variant availability;
- recommendation result products.

Use approved static landing content for:

- hero and campaign headlines;
- short brand/editorial copy;
- campaign image paths and alt text;
- the editorial order of campaign modules;
- family thumbnail paths keyed to real family IDs.

Do not hard-code price, availability, fragrance notes, or product names into campaign copy. If live catalogue data is unavailable, preserve the campaign hero and brand premise but omit commerce bands and show the shared actionable error treatment where appropriate.

## 8. Catalogue and recommendation transitions

- Hero `Explore fragrances` → `/catalogue`.
- Family thumbnails → `/catalogue?family={familyId}`.
- Final catalogue action → `/catalogue`.
- Product actions → the canonical product-detail route once present; until then, route into `/catalogue` rather than a known missing page.
- Recommendation campaign → `/quiz` only after the existing recommendation flow has a customer-facing page.
- Quiz results must continue to render catalogue-authoritative products and preserve the current deterministic fallback if AI reasoning fails.
- The landing page must not run recommendation generation automatically or infer a visitor profile from passive behavior.

## 9. Minimal motion behavior

- No scroll choreography, parallax, autoplay video, carousels, particles, canvas, or post-processing.
- Use the existing 120/180/240ms duration tokens for link underlines, button states, and focus transitions.
- Optional product-image hover change is limited to a subtle opacity or scale adjustment and must not shift layout.
- Images load normally through `next/image`; only below-the-fold media is lazy-loaded.
- `prefers-reduced-motion` removes optional transitions through the existing global rule.

## 10. Route and shell changes required during implementation

1. Create `src/app/catalogue/page.tsx` by moving the current catalogue page's server loading, `CustomerShell`, Suspense boundary, and `CatalogueView` composition from `src/app/page.tsx` without behavior changes.
2. Replace `src/app/page.tsx` with the new landing-page Server Component.
3. Keep the logo link at `/`; it will correctly return to the landing page.
4. Keep existing header, mobile-nav, and footer catalogue links at `/catalogue`; they already target the intended route.
5. Add a backwards-compatible `contentLayout` option to `CustomerShell`:
   - default `contained` preserves every existing customer page;
   - `full-bleed` removes only the shell's main max-width and horizontal/vertical padding so landing sections can manage gutters with canonical tokens.
6. Preserve the catalogue's current query-string behavior after the move, including direct family/filter links and back/forward navigation.
7. Add route-level metadata for `/` and `/catalogue` while leaving global metadata as the fallback.
8. Update route tests and any assertions that currently treat `/` as the catalogue. Do not add redirects from `/` to `/catalogue`, because `/` becomes the landing page.
9. Treat the missing product-detail and `/quiz` pages as explicit external dependencies. Do not expand those flows as part of the landing-page implementation.

## 11. Implementation acceptance criteria

- The landing page works with zero, two, three, or more catalogue products without duplication.
- Every displayed price, family, product name, image, and availability state comes from the catalogue boundary.
- Campaign modules visibly interrupt commerce at desktop and mobile sizes without hiding products behind effects.
- `/catalogue` preserves all current search, filter, loading, empty, and error behavior.
- The customer shell, auth state, cart state, and production flows remain unchanged outside the new shell layout option.
- Screenshots at 375px, 768px, and 1440px show deliberate art direction, no horizontal overflow, and no dead navigation targets introduced by the landing page.
