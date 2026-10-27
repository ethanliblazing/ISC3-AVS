---
name: avstudio-guide
description: Authoritative reference for creating and editing AV Studio project entities — pages (.page), containers, elements, actions, variables, parameters, connectors, datasources, functions, avstudio.config. Trigger whenever you are asked to create, edit, extend, or restructure a page, arrange elements in a grid, size or lay out containers in a responsive page (rails vs elastic, container `size`/`manualMode`), wire actions to elements/pages/variables, build a repeated/datasource-driven subpage list (`subpageList` — boxless or grid, scroll), bind a datasource to an element (`attachedDatasource`) and use dynamic `$`/`%`/`#datasource:path#` tokens, or ensure a JSON payload stays within the AV Studio data model. Never invent properties, values, units, or file layout rules beyond what these references define. Also trigger for questions about avstudio.config options (log level / console verbosity, theme, start page) and how to change them, for animating the page-switch transition (View Transitions API, theme `page` transition keys), for attaching a live MJPEG / stream preview (Roku, Fire Stick, IP camera) to a page, for wiring a WebSocket connector (receive JSON into a datasource / variable / parameter, or send a message via a `ws` action), and for MCP connection setup (connecting AI agents to AV Studio).
---

# AV Studio Project Entities — Authoritative Data Model

This skill defines the **only** valid data structures of an AV Studio project. AV Studio is a
HTML5 UI editor: projects are plain folders of JSON/JS files that a custom VS Code extension
renders into a visual editor and live preview. Device panels (pages), UI grids (containers),
widgets (elements), and control logic (actions, variables, connectors, datasources) are all
stored as JSON. Anything written outside these schemas is silently unsupported: it will not
render, may be stripped by the editor, and can break the live preview.

## When to use this skill

Trigger on ANY of these tasks:

- Create a new `.page` file, or edit an existing page / container / element.
- Build an element grid: choose containers, flex flow/align/distribution, or fixed positioning.
- Attach a **live preview / MJPEG stream** (Roku / Fire Stick / IP camera) to a page.
- Add or edit **actions**: on elements, on pages (`onLoad`/`onExit`), on variables and page
  parameters (`onChange`).
- Create/rename page parameters or global variables.
- Create connectors, datasources, functions, or edit `avstudio.config`.
- Explain `avstudio.config` settings (e.g. `loglevel` — log level / console verbosity)
  or how to change them (config form / status bar button / command palette).
- Add or restyle the **page-switch transition** (View Transitions API) — the theme's page
  transition keys (`page` section) or a custom CSS override.
- Validate or repair an existing project JSON file.
- Set up MCP connection for AI agents (opencode, Cursor, Antigravity, etc.).

## File layout overview (project root = folder containing `AVstudio UI/`)

```
project-root/
├── .agents/skills/avstudio-guide/   ← this skill (CLAUDE/opencode instruction set)
├── .vscode/launch.json              ← auto-managed Live Preview debug configs (F5)
└── AVstudio UI/                        ← the actual project (also called "project root" below)
    ├── avstudio.config                 ← ProjectConfig JSON (no extension)
    ├── pages/                          ← .page files (JSON) + sibling *.css (scoped per folder, last-resort styling — 01), subfolders allowed
    ├── connectors/                     ← .websocket .web .amx .mqtt .crestron .knx .doorbird
    ├── datasources/                    ← <name>.datasource + formatter + data (flat)
    ├── functions/                      ← .js files, subfolders allowed
    ├── global.variables                ← Record<string, Variable> (JSON, no extension)
    ├── global.slots                    ← GlobalSlotsPayload (JSON, no extension) — top/left/right/bottom → { pageKey, visibleByDefault, visibleOnPages, hiddenOnPages }
    ├── assets/                         ← images/ audio/ video/ icons/
    └── theme/                          ← per-theme folders: *.theme (active one set in avstudio.config "theme") + sibling *.css companions (globalStyles.css; schema: references/09 §Themes)
```

## Hard rules (highest priority — never violate)

1. **No invented properties.** Every key you write MUST appear in the reference schemas
   (`references/`). Never add keys "just in case", never rename existing keys, never use
   camelCase variants of documented keys. When editing an existing file, keep any extra
   legacy keys already present in that file (see rule 4).
2. **`uuid` is mandatory** on every page, container, and element. On nested objects
   (`width`, `height`, `boxShadow`, `boxReflect`, `background`, actions, ...) uuids are
   optional — the editor adds them automatically when it touches the object.
3. **Supported units only** (SizeProperty.unit):
   `px | % | em | rem | vh | vw | cqw | cqh | cqi | cqmin | cqmax | vmin | vmax`.
   Missing `unit` defaults to `px` at render time. `value: null` = "unset" (renderer falls
   back to the element default).
4. **Legacy keys are real.** Existing files may contain legacy property names. Keep them
   intact when editing those files:
    - `cornersRaduis` (dpad) — legacy twin of `cornersRadius`
    - `hideCetralButton` (dpad) — legacy twin of `hideCentralButton`
    - `joinValueSetter_signal_fb`, `externalSetterConnectorType` (variables/parameters)
    - Actions written by the editor use the key `uuid` (the internal type name is `uid`) —
      preserve whatever key form the file already uses; default to `uuid` for new files.
