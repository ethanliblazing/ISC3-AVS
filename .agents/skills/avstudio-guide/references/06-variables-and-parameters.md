# 06 — Global variables & page parameters

Both are `Variable` objects. Global variables live in `global.variables` (a flat JSON
object at the project root, no extension), page parameters live inside a page's
`parameters` field. The schema is identical; file-level legacy keys differ slightly.

```jsonc
// global.variables — Record<string, Variable>
{
    "volume": {
        "type": "number",              // REQUIRED: "string" | "boolean" | "number"
        "defaultValue": 11,            // default value (matches type)
        "currentValue": 11,            // runtime value — editor maintains it; set on create
        "actions": [ /* Action[] — see 05; typical behaviour "onChange" */ ],
        "externalBinding": {           // optional: bind to a connector value
            "connectorName": "connectors/crestron cp4.crestron",
            "kind": "crestron",        // "crestron" | "mqtt" | "knx" | "websocket"
            "signalName": "1",         // crestron: signal/join name
            "signalType": "boolean",   // crestron: "boolean" | "number" | "string"
            "topic": "home/lights/1",  // mqtt
            "datapointId": 12,         // knx
            "format": "DPT1",          // knx: see formats in 05
            "path": "payload.value"    // websocket: JSON path to the scalar to extract (empty = the whole incoming message)
        },
        "formatValueFunctionUid": ""   // uid of a formatting function (compiled)
    }
}
```

## Example (observed real file, trimmed)

```json
{
    "btnColor2": {
        "type": "boolean",
        "defaultValue": false,
        "joinValueSetter_signal_fb": "1",
        "formatValueFunctionUid": "",
        "externalSetterConnectorType": "connectors/crestron cp4.crestron",
        "actions": [
            { "name": "set FB", "behaviour": "onChange", "signalName_signal": "111", "type": "d", "onChangeActionUseCustomValue": false }
        ]
    },
    "name": {
        "type": "string",
        "defaultValue": "Adam",
        "externalSetterConnectorType": "",
        "joinValueSetter_signal_fb": "1"
    },
    "volume": { "type": "number", "defaultValue": 11 }
}
```

## Page parameters (inside a `.page` file)

```jsonc
"parameters": {
    "roomId": { "type": "number", "defaultValue": 1 },
    "label":  { "type": "string", "defaultValue": "Room A" }
}
```

Rules:

- Keys = parameter names, referenced elsewhere as `attachedParameterName` (actions) and
  by `%parameterName%` inline tokens in string render properties (see **Dynamic value
  tokens** below).
- Parameters can carry `actions` (behaviour `onChange`), `externalBinding`,
  `formatValueFunctionUid` — same as globals.
- Subpage elements pass values into a page's parameters via `inputParameters` (see
  04 §15) — keys should match parameter names.

## Legacy / file-level keys (keep, do not remove when editing existing files)

- `joinValueSetter_signal_fb` — string; FB signal for local value setter.
- `externalSetterConnectorType` — string; connector path for external value setter.
- The editor may also store `currentValue` — always keep it in sync with
  `defaultValue` when you create the variable (on create: both equal).

## Variable naming

Names must be unique per map (all of `global.variables`, or per-page `parameters`),
alphanumeric, no spaces (editor validates `^[a-zA-Z0-9_]+$`-ish; observed: lowercase
camelCase). How names turn into runtime values in properties/actions/rich text — token
syntax `$name$` / `%name%` / `#datasourceKey:path#` and the rich-text var-tags — see
**Dynamic value tokens** below.

## Dynamic value tokens

Any string **render property** — element/container/page props and rich text HTML in
`element.text` — may reference a value at runtime through inline tokens:

