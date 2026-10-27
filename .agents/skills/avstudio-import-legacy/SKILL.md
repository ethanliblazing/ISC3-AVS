---
name: avstudio-import-legacy
description: Import/recreate an AVstudio project from a legacy production build (the old web editor's export folder with data.js + uploads/) into the current project format. Trigger whenever the user brings an old AVstudio build to "import", "convert", "migrate", or "recreate" it in the current version, mentions a legacy build/backup (a folder with data.js, window.staticdata, uploads/), or asks why old projects do not open in the new editor. Covers the staged extraction (extract-legacy.mjs), the page-by-page migration workflow, the old→new mapping tables, and every gap that needs judgment. Do not use this skill for creating brand-new projects from scratch (use avstudio-guide) or for integrating external HTML components (use avstudio-custom-element).
---

# Legacy Build Import — staged extraction + page-by-page migration

A legacy AVstudio production build (the old web editor's download: `data.js` +
`uploads/`) is brought into the current format in **two stages**:

1. **Extractor (script)** — converts everything that is provably mechanical:
   media → `assets/`, fonts → theme, legacy modificators → `functions/*.js`
   (with the `window.avgatorStudio` → `window.avstudio` bridge rename),
   `global.variables`, `datasources/*`, `connectors/*`, `avstudio.config`,
   theme CSS. **Pages are NOT generated** — each legacy page is written as a
   digest into `_legacy/pages/<Name>.legacy.json` (orientation-collapsed, with
   a `layoutHint`).
2. **Agent migration** — you migrate pages **one by one**: read the digest,
   decide the layout (the hint is derived from `page.isStatic`), compose
   containers and elements per the avstudio-guide rules, verify against the
   digest, and write the `.page` file.

This split exists because the legacy layout model (static containers, absolute
widgets, editor-residue coordinates) does not map 1:1 onto the new one — see
`references/07-layout-decisions.md`. Composition requires judgment; the
mechanical parts require none.

## Requirements

- Node ≥ 18 (the extractor is a single self-contained `.mjs`, no dependencies).
- The legacy build folder must contain `data.js` with `window.staticdata`.

## Workflow

### 1. Locate the input and run the extractor

The legacy build is a folder whose `index.html` loads `./data.js`.

```bash
node <skill>/scripts/extract-legacy.mjs --src <legacyBuildDir> \
    [--out <dir>] [--orientation portrait|landscape] [--name "Name"] \
    [--sprites-dir <dir>] [--force]
```

- `--out` defaults to `<legacyBuildDir>-converted`; `--force` overwrites.
- `--orientation` defaults to the project's legacy `defaultOrientation`.
- A `.gitignore` is written to `<out>/` (workspace root): the scaffold rules plus
  `<project>/_legacy/` staging. Do not move it into the project folder.
- Exit code 2 = the report has `error` entries — read
  `<out>/migration-report.json` before anything else.

Never modify the legacy build folder — it is the source of truth.

### 2. Read the report

`migration-report.json` contains:

- `summary` + `entries` (`renamed / substituted / dropped / todo / error / info`)
  for the mechanical part — resolve these first (they are few);
- `pageWorklist` — one row per legacy page: digest file, target `.page` path,
  `layoutHint`, element/container counts, anomalies. **This is your
  checklist.**

### 3. Migrate pages one by one

For every row of the worklist (do simple subpages first, complex last):

1. **Read the digest** `_legacy/pages/<Name>.legacy.json` — the raw legacy
   payload with the chosen orientation already collapsed.
2. **Layout** — follow `layoutHint` (`references/07-layout-decisions.md`):
   - `fixed` (legacy `page.isStatic`) — the page is an absolute canvas;
     elements keep their `top/left/right/bottom/deltaCenter/constraints`;
   - `responsive` — flex composition; **drop** all element coordinate props
     (they are legacy editor residue the old runtime ignored) and build
     rails/elastic per `references/13` of avstudio-guide.
3. **Compose containers** — legacy `manualMode: true` containers become rails
   (keep `size`), `manualMode: false` become elastic. Map the flow/align/
   distribution/padding per `references/02-containers.md` of avstudio-guide.
4. **Elements** — map types and props per `references/02-elements.md`
   (state → `isVisible`/`isPressed`/`value`, `slider2` → `slider`,
   `switch`→`stateControl`, keypad → buttons…), dynamic values per
   `references/05-dynamic-values.md` (`{main.x}` → `#ds:x#`, list items →
   `*.x`), actions per `references/03-actions.md` (`tap` → `onClick`,
   `uid` → `uuid`, target refs → `pages/…` paths).
5. **Parameters** — convert the legacy array to `Record<string, Variable>`
   per `references/04-project-data.md` (type coercion, media-id parameters →
   string asset paths; rewrite caller-passed ids the same way).
6. **Verify before writing**: element count matches the digest, every
   property exists in the avstudio-guide schemas (never invent props), page
   refs/`subpageName`/`#ds:` keys resolve. Write `pages/<Name>.page`.
7. Mark the row done. If a page has `anomalies`, resolve them explicitly.

### 4. Global containers and slots

`_legacy/global-containers.json` lists each legacy global container with its
slot position and the planned slot-page path. Build `pages/global/<Name>.page`
pages from those digests (same element workflow), then make sure
`global.slots` references them (`pageKey`) — the skeleton already carries the
planned paths and visibility lists.

### 5. Finish

- `avstudio.config.startPage` already points at the planned start page — make
  sure that page exists.
- Delete the `_legacy/` folder (it is gitignored).
- Open the project root in VS Code: the health check must be clean.
- Compare against the legacy build opened in a browser (`index.html`) side by
  side: start page, navigation, one subpage + one subpageList with live data,
  overlays, fonts, icons.

## Hard rules

1. **`avstudio-guide` is the schema authority.** Every key you write must
   exist in its references — never invent or rename properties.
2. **The digest is the source of truth for content** (which elements, which
   texts, which actions); the guide is the source of truth for the SHAPE.
   Never "improve" legacy content while migrating.
3. **One page at a time, verify before writing.** Element count vs digest is
   the minimum check.
4. **The report is the contract** — resolve or explain every `todo`/`error`.
5. `uuid` on every page/container/element; actions use `uuid`.
6. Delete `_legacy/` only after all pages migrated and verified.

## CLI reference

| Flag | Meaning |
| --- | --- |
| `--src <dir>` | Legacy build folder with `data.js` (required) |
| `--out <dir>` | Output project root (default `<src>-converted`) |
| `--orientation <p\|l>` | Which legacy orientation survives (default `defaultOrientation`) |
| `--name <name>` | Override project name |
| `--sprites-dir <dir>` | Folder with `<pack>.svg` sprite bundles (default: auto-discover the installed extension) |
| `--force` | Overwrite a non-empty output directory |

## References

- `01-input-format.md` — legacy build anatomy (`window.staticdata`, Strapi
  wrappers, `uploads/`, `dynamicDataUsed`, the `main.` path keyword).
- `02-elements.md` — all legacy element types → new types, prop by prop.
- `03-actions.md` — actions: behaviours, signal types, targets, overlay props.
- `04-project-data.md` — config, variables, datasources, connectors, media,
  fonts, functions/bridge, CSS, page parameters.
- `05-dynamic-values.md` — dataset options → `attachedDatasource` + tokens.
- `06-gaps.md` — no-equivalent cases + rework strategies (attachedFunctions,
  visibility startup, keypad, overlays…).
- `07-layout-decisions.md` — legacy layout model → new layout decisions
  (`page.isStatic` marker, static canvases, coordinate residue, rails/elastic).
