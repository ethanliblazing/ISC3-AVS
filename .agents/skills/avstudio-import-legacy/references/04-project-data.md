# 04 — Project-level data: old → new

## `avstudio.config`

| Legacy | New |
| --- | --- |
| `name`, `archiveName` | same (`archiveName` slugified) |
| `archiveFormat: 'zip'\|'ch5z'` | `archiveType: 'zip'\|'ch5z'` |
| `startPage` (uid) | `startPage: 'pages/<Name>.page'` |
| `env[].debugOptions.showConsoleOnLoad` | `loglevel: 'debug'` (else `'info'`) |
| `splashScreen.logoImgId` | `splashScreen: 'assets/images/…'` |
| theme | always built-in `theme/darkhuddle/darkhuddle.theme` |

## Variables (`global.variables` = `Record<string, Variable>`)

- `type` kept (`string|number|boolean`); `defaultValue`/`currentValue`
  **coerced to the type** (legacy stored `"50"` for numbers).
- `joinValueSetter_signal_fb: "<join>"` →
  `externalBinding: { connectorName: 'connectors/X.crestron', kind: 'crestron', signalName, signalType }`
  — `signalType` from the variable type: `boolean|number|string`.
- `mqttValueSetter: {uid, topic}` → `{ connectorName, kind: 'mqtt', topic }`.
- `amxValueSetter` → dropped (no AMX binding kind).
- `datasetID` + `dynamicValue` (ds-fed variable) → dropped — bind via element
  tokens instead.
- `pageId` — bookkeeping; page parameters are converted per page.
- **Media-id parameters**: a legacy parameter consumed as a background/element
  `imgId` (holding numeric Strapi media ids) is coerced to `type: 'string'`
  with asset-path values, and caller-passed numeric ids are rewritten through
  the media collection (`"2993"` → `"assets/images/presentation_bg.jpg"`);
  unmatched numeric values are reported as errors.
- `waitForLoadingUi` dropped. `actions` mapped (03). `formatValueFunctionUid`
  → functions path (or kept when it already matches `formatter-*`).
- `connectorName` is the **connector file path** (`connectors/X.web`), not a
  display name.

## Datasources (`datasources/<Name>.datasource`)

Legacy runtime always used the `production` entity; `development` is ignored.

| Legacy (`production`) | New |
| --- | --- |
| `storageType: 'local'` (+ `sourceObject` JSON string) | `localJson: './<Name>.json'` + the parsed object written next to the config |
| `storageType: 'remote'` + `sourceLink` | `remoteFetchType: 'web'` + `webConnectorUid` + `urlPostfix` (`{{var}}` → `$var$`) + `pollingInterval: autoUpdateInterval` |
| `wsConnectorUid` set | `remoteFetchType: 'websocket'` + `wsConnectorUid` (+ `wsMessagePath` if known) |
| `mqttConnectorUid` (+`mqttTopic`) | `remoteFetchType: 'mqtt'` + uids/topic |
| `storageType: 'mixed'` | remote mapping **plus** the local fallback file |
| `storageType: 'none'` | empty datasource + info |
| `useBaseUrl` + project `datasetOptions.hostname` | hostname written into the web connector `host` |
| `headerKey`/`headerValue` (or project-level) | web connector `headers[]` |
| `modificatorId` | `formatterFunction: './<Name>.formatter.js'` + the function copied into `datasources/` |
| `isImagePreloadSource` | same |

Formatter files live next to the `.datasource` file and are referenced
`./<file>.js`; every `.js`/`.json` sibling in the same folder is shared by all
datasources of that folder.

## Connectors (`connectors/<Name>.<ext>`)

`.web` `.websocket` `.mqtt` `.amx` `.crestron` (+ new `.knx` `.doorbird`).
`host`, `port`, `isSecure`, `reconnectTimeout`, `keepaliveTimeout`, `path`,
`username/password` (mqtt/amx), `headers` (web) map 1:1. `host2` /
`hostSwitchTimeout` dropped. `webXpanel` → a `.crestron` connector
(`ipId`/`roomId`/`authToken`). Project `globalJoins` land on the crestron
connector's `globalJoins`.

