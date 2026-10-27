# 07 — Layout decisions: legacy layout model → new layout

The legacy layout model and the new one are **not isomorphic**. This file
records the real semantics (verified in the legacy runtime source) and the
decision rules for the page-by-page migration.

## Legacy model (what the old runtime actually did)

- **Containers are flex boxes** (`flow`/`align`/`distribution`/`gap`).
  `size.manualMode: true` fixes ONE axis — the one perpendicular to the page's
  container flow: page flow `column` → `height` rail; page flow `row` →
  `width` rail. `manualMode: false` → the container auto-sizes **by content**
  (no size styles at all).
- **Element positioning is opt-in per CONTAINER**: `containerBasic.tsx` passed
  `isStaticElement: !!containerData.isStatic` to every element. Only elements
  of a **static container** got `position: absolute` + their
  `top/left/right/bottom`/`constraints*`/`deltaCenter*` applied
  (`useGetElDimensionsStyles`). Everything else flowed in flex.
- **`page.isStatic: true`** (the `_adaptive` subpages) rendered the container
  as a full-size **canvas**: `position: absolute; inset: 0; width/height:
  100%; display: block`. In practice every container on such a page was
  static, so the page was an absolute canvas.
- Mixed pages (flex containers + static containers on one page) were
  *technically possible* but did not occur in real projects.
- **Coordinate residue**: elements in NON-static containers may still carry
  `top/left/...` — the legacy editor stored drag measurements there, but the
  runtime ignored them. They are noise, not layout.

## New model (what the current runtime does)

- The layout mode is **binary per page**: `layout: 'responsive'` (flex
  everywhere, coordinates ignored) or `layout: 'fixed'` (every element
  absolutely positioned by its coordinates). The render layer checks the PAGE
  layout — there is no per-element static flag that switches positioning
  (`element.tsx`: `if (layout !== 'fixed') return {}`).
- Sizing is **rails and elastic**: the page is the viewport (never scrolls);
  `size` + `manualMode: true` = rail (hard size), no size / `manualMode:
  false` = elastic (flexes into a share of the leftover space — NOT
  content-based sizing). See avstudio-guide 13 §2.

## Decision rules for migration

1. **Layout mode** — decided by the single marker:
   `page.isStatic === true` → `layout: 'fixed'`; otherwise
   `layout: 'responsive'`. (The extractor pre-computes this as `layoutHint`.)
   If a non-static page somehow contains a static container (`anomalies` in
   the digest), treat the page as fixed and review it manually.
2. **Fixed pages**: keep every element's `top/left/right/bottom`,
   `deltaCenterX/Y`, `constraints*`, `zIndex`; set `isStaticElement: true` on
   the elements (data fidelity; the runtime keys off the page layout). The
   legacy canvas container was full-page (`inset: 0`), so the stored
   coordinates are already page-relative — keep one container as a plain
   wrapper (or split into several if that helps organization; containers
   themselves are not positioned on a fixed page).
3. **Responsive pages**: **drop** all coordinate props from every element
   (`top/left/right/bottom`, `deltaCenterX/Y`, `constraints*`, `zIndex`) —
   they are editor residue the legacy runtime never applied. Compose with
   flex: page `flow` (row/column) + container `flow/align/distribution`.
4. **Container sizing**:
   - legacy `manualMode: true` → new rail: keep `size` (+ `manualMode: true`);
     the meaningful axis follows the page container flow (column → height,
     row → width), exactly like the legacy runtime;
   - legacy `manualMode: false` (content-sized) → new elastic (no `size`).
     NOTE: elastic flexes into a share of leftover space — for a container
     whose legacy height came from its CONTENT, elastic is the closest match
     when it is the only/last flexible child on its axis; otherwise consider
     making it a rail with an explicit size to preserve the visual weight.
     Verify each such container against the legacy build side-by-side.
5. **Scrollbars**: legacy `showScrollbars: true` → `scrollMode: 'scroll'`;
   legacy omitted/false (overflow cut) → `scrollMode: 'disabled'`.
6. **Global containers** (slots): build as regular pages under
   `pages/global/<Name>.page`; the slot config (`visibleByDefault`,
   `visibleOnPages`, `hiddenOnPages`) maps 1:1.
7. **Empty pages** (no elements — e.g. overlay backdrop pages): reproduce as
   an empty page with the same background — that is faithful, not a bug.