| token | resolves to |
| :--- | :--- |
| `$name$` | `currentValue` of the global variable with key `name` (`global.variables`) |
| `%name%` | `currentValue` of the page parameter with key `name` (page `parameters`) |
| `#key:path.to.value#` | a value from the element's **own attached datasource** (see §Datasource tokens) |
| `!system:key=value(;key=value)*!` | live feedback from a control system (e.g. a Crestron join — see §External feedback tokens) |
| `@env:KEY@` | a value from the project's **active env file** (`env/*.env` — see 00 §`env/` and §Env tokens below) |

- **Name rules**: `[A-Za-z0-9_]{1,64}` — letters, digits, underscore only. The editor
  sanitizes when attaching via the dynamic picker (strips other characters, truncates
  to 64); observed convention: lowercase camelCase (`roomId`, `btnColor2`).
- The token may be the **whole value** — this is the "attached dynamic value" state the
  editor's dynamic picker writes (the field then shows a `var` / `param` button instead
  of a plain value) — or **embedded inside a larger string**; both resolve at render.
- **Resolution order**: `$`-tokens first, then `%`-tokens, recursively over strings,
  arrays and objects. `#…#` datasource tokens are resolved in a separate pass against the
  element's own attached datasource (§Datasource tokens). A token whose name does not
  exist in its map stays in the string as-is (typo'd names render literally — always
  match keys exactly).
- **Env tokens** resolve **last**, after `$`/`%`/`#`/feedback: an env value is a literal
  authored in the `.env` file (it may itself embed other tokens — env output is not
  re-scanned afterwards, so no double resolution). An exact `@env:KEY@` keeps the env
  value's type (numbers/booleans survive); embedded in a larger string it stringifies;
  an unknown key stays literal. See §Env tokens below for where the values come from.
- `activeModeIndex` supports `$name$` (variables), `%name%` (parameters) and an external
  feedback token (e.g. `!crestron:type=boolean;name=5!`), like any other render property.
  A boolean value drives it naturally: value `false` → Default state, `true` → first mode;
  a string value is matched against a mode `name` (03 §Modes).
- **Actions**: action fields (`value`, signal names, `requestUrl`, …) accept tokens too.
  Element-hosted actions resolve `$`/`%` and `#ds` via the render pipeline (the element
  snapshot resolves as a whole); page-hosted actions resolve `$`/`%`; variable-/
  parameter-hosted actions resolve `$`/`%` at action time. `#ds` is not resolved for
  page/variable/parameter actions. `@context:<key>@` markers resolve at action time for
  element actions' JSON message bodies (05).
- The picker button in the UI is offered on common fields (`placeholder`, `imgPath` /
  `externalUrl`, `videoUrl`, `text`/`textOn`/`textOff`, slider labels and value
  tooltips, dpad labels, `background.color`, `border.borderColor`, `opacity`,
  `pageFlipTarget`, `activeModeIndex`, ...) — but writing the token text directly into
  the JSON is equivalent and works for **any** string render property.

```jsonc
"placeholder":  "%roomId%",                 // exact token — page parameter
"imgPath":      "$posterImage$",            // exact token — global variable
"text":         "<p>Temp: $temperature$°C</p>", // embedded in rich text
"labelTopText": "Zone %zone%",              // embedded in a plain label
```

Rich text HTML additionally supports cached display tags inserted by the rich text
toolbar. Two families:

**Variable tags — global variables only:**

- `<varString variableName="username">User</varString>` — variable value, children =
  fallback while empty/unset
- `<varNumber variableName="x"/>` — numeric variable value
- `<varBoolean variableName="x" true="True" false="False"/>` — boolean variable,
  renders `true`/`false` text per attributes

**Parameter and feedback tags:**

- `<parameter name="roomId">Default</parameter>` — the page parameter's current value
  (children = fallback while unset/empty). Equivalent to the inline `%name%` token for
  normal use; prefer `%name%` when the parameter's value is itself an unresolved token,
  because `%name%` runs the full resolution pipeline while `<parameter>` prints the stored
  value as-is.
- `<parameterBoolean name="flag" true="On" false="Off"/>` — boolean page parameter,
  renders the `true`/`false` text per attributes (fallback = the `false` text). The
  parameter-tag counterpart of `<varBoolean>`; use it when a boolean parameter must
  display different text for each state.
