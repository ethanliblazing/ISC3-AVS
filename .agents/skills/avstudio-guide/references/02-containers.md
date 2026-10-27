# 02 — Containers and the element grid (`ContainerType`)

A container is a flex box that arranges its `elements`. Containers live only in the
page's top-level `containers` array — a container can **never** appear inside another
container's `elements`. Every entry in `elements` is a typed element (has a `type` key);
a container object has no `type` and renders as nothing, so nested containers are not
supported and produce a blank canvas. Build grids from multiple top-level containers
(see Grid building rules below), and group complex structures with a `subpage` element
(see "Grouping complex structures" at the bottom).

Element types: `button | text | image | spacer | shadesCompact | dpad | stateControl |
input | dateTime | video | slider | autonomic | rgbPicker | roundSlider | subpage |
subpageList` (see 04 + 03 for full schemas).

## Full schema

```jsonc
{
    // REQUIRED
    "uuid": "0708cf81-e360-4c29-a7f0-280690a0c4c2",
    "elements": [ /* AvstudioElement[] — typed elements only, never nested containers */ ],
    "cssClass": "container",

    // OPTIONAL
    "name": "Container",

    // GRID (flex)
    "flow": "row" | "column",                                     // layout axis
    "align": "flex-start" | "flex-end" | "center" | "stretch",    // cross axis
    "distribution": "flex-start" | "flex-end" | "center" | "space-between" | "space-around", // main axis
    "gap": { "value": 10, "unit": "px" },                         // spacing between items

    // SIZING / MODE
    "size": { "value": 64, "unit": "px", "manualMode": true },    // ContainerSize — honored ONLY with manualMode: true (pinned rail); without it the value is ignored → elastic container (rule 20)

    // STYLING
    "paddingOptions": {                                        // exact keys: padding + the four sides below — never top/right/bottom/left
        "padding":       { "value": 12, "unit": "px" },       // all sides
        "paddingLeft":   { "value": 8,  "unit": "px" },
        "paddingTop":    { "value": 8,  "unit": "px" },
        "paddingRight":  { "value": 8,  "unit": "px" },
        "paddingBottom": { "value": 8,  "unit": "px" }        // side keys override padding
    },
    "border": { /* Border — see 03 */ } | null,
    "background": { /* Background — see 03 */ },
    "textColor": "#ffffff",
    "fontFamily": null | string,
    "fontSize": { "value": 16, "unit": "px" },
    "textTransform": "uppercase" | "lowercase" | "capitalize" | "none",
    "allowTextWrap": true,

    // SCROLL
    "scrollMode": "scroll",           // "disabled" (no scroll) | "scroll" (visible bar) | "scrollHidden" (scrollable, bar hidden); unset → inherit theme container.scrollMode
    "scrollSnap": false,              // CSS scroll snap (scroll-snap-type: both mandatory + scroll-snap-align on elements); off by default
    "scrollSnapAlign": "start",       // "start" | "center" | "end"; snap alignment of the elements, applies when scrollSnap is on (default "start")
    "scrollbarThumbBackground": "auto" // CSS color or "auto"; unset → inherit theme --av-container-scrollbarThumbBackground
}
```

## Grid building rules

1. **All containers are top-level.** The page's `containers` array holds every container;
   the page's own `flow` (`"row" | "column"`) and `gap` arrange the top-level containers.
   A container's `elements` holds only typed elements — never other containers.
2. **Row of columns** → page `flow: "row"`; each top-level container is a column
   (`flow: "column"`) holding elements.
3. **Distribute space** → `distribution: "space-between" | "space-around"` on the
   row container; `align` controls cross-axis (`center` for vertical centering in a row,
   `stretch` to fill height).
4. **Two sizing modes — how `size` really works** (rule 20):
   - `manualMode: true` → **rail**: the container is pinned at the exact value
     (`flex-basis` = value, `flex-grow/shrink: 0`) and flex never redistributes it.
   - `manualMode` false or absent → the `size` value is **ignored at render time**
     (rendered as `auto`): the container is **elastic** — it claims the full axis
     (`width`/`height: 100%`) and shrinks into its share of the leftover space.
     Equal elastic siblings split the remaining space equally; after rails are
     subtracted, elastics share what remains.
5. **Elastic by default (equal split without percent math)** → for content regions
   (canvas, lists, columns, cards) do **not** set `size` at all — elastic siblings
   split the space equally on their own. A `size` value with `manualMode` false is a
   no-op that only misleads readers.
6. **Rails** → regions with an intrinsic size that must not flex: top bar, menu row,
   toolbar, header/footer strip, fixed side panel, status row →
   `size: { "value": 64, "unit": "px" }` + **`"manualMode": true`** (use `%` for a
   proportional rail). Use sparingly — everything else stays elastic.
7. **Spacing** → `gap` on the parent (page `gap` between top-level containers, container
   `gap` between elements); do not rely on margins (elements have no margin
   fields — use gap or spacer elements).
8. **The page never scrolls — containers scroll their content.** The page is the
   viewport (`100% × 100%`); a container whose children exceed its size scrolls
   internally. Scroll behavior is controlled per container by `scrollMode`
   (sidebar → Container layout → "Scroll") with three states: `"disabled"`
   (overflow hidden — no scrolling), `"scroll"` (scrollable, scrollbar visible),
   `"scrollHidden"` (scrollable, scrollbar visually hidden). It falls back to the
   theme key `container.scrollMode` (default `"scroll"`), set in the project
   `.theme` file under the `container` block. Containers without an explicit mode
   inherit the theme value. Never grow the page to fit content — put growing
   content (lists, logs, grids) in an elastic container and let it scroll.
