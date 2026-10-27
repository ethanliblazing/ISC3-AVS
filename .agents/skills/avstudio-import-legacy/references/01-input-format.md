# 01 — Legacy build anatomy

A legacy production build is a static web app. The entire project snapshot is
embedded at build time in **`data.js`**:

```js
window.staticdata = { "id": 2605, "attributes": { … } };
```

Parse: take the substring from the first `{` after `window.staticdata` to the
last `}` of the file — it is plain JSON.

## `attributes` inventory

| Field | Shape | Where it goes |
| --- | --- | --- |
| `name`, `archiveName` | string | `avstudio.config` |
| `archiveFormat` | `'zip' \| 'ch5z'` | `archiveType: 'zip' \| 'ch5z'` (legacy dotted values accepted) |
| `startPage` | page **uid** | `startPage: 'pages/<Name>.page'` |
| `defaultOrientation` | `'portrait' \| 'landscape'` | orientation collapse default |
| `customCss` | string | `theme/darkhuddle/globalStyles.css` |
| `theme` | `{ data: { attributes: { name, css, colors, … } } }` | theme name → built-in `darkhuddle`; `css` → `globalStyles.css` |
| `themeOverrides` | partial theme | dropped (merged into theme at runtime in legacy) |
| `globalContainers` | array | `pages/global/<Name>.page` + `global.slots` |
| `pages` | `{ data: […] }` Strapi wrapper | `pages/*.page` |
| `variables` | array | `global.variables` |
| `datasources` | `{ data: […] }` | `datasources/<Name>.datasource` (+ `.json`, `.formatter.js`) |
| `modificators` | `{ data: […] }` | `functions/<Name>.js` |
| `media` | `{ data: […] }` | `assets/images|audio|video`, fonts → theme folder |
| `websocketConnectors` / `webConnectors` / `mqttConnectors` / `amxConnectors` | arrays | `connectors/*` |
| `webXpanel` | object | `connectors/WebXpanel.crestron` |
| `globalJoins` | object | crestron connector `globalJoins` |
| `datasetOptions` | `{ hostname, headerKey, headerValue }` | web connector `host`/`headers` |
| `env[]` | `{ envName, archiveName, debugOptions, webXpanel, … }` | `showConsoleOnLoad` → `loglevel`; the rest dropped |
| `overlays[]`, `presets[]` | arrays | overlays → `o`-actions already carry everything; presets dropped |
| `splashScreen` | `{ logoImgId, text }` | `avstudio.config.splashScreen` (asset path) |
| `guides`, `debugOptions`, `permissions`, `isTemplate`, `template*`, `builds`, `projectScreenshots` | — | dropped (editor/account metadata) |

## Strapi wrappers

`pages`, `datasources`, `modificators`, `media` are wrapped:
`{ data: [{ id, attributes: {…} }] }`. `variables`, `globalContainers`,
`overlays`, `presets`, connectors are plain arrays. Page parameters are a plain
array of variable objects **on each page**.

## Runtime-only vs stored

Legacy elements store editor/runtime bookkeeping that must NOT be migrated:
`dynamicDataUsed` (a derived cache — see 05), `elementCalculatedDs`,
`parentData`, `index`, `containerIndex`, `currentPageContainersFlow`,
`staticDevMoveableRef`, `staticStyles`, `data`. Digests keep the raw payload; do not carry these into migrated pages.

## `dynamicDataUsed` — the Rosetta stone

Every element/page carries:

```json
{ "statesUsed": {}, "variablesUsed": { "activeModeIndex": "$VolumeMute$" },
  "datasourceUsed": { "inputParameters.0.passedValue": "{main.header}" },
  "parametersUsed": {} }
```

It maps **prop path → dynamic token** (`$var$`, `%param%`, `{main.ds.path}`).
The stored prop values already contain those tokens (the cache is derived), so
conversion can tokenize by walking string props; use `dynamicDataUsed` to
verify nothing was missed.

## The `main.` path keyword

ALL legacy datasource paths carry a throwaway first segment the runtime strips:

- `datasetPath: "main.readme"` → real path `readme`; `"datasource"` → whole ds.
- Filter `field: "main.0.presets"` → real path `0.presets`.
- Pointers are always `{main.<path>}` — the old resolver skips anything not
  starting with `{main.`.

New model equivalents live in 05.

## Modes

Legacy `modes[].modeProps` contains a **full element snapshot**, not overrides.
The new model wants partial `modeProps`. Re-map the snapshot per the 02 tables and strip unchanged/unknown keys — keep `modeProps` minimal.

## `uploads/`

Media files live in the build's `uploads/` folder; `media.data[].attributes.url`
is `/uploads/<file>`. `svgContent` (inline SVG strings) is written directly.
Legacy media names embed a hash (`audio_bg.bb67d76c2d26a34b9ff6.jpg`) — the
extractor strips it (`audio_bg.jpg`).
