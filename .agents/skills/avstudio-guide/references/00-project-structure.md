# 00 — Project structure, `avstudio.config`

## Project layout

A workspace may contain one or several AV Studio projects. A project = a folder that
contains `avstudio.config` (the folder is conventionally named `AVstudio UI/`).

```
AVstudio UI/
├── avstudio.config      ← ProjectConfig (JSON, NO extension) — REQUIRED marker of a project
├── pages/               ← *.page files (JSON) + sibling *.css (auto-injected, scoped per folder, see 01), subfolders allowed
├── connectors/          ← *.websocket *.web *.amx *.mqtt *.crestron *.knx *.doorbird (flat)
├── datasources/         ← <name>.datasource + formatter + local data (flat)
├── functions/           ← *.js, subfolders allowed
├── global.variables     ← Record<string, Variable> (JSON, NO extension)
├── global.slots         ← GlobalSlotsPayload (JSON, NO extension) — global slot → page key
├── assets/
│   ├── images/          ← .png .jpg .jpeg .gif .webp .svg .ico .bmp .avif
│   ├── audio/           ← .mp3 .wav .ogg .m4a .aac
│   ├── video/           ← .mp4 .webm .m4v
│   └── icons/           ← icon library sprite bundles
└── theme/               ← per-theme folders; each holds a *.theme file (named in avstudio.config "theme") + sibling *.css / font / image dependencies (globalStyles.css), auto-injected while that theme is active
```

Notes:

- Asset paths inside page JSON are relative to the project folder:
  `"assets/images/my-image.png"`.
- File references in **settings files** (`avstudio.config`, `global.slots`) are
  project-root paths that include the folder name: `"theme/darkhuddle/darkhuddle.theme"`,
  `"pages/start.page"`, `"connectors/crestron cp4.crestron"`.
- Runtime page keys are relative to `pages/`: `"start.page"`,
  `"additional/second.page"`; stored absolute page refs use the project-root
  `pages/` prefix. `"/"` = the configured start page.
- Subpage references inside page JSON may be **relative** to the containing page folder
  (`"./subs/inner.page"`) when the target is nested under it — the folder stays
  copyable/movable. Targets outside that scope use absolute page keys.
- `functions/` and `datasources/` may contain subfolders. `connectors/` is flat.
- Files `avstudio.config`, `global.variables`, and `global.slots` have **no** file extension.
- Connector references in variables/actions/datasources are project-root paths with the
  `connectors/` prefix: `"connectors/crestron cp4.crestron"`, `"connectors/strapi.web"` —
  spaces are allowed; never reference a bare file name.

## `avstudio.config` — ProjectConfig

```jsonc
{
    // REQUIRED
    "name": "My AVstudio project",          // display name
    "archiveName": "my-avstudio-project",   // used for export archive file name
    "archiveType": ".zip",                  // ".zip" | ".ch5z"
    "splashScreen": "",                     // image filename; string | undefined
    "theme": "theme/darkhuddle/darkhuddle.theme",      // path of the active .theme file relative to the project root (any nesting, e.g. "theme/dark/huddle.theme"); empty/undefined = built-in defaults
    "loglevel": "debug",                    // console log verbosity for Live Preview: "silent" | "error" | "warn" | "info" | "debug" (default "debug" = maximum verbosity when missing)
    // OPTIONAL
    "startPage": "pages/start.page"         // path of the default page relative to the project root | null | undefined
}
```

Rules:

- `startPage` may point at a page in a subfolder too (e.g. `"pages/additional/second.page"`).
- `startPage` missing/null → user picks the start page.
- `loglevel` is the **production/build** console verbosity for the exported project
  (ascending verbosity: `silent` < `error` < `warn` < `info` < `debug`). It is the
  project-level replacement for the old `avstudio-editor.logLevel` VS Code setting.
  Missing/invalid values fall back to `"debug"`.
- The **development** log level (Live Preview console) is a separate, workspace-level
  concept: it is set via the status bar "Log level" button or the
  "🅰🆅 Set Live Preview log level" command, stored in VS Code workspace state (never
  written into `avstudio.config`), and streamed to Live Preview by substituting
  `loglevel` in the live projectConfig slice. Editing `loglevel` in `avstudio.config`
  only affects the production build — it does not change the dev console.

Level semantics (Live Preview console, DevTools console of the preview page):

- `silent` — no console output from actions or live connectors.
- `error` — only errors.
- `warn` — errors and warnings.
- `info` — also confirms when an action you triggered (Crestron/KNX/MQTT write, etc.)
  was actually sent.
- `debug` — maximum verbosity; also shows write confirmations from the device/broker.
- Icon packs are **not** configured in `avstudio.config` — a pack is active iff
  `assets/icons/<pack>.svg` exists in the project. The full list of bundles (e.g. `ai`
  AntDesign, `bi` BoxIcons, `bs` Bootstrap, `md` Material, `fa`/`fa6` Font Awesome, ...)
  is in `references/11-icons.md`.

## `global.slots` — GlobalSlotsPayload

Maps the four canvas global slots (regions present on every page) to page keys plus
per-position visibility settings. Each value is a `GlobalSlotConfig` object:

```ts
interface GlobalSlotConfig {
    pageKey: string | null;        // page key under pages/, or null when empty
    visibleByDefault: boolean;     // default true
    visibleOnPages: string[];      // default []
    hiddenOnPages: string[];       // default []
}
```

Visibility semantics:

- `visibleByDefault === true` → the slot renders on every page **except** those listed in
  `hiddenOnPages`.
- `visibleByDefault === false` → the slot is hidden on every page **except** those listed
  in `visibleOnPages`.

Only the list matching the flag is used; the other is ignored.

```jsonc
{
    "top": {
        "pageKey": "pages/subpages/header.page",
        "visibleByDefault": true,
        "visibleOnPages": [],
        "hiddenOnPages": ["pages/subpages/login.page"]
    },
    "left": { "pageKey": null, "visibleByDefault": true, "visibleOnPages": [], "hiddenOnPages": [] },
    "right": { "pageKey": null, "visibleByDefault": true, "visibleOnPages": [], "hiddenOnPages": [] },
    "bottom": { "pageKey": "pages/footer.page", "visibleByDefault": false, "visibleOnPages": ["pages/start.page"], "hiddenOnPages": [] }
}
```

Rules:

- Keys: `top`, `left`, `right`, `bottom`. Unknown keys are ignored. Missing/full keys default
  to an empty config (`pageKey: null`, `visibleByDefault: true`, empty lists).
- `pageKey`/`visibleOnPages`/`hiddenOnPages` reference pages by project-root paths
  (e.g. `"pages/start.page"`, `"pages/additional/second.page"`); they resolve to the same
  keys used by navigation and `subpageName`.
- The referenced pages live in `pages/`; the file only holds references, not page data.
- Missing file or missing keys → the corresponding slot renders nothing.

Slot source pages are ordinary `.page` files. Each referenced page is rendered inline on
every page of the project like a subpage (shared layout region), so edits affect all pages
at once.

Showing or hiding the global slots on the editor canvas is an editor-only visual option
(`editorShowGlobalSlotsByPage` in workspace state, stored per page key; hidden on the canvas
by default on every page, tick the checkbox to show them on the current page), it does
not change the live/exported render. Other editor-canvas options live in workspace state
too: "Global project background visibility" (`editorShowGlobalProjectBackgroundByPage`,
stored per page key like the slots option) and the editor background color
(`editorBackgroundColor`).