9. **Scrollbar look** → per-container `scrollbarThumbBackground` overrides the
   theme default; unset inherits theme var
   `--av-container-scrollbarThumbBackground`. Value is a single component: a
   CSS color (`"#ff4444"`, `rgb(...)`) or the literal `"auto"` for native
   system scrollbars (`"auto"` is the seeded-theme default). Scrollbar
   thickness is native (no size property exists — use `scrollMode: "scrollHidden"` to
   hide the bar while keeping content scrollable). A **grid `subpageList`** exposes
   the same controls and theme vars under the element scope
   (`element.subpageList.scrollMode` / `--av-element-subpageList-scrollbarThumbBackground`,
   see 04 §16).
10. **Scroll snap** → per-container boolean `scrollSnap` (sidebar → Container
   layout → "Scroll" → "Scroll snap" card; off by default). When the container is
   scrollable (`scrollMode` not `"disabled"`), enabling it sets
   `scroll-snap-type: both mandatory` on the container and
   `scroll-snap-align` on its direct elements, so scroll resting
   positions lock to element boundaries (page-by-page scrolling). The hidden
   axis produces no snap positions, so `both` always matches the actual
   scroll axis. `scrollSnapAlign` (`"start"` default / `"center"` / `"end"`,
   exposed inside the expanded card) positions the elements relative to the
   snapport.
   **Availability** (hard rule 22):
   - The keys exist on every container, but snap is **rendered only in a
     responsive layout** - a fixed container has `overflow: visible`, never
     scrolls, and silently ignores the keys.
   - With `scrollMode: "disabled"` snap is inert (the sidebar card is hidden).
   - Snap targets are the container's **direct elements**. An inner scroller
     (e.g. a grid `subpageList`) manages its own targets and participates in
     this container as a single target (its root element).
   - There are **no theme keys** for snap - element/container props only
     (contrast with `scrollMode`, which inherits `container.scrollMode`).
   - A **grid `subpageList`** exposes the same card under the element scope
     (see 04 §16); a **boxless** list cannot snap at all.

## Canonical responsive example (rail + elastic)

The standard responsive pattern: page `flow: "column"` → a **header rail** pinned at
64px (`manualMode: true`) + an **elastic content container** with no `size` that
flexes out into all remaining height. The page fills the viewport and never scrolls;
the content container scrolls internally if its elements overflow.

```json
{
    "uuid": "p1111111-aaaa-4bbb-8ccc-000000000001",
    "name": "start",
    "layout": "responsive",
    "cssClass": "page",
    "flow": "column",
    "gap": { "value": 12, "unit": "px" },
    "containers": [
        {
            "uuid": "c1111111-aaaa-4bbb-8ccc-000000000001",
            "name": "Top bar",
            "cssClass": "container",
            "flow": "row",
            "distribution": "space-between",
            "align": "center",
            "gap": { "value": 12, "unit": "px" },
            "size": { "value": 64, "unit": "px", "manualMode": true },
            "elements": [
                { "uuid": "c1111111-aaaa-4bbb-8ccc-000000000010", "type": "text", "name": "Title", "cssClass": "text", "text": "<p>Living room</p>" },
                { "uuid": "c1111111-aaaa-4bbb-8ccc-000000000011", "type": "button", "name": "Menu", "cssClass": "button", "text": "<p>Menu</p>" }
            ]
        },
        {
            "uuid": "c1111111-aaaa-4bbb-8ccc-000000000002",
            "name": "Content",
            "cssClass": "container",
            "flow": "row",
            "distribution": "space-between",
            "gap": { "value": 12, "unit": "px" },
            "elements": [
                { "uuid": "c1111111-aaaa-4bbb-8ccc-000000000012", "type": "button", "name": "B1", "cssClass": "button", "text": "<p>1</p>" },
                { "uuid": "c1111111-aaaa-4bbb-8ccc-000000000013", "type": "button", "name": "B2", "cssClass": "button", "text": "<p>2</p>" }
            ]
        }
    ]
}
```

Side panel variant: page `flow: "row"` → menu container
`size: { "value": 260, "unit": "px", "manualMode": true }` + main container with no
`size` (elastic, takes the remaining width). Two or more elastic containers with no
`size` split the leftover space equally — that is the whole equal-grid recipe.

## Grouping complex structures (subpages)

When a layout needs real nesting or a reusable group, use a **`subpage` element**
instead of nested containers: it renders a whole target page inside the element bounds,
sized via the element's `width`/`height`, and can pass values to the subpage's
parameters via `inputParameters`. See `references/04-elements-catalog.md` §15
(`subpage`) and `references/01-pages.md`. Subpages are the only supported way to embed
one page inside another; nested containers are not supported and render as nothing.
To compose a page with its dependent subpages into a copyable module, keep them in one
folder and reference them with relative refs — `references/01-pages.md` §Modular pages.

## Empty container

```json
{
    "uuid": "c1111111-aaaa-4bbb-8ccc-000000000020",
    "name": "Container",
    "elements": [],
    "cssClass": "container"
}
```