5. **CSS classes** — every page/container/element carries `cssClass`. Defaults:
   `page`, `container`, `button`, `text`, `image`, `subpage`, `subpageList`, `spacerElement`,
   `sliderElement`, `dpadElement`, `stateControlElement`, `shadesCompactElement`,
   `videoElement`, `inputElement`, `dateTimeElement`, `rgbPickerElement`,
   `roundSliderElement`, `autonomicElement`. Custom classes may be styled in the active
   theme's companion `globalStyles.css` (a sibling of the active `.theme`; create it if
   missing) — see 09 §CSS (style layers).
   Every rendered element also carries the stable DOM class `element_<type>`
   (e.g. `element_button`) — see 09 §Stable DOM hooks.
   `spacer` doubles as a decorative shape element — style it with `background`/`border`/
   `borderRadius`/`width`/`height` for dots, dividers, lines, squares (04 §spacer), not
   just as an invisible flex filler.
   5a. **Styling decision order — theme vars first, custom CSS last.**
   Custom CSS (including `pages/<dir>/*.css`) is an antipattern by default:
   never write it proactively and never offer it unprompted. Before writing any
   custom CSS:
    1. If the property is covered by a theme key, use its CSS variable
       (`--av-<section>-<key>`: section ∈ `project | page | container | overlay | element.<type>`;
       e.g. `var(--av-element-button-backgroundColor)`) or set the key in the active
       `.theme` file — never hardcode a value a variable already provides.
    2. Broad restyles ("all buttons", "every page", a whole container look) → propose an
       edit to the matching `.theme` section, not a pile of new css classes.
    3. Only a one-off tweak for specific instances → `cssClass` + the active theme's
       companion `globalStyles.css` (sibling of the active `.theme`; create it if missing).
    4. Only what steps 1–3 cannot express, **and only when the user explicitly asks
       for custom CSS** → `pages/<dir>/*.css` (scoped per folder, 01 §Sibling
       stylesheets). If the user requests something the built-in layers cannot do,
       first propose the closest supported equivalent (rule 12); page CSS only if
       the user insists after that.
       Decision table and scope of style files: 09 §Where to style what; theme inventory:
       09 §Themes.
6. **Page references**: absolute page refs use project-root paths with the `pages/` folder:
   `"pages/start.page"`, `"pages/additional/second.page"`. `"/"` = the start page.
   `pageFlipTarget` and `overlayAttachedSubpage` use absolute page refs (except
   the special routing values `"/"` and `"-1"`). `overlayAttachedSubpage` may
   instead be a `$var$` / `%param%` token that resolves to a page ref (see
   references/05-actions.md, Overlay props). `subpageName` additionally supports
   relative refs: `"./inner.page"`, `"./subs/inner.page"` — used when the target page
   lives in the same folder as (or a descendant of) the page containing the element;
   the editor stores them automatically. When writing `subpageName` by hand, prefer
   the relative form for targets inside the page's folder and `pages/...` otherwise.
   Legacy bare page refs may still be read for compatibility, but new data must not use
   them. Do not invent paths — only reference page files that exist (or state the new
   page file must be created). See `references/01-pages.md` §Modular pages for the full
   composition guidance.
7. **Asset paths** are relative to `AVstudio UI/`: `"assets/images/my-image.png"`.
   Categories: `assets/images/`, `assets/audio/`, `assets/video/`,
   `assets/icons/`. Only reference existing files. **Assets are attached to an element
   only through an asset field** — `iconImageData.imgPath` (with `useImageAsIcon: true`
   on types with IconOptions), `background.imgPath`, `background.videoBackground.src`
   (local video background), or a dedicated `image` element
   (03 §Assets on elements). **NEVER** embed an image inside `element.text` via an
   `<img>` tag — `text` is text-only. Dynamic asset paths use a bare `$var$` / `%param%`
   token in the asset field; `<varString>`/`<varNumber>` tags are rich-text only (rule 13).
   Theme background-image keys (`backgroundImage` / `pressedBackgroundImage` in a
   `.theme` file) are CSS strings — reference a project image as
   `url("assets/images/<file>")`; the Theme Editor's Background image select writes
   exactly this value. Don't copy assets into the theme folder for this (09 §Themes).
8. **Colors**: any CSS color string — `#hex`, `rgba(...)`, `currentColor`. Opacity props
   (e.g. image `opacity`, `startOpacity`) are 0–100 numbers, not 0–1.
9. **Text fields** (`element.text`, button text) are HTML strings — e.g.
   `"<p>Open second</p>"`. For dynamic content inside them — and in any other
   property — see rule 13.
10. **Numbers are numbers, strings are strings.** Sizes like `width.value` are numbers
    (or `null`), never `"100"`. `zIndex`, `delay`, `step` are numbers.
11. **Never delete** `containers: []` when restructuring — a page may keep containers empty
    but the key itself should stay.
12. **No data model extensions.** If the user requests a capability that no schema field
    supports, say so explicitly and propose the closest supported equivalent — do not
    improvise a new key.
