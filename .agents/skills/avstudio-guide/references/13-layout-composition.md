# 13 — Layout composition (how to structure pages)

How to think about a page **before writing JSON** — the order of decisions when
creating or editing any page: **structure → layout mode → modules → built-in styling →
custom CSS last**. Follow this guide for every page you build or restructure; the
mechanics (schemas, exact keys) live in 00–04, this file is about the reasoning and the
recipe.

## 1. Decide the layout mode FIRST — `responsive` is the default

- **`layout: "responsive"`** — the default for almost everything. Containers are flex
  boxes that scale with the screen; elements flow inside them. Touch panels, web
  layouts, dashboards, most AV UI.
- **`layout: "fixed"`** — only when the design is pixel-exact and must not scale
  (e.g. a TV UI with an explicit pixel mockup): elements are absolutely positioned via
  `left/top/right/bottom`, `deltaCenterX/Y`, `constraints*` (03 §Positioning).

Rules:

- Never default to `fixed`. If the user did not provide an exact pixel design, build
  responsive.
- Never mix: absolute positioning props inside a responsive page, or flex-flow
  elements scattered on a fixed canvas — pick one mode per page.
- A page's mode is independent per page: a fixed TV overlay subpage can live inside a
  responsive page and vice versa (each page/subpage carries its own `layout`).

## 2. The responsive sizing paradigm — rails and elastic containers

How space is actually distributed in a responsive page (rule 20):

- **The page IS the viewport.** It always renders `100% × 100%` of the available area
  and **never scrolls**. You are not "drawing a canvas of the panel's pixel size" —
  you are splitting a fluid viewport. Never derive container sizes from a design
  resolution or the physical panel size.
- **Content scrolls inside containers, not the page.** A container's content that
  overflows scrolls internally (`scrollMode: "scroll"` is the responsive default;
  `"disabled"` turns scrolling off, `"scrollHidden"` scrolls with the bar hidden).
  If a list can grow, put it in an elastic container
  and let the container scroll — do not grow the page. Optionally, boolean
  `scrollSnap` (+ `scrollSnapAlign`) locks scroll resting positions to element
  boundaries for page-by-page scrolling (02 §Grid building rules rule 10).
- **Elastic containers (default) "flex out".** A container without `size` (or with
  `manualMode` false — which makes the renderer ignore `size` entirely) claims the
  full axis and then **flexes out into its share of the leftover space**. Equal
  elastic siblings split the remaining space equally — no percent math needed.
- **Rails are the exception.** Hard sizes (`size` + `manualMode: true`) make sense
  only where an intrinsic size must not flex: a menu bar, toolbar, header/footer
  strip, a fixed side panel, a status row. Everything else stays elastic.
- **Mixed layout**: hard-sized rails are subtracted first; elastic containers share
  whatever remains. Example: page `flow: "column"` → header rail `64px`
  (`manualMode: true`) + content container with no `size` (elastic, takes the rest).

Decision rule for every container: *"Must this region keep a specific size on any
screen?"* → yes: rail (`size` + `manualMode: true`). No → elastic (no `size`).

## 3. Structure: page → containers → elements (wireframe first)

Sketch the page as bands/columns before touching JSON:

1. **What are the horizontal bands and columns?** Each band/column becomes a
   **top-level container**. Containers are never nested (rule 17) — a container's
   `elements` holds only typed elements.
2. **Arrange the top-level containers** with the page's own `flow` (`"row"`/`"column"`)
   and `gap`; distribute bands with container `size` (02 §Grid building rules):
   - row of columns → page `flow: "row"`, each column container `flow: "column"`;
   - equal columns → leave every column container **without `size`** — elastic
     siblings split the row equally (§2 above);
   - rail band/column (top bar, menu, fixed panel) → `size: { "value": 300, "unit": "px" }`
     **+ `manualMode: true`** — without `manualMode` the size is ignored;
   - spacing → `gap` on the parent; never margins (elements have no margin fields —
     use `gap` or `spacer` elements).
   Do not hard-size every band from the mockup's pixel geometry — hard sizes only
   where the region is intrinsically sized (§2 above).
3. **Fill each container with elements**: correct element type (04), `width`/`height`
   sized relative to the container or left to flex (03 §Width / Height), `gap`/spacer
   for spacing, `align`/`distribution` for distribution.

Do not start from styling — a page is shaped by its structure first.

## 4. Break complex layouts into modules (subpages)

Any region that is **complex, repeated across pages, or has its own logic
(parameters/actions)** should not bloat one page — extract it into a **subpage module**
(01 §Modular pages):

```
pages/
├── module-a/
│   ├── module-a.page          ← main page of the module
│   └── subs/
│       ├── header.page        ← embedded via subpage elements
│       └── status.page
└── start.page                 ← global / shared pages stay at the top level
```

Rules:

- Subpage elements reference their targets with **relative refs** (`"./subs/header.page"`)
  when the target lives in the module folder — the module stays copyable/movable
  (rule 6, 01 §Modular pages).
