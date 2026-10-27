# 09 — Functions, CSS, assets, themes

## Functions (`functions/*.js`)

Plain JavaScript files (subfolders allowed: `functions/utils/5515.js`). Every function
file follows the same contract — the editor compiles it and exposes a uid:

```js
function myFunction(data) {
  // write code here
  return data;
}
```

Rules:

- Use `function myFunction(data) { ... }` — the function must be named and export-free;
  synchronous, no imports, no external libraries.
- Receives the current data (element value / datasource payload / action payload) and
  must `return` it.
- Referenced from actions via `attachedFunctionToRun` (compiled uid) and from variables
  via `formatValueFunctionUid` — those uids are editor-generated; when creating a
  function file, name it meaningfully (`logger.js`, `utils/5515.js`), and reference the
  file's relative path where the schema expects a uid string.
- Datasource formatters are the same shape, placed in `datasources/` next to the
  datasource file (see 08).

## CSS (style layers)

AV Studio has **no project-wide `css/` folder** — custom CSS lives in one of two places,
both tied to files the editor actually collects and injects:

1. **Theme companion CSS** — **every** `*.css` file sitting next to the active `.theme`
   file (siblings, same folder) is injected as a `<link rel="stylesheet">` **only while
   that theme is active**, and removed when another theme (or none) is active. There is
   **no limit on the number of files and their names are free-form** — `globalStyles.css`
   is the only seed, not a fixed set:
   - `globalStyles.css` — project-wide custom classes / tweaks that belong to the theme;
   - the page-switch **transition is a theme setting, not a file** (the `page` section's
     `transition*` keys, see 15-page-transitions.md) — but any sibling `*.css` may override
     the generated transition CSS (Custom Advanced, see 15);
   - any other `*.css` sibling (any name) is injected too — add as many as you need.
   A `.theme` file must exist and be selected (`avstudio.config` `"theme"`) for its
   companions to be live; create a companion if it is missing.

```css
/* <theme-folder>/globalStyles.css — classes referenced by element cssClass */
.customBackgroundButton {
    background-color: var(--av-element-button-backgroundColor);
}
```

2. **Page-folder CSS** — **every** `*.css` file in a page folder (`pages/<dir>/*.css`) is
   always injected, concatenated and **scoped to that folder**: all pages whose file lives
   in `<dir>` get them, pages elsewhere do not. Names are free-form and the number of files
   per folder is unlimited (mechanics: 01 §Sibling stylesheets).

### Scope of style files

| file / folder | scope | live when |
| :--- | :--- | :--- |
| `theme/<dir>/globalStyles.css` | companion of the sibling `.theme` — custom classes / project-wide tweaks | **only while that theme is active** |
| any other `theme/<dir>/*.css` | companion of the sibling `.theme` — theme-level overrides / transitions (15) / fonts | **only while that theme is active** |
| `pages/<dir>/*.css` | page-folder stylesheets — one `@scope ([data-av-page-dir="<dir>"])` block per folder (mechanics: 01 §Sibling stylesheets) | always |

All `--av-*` variables from the active theme are set on the canvas root, so every
custom class in any stylesheet inherits them via normal CSS cascade.

### Where to style what (decision order)

Before writing custom CSS, decide the right layer — in this order:

1. **A theme variable covers the property → use it.** Every theme key is exposed as
   a CSS variable named `--av-<section>-<key>` where section is one of
   `project`, `page`, `container`, `overlay`, `element.<type>`
   (full inventory: §Themes below).
   - In a `.theme` file: set the key itself (`"element": { "button":
     { "backgroundColor": "#0f5be8" } }`) instead of overriding CSS.
   - In custom CSS: prefer referencing the var over hardcoding a value —
     `background-color: var(--av-element-button-backgroundColor)` keeps the class
     consistent with the active theme and future theme switches.
2. **Broad restyle (a whole element type, all pages, all containers) → edit the
   theme, not CSS.** When the user asks to change "all buttons", "every page", etc.,
   propose changing the matching `.theme` section (`element.button`, `page`, ...)
   — via the Theme Editor or by editing the file. Do not generate a pile of custom
   classes for look-and-feel changes; reserve CSS for what themes cannot express.
3. **A one-off tweak for specific instances → `cssClass` + the active theme's
   companion `globalStyles.css`.**
   Add a class to the element/container/page `cssClass` field and style it in
   `globalStyles.css` (sibling of the active `.theme`; create it if missing).