13. **Dynamic values are inline tokens — `$`/`%` for vars/params, `#key:path#` for
    datasources — never a plain string.**
    Any string render property of an element/container/page (incl. rich text HTML in
    `element.text`) may embed tokens: `$name$` = a key of `global.variables` (global
    variable), `%name%` = a key of the page's `parameters` (page parameter), and
    `#key:path#` = a value from the element's own `attachedDatasource` result. Use a token
    alone (`"placeholder": "%roomId%"`, `"value": "$volume$"`) or embedded
    (`"text": "<p>Temp: $temperature$°C</p>"`). Token names are `[A-Za-z0-9_]{1,64}`,
    lowercase camelCase. If the user asks for a dynamic binding, write the token with
    its markers — dropping them yields a broken literal string. Element/page action
    fields (`value`, signal names, `requestUrl`) resolve through the render pipeline;
    variable-/parameter-hosted action fields resolve `$`/`%` at action time, and `#ds`
    stays literal for them (05). **Datasource tokens** are the third family: `#key:path#` reads
    from the element's own `attachedDatasource` (`key` = the datasource project-root path
    including `.datasource`, e.g. `#datasources/rooms.datasource:rooms.0.name#`); inside a
    `subpageList` instance `#key:*.<path>#` reads the **current list item** (`*` = this
    instance's array item, resolving only when `key` matches the list's datasource).
    Never invent datasource keys or field paths; datasource tokens are render-property
    only, like `$`/`%`. Full syntax: 06 §Datasource tokens, §Item-relative datasource
    tokens. **External feedback tokens** are a fourth family: `!system:key=value!` binds a
    render property directly to live feedback from a control system (currently Crestron:
    `!crestron:type=<boolean|number|string>;name=<join>!`, where `name` is a join number or
    a text signal name and may itself embed `$`/`%`/`#ds` tokens, incl. item-relative).
    Resolved last, after `$`/`%`/`#ds`; resolves in render properties and in
    element-/page-hosted action fields (not in variable/parameter actions). Full syntax and
    patterns: 06 §External feedback tokens.
    **Element-context tokens** are a fifth family: `@context:<key>@` is a universal runtime
    marker usable **only inside an action's JSON message body** (`value` of
    `mqtt`/`ws`/web `post|put|patch`). Every element exposes `@context:elementName@` (the
    element's friendly name, string); element-specific keys are declared per type
    (`ElementContextRegistry`): `@context:pressedButton@` = the pressed D-Pad button id
    (string); `@context:red@` / `@context:green@` / `@context:blue@` = Color Picker
    (`rgb` variant) channel values (number); `@context:hex@` = Color Picker hex value
    (string, `hex` variant). Numeric keys may stand as bare JSON values
    (`{"r": @context:red@}`), string keys must be quoted. Resolved at action time, never
    at render; full list: 05.
    Rich text additionally supports cached toolbar tags: variable tags
    (`<varString variableName="x">Fallback</varString>` / `<varNumber variableName="x"/>` /
    `<varBoolean variableName="x" true="True" false="False"/>`, global variables only),
    parameter tags (`<parameter name="x">Fallback</parameter>` /
    `<parameterBoolean name="x" true="True" false="False"/>`) and feedback tags
    (`<digital_fb signal="J" true="On" false="Off"/>` / `<analog_fb signal="J"/>` /
    `<serial_fb signal="J">Fallback</serial_fb>`). Full syntax, limits, examples: 06 §Tokens.
    **The marker (`$`/`%`, or tag vs token) is dictated by the entity's real storage —
    never guess, never auto-convert.** `$name$` / `<varString variableName="name">` are
    for keys that exist in `global.variables`; `%name%` is for keys in the page's
    `parameters`. Before "fixing" or rewriting an existing token/tag, verify the key's
    actual scope in the project files — do not replace an existing `<varString>` with a
    `%param%` token (or vice versa) merely because of a guessed classification; that
    silently changes rendering behavior (cached global vs runtime parameter). Only change
    the marker when you have confirmed the true scope and the rewrite is genuinely needed.
14. **Element modes: base props ARE the Default (resting) state — do not duplicate it.**
    `modes` are 1-based partial overrides merged over the base element
    (`activeModeIndex: 1` → `modes[0]`, `n` → `modes[n-1]`); `activeModeIndex` unset /
    `0` / `false` / `""` → Default (base props). It also accepts a mode `name` string, a
    `$var$` / `%param%` token, or an external feedback token (boolean: `false` → Default,
    `true` → `modes[0]`). **For two-state elements (normal/active, off/on) write the resting look
    into the base props and add ONE mode carrying only the differences in `modeProps` —
    never an extra "inactive" mode mirroring the base.** Mode actions: base `actions`
    keep running unless the active mode sets `isModeHasOwnActions: true` + its own
    `modeProps.actions`. Full reference: 03 §Modes.
15. **Library icons on elements use sprite symbol ids — never inline markup, and only
    from active packs.** `iconName` is a sprite symbol `<Pack><Name>` in CamelCase
    (`"BiHouse"`, `"MdHome"`, `"FaHome"`), NOT `library:icon`, and NOT an image path. The
    pack is derived from the symbol's leading characters; real names come from the
    editor's icon picker / Icon Explorer — never invent them. **An icon renders on the
    page (editor preview + Live Preview) only when its pack is active** — a pack is active
    iff `assets/icons/<pack>.svg` exists in the project (there is **no `iconLibraries`
    setting**; file presence is the single source of truth, auto-synced by the editor).
    Without activation the symbol is not injected into the page and the icon is blank.
    The extension's bundled sprites (`resources/sprites/*.svg`) only power the picker /
    Icon Explorer thumbnails, not the page render. If the needed pack is not active,
    **stop and ask the user** to activate it in the Icon Explorer
    (`avstudio-editor.openIconExplorer`), proposing suitable pack(s) by exact code +
    label (e.g. `bi` = BoxIcons, not "Bootstrap Icons"; `bs` = Bootstrap); do not create or
    delete files in `assets/icons/` yourself. **Never** inject an icon by inlining `<img>`/`<div>`
    into `element.text` — icons go in `iconName`, real images in
    `useImageAsIcon`+`iconImageData` (03 §Assets). Full reference: 11-icons.
16. **AV Studio log levels are exactly five — never answer with generic logging
    tables.** Values are `silent | error | warn | info | debug` (ascending verbosity,
    default `debug` when missing); there is no TRACE / FATAL / CRITICAL in AV Studio.
    There are **two separate settings**: `avstudio.config` `"loglevel"` = production/
    build verbosity of the exported project; the **dev** log level (Live Preview
    console) = workspace-level VS Code setting via the status bar "Log level" button /
    "🅰🆅 Set Live Preview log level" command — it is never written to the project file
    and never changes the project setting. Semantics + how to change each:
    `references/00-project-structure.md` §loglevel + the user block in
    `references/10-editor-commands.md` §1.
17. **No nested containers.** Containers live only in the page's top-level `containers`
    array. Every entry in a container's `elements` is a typed element (`type` key from
    the 16 element types) — never another container. A container object inside
    `elements` has no `type` and renders as nothing (blank canvas, no error). Build
    grids from multiple top-level containers (02 §Grid building rules); for complex
    grouped/nested structures use a `subpage` element (04 §15).