- **Each subpage picks its own correct layout type** — responsive for content blocks,
  fixed for pixel-exact overlays. Do not blindly inherit the parent's mode.
- Keep module dependencies **inside the module folder**; only shared/global pages
  (start, login, 404) live at the `pages/` top level and are referenced absolutely.
- **A repeated, datasource-driven list of subpages** (e.g. one card per room) → a
  `subpageList` element (04 §16), not a stack of `subpage` elements: it renders the
  module once per datasource array item — a scrollable `grid` matrix by default; the
  opt-in `boxless` variant instead flows instances through the parent container. Put it in
  an elastic container and let it scroll (rule 20) — never grow the page.
- **Shared regions on every page** (top bar, left menu, footer) → `global.slots`
  (`global.slots` file, pageKey refs) instead of duplicating subpage elements on every
  page (00 §global.slots).

## 5. Styling — built-ins first, custom CSS last

Apply styles in this order (09 §Where to style what, rule 5a):

1. **Layout props do the heavy lifting**: `flow`/`align`/`distribution`/`gap`/`size`/
   `paddingOptions` — most visual outcomes are structure, not paint.
2. **Theme variables / `.theme` keys** for colors, fonts, gaps, borders — every theme
   key is a CSS variable `--av-<section>-<key>` (section ∈
   `project | page | container | overlay | element.<type>`); set the key in the active `.theme`
   file (e.g. `"element": { "button": { "backgroundColor": "#0f5be8" } }`) or reference
   the var in CSS. Never hardcode a value a variable already provides.
3. **`cssClass` + the active theme's companion `globalStyles.css`** — only for one-off
   tweaks the theme cannot express
   (a single special instance). Keep the default classes (`page`, `container`,
   `button`, ...) — add custom classes on top, don't replace.
4. **`pages/<dir>/*.css`** — last resort and antipattern by default: only for what
   steps 1–3 cannot express **and only when the user explicitly asks for custom
   page CSS** (01 §Sibling stylesheets). Never create these files proactively.

Anti-patterns:

- ❌ Custom CSS for standard spacing, colors, fonts, gaps — the theme covers these.
- ❌ `pages/<dir>/*.css` without an explicit user request — even when they would work.
- ❌ Broad restyles ("all buttons", "every page") via new css classes — propose a
  `.theme` section edit instead (rule 5a).
- ❌ Inline `style={{...}}` on elements — unsupported CSS in `style` will not render
  properties the editor doesn't know (09 §Rules).
- ❌ Omitting `cssClass` — every page/container/element carries it (defaults per
  rule 5).

## 6. Anti-pattern checklist (what NOT to do)

- ❌ `layout: "fixed"` everywhere, or fixed without a pixel design.
- ❌ Absolute positioning props inside responsive pages.
- ❌ Nested containers (rule 17 — they render as nothing).
- ❌ Hard-sizing every container from the mockup's pixel geometry ("the design is
  1280×800, so this column is 800px") — split the viewport: rails + elastic.
- ❌ `size` with px/% but no `manualMode: true` — the renderer ignores it; the
  intended "hard size" silently does nothing (rule 20).
- ❌ `size: { "value": 100, "unit": "%" }` as "equal split" or "fill" styling — for
  elastic containers just omit `size` (02 §Grid building rules).
- ❌ Making the page scroll (growing content beyond the viewport) instead of letting
  an elastic container scroll its content internally.
- ❌ Monolithic mega-pages with every region inline — split into subpage modules.
- ❌ Custom CSS for what the theme provides; whole-type restyles via css classes.
- ❌ Page-folder CSS (`pages/<dir>/*.css`) created proactively or offered unprompted —
  only on explicit user request (rule 5a).
- ❌ Invented keys, invalid units, missing uuids (rules 1–3, 18).

## 7. Page-building recipe (step by step)

1. **Regions**: derive the page's bands/columns from the request; sketch them
   explicitly (e.g. "top bar / content column / right status panel").
2. **Mode**: `responsive` by default; `fixed` only for an explicit pixel design.
3. **Containers**: one top-level container per region; page `flow`/`gap` +
   container `flow`/`align`/`distribution`/`gap` (02 §Grid building rules). Size per
   the paradigm (§2): elastic regions get **no `size`**; only rails get
   `size` + `manualMode: true`.
4. **Elements**: correct type + type-specific props (04), sizing, spacing via gap.
5. **Modules**: extract complex/repeated/logical regions into subpage modules with
   relative refs and their own layout mode (01 §Modular pages); shared regions →
   `global.slots`.
6. **Styling**: theme keys/vars for look-and-feel; `cssClass`+`globalStyles.css` only for
   genuine one-offs.
7. **Validate**: `uuid` on every entity (rule 2), keys verbatim from schemas (rule 1),
   supported units (rule 3), page references per rule 6 (relative refs only inside the
   page's folder, `subpageName` only).
