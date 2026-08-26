# Palermo Perfume System — UI Design System

Status: **Frozen implementation design baseline**

Purpose: ensure the team builds one coherent application.

Until Palermo supplies an approved replacement brand system, these tokens are the implementation baseline. Do not improvise fonts, colours, spacing, radii, shadows or responsive rules inside feature code.

## 1. Design direction

Palermo should feel:
- premium;
- restrained;
- clean;
- modern;
- product-focused;
- calm.

Avoid neon colours, loud gradients, glassmorphism, excessive animation, decorative clutter, inconsistent luxury fonts and low-contrast beige-on-beige UI.

Commerce clarity wins.

## 2. Typography

Primary font: **Inter**

Do not add alternate feature fonts.

Type scale:
```text
Display       36 / 44 / 700
H1            30 / 38 / 700
H2            24 / 32 / 600
H3            20 / 28 / 600
Body          16 / 24 / 400
Body Small    14 / 20 / 400
Label         14 / 20 / 500
Caption       12 / 16 / 400
```

No text below 12 px. Body normally 16 px.

## 3. Colours

Neutral:
```text
--color-bg:             #FAFAF8
--color-surface:        #FFFFFF
--color-surface-muted:  #F5F4F0
--color-text:           #181817
--color-text-muted:     #6B6B67
--color-border:         #E4E2DC
--color-border-strong:  #C9C6BE
```

Brand/action:
```text
--color-primary:        #26231F
--color-primary-hover:  #3A3630
--color-primary-text:   #FFFFFF
--color-accent:         #A88652
--color-accent-hover:   #917245
--color-accent-subtle:  #F4EEE5
```

Semantic:
```text
--color-success:        #287A4B
--color-success-bg:     #EDF7F1
--color-warning:        #A66A16
--color-warning-bg:     #FFF7E8
--color-danger:         #B42318
--color-danger-bg:      #FFF0EE
--color-info:           #245EA8
--color-info-bg:        #EEF5FF
```

No arbitrary colour literals in feature components.

## 4. Spacing

4 px base:
```text
4 8 12 16 20 24 32 40 48 64 80 96
```

No random 13/19/37 px spacing without reviewed reason.

## 5. Radius

```text
sm   6px
md   10px
lg   16px
full 9999px
```

## 6. Shadows

```text
shadow-sm: 0 1px 2px rgba(24,24,23,.06)
shadow-md: 0 8px 24px rgba(24,24,23,.10)
```

Prefer borders to heavy shadows. No glow/coloured shadow.

## 7. Content widths/gutters

```text
reading   720px
form      640px
page      1200px
wide      1360px
```

Horizontal gutters:
```text
mobile   16px
tablet   24px
desktop  32px
```

## 8. Validation widths

Mandatory:
```text
375px
768px
1440px
```

### 375
- no page horizontal scroll;
- primary one-column layout;
- collapsed navigation;
- touch targets >= 44×44;
- intentional table/filter behaviour.

### 768
- catalogue 2–3 columns;
- readable forms;
- adaptive admin nav;
- no truncated controls.

### 1440
- constrained content;
- catalogue ~4 columns where appropriate;
- persistent admin nav where useful;
- no over-wide forms/text.

## 9. Grid guidance

Catalogue:
```text
375:  1 column
768:  2–3 columns
1440: 4 columns
```

Product detail:
```text
mobile:  media → detail → actions
desktop: media + detail columns
```

Checkout:
```text
mobile:  single column
desktop: form/details + summary
```

Admin:
```text
mobile:  stacked controls/cards
desktop: sidebar + main content
```

## 10. Buttons

Variants:
```text
primary
secondary
outline
ghost
danger
link
```

Sizes:
```text
sm md lg icon
```

Rules:
- one obvious primary action per decision area;
- destructive action distinct;
- loading preserves width;
- icon-only controls have accessible name;
- normal mobile primary controls >=44 px tall.

No feature-local button CSS.

## 11. Inputs

Required:
- visible label;
- supporting/error text;
- ~44 px comfortable height;
- focus ring;
- disabled and invalid states;
- invalid state uses message + colour;
- placeholder is supplementary.

Prefer accessible primitives over fancy custom controls.

## 12. Focus

All controls have visible keyboard focus:
- approx 2 px ring;
- 2 px offset;
- high-contrast semantic tone.

Never remove focus without replacement.

## 13. Cards

Default:
- surface background;
- 1 px border;
- radius md/lg;
- 16–24 px padding;
- little/no shadow.

Product cards keep consistent image ratio, naming, key fragrance context, price and action placement.

## 14. Product imagery

Use approved synthetic/demo assets until client-approved assets exist.

Rules:
- consistent aspect ratio;
- deliberate object-fit;
- meaningful alt where informative;
- decorative alt empty;
- no random copyrighted web images.

Suggested ratio: **4:5**.

## 15. Icons

One icon system only, frozen in scaffold.

No emoji as UI icons. No second icon package. Common sizes 16/20/24 px.

## 16. Navigation

Customer priorities:
- catalogue/discovery;
- account;
- wishlist/cart;
- auth state.

Admin priorities:
- dashboard;
- catalogue;
- inventory;
- promotions;
- reviews/moderation;
- reporting where implemented.

Mobile nav must be intentionally redesigned, not squeezed.

## 17. Tables

Admin tables require:
- headers;
- loading;
- empty;
- error;
- row-action convention;
- keyboard accessibility;
- mobile adaptation.

Use local horizontal table scroll or card/list conversion. Never force page-wide horizontal scroll.

## 18. Status badges

Semantic variants:
- success;
- warning/pending;
- danger/failure;
- neutral;
- info.

Status must be understandable without colour.

## 19. Errors

Use shared Alert/ErrorState.
Errors are actionable, consistent and non-sensitive.
No browser `alert()` for normal UX.

## 20. Loading

Use skeleton for known structure, spinner for bounded action, loading/disabled button for mutations. Avoid full-screen spinners for local updates.

## 21. Empty states

Required for collections:
- catalogue no match;
- cart;
- wishlist;
- orders;
- reviews;
- admin tables.

Explain state and provide next action when useful.

## 22. Dialogs/drawers

Dialog for focused desktop action/confirmation.
Drawer/sheet for mobile filtering/navigation where appropriate.
Do not nest modal layers.

## 23. Motion

Durations:
```text
fast   120ms
normal 180ms
slow   240ms
```

Restrained only. Respect `prefers-reduced-motion`.

## 24. Checkout UX

- group related information;
- show server validation clearly;
- preserve valid entered data after recoverable failures;
- show summary/price clearly;
- never imply payment success before Palermo confirms;
- prevent duplicate submission while processing.

## 25. Admin density

Admin may be denser, but uses same font, tokens, primitives, focus and accessibility. Do not build a visually separate app.

## 26. Accessibility

Target WCAG 2.2 AA:
- semantic headings;
- keyboard navigation;
- visible focus;
- contrast;
- labels;
- accessible icon names;
- alt text;
- no colour-only state;
- reduced motion;
- touch targets;
- no keyboard traps.

## 27. Visual PR evidence

Attach:
- 375 screenshot;
- 768 screenshot;
- 1440 screenshot;
- at least one relevant non-happy state.

Reviewer may reject a UI PR without responsive evidence.

## 28. Prohibited drift

Do not merge:
- arbitrary fonts;
- arbitrary colours;
- arbitrary spacing/radii/shadows;
- second component/icon library;
- gradient-heavy feature styling;
- inconsistent button/input treatment;
- feature-local design tokens without system reason.

If the system lacks a legitimate need, change it centrally through review.