18. **Property keys are exact literals from the schemas — never variants.** Use the
    exact spelling shown in the schema block for the entity: `paddingTop`/`paddingRight`/
    `paddingBottom`/`paddingLeft` (never bare `top`/`right`/`bottom`/`left`),
    `backgroundColor` (never `background-color`), `borderRadius` (never `border-radius`),
    `scrollMode` (never `scroll-mode`), `scrollSnap`/`scrollSnapAlign`,
    `manualMode`, `scrollbarThumbBackground`.
    Keep snake_case where the schema mandates it (`input_signal_s_fb`,
    `value_signal_a`, `attachedFunctionToRun`). Where an alias exists (`textFontSize` on
    elements vs `fontSize`), use the key documented for that entity. When in doubt,
    re-read the schema block — do not guess.
19. **Live MJPEG previews are `image` elements with `variant: "stream"` — nothing else.**
    Set `useExternalUrl: true` and `externalUrl` to the stream URL (04 §3). Never use
    the `video` element for MJPEG (it plays MP4/WebM/HLS/RTSP only), never embed an
    `<img>` in `element.text`, and never hand-roll refresh keys or changing `?t=`-style
    query params. The stream variant is fully manual: every page mount requests the
    stream with a fresh cache-busted URL (a stale cached frame is never shown), a
    refresh hint shines through while the stream is blank, any click on the element
    re-requests the stream and still triggers the element's click actions in
    parallel, and leaving the page tears the stream connection down — no background
    downloads, no auto-reconnect polling. `externalUrl` may embed `$var$` / `%param%`
    tokens (rule 13). `isLazyLoad` is ignored in stream mode; all other image props
    behave as in `"simple"`.
20. **Responsive sizing paradigm: the page never scrolls — content scrolls inside
    containers.** A responsive page always fills the viewport (`100% × 100%`); never
    derive container sizes from a design resolution or the physical panel size. Split
    the page into **elastic** and **rail** containers:
    - **Elastic (default)** — do not set `size` at all: the container stretches into
      its share of the leftover space, and equal elastic siblings split that space
      equally. No percent math, no px from mockups.
    - **Rail** — a region with an intrinsic size that must not flex (top bar, menu
      row, toolbar, header/footer strip, fixed side panel):
      `size: { "value": 64, "unit": "px" }` **with `manualMode: true`** — the renderer
      pins it (flex-grow/shrink: 0). `size` WITHOUT `manualMode: true` is ignored at
      render time — a hard size that silently does nothing.
    - Mixed layout: rails are subtracted first; elastic containers share the remainder.
      Mechanics + canonical example: `references/02-containers.md` §Grid building rules;
      reasoning: `references/13-layout-composition.md` §The responsive sizing paradigm.
