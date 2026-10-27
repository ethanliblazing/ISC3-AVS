# 03 — Common element properties (shared by ALL element types)

Every element (regardless of `type`) is built from `ElementBase` + `Font`. This file
documents the shared properties; per-type properties are in `references/04-elements-catalog.md`.

## Common schema

```jsonc
{
    // REQUIRED
    "uuid": "9b8c5e39-38b8-4e58-b357-fe2931089697",   // unique uuid v4
    "type": "<one of the 16 types, see 04>",          // REQUIRED
    "name": "Image_1",                                // display name (REQUIRED in practice)
    "cssClass": "image",                              // default class per type (see 04)

    // CONTENT
    "text": "<p>Label</p>",                           // html string — only where the type supports it

    // TYPOGRAPHY (Font)
    "fontFamily": null | "Arial",                     // string | null
    "fontSize": { "value": 16, "unit": "px" },        // SizeProperty
    "textTransform": "uppercase" | "lowercase" | "capitalize" | "none",
    "allowTextWrap": true,                            // boolean
    "textFontSize": { "value": 14, "unit": "px" },    // alias used on elements (SizeProperty)
    "textColor": "#ffffff",                           // string

    // POSITIONING (fixed layout pages)
    "top": "358px",       // css length string
    "left": "571px",      // css length string
    "right": "143px",     // css length string
    "bottom": "160px",    // css length string
    "deltaCenterX": "214px",   // drag offset from centered position
    "deltaCenterY": "-8px",    // drag offset from centered position
    "constraintsVertical": "top" | "bottom" | "center" | "both",
    "constraintsHorizontal": "left" | "right" | "center" | "both",

    // SIZING
    "width":  { "width":  { "value": 100, "unit": "px" }, "maxWidth": { "value": 400, "unit": "px" }, "minWidth": { "value": 50, "unit": "px" } },
    "height": { "height": { "value": 61, "unit": "px" }, "maxHeight": { "value": 400, "unit": "px" }, "minHeight": { "value": 30, "unit": "px" } },
    // NOTE: inner key MUST match the dimension name ("width" inside width, "height" inside height)

    // BOX MODEL & STYLE
    "paddingOptions": { /* Padding */ },
    "border": { /* Border */ } | null,
    "background": { /* Background */ },
    "gap": { "value": 8, "unit": "px" },              // flex gap / element-internal spacing
    "boxShadow": { /* BoxShadow */ },
    "boxReflect": { /* BoxReflect */ },
    "zIndex": 1,                                      // number
    "order": 1,                                       // number — flex order in row/column containers

    // STATE
    "isWidget": false,          // part of a widget set
    "isStaticElement": false,   // static/decoration element
    "style": {},                // React.CSSProperties — advanced escape hatch, use sparingly
    "activeModeIndex": 0,       // number | string | boolean — currently active mode
    "modes": [ /* Mode[] */ ],

    // DATA BINDING (every element — see 06 §Datasource tokens, 08)
    "attachedDatasource": {
        "datasource": "datasources/rooms.datasource",   // datasource key (project-root path incl. .datasource) | null
        "steps": [ /* JsonStep[] — optional pick/filter chain */ ]
    },

    // LOGIC
    "actions": [ /* Action[] — see 05 */ ]
}
```

## Positioning (fixed layout)

On `layout: "fixed"` pages elements are absolutely positioned by the editor via
`left/top/right/bottom` and drag deltas. Accepted patterns seen in real files:

```jsonc
// anchored by two opposite edges + center deltas (editor-written)
"left": "571px", "top": "144px", "right": "143px", "bottom": "160px",
"deltaCenterX": "214px", "deltaCenterY": "-8px",
"constraintsVertical": "top", "constraintsHorizontal": "left"

// anchored by a single edge
"top": "358px"
```

- `constraintsVertical` / `constraintsHorizontal` decide which edges the element sticks
  to when the canvas resizes (`top|bottom|center|both` / `left|right|center|both`).
- `deltaCenterX` / `deltaCenterY` are the accumulated drag offsets from the centered
  anchor (css length strings, can be negative).
- `zIndex` controls stacking; `order` applies in flex (responsive) containers.

## Width / Height

```jsonc
"width": {
    "width":   { "value": 100,   "unit": "px" },   // SizeProperty — "" nested under own key
    "maxWidth": { "value": 400, "unit": "px" },
    "minWidth": { "value": 50,  "unit": "px" }
}
```

- `value: number | null`; `unit` from the 13 supported units (default `px`).
- `value: null` = unset → renderer falls back to the element default size.
- Same shape for `height` (`height/maxHeight/minHeight`).

### Responsive sizing guidance (13 §The responsive sizing paradigm)

- Unset `width`/`height` (`value: null` or omitted) → the element is a flex item
  sized `auto` (min-content) inside the container's flex flow — often all you need.
- Size relative to the container (`%`, or viewport units for special cases) rather
  than in absolute px; hard px only for intrinsically sized widgets (a 48px icon
  button, a 200px slider). Do not hardcode px for every element from the mockup's
  pixel geometry.