- `<analog_fb signal="7"/>` — live analog (number) feedback for the join, fallback `0`.
- `<digital_fb signal="555" true="On" false="Off"/>` — live digital (boolean) feedback,
  renders the `true`/`false` text per attributes (fallback = the `false` text).
- `<serial_fb signal="RoomName">Default</serial_fb>` — live serial (string) feedback,
  children = fallback.

`signal` is a join number or a text signal name, exactly like the `name` param of an
external feedback token (§External feedback tokens). Feedback tags resolve through the
same pipeline: in the editor (no live driver) they show their fallback, in Live Preview /
production they show the live value.

For parameters inside rich text you may use either the inline `%name%` token or the
`<parameter name="…">` tag — both are supported. For a boolean parameter that needs
state-dependent text use `<parameterBoolean name="…" true="…" false="…"/>`.

**Which form to use is determined by the value's actual scope, never guessed from its
name.** Check the project: a key present in `global.variables` → `$name$` or the toolbar
tag `<varString variableName="name">`; a key present in the page's `parameters` →
`%name%` (or the `<parameter name="name">` tag). Do not "correct" an existing tag/token by swapping its marker based on a guess
(e.g. rewriting `<varString variableName="deviceName">` to `%deviceName%`) — that
silently changes rendering behavior. Verify the real scope and only rewrite it when the
change is actually warranted.

## Datasource tokens (`#key:path#`)

Any string **render property on an element** (not containers/pages) may read from the
element's own `attachedDatasource` result with `#key:path#`:

```jsonc
"attachedDatasource": { "datasource": "datasources/rooms.datasource", "steps": [] },
"text":     "Room: #datasources/rooms.datasource:name#",        // path into the result
"subtitle": "#datasources/rooms.datasource:rooms.0.name#"       // numeric segment = array index
```

- `key` = the datasource key **exactly as stored** — its project-root path including the
  `.datasource` extension (`datasources/rooms.datasource`; may contain `/`, dots, spaces,
  see 08). It MUST equal the element's `attachedDatasource.datasource`; a token whose key
  differs stays literal.
- `path` = dot-separated segments into the result; numeric segments address array indices
  (`rooms.0.name`). An empty path (`#key:#`) reads the whole result. `attachedDatasource.steps`
  run first, so `path` addresses the filtered result.
- Exact whole-string token preserves the value's type (number/boolean stay typed);
  embedded in a larger string it stringifies. Unknown key/path (or a not-yet-loaded
  datasource) stays literal — the same convention as variables. Verify the datasource
  file and field path exist.
- Datasource tokens resolve on element render properties and element-hosted action
  fields only; page/variable/parameter action fields leave `#…#` literal (05).

## Item-relative datasource tokens (`#key:*.<path>#`)

A **`subpageList`** instance adds an item scope: inside its `inputParameters`, the leading
`*` path segment means "the current array item of this list instance" (see 04 §16):

```jsonc
{
  "type": "subpageList",
  "attachedDatasource": { "datasource": "datasources/rooms.datasource", "steps": [] },
  "inputParameters": {
      "roomId":   "#datasources/rooms.datasource:*.id#",
      "roomName": "#datasources/rooms.datasource:*.name#"
  }
}
```

- Each replicated instance resolves `*.` against **its own** array item — instances do
  not share item values.
- The token key must match the list's `attachedDatasource.datasource`; outside a matching
  list scope (plain page, a single `subpage`, a mismatched key) the token stays literal.
- In the dynamic value picker an array result is shown as an **"All items (N)"** wildcard
  node holding the merged union of the items' leaf fields, so picking a field writes the
  `*.` token instead of a literal index.
- A single `subpage` has no item scope — address a specific item with an index path
  (`#key:0.name#`), or switch to `subpageList` when per-item data is required.

## List context parameters (`avstudio_listItemKey` / `avstudio_listItemIsSelected`)