21. **WebSocket is JSON-only and path-routed — never invent filter fields.** A
    `.websocket` connector receives JSON messages; non-JSON is dropped. Consumers
    extract a value with a root-relative JSON path (`wsMessagePath` on a datasource,
    `path` on a `websocket` `externalBinding`; empty = whole message). Variables only
    receive scalars. A `ws` action sends `value` verbatim (no `$`/`%`/`#` token
    resolution; only `@context:<key>@` markers, see 05). There is **no**
    `matchPath`/`matchValue`/`filter` — separate streams by
    distinct paths or separate connectors. Full guide: `references/14-websockets.md`.
22. **Scroll snap is opt-in and exists on exactly two hosts - never add it
    elsewhere.** `scrollSnap` (boolean) + `scrollSnapAlign` (`"start"` default /
    `"center"` / `"end"`) are keys of **containers** and **`subpageList`** only.
    Off by default (absent or `false` = off), and there are **no theme keys** for
    snap (unlike `scrollMode` - element props only). It takes effect only when
    the host actually scrolls: a container needs **responsive layout** (fixed
    containers have `overflow: visible` and never scroll) and `scrollMode` not
    `"disabled"`; a `subpageList` needs **`variant: "grid"`** (a boxless list has
    no box of its own) and `scrollMode` not `"disabled"` - fixed layout works for
    grid lists too. When on: `scroll-snap-type: both mandatory` on the scroll
    container + `scroll-snap-align` on its direct snap targets (the container's
    elements / the grid cells). Sidebar: "Scroll" → "Scroll snap" card
    (collapsed while off, alignment options while on; hidden while scroll mode is
    "disabled"). Mechanics: 02 §Grid building rules rule 10; 04 §16.

## Reading the references (load on demand, never invent)

| Task                                                                                                 | Load these files                                                                                                                      |
| :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| Project skeleton, avstudio.config                                                                    | `references/00-project-structure.md`                                                                                                  |
| Log level / console verbosity / how to change it                                                     | `references/00-project-structure.md` (§loglevel), `references/10-editor-commands.md` §1                                               |
| New page / page properties / page parameters / page actions                                          | `references/01-pages.md`, `references/06-variables-and-parameters.md`                                                                 |
| Layout composition — structure, layout mode, sizing paradigm (rails/elastic), modules, styling order | `references/13-layout-composition.md`                                                                                                 |
| Container grids (responsive flex + fixed)                                                            | `references/02-containers.md`                                                                                                         |
| Positioning, sizing, background, border, shadow of any element                                       | `references/03-elements-common.md`                                                                                                    |
| Attach an image/icon/asset to an element (icon, background, image element)                           | `references/03-elements-common.md` §Assets on elements                                                                                |
| Theme background image from a project asset (`url("assets/…")` in `.theme`)                          | `references/09-functions-and-assets.md` §Themes                                                                                       |
| Library icon on an element: `iconName` format, the 31 packs, pack activation flow                    | `references/11-icons.md`                                                                                                              |
| Multi-state elements: modes, `activeModeIndex`, Default vs mode props                                | `references/03-elements-common.md` §Modes                                                                                             |
| Which element type to use / its specific props                                                       | `references/04-elements-catalog.md`                                                                                                   |
| Live MJPEG / stream preview (Roku / Fire Stick / camera)                                             | `references/04-elements-catalog.md` §3 (`variant: "stream"`)                                                                          |
| Actions on elements, pages, variables / signal types                                                 | `references/05-actions.md`                                                                                                            |
| Global variables & page parameters                                                                   | `references/06-variables-and-parameters.md`                                                                                           |
| Connectors (web/websocket/mqtt/crestron/amx/knx/doorbird)                                            | `references/07-connectors.md`                                                                                                         |
| WebSocket end-to-end (connect, receive into datasource/variable/parameter, send via `ws` action)      | `references/14-websockets.md`                                                                                                         |
| Crestron feedback emulation / test signals in browser console                                        | `references/12-crestron-feedback-emulation.md`                                                                                        |
| Feedback tokens — direct, through subpage parameters, dynamic joins, mode selector, rich-text tags   | `references/06-variables-and-parameters.md` §External feedback tokens, `references/03-elements-common.md` §Modes, `references/12-crestron-feedback-emulation.md` |
| Datasources (HTTP / connector-fetched / local)                                                       | `references/08-datasources.md`                                                                                                        |
| Bind a datasource to an element / `attachedDatasource` / steps                                       | `references/08-datasources.md` §Attaching a datasource to an element, `references/06-variables-and-parameters.md` §attachedDatasource |
| Dynamic datasource tokens (`#key:path#`, item-relative `#key:*.<path>#`)                             | `references/06-variables-and-parameters.md` §Datasource tokens                                                                        |
| Repeated / datasource-driven subpage list (boxless vs grid, rows/columns/gridFlow, scroll)           | `references/04-elements-catalog.md` §16, `references/06-variables-and-parameters.md` §Item-relative datasource tokens                 |
| JS functions, CSS classes, assets, themes                                                            | `references/09-functions-and-assets.md`                                                                                               |
| Page-switch transition animation (View Transitions, theme `page` transition keys)                    | `references/15-page-transitions.md`                                                                                                   |
| Launch Live Preview / run editor commands (agent + user)                                             | `references/10-editor-commands.md`                                                                                                    |
| MCP setup (connect AI agent to AV Studio)                                                            | Inline — workflow I below                                                                                                             |