4. **Page-folder CSS (`pages/<dir>/*.css`) — last resort, user insistence only.**
   This layer exists for what the built-in layers cannot express, and it is an
   antipattern by default: never create these files proactively and never offer
   them unprompted. Touch them only when the user explicitly asks for custom
   page CSS. Mechanics and nesting rules: 01 §Sibling stylesheets.

### Stable DOM hooks

Every rendered element carries these classes on its root node:

- default per-type class (`button`, `text`, `image`, ... — see rule 5 of SKILL.md),
- `element_<type>` (e.g. `element_button`) — same for every instance of the type,
- the element's own `cssClass` value(s).

So styling "every slider" without touching the theme can target `element_slider`,
and styling one instance uses its `cssClass`.

Rules:

- `cssClass` values on pages/containers/elements (rule 5 of SKILL.md) can be styled here.
- Prefer `var(--av-*)` over hardcoded values whenever a matching variable exists.
- Don't restyle whole types/pages with broad custom CSS when a theme section covers it —
  offer the theme change instead.
- Don't create `pages/<dir>/*.css` unless the user explicitly asked for custom page
  CSS — and even then, only for what steps 1–3 above cannot express.
- Don't style via `style: { React.CSSProperties }` on elements unless truly necessary —
  prefer cssClass + css files (unsupported CSS in `style` will not render properties
  the editor doesn't know).

## Assets (`assets/`)

Categories and allowed extensions (anything else is ignored by the editor):

| folder | extensions |
| :--- | :--- |
| `assets/images/` | `.png .jpg .jpeg .gif .webp .svg .ico .bmp .avif` |
| `assets/audio/` | `.mp3 .wav .ogg .m4a .aac` |
| `assets/video/` | `.mp4 .webm .m4v` |
| `assets/icons/` | icon library sprite bundles (`ai.svg`, `bs.svg`, `bi.svg`, ...) |

References in JSON are always relative to the project root: `assets/images/my-image.png`.
Icons: `iconName` holds a sprite **symbol id**, `"<Pack><Name>"` (e.g. `"BiHouse"`), NOT
`library:icon`. The editor's icon picker and `references/11-icons.md` cover the exact
format, the available packs, and how a pack becomes available in the picker (a pack is
active iff its `assets/icons/<pack>.svg` bundle exists; there is no `iconLibraries` setting).

## Themes (`theme/` folder)

A theme is a single `*.theme` file (JSON syntax), conventionally placed in its own
folder under `theme/` together with its companion CSS/font files (e.g.
`theme/darkhuddle/darkhuddle.theme` + `theme/darkhuddle/globalStyles.css`). Theme
files may live in any structure inside `theme/` (e.g. `theme/darkhuddle/darkhuddle.theme`,
`theme/dark/huddle.theme`). The active theme is selected in Project Settings
(`avstudio.config` `"theme"`), which stores the file path **relative to the project
root, with the folder** (e.g. `"theme/darkhuddle/darkhuddle.theme"`,
`"theme/dark/huddle.theme"`). Clearing the field (or leaving it empty) means no project
theme — the built-in defaults apply. The editor ships
`theme/darkhuddle/darkhuddle.theme` at project creation, together with its
`globalStyles.css` companion, seeded with the full built-in default theme, and
pre-selects it.

The `.theme` file mirrors the theme schema exactly — five sections:
`project`, `page`, `container`, `overlay`, `element.<type>` (16 element types).
Values are plain CSS strings. The complete canonical key inventory is below.

### Theme key inventory (`avstudio-theme-inventory`)

This inventory is the schema reference — **do not invent keys**. Element fields =
`elementBase` ∪ `elementExtras["<type>"]`. It is verified against the code by
`extension/scripts/checkSkillSync.mjs`. If the seeded `theme/darkhuddle/darkhuddle.theme` was
renamed or broken, this inventory is the source; recreate the file via the
**Add theme** command.

```jsonc avstudio-theme-inventory
{
    "project": ["textColor", "brandColor", "fontSize", "fontFamily", "backgroundColor", "backgroundImage", "backgroundImageOpacity", "backgroundImageBlur", "gap", "borderRadius"],
    "page": ["gap", "fontSize", "fontFamily", "textColor", "brandColor", "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "borderStyle", "borderWidth", "borderTopWidth", "borderBottomWidth", "borderLeftWidth", "borderRightWidth", "borderRadius", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius", "borderColor", "backgroundColor", "backgroundImage", "backgroundImageOpacity", "backgroundGradient", "backgroundGradientOpacity", "backgroundImageBlur", "backgroundElementsBlur", "flow", "align", "responsiveWidth", "responsiveHeight", "fixedWidth", "fixedHeight", "transitionEnter", "transitionExit", "transitionDuration", "transitionEasing"],
    "container": ["gap", "size", "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "backgroundColor", "backgroundImage", "backgroundImageOpacity", "backgroundGradient", "backgroundGradientOpacity", "backgroundImageBlur", "backgroundElementsBlur", "borderStyle", "borderWidth", "borderTopWidth", "borderBottomWidth", "borderLeftWidth", "borderRightWidth", "borderColor", "scrollMode", "scrollbarThumbBackground", "flow", "align", "distribution", "fontFamily", "fontSize", "textColor", "brandColor", "borderRadius", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"],
    "overlay": ["maskColor", "maskOpacity", "maskBlur", "backgroundColor", "closeButtonColor", "closeButtonSize", "closeButtonOffset"],
    "elementBase": ["backgroundColor", "backgroundImage", "backgroundImageOpacity", "backgroundGradient", "backgroundGradientOpacity", "backgroundImageBlur", "backgroundElementsBlur", "borderStyle", "borderWidth", "borderTopWidth", "borderBottomWidth", "borderLeftWidth", "borderRightWidth", "borderRadius", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius", "borderColor"],
    "elementExtras": {
        "button": ["fontSize", "fontFamily", "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "textTransform", "textColor", "gap", "iconSize", "iconColor", "pressedBackgroundColor", "pressedTextColor", "pressedIconColor", "pressedBorderColor", "pressedBorderWidth", "pressedBackgroundImage", "pressedBackgroundImageOpacity", "pressedBackgroundImageBlur", "pressedBackgroundElementsBlur", "pressedBackgroundGradient", "pressedBackgroundGradientOpacity", "disabledOpacity", "disabledFilter"],
        "text": ["fontSize", "fontFamily", "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "textTransform", "textColor", "gap", "iconSize", "iconColor"],
        "image": [],
        "spacer": [],
        "shadesCompact": ["fabricBackground", "fabricBackgroundBlur"],
        "dpad": [],
        "stateControl": ["fontSize", "fontFamily", "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "textTransform", "textColor", "gap", "controlSize", "switchCheckedBg", "switchUncheckedBg", "switchThumbCheckedBg", "switchThumbUncheckedBg", "switchTextOnColor", "switchTextOffColor"],
        "input": ["fontSize", "fontFamily", "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "textTransform", "textColor"],
        "dateTime": ["fontSize", "fontFamily", "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "textColor", "gap"],
        "video": [],
        "slider": ["fontSize", "fontFamily", "textColor", "textTransform", "gap", "trackBackground", "thumbBackground", "progressStartColor", "progressEndColor", "valueTooltipColor"],
        "autonomic": ["fontSize", "fontFamily", "primaryColor"],
        "rgbPicker": [],
        "roundSlider": ["fontSize", "fontFamily", "textColor", "textTransform", "startColor", "endColor", "defaultTrackColor", "handleColor"],
        "subpage": ["fontSize", "fontFamily", "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "textColor"],
        "subpageList": ["fontSize", "fontFamily", "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "textColor", "rows", "columns", "gridFlow", "gap", "scrollMode", "scrollbarThumbBackground"]
    }
}
```

### Cascade & inheritance

How theme values reach the pixels:

1. **Theme layer.** The active `.theme` file is flattened once into `--av-*` CSS custom
   properties and set on the canvas root — it defines the look of everything that does
   not override it.
2. **Node layer.** Every page/container/element re-declares a subset of those same
   variables inline from its own JSON props (`gap`, `padding*`, `border*`, `fontSize`,
   background group, ...). An **explicit node value always wins over the theme**; an
   unset node prop inherits the theme value. So a theme is the defaults layer: changing
   `container.gap` restyles only containers that have no own `gap`.
3. **Internal var() graph.** Inside the theme, leaves may reference other theme
   variables, letting one knob drive many props:
   - sides → base knob: `"paddingTop": "var(--av-page-padding)"`, corner radii →
     `var(--av-<section>-borderRadius)`;
   - cross-section references: `stateControl.gap → var(--av-project-gap)`,
     `slider.progressStart/EndColor → var(--av-project-brandColor)`;
   - plain CSS passthroughs (`inherit`, `currentColor`) behave natively.

### Theme dependencies (`css` + font + image files)

A `.theme` file automatically owns the `*.css`, font files (`*.ttf .otf .woff .woff2`)
and image files (`*.png .jpg .jpeg .gif .webp .svg .ico .bmp .avif`) sitting **in the
same folder** as it (siblings only — not recursive):

```
theme/
  darkhuddle/
    darkhuddle.theme        ← theme
    globalStyles.css        ← dependency (auto-injected while this theme is active)
    Super Bouncer.ttf       ← dependency → @font-face { font-family: "Super Bouncer" }
    bg.png                  ← dependency (selectable as a theme background image)
```

- When a theme is **active** (selected in `avstudio.config` `"theme"`), its dependent
  css files are injected into the page and each font file gets an auto-generated
  `@font-face` rule whose family name is the file name without extension. Reference
  fonts from theme values by that name, e.g. `"fontFamily": "Super Bouncer"` in the
  `project` section.
- **Any `*.css` sibling is a dependency, whatever its name** — file names are free-form
  and the folder may hold any number of them; all are injected while the theme is active
  (`globalStyles.css` is the only seeded example).
- Switching or clearing the active theme removes the previous theme's injections —
  only one theme's css/fonts are live at a time.
- Font files may use spaces in names; family = exact base file name.
- Font families from dependencies appear as select options in the "Font family"
  picker (sidebar Font section and Theme Editor `fontFamily` field). In the sidebar
  the options come from the **active** theme; in the Theme Editor — from the theme
  being edited. Any custom CSS value can still be typed freely.
- To use a project image as a theme background, set `backgroundImage` /
  `pressedBackgroundImage` to `url("assets/images/<file>")`; an image **sibling of the
  `.theme` file** can be referenced the same way: `url("theme/<dir>/<file>")`. The
  Theme Editor's Background image select writes exactly these values, offering both
  groups (theme folder first, then project assets), so a background can come from the
  theme's own folder or from the project's assets. Gradients and any custom CSS
  remain valid. Raw `assets/…` and `theme/…` urls inside `--av-*` values resolve
  per-view: in the editor canvas and webview previews they map to the project's asset
  URLs; on the live server and in static exports the project-relative path is used
  as-is.

### Reserved theme names & Reset

Built-in themes have reserved file names (currently: `darkhuddle.theme`). A file whose
**base name** matches a reserved name — case-insensitively, at any nesting depth
(e.g. `theme/dark/DarkHuddle.theme`) — is an instance of that built-in theme:

- the visual editor shows a per-section **Reset** button restoring that built-in's
  factory values;
- the **Add theme** command can re-seed it.

A file with a custom name (`my-dark.theme`) is user-owned: there is no reset target for
it. Do not reuse reserved names for custom themes.

Rules:

- The active `.theme` file is the **single source of truth** for all `--av-*` values:
  when the file exists and is selected, its values are applied exactly as written — no
  merging against built-in defaults. A key missing from the file simply does not set its
  CSS variable, so keep the file complete (the seeded snapshot already contains every
  value).
- Values are CSS strings; a theme may reference its own variables via `var(--av-...)`
  (e.g. `"paddingTop": "var(--av-page-padding)"`), letting one knob cascade to many props.
- If **no theme is selected or the file is missing** (e.g. older projects), the built-in
  default theme applies. Unknown keys in a theme file are harmless.
- Double-clicking a `.theme` file opens the visual Theme Editor (Forms Editor): sections
  per schema group with color pickers, enum selects, and asset-aware fields (`fontFamily`
  lists the theme's font dependencies; `backgroundImage` lists the theme's sibling
  images and the project's image assets) —
  all still accepting arbitrary CSS. Edits save directly to the file
  and re-style the canvas live. The per-section "Reset" (reserved names only) restores
  the built-in's factory values.
- Theme files color the canvas chrome (editor preview and Live preview). Do not reference
  theme files from page JSON.