A page used as a **subpageList item** receives the list's per-item context through two
reserved **page parameter names** (declaring them is optional — they exist implicitly,
see below):

- `avstudio_listItemKey` (string) — the item's context key: the Subpage List's
  **List Key** setting (the element's `listKey` prop) resolved against that item, or
  the item index (`"0"`, `"1"`, …) by default;
- `avstudio_listItemIsSelected` (boolean) — `true` on the item whose key equals the
  list's resolved `activeSelectedListKey` (the **List Selected Key** setting).

Inside the item page they behave exactly like any page parameter
(`%avstudio_listItemKey%`, `%avstudio_listItemIsSelected%`, rich-text
`<parameter>`, actions). Notes:

- The names are **reserved and implicit everywhere**: whether a page is used as a list
  item cannot be judged statically (the `subpageName` target may be a dynamic token),
  so every page's parameter store seeds both entries (an explicit declaration wins),
  the tokens resolve on any page (`''` / `false` outside a list), and every page's
  parameters table pins the two names in a dedicated footer section ("Subpage List
  context", light-blue tint) below the declared parameters — column-aligned and
  excluded from sorting and the name filter; the **actions editor is available right
  on the row** — the first action edit
  materializes a real declaration in the file. The create form
  rejects these names for both page parameters and global variables. `avstudio_listItemKey` is
  shown with the **`any`** type tag: its value may come from any datasource field and
  is stringified (the store/file keep it `string`-typed); `avstudio_listItemIsSelected` is a
  plain boolean.
- The whole **`avstudio_` prefix is reserved** for system-provided names: the create
  form refuses new parameters/variables wearing it (case-insensitive) and the health
  check warns about them in hand-edited files — the exact list-context names are the
  only allowed declarations under this prefix.
- The list injects both at the item boundary and **overrides** any stored
  `inputParameters` value for these names — the list's sidebar shows those rows as
  read-only ("Provided by the list context"). Default value, External value setter and
  Formatter are hidden for the reserved names — the list owns the value; the declared
  default is what a standalone render shows.
- The parameter's **side-effect actions** react to `avstudio_listItemIsSelected` flips in live
  runtime (the editor preview does not run parameter actions).
- **Formatters on variables/parameters are not executed by the runtime** (neither
  display nor store) — a chosen `formatValueFunctionUid` is stored and validated for
  reference integrity only. The only formatter that runs today is the datasource's
  own `formatterFunction` (08 §Datasources), applied to the datasource result before
  it lands anywhere. Do not rely on parameter formatters to transform
  `avstudio_listItemKey` / `avstudio_listItemIsSelected` — transform inside the page
  (a function action, a computed parameter) instead.
- An injected `avstudio_listItemKey` that resolves to an empty string is dropped — the declared
  default stands. Declaring the names is optional: a page that never declares them
  still receives the values (implicit entries) and keeps them file-clean until an
  action is attached.
- The health check treats the reserved parameter tokens as always known, warns when a
  stored `inputParameters` value sets these names and when any page declares them with
  an externalBinding (the binding would be overridden whenever the page is used as an
  item). It also warns when the list's `listKey` prop has no
  item-relative token (the same key on every item), and when `activeSelectedListKey`
  carries an item-relative token (it never resolves at list level).

## External feedback tokens (`!system:key=value!`)

Any string **render property** (element/container/page props) may bind directly to live
feedback from a control system through a single namespaced token family:

```
!<system>:<key>=<value>(;<key>=<value>)*!
```

- **One delimiter family for every system.** `system` is the connector kind (`crestron`
  today; `knx` / `mqtt` / `websocket` / … are added through the namespace, never through
  new delimiters). Pairs are separated by `;`, key/value by the **first** `=`; values may
  contain `=` but not `;` or `!`.
- **Crestron:** `!crestron:type=<boolean|number|string>;name=<join>!`. `name` is the
  signal name — a **join number or a text signal name** (`!crestron:type=boolean;name=dpad_top!`,
  `!crestron:type=string;name=RoomName!`). The connector is not part of the token: WebXPanel
  keeps a single active crestron connection, so the project's crestron connector is used.
- **Dynamic joins.** `name` may itself embed `$var$`, `%param%` or `#ds:...#` tokens
  (including item-relative `#ds:*.<path>#`). They are resolved first, so a per-item join is
  only subscribed once concrete:

```jsonc
// subpageList.inputParameters: { "joinName": "#datasources/rooms.datasource:*.signal#" }
"background": { "color": "!crestron:type=string;name=%joinName%!" }
```

- **Resolution order:** `$`-tokens → `%`-tokens → `#…#` datasource tokens → `!…!` feedback.
  The feedback token is resolved last, on the fully-resolved value.
- Exact whole-string token preserves the value's type (number/boolean stay typed); embedded
  in a larger string it stringifies (`"Room temp: !crestron:type=number;name=7! °C"`).
- A token with an unknown system, a missing connector, or unresolved params stays literal —
  the same convention as variables/parameters/datasources. In the editor (no live feedback)
  feedback tokens stay literal; they resolve in Live Preview / production. The editor's
  health check warns about unsupported systems, invalid Crestron `type`/`name`, and
  Crestron tokens in a project without a Crestron connector.
- Feedback tokens resolve on **element/container/page render properties** and in
  **element-hosted and page-hosted action fields** (the whole element/page snapshot is
  feedback-resolved, actions included). Variable-/parameter-hosted actions (`onChange`)
  resolve `$`/`%` at action time only — a feedback token there stays literal (05). Prefer a
  feedback token over a variable with an external setter when the value is used in a single
  place.

### Feedback through parameters

A feedback token may be the value of an `inputParameters` entry, so the target page's
parameter receives the resolved live value instead of each consumer subscribing to the
join separately:

```jsonc
// subpageList on the parent page
"inputParameters": {
    "volumeLevelPercent": "!crestron:type=number;name=#datasources/rooms.datasource:*.volume#!"
}
```

Inside the subpage the parameter is an ordinary `number`/`string`/`boolean`: consume it
with `%volumeLevelPercent%` or `<parameter name="volumeLevelPercent">`. For a
`subpageList`, an item-relative join (`#…:*.volume#`) is resolved **per instance** — after
the `*` is bound to that instance's array item and before the subpage's parameters are
applied — so each instance subscribes to its own join.

**Route a value through a parameter instead of an inline token when:**

- the value is consumed in **several places** — resolve once at the boundary and share it;
- you need to **transform** the value (a parameter carries a formatting function,
  `formatValueFunctionUid`).

For a single consumer, the inline token is simpler.

### Feedback as a mode selector

`activeModeIndex` accepts a feedback token, resolved before the mode is looked up (so the
mode applies as soon as the join changes): a boolean join drives Default vs the first mode
(`false` → Default, `true` → `modes[0]`), a string join is matched against a mode `name`
(03 §Modes).

```jsonc
// button: base props = Default (off); one mode = the "on" look
{
    "type": "button",
    "text": "<p>Light</p>",
    "background": { "color": "#222222" },
    "modes": [
        { "name": "On", "isModeHasOwnActions": false,
          "modeProps": { "text": "ALARM!", "background": { "color": "rgba(255,0,0,1)" } } }
    ],
    "activeModeIndex": "!crestron:type=boolean;name=555!"
}
```

### Feedback patterns (quick reference)

```jsonc
// 1. Direct — one property bound straight to a join
"background": { "color": "!crestron:type=string;name=RoomName!" }

// 2. Dynamic join — the join name comes from a variable/parameter/datasource token
"inputParameters": { "joinName": "#datasources/rooms.datasource:*.signal#" }
"background": { "color": "!crestron:type=string;name=%joinName%!" }

// 3. Shared value — resolve once at the subpage boundary, consume in many places
"inputParameters": {
    "roomName": "#datasources/rooms.datasource:*.name#",
    "volumeLevelPercent": "!crestron:type=number;name=#datasources/rooms.datasource:*.volume#!"
}
// item.page → slider "%volumeLevelPercent%", text "<parameter name=\"volumeLevelPercent\">"

// 4. Rich-text tags — digital / analog / serial feedback inside element.text
"text": "<p>Bool <digital_fb signal=\"555\" true=\"On\" false=\"Off\"/> · Analog <analog_fb signal=\"7\"/> · <serial_fb signal=\"RoomName\">—</serial_fb></p>"
```

## Env tokens (`@env:KEY@`)

`@env:KEY@` references a value from the project's **active env file** — a dotenv file
under `env/*.env` (format and selection: 00 §`env/`). Env files carry
per-deployment constants so one project can ship to several environments without
editing content:

```jsonc
// env/dev.env:  HOST=192.168.1.10   PORT=5442
"webConnector": { "host": "@env:HOST@", "port": "@env:PORT@" }
"text": "<p>Server: @env:HOST@</p>"
```

- Keys follow the same `[A-Za-z0-9_]{1,64}` charset as `$`/`%` tokens
  (`UPPER_SNAKE_CASE` recommended). Values are type-inferred from the file:
  `true`/`false` → boolean, JSON-style numbers → number, everything else → string.
- **Resolution scope**: env tokens resolve wherever the render pipeline resolves
  `$`/`%` tokens — element/container/page render props, element/page action fields and
  datasource `inputParameters` steps — plus `avstudio.config` values and connector
  configs (e.g. the `.web` connector's `host`/headers), resolved when a driver starts
  against the active env values (the production build resolves them against the file
  picked at build time); switching env in Live restarts the affected drivers. They are **not** resolved in variable- or parameter-hosted
  action values.
- **Which file is "active"**: editor/Live Preview use the status-bar selection
  (`avstudio-editor.selectEnv`, workspace-level); a production build picks its own file
  at build time (auto with a single file, asked when there are several). Unknown keys
  stay literal, and the editor health check flags them.
- The dynamic picker hides the Environment tab by default — a field opts in via
  `dynamicSourceWhiteList: ["env"]` (all project-config fields use it); typing
  `@env:KEY@` directly into any field always works. When the project has no active env
  file — or the active file carries no values yet — the tab shows an informer under the
  (empty) table: "Create environment" creates `env/<name>.env` (folder included) via
  `avstudio-editor.createEnvFile`, and when the active file is empty the informer
  offers "Open file for editing" instead (the file opens as plain text).

## `attachedDatasource` (element binding)

Present on **every element** (never on containers/pages). It is the datasource that
element consumes: for `subpageList` it is the replication source (04 §16); for any
element it is what `#key:path#` tokens resolve against:

```jsonc
"attachedDatasource": {
  "datasource": "datasources/rooms.datasource",  // datasource key (project-root path incl. .datasource) | null
  "steps": [                                     // OPTIONAL ordered pick/filter chain applied before use
    { "id": "<uuid>", "kind": "pick",   "path": ["rooms"] },
    { "id": "<uuid>", "kind": "filter", "source": ["rooms"], "key": ["online"], "op": "isTrue", "value": "" }
  ]
}
```

- `datasource: null` (or absent) = nothing attached: `#…#` tokens stay literal and a
  `subpageList` renders no instances. The default template writes
  `{ "datasource": null, "steps": [] }`.
- `steps` is the pick/filter chain: `kind: "pick"` selects a subtree by `path`;
  `kind: "filter"` narrows an array by `key`, `op` and `value`, with `op` ∈ `equals |
  notEquals | contains | notContains | exists | notExists | nullOrEmpty | notNullOrEmpty |
  isTrue | isFalse`. Step values may themselves embed `$var$` / `%param%` tokens.
- The `datasource` key must reference an existing datasource file (08); do not invent
  keys or paths.