## Standard workflows

### A. Create a new page

0. Follow `references/13-layout-composition.md` — structure first, then layout mode,
   modules for complexity, built-in styling; custom CSS last.
1. Decide `layout`: `"responsive"` (flex containers scale) or `"fixed"` (elements are
   absolutely positioned via `left/top/right/bottom/deltaCenterX/Y`). Default: `responsive`.
2. File: `AVstudio UI/pages/<folder/name>.page`. File name (minus `.page`) becomes the
   page key; absolute refs use `pages/<folder/name>.page` in pageFlipTarget/subpageName.
3. JSON:
    ```json
    {
        "uuid": "<new-uuid-v4>",
        "name": "start",
        "layout": "responsive",
        "cssClass": "page",
        "containers": [ <container> ]
    }
    ```
4. Add at least one container (see section C), then elements.
5. Styling: `paddingOptions`, `background`, `border`, `width`/`height` +
   `enableCustomPageSize: true` for custom canvas size, `textColor`, font props
   (`fontFamily`, `fontSize`, `textTransform`, `allowTextWrap`) — see
   `references/01-pages.md`. Custom page CSS (`pages/<dir>/*.css`) only on
   explicit user request (rule 5a, 01 §Sibling stylesheets) — never by default.
6. Page life-cycle actions: `actions` with behaviour `onLoad`/`onExit` and
   `pageFlips.analogPageFlipValue` for Crestron analog flips — see
   `references/05-actions.md`.
7. Wire the page into navigation from another page: element action `type: "r"` with
   `pageFlipTarget: "pages/<page-key>"` (or `"/"` for the start page).

### B. Create an element inside a container

1. Pick the type from `references/04-elements-catalog.md` (16 types).
2. Minimal shape:
    ```json
    {
        "uuid": "<uuid-v4>",
        "type": "button",
        "name": "Button_1",
        "cssClass": "button",
        "text": "<p>Label</p>"
    }
    ```
3. Size it with `width: { "width": { "value": 200, "unit": "px" } }` and
   `height: { "height": { "value": 80, "unit": "px" } }` — note the double nesting:
   the key of the nested SizeProperty equals the dimension name.
4. In responsive containers, elements flow like flex items (you may add `order`,
   `zIndex`); in fixed pages use positioning props from `references/03-elements-common.md`.
5. Actions: `actions: [...]` — see `references/05-actions.md`.
6. Type-specific props: include them per `references/04-elements-catalog.md`
   (e.g. slider `minValue/maxValue/step`, input `input_signal_s_fb`, subpage `subpageName`).

### C. Build a container grid

- **Follow the composition order first**: structure → layout mode → modules → styling
  (`references/13-layout-composition.md`). The mechanics below are the toolbox.
- **Responsive grid** (container-level flex): `flow: "row" | "column"`,
  `align` (`flex-start|flex-end|center|stretch`), `distribution`
  (`flex-start|flex-end|center|space-between|space-around`), `gap: {value, unit}`.
  Containers are all top-level — never nested (rule 17): use the page's own `flow`/`gap`
  plus per-container `size` to create rows and columns (02 §Grid building rules), and
  group complex structures with a `subpage` element (04 §15).
- **Sizing strategy (rule 20)**: the page never scrolls — containers split the viewport
  and overflowing content scrolls inside a container. Leave container `size` unset for
  elastic regions (they share the leftover space; equal siblings split it equally);
  use `size` + `manualMode: true` only for rails with intrinsic size (top bar, menu
  row, toolbar, fixed side panel); never compute px sizes from a design resolution
  (02 §Grid building rules, 13 §The responsive sizing paradigm).
- **Fixed canvas** (`layout: "fixed"`): elements position themselves with
  `left/top/right/bottom` (CSS strings like `"571px"`), `deltaCenterX/deltaCenterY`
  (drag offsets), and `constraintsVertical` / `constraintsHorizontal`
  (`top|bottom|center|both` / `left|right|center|both`) — see
  `references/03-elements-common.md` section "Positioning".
- Container props: `size` (`value/unit` + `manualMode` — honored only with
  `manualMode: true`, see rule 20), `paddingOptions`, `border`,
  `background`, `gap`, `scrollMode`/`scrollbarThumbBackground`/`scrollSnap`/
  `scrollSnapAlign`, `textColor`, font props, `cssClass: "container"`.

### D. Wire an action

1. Choose a host: element (`element.actions`, behaviours `onPress/onRelease/onClick/onHold`
   and change/focus behaviours), page (`page.actions`, behaviours `onLoad/onExit`), or
   variable/parameter (`variable.actions`, behaviour `onChange`).
2. Choose `type` (SignalType): `d` digital, `joinMap` per-target Crestron join map
   (D-Pad buttons digital/momentary, Color Picker channels analog/on-change), `a` analog,
   `s` serial, `r` routing (page flip), `v` set
   variable, `p` set parameter, `o`/`co` overlay, `f` run function,
   `post/put/get/delete/patch` HTTP, `audio`, `ws`, `mqtt`, `knx`.