## Functions (legacy modificators → `functions/<Name>.js`)

- Source verbatim → `functions/<Name>.js`; uid → file path for
  `attachedFunctionToRun` / `formatValueFunctionUid` / ds `formatterFunction`.
- **Bridge rename**: the legacy runtime exposed its JS API as
  `window.avgatorStudio`; the new runtime installs `window.avstudio` with the
  same method names (no alias). The extractor rewrites the identifier in every
  migrated source:

  | `window.avstudio` method | Purpose |
  | --- | --- |
  | `getVariableByName({name})` / `setVariableByName({name, value})` | read / write a variable's current value |
  | `publishAnalog/Digital/Serial({signalName, value})` | publish a signal |
  | `getInstantDigitalFb / getInstantAnalogFb / getInstantSerialFb({signalName, defaultValue?})` | synchronous feedback read |
  | `getDatasource({uid?})` | resolved datasource data (all when omitted) |
  | `navigate(path)` / `navigateToPage(pageName)` | page navigation |

  Legacy-only methods — `setStoreValue`, `getStoreValue` (the "states" store
  is gone) and `audioControl` (use an `audio` action type) — are flagged as
  todo when a migrated function calls them.
- An `f` action's return value is **not consumed** — a function that must
  affect the UI writes state itself via the bridge (`setVariableByName`).

## Media & fonts

- `media.data[]` + build `uploads/` → `assets/images|audio|video/<clean name>`
  (hash suffix stripped: `audio_bg.bb67d76c…jpg` → `audio_bg.jpg`).
- Every legacy `imgId` reference (element `imgId`, `iconImageData.imgId`,
  `background.imgId`, splash) → `imgPath: 'assets/images/…'`.
- Fonts (`.ttf/.otf/.woff/.woff2`) → **theme folder** (`theme/darkhuddle/`).
  Family = file base name (`Audiowide-Regular.ttf` → `Audiowide-Regular`).
- If migrated CSS references a short family name (`Audiowide`), the extractor
  emits an alias `@font-face` pointing at the file.

## Global containers → `global.slots`

Legacy `globalContainers[]` become real pages `pages/global/<Name>.page`
(their single container converted) and `global.slots` entries:

- position = `portraitPosition`/`landscapePosition` per chosen orientation
  (`top|left|right|bottom`);
- `visibleByDefault`, `visibleOnPages`, `hiddenOnPages` — semantics identical;
  page uids → page paths;
- two containers on one position are merged into the same slot page.

## CSS

- Legacy theme `css` + project `customCss` →
  `theme/darkhuddle/globalStyles.css` (global, active while the theme is).
- The `darkhuddle.theme` snapshot is copied automatically from the extension's
  `resources/themes/` (regenerated from `@hmi/theme` on every build — no
  drift). Fallback: the health-check restore.
- **Reset caveat**: `darkhuddle` is a reserved theme — the editor's Reset
  button restores its files and would discard the migrated CSS. For delivered
  projects, copy the theme folder to a new name (`theme/<project>/`) and point
  `avstudio.config` at the copy.
- Per-page styling in the new model = sibling `*.css` in the page's folder
  (`@scope`-ed per folder) — use it when un-tangling global CSS.

## Page parameters

Legacy `page.parameters` is an array of variable objects; entries may carry a
`pageId` pointing at another page (a project-wide pool with bookkeeping). The
new model declares parameters on the owning page as
`Record<name, Variable>`. While migrating a page, merge every parameter referenced by
inbound `subpage`/`subpageList` `inputParameters` into the target page.

## Dropped outright

`guides`, `presets`, `overlays` (registry — actions carry everything),
`themeOverrides`, `debugOptions` (→ loglevel), `permissions`, `isTemplate` /
`template*`, `builds`, `projectScreenshots`, `selectedEnv`, legacy page
`url`/`numericPageId`/`isStatic`.