- `maxWidth`/`maxHeight`/`minWidth`/`minHeight` clamp flexible sizes (e.g. a card
  that stretches with the column but stops at `maxHeight: 400px`).
- Content that exceeds the container overflows and the **container** scrolls it
  internally (responsive default `scrollMode: "scroll"`) — the page itself never scrolls.
  Let long lists/logs grow and scroll; do not try to precompute their height.

## Padding

```jsonc
"paddingOptions": {
    "padding":       { "value": 12, "unit": "px" },   // all sides
    "paddingLeft":   { "value": 8,  "unit": "px" },
    "paddingTop":    { "value": 8,  "unit": "px" },
    "paddingRight":  { "value": 8,  "unit": "px" },
    "paddingBottom": { "value": 8,  "unit": "px" }
}
```

All values are SizeProperty; the four side keys override `padding`.

The side keys are exact literals (rule 18): `paddingTop`/`paddingRight`/`paddingBottom`/
`paddingLeft` — never bare directions like `top`/`right`/`bottom`/`left`. The `border`
side keys below follow the same rule (`borderTopWidth`, `borderBottomLeftRadius`, ...).

## Border

```jsonc
"border": {
    "useBorder": true,                  // master switch
    "borderWidth": 2,                   // number (px) — all sides
    "borderTopWidth": 2,                // number — individual sides override borderWidth
    "borderRightWidth": 2,
    "borderBottomWidth": 2,
    "borderLeftWidth": 2,
    "borderColor": "#ffffff",           // string
    "borderStyle": "solid",             // "dashed" | "solid" | "dotted"
    "borderRadius": 8,                  // number (px) — all corners
    "borderTopLeftRadius": 8,           // number — individual corners override borderRadius
    "borderTopRightRadius": 8,
    "borderBottomRightRadius": 8,
    "borderBottomLeftRadius": 8
}
```

## Background

Backgrounds are a **layer stack** rendered bottom → top:
**color → image → video → gradient**. Each layer is optional and independent
(the image layer keeps its legacy keys; video/gradient are separate layers).

```jsonc
"background": {
    // solid color (optional) — base layer, always painted first
    "color": "rgba(147, 61, 61, 1)",

    // image layer (ImageProps — identical for elements of type image)
    "customBackgroundImage": false,     // master switch for the image part
    "imgPath": "assets/images/my-image.png",  // string | null
    "useExternalUrl": false,            // boolean
    "externalUrl": "",                  // string
    "isLazyLoad": false,                // boolean
    "fillType": "fill" | "cover" | "contain" | "custom",   // Layout
    "fillAlignX": "left" | "right" | "center",
    "fillAlignY": "top" | "bottom" | "center",
    "opacity": 100,                     // number 0–100 (NOT 0–1)

    // custom fit & effects
    "customBackgroundImageOpacity": 100, // number 0–100
    "customBackgroundImageblur": 0,      // number (px) — note lowercase "blur" in key
    "backgroundSizeX": { "value": 100, "unit": "%" },  // SizeProperty
    "backgroundSizeY": { "value": 100, "unit": "%" },  // SizeProperty
    "backgroundPosition": "top" | "right" | "bottom" | "left" | "center",
    "backgroundElementsBlur": 0,         // number (px) — blur of child content behind this bg

    // video layer — above the image, below the gradient
    "videoBackground": {
        "enabled": false,               // master switch
        "useExternalUrl": false,        // boolean
        "externalUrl": "",              // string — used when useExternalUrl is true
        "src": "assets/videos/loop.mp4",// string | null — local project asset path
        "opacity": 100,                 // number 0–100
        "loop": true                    // boolean — repeat forever (default true); false plays once
        // playback is autoplay + muted + object-fit: cover
        // (mp4/webm only; browser autoplay requires muted)
    },

    // gradient layer — top of the stack, can tint the image/video below
    "gradientBackground": {
        "enabled": false,               // master switch
        "value": "linear-gradient(180deg, rgba(0,0,0,0.6), transparent)", // raw CSS background-image
        "opacity": 100                  // number 0–100
    }
}
```

## Assets on elements (images & icons)

Assets are attached to an element through an **asset field** — there are exactly three
canonical ways. **Never** embed a `<img>` HTML tag inside `element.text`; the `text`
field carries only textual content (labels, rich text), not assets.

The three ways:

1. **As an element icon** — for element types with `IconOptions` (`button`, `text`).
   Enable the image variant with `useImageAsIcon: true` and fill `iconImageData`:

```jsonc
{
    "type": "button",
    "text": "",
    "useImageAsIcon": true,              // IconOptions — switch from library icon to image
    "iconImageData": {                   // ImageProps
        "imgPath": "assets/images/ic_living.svg",  // real asset path (rule 7)
        "useExternalUrl": false,
        "externalUrl": "",
        "fillType": "contain",
        "fillAlignX": "center",
        "fillAlignY": "center",
        "isLazyLoad": false
    }
}
```

   (Without `useImageAsIcon`, icons are library sprite symbols via `iconName` such as
   `"BiHouse"` — see 11-icons.)

2. **As a background image** — `customBackgroundImage: true` + `imgPath` under
   `background` (full shape in the §Background block above). Any element with a
   background can use this. A **background video** is the sibling
   `background.videoBackground.src` asset field (see §Background).