3. Fill the fields required by that type — full map in `references/05-actions.md`.
4. Multi-button elements (D-Pad): bind each button's Crestron join with a `joinMap`
   action (`buttonJoins: { top, right, bottom, left, center }`, momentary). For
   the Color Picker (`rgb` variant), bind each color channel to an analog join
   (`channelJoins: { r, g, b }`).
   For non-Crestron transports, use one action whose JSON `value` contains
   `@context:pressedButton@` to report which button was pressed.
5. Compiled-function actions (`type: "f"`) reference `attachedFunctionToRun` = the
   function uid; HTTP actions use `connectorUid` (project-root path with the
   `connectors/` prefix, like `connectors/strapi.web` — never a bare file name) +
   `requestUrl` and chain `onResponseOk`/`onResponseError` (arrays of other action uuids).
   `ws`/`mqtt`/`knx` actions use the same `connectorUid` path rule; a `ws` action sends
   `value` verbatim (no token resolution — see `references/14-websockets.md`).

### E. Variables & page parameters

- Global variables live in `global.variables` as `Record<name, Variable>`:
  `{"volume": {"type": "number", "defaultValue": 11}}` — see `references/06-…`.
- Page parameters live in the page JSON under `parameters: Record<name, Variable>`
  (same Variable schema).
- Variables/parameters may carry `actions` (`onChange`), `externalBinding` (crestron /
  mqtt / knx / websocket — the last with a root-relative `path`), `formatValueFunctionUid`,
  and legacy keys (rule 4).

### F. Create a connector / datasource / function

- Connector file: `connectors/<name>.<ext>` — ext decides the type
  (`.web` `.websocket` `.mqtt` `.crestron` `.amx` `.knx` `.doorbird`). Schema: `references/07-…`.
- Datasource: `datasources/<name>.datasource` + optional formatter and local JSON.
  Schema: `references/08-…`. A WebSocket datasource adds `remoteFetchType: "websocket"`,
  `wsConnectorUid`, and a root-relative `wsMessagePath` — see `references/14-websockets.md`.
- Function: `function myFunction(data) { ... return data; }` in
  `functions/<name>.js` (subfolders allowed) — `references/09-…`.

### G. After editing any JSON

- Validate: every brace/parenthesis balanced, `uuid` present per rule 2, units per rule 3,
  page keys per rule 6, no keys outside the schemas (rule 1).
- Key spell-check (rule 18): every property key you wrote must exist verbatim in the
  reference schemas — re-read the schema block of the entity you edited and compare
  (e.g. `paddingTop` is a real key, `top` is not; `backgroundColor` not
  `background-color`).
- The data must round-trip: the extension parses these files as JSON and renders them
  directly — invalid JSON breaks the whole project slice.

### H. Launch Live Preview & use editor commands

1. **Never try to execute editor commands from the terminal** (`code --command ...` does
   not work reliably — do not attempt it).
2. Live Preview request → give the user the canonical manual instructions (F5 hotkey,
   Command Palette title, Run & Debug panel) — ready-made block in
   `references/10-editor-commands.md` §1.
3. UI editors → tell the palette titles (Open Variables / Open page parameters / Open
   Icon Library Explorer).
4. Log level / console verbosity questions → point to `references/00-project-structure.md`
   (`avstudio.config` `"loglevel"` semantics) and the ready-made user block in
   `references/10-editor-commands.md` §1 (config form / status bar button / palette).
5. For file-based entities (page/connector/datasource/function/variable) create the
   files directly (workflows A–F); modal flows (`createProject`, connector creation
   prompts) are user-only — describe the palette title.
6. Full table of all extension commands, context requirements and user instruction
   templates: `references/10-editor-commands.md`.

### I. Set up MCP connection for AI agents

The AV Studio extension runs an MCP server that exposes project tools (read
snapshots, manage icons, run commands, get diagnostics). AI agents connect
through a stdio bridge.

#### How it works

1. The extension starts the MCP server on `127.0.0.1` (HTTP) only while an
   AVStudio project is open. It prefers `127.0.0.1:27777`, tries the next two
   ports when busy, and finally lets the OS assign a free port.
2. Stdio bridge at `~/.avstudio-mcp/bridge.mjs` proxies stdin/stdout → HTTP
3. Each project gets a discovery file at `~/.avstudio-mcp/<sha1>.json` with the
   actual port and token
4. Client config only needs the bridge command — token stays in discovery file
5. A status bar item shows the connection state: green (configured + running),
   orange (problem — click to Retry / Show log), gray (not configured — click
   to set up). Hidden while no project is open.

#### Setup steps

1. **Determine your platform.** You know which environment you are running in
   (opencode, Cursor, Antigravity, Claude Desktop, etc.). Use that.

2. **Verify the project root.** Read the discovery file(s) at
   `~/.avstudio-mcp/*.json` to find the record for this project. The
   `projectRoot` field in the discovery file is the authoritative value —
   do NOT assume it equals the VS Code workspace folder. In the standard
   layout it points to `<workspace>/AVstudio UI/`. Read the discovery
   metadata without displaying the token.

3. **Fetch current docs.** Use webfetch to check the MCP config format for
   your platform. Never rely on hardcoded formats.

4. **Generate the config.** The entry is always:
    - key: `"avstudio"`
    - command: `"node"`
    - args: `["~/.avstudio-mcp/bridge.mjs", "--project", "<projectRoot>"]`

    Wrap in your platform's config format (from fetched docs) and write to
    the platform-specific config file.

5. **Verify.** After writing the config, verify the connection works by
   calling `tools/list` through the MCP client. If it fails:
    - Check for a project-root mismatch (workspace folder vs discovery
      projectRoot).
    - Distinguish sandbox execution blocks from actual server connection
      failures.

#### Hard rules for MCP

- Never include the token in client configs.
- Always use absolute paths in the bridge command.
- Always use the projectRoot from the discovery file — never assume the workspace folder.
- Always fetch current docs — never use cached config formats.
- Read discovery metadata without exposing the token.

### J. Attach a live MJPEG preview

Use for live Motion-JPEG previews: Roku / Fire Stick screen mirrors, IP camera
feeds, any `multipart/x-mixed-replace` HTTP endpoint (rule 19).

1. Create a dedicated `image` element in the target container (workflow B shape).
2. Set `"variant": "stream"`, `"useExternalUrl": true`, and `"externalUrl"` to the
   stream endpoint — a literal URL or a `$var$` / `%param%` token (06 §Tokens).
3. Size and style it like any image: `width`/`height`, `fillType`, `fillAlignX/Y`,
   `border`, `background`, etc. all work as in `"simple"`.
4. Done — no refresh or reconnect wiring. Every page mount requests the stream
   with a fresh cache-busted URL (a stale cached frame is never shown), a refresh
   hint shines through the blank stream area, any click on the element refreshes
   the stream while the element's click actions still run in parallel, and
   leaving the page tears the stream connection down (no leftover background
   downloads). Tell the user: after the source device becomes active, click the
   image to start the stream — there is no automatic pickup by design.

## Quick schema skeleton (details in references)

```jsonc
// page
{
  "uuid": "...", "name": "start", "layout": "responsive" | "fixed",
  "cssClass": "page", "containers": [ /* ContainerType[] */ ],
  "background": { /* Background */ }, "paddingOptions": { /* Padding */ },
  "border": { /* Border */ }, "enableCustomPageSize": false,
  "width": { "width": { "value": 100, "unit": "%" } },
  "height": { "height": { "value": null, "unit": "px" } },
  "parameters": { /* Record<string, Variable> */ },
  "actions": [ /* Action[] */ ], "pageFlips": { "analogPageFlipValue": 1 },
  "dynamicDataUsed": { "variablesUsed": [], "statesUsed": [], "datasourceUsed": [] },
  "textColor": "#ffffff", "flow": "row" | "column", "gap": { "value": 10, "unit": "px" }
}

// container
{
  "uuid": "...", "name": "Container", "elements": [ /* AvstudioElement[] — typed elements only, never nested containers */ ],
  "cssClass": "container", "flow": "row" | "column",
  "align": "flex-start" | "flex-end" | "center" | "stretch",
  "distribution": "flex-start" | "flex-end" | "center" | "space-between" | "space-around",
   "gap": { "value": 10, "unit": "px" },
   "size": { "value": 64, "unit": "px", "manualMode": true },  // exact size only with manualMode: true (rail); otherwise size is ignored — container stays elastic (rule 20)
  "paddingOptions": { /* Padding */ }, "border": { /* Border */ }, "background": { /* Background */ },
  "scrollMode": "scroll", "scrollSnap": false, "scrollSnapAlign": "start", "scrollbarThumbBackground": "auto",
  "textColor": "#ffffff"
}

// element (common part — BaseElement, then type-specific props)
{
  "uuid": "...", "type": "<one of 16>", "name": "Button_1", "cssClass": "<default per type>",
  "text": "<p>…</p>", "textFontSize": { "value": 16, "unit": "px" }, "textColor": "#ffffff",
  "textTransform": "uppercase" | "lowercase" | "capitalize" | "none", "allowTextWrap": true,
  "width": { "width": { "value": 200, "unit": "px" } }, "height": { "height": { "value": 80, "unit": "px" } },
  "top": "571px", "left": "144px", "right": "143px", "bottom": "160px",
  "deltaCenterX": "214px", "deltaCenterY": "-8px",
  "constraintsVertical": "top" | "bottom" | "center" | "both",
  "constraintsHorizontal": "left" | "right" | "center" | "both",
  "zIndex": 1, "order": 1, "gap": { "value": 8, "unit": "px" },
  "paddingOptions": { /* Padding */ }, "border": { /* Border */ }, "background": { /* Background */ },
  "boxShadow": { "color": "black", "blur": 50 }, "boxReflect": { "position": "bottom", "offset": 1, "startOpacity": 80, "endOpacity": 0 },
  "actions": [ /* Action[] */ ], "modes": [ /* Mode[] */ ], "isWidget": false, "cssClass": "button"
}
```

The authoritative full schemas with every allowed value live in `references/`. Load the
file(s) matching your task before writing JSON.