3. **As a dedicated `image` element** — `type: "image"` with top-level `imgPath`
   (see 04 §image). Use this when the picture is a stand-alone visual, not an icon or
   a fill. The dedicated `image` element also covers **live MJPEG previews** (Roku /
   Fire Stick / camera) via `variant: "stream"` — see 04 §3 and rule 19.

Dynamic asset paths use a **bare token** inside the asset field (e.g.
`"imgPath": "%assetId%"` or `"$heroImage$"`), exactly like any other string render
property — rule 13. Cached toolbar tags (`<varString …>`, `<varNumber …>`) are **rich
text only** and never appear inside an asset path.

> **Anti-pattern — never do this:** putting a picture into an element by inlining its
> markup (or a dynamic tag) into `element.text` / `<p>` content. Assets belong in an
> asset field above, not in the text HTML.

## BoxShadow

```jsonc
"boxShadow": {
    "isEnabled": true,
    "xOffset": 0,           // number (px)
    "yOffset": 0,           // number (px)
    "blur": 50,             // number (px)
    "spread": 0,            // number (px)
    "color": "black",       // string
    "inset": false          // boolean
}
```

Real files often contain just `{"color": "black", "blur": 50}` — omitted members default.
Keep existing extra keys (e.g. a nested `uuid`) when editing.

## BoxReflect

```jsonc
"boxReflect": {
    "isEnabled": true,
    "offset": 1,                 // number (px)
    "position": "bottom",        // "top" | "right" | "bottom" | "left"
    "startOpacity": 80,          // number 0–100
    "endOpacity": 0              // number 0–100
}
```

Real default from templates: `{"position": "bottom", "offset": 1, "startOpacity": 80, "endOpacity": 0}`.

## Modes (multi-state elements)

The element's **base props are the Default state** — what renders while no mode is
active. Modes are 1-based partial overrides merged ON TOP of the base props, so a mode
only lists the properties that CHANGE for that state.

```jsonc
// two-state element: resting look lives in the BASE PROPS (Default), not in a mode
{
    "type": "button", "text": "<p>Light</p>",
    "background": { "color": "#222222" },   // Default (off) look
    "actions": [ /* base actions */ ],
    "modes": [
        {
            "name": "Pressed",                  // string — mode name
            "isModeHasOwnActions": false,        // boolean — mode overrides actions
            "modeProps": {                       // Partial element props (any element prop
                "textColor": "#ff0000",          // except "modes" itself), merged over base
                "background": { "color": "red" } // while the mode is active
            }
        }
    ],
    "activeModeIndex": "$lightOn$"               // number | string | boolean | name | $var$/%param$ token | feedback token
}
```

`activeModeIndex` resolution:

| value | result |
| :--- | :--- |
| unset / `null` / `""` / `0` / `false` / `"0"` / `"false"` | **Default** — base props (no mode) |
| `1` … `n` (number or numeric string) | `modes[n - 1]` — modes are **1-based** |
| `true` / `"true"` | `modes[0]` (first mode) |
| any other string | matched against a mode `name` (case-insensitive); no match → Default |
| `$variableName$` / `%parameterName%` token | resolved first (variables then parameters, 06 §Tokens), then interpreted as above — ideal for boolean "on/off" states: `false` → Default, `true` → `modes[0]` |
| `!system:key=value!` feedback token | resolved first (live control-system feedback, 06 §External feedback tokens), then interpreted as above — a boolean join drives `false` → Default, `true` → `modes[0]`; a string join is matched against a mode `name` |

Notes:

- **Two-state styling (normal/active, off/on, idle/pressed): create ONE mode, never
  two.** The resting treatment belongs in the base element props; the mode only carries
  the differences (`modeProps`). An "inactive" mode that mirrors the base props is
  redundant — Default already is the fallback whenever the mode is not active.
- `modeProps` accepts any `ElementBase` property except `modes` (no recursion), and is
  a partial override — unspecified properties keep their base values. Common overrides:
  colors, background, border, text, icons, positioning.
- When a mode is active, the **base `actions` still run** — they are only replaced if
  the active mode has `isModeHasOwnActions: true` and `modeProps.actions` (then that
  list is used instead).
- `activeModeIndex` is a plain element property in the JSON; at runtime nothing writes
  it — drive it with a `$var$` / `%param%` token, a feedback token, or a literal, and set
  the base `actions` on the element itself.

## cssClass defaults by type

`page` · `container` · `button` · `text` · `image` · `subpage` · `subpageList` ·
`spacerElement` · `sliderElement` · `dpadElement` · `stateControlElement` ·
`shadesCompactElement` · `videoElement` · `inputElement` · `dateTimeElement` ·
`rgbPickerElement` · `roundSliderElement` · `autonomicElement`.

Custom classes can be styled in the active theme's companion `globalStyles.css` (see 09). Every rendered element root
also carries the stable class `element_<type>` (e.g. `element_button`) — useful for
styling all instances of a type; prefer theme variables over direct CSS values where a
matching `--av-*` var exists (09 §Where to style what).
