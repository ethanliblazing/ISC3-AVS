---
name: avstudio-custom-element
description: Full lifecycle of integrating an external HTML component into AV Studio as a custom element — analyze a component the user provides (dist bundle or source), discover its interactive controls, agree with the user on the set of states (props) and actions (events), write the component's `manifest.json` with the right hook strategies, and verify the element end-to-end in the editor (picker entry, sidebar controls, action round-trip). Trigger whenever the user wants to add a custom element / external component / HTML widget to their project, asks to analyze or wire a component's states and actions, reports that a custom element's controls or events are missing in the editor, or asks how a component integrates with AV Studio (props down, events up). Do not use this skill for AV Studio's built-in elements (button, slider, …) — those are documented in avstudio-guide.
---

# Custom Elements — Component Integration Workflow

This skill integrates an external HTML component into AV Studio as a **custom element**:
a folder under `elements/` rendered by the host inside an iframe, driven by a
**manifest contract** — values flow **down** (props, bound to variables/parameters/
feedback like any element's value) and gestures flow **up** (events, executed through
the standard action pipeline).

The component code itself is **never modified**. Everything is expressed as data in
`elements/<id>/manifest.json`; a universal bridge script (injected by the host into
every entry document) interprets the manifest's hook strategies against the component's
DOM. This document is the single source of truth for the manifest format and the
strategy catalog.

**Zero threshold**: a folder with just an `index.html` is already a working element
(a static frame). The manifest adds the contract on top — and a broken/missing
manifest never breaks rendering, it only degrades the contract (the sidebar shows the
issues).

## When to use this skill

- The user brings a component (a build, an HTML page, a widget) and wants it in AV Studio.
- The user asks to analyze what states/actions a component exposes, or asks to wire
  them to variables/parameters/drivers.
- A custom element exists but its controls/events are missing in the editor (analysis
  or manifest problem — debug it here).
- The user asks how props/actions work for custom elements.

Do not use for built-in elements (slider, button, subpage…) — see `avstudio-guide`
reference 04 (§17 covers the customElement data model; this skill covers the workflow).

## Workflow

Always walk the phases in order. Phase 4 (agreement) is a hard gate: never write the
manifest before the user confirmed the discovered sets.

### Phase 0 — Intake

Ask the user (skip what they already told you):

1. **Where is the component?** A folder path (dist build or source project).
2. **What does it do, and what matters?** ("a 3D touch panel for lights", "a chart
   widget I want to drive"). This scopes the analysis: a component may expose ten
   controls while the user needs three.
3. **Dist or source?**
   - **Dist** (built output with `index.html`): the primary path — copy as-is.
   - **Source**: the skill does not build it. Instruct the user to produce a static
     build into the element folder (any bundler, plain HTML is fine), then continue
     from Phase 1. The contract only needs the built output.

### Phase 1 — Placement

1. Choose an **id**: kebab-case folder name (`3dmap`, `touch-panel`), stable — it is
   referenced by element instances (`customElementId`).
2. Create `elements/<id>/` in the project root and place the component so that
   **`index.html` sits at the folder root** (the entry document; if the component uses
   another html name, keep it — the slice picks the shallowest `*.html` — but prefer
   `index.html`). All sibling assets stay next to it, loaded relatively.
3. Nothing else is required: reload-free, the extension's file watcher picks the folder
   up automatically and the element appears in the **Custom Elements** section of the
   Add Element picker. Without a manifest it already renders as a static frame.
4. **Vendor remote assets — maximize this.** Scan the entry document and its CSS
   for remote references (`https?://` in `src`/`href`, `@import`, `url(...)`),
   download each asset into the element folder (a `vendor/` subfolder keeps
   structure) and point the reference at the local copy. CDN links do load in the
   editor (the local server adds no CSP), but vendored assets also work offline
   and in exported builds. The URL swap is a sanctioned, mechanical exception to
   "do not touch component files" — references only, never logic. If an asset
   cannot be vendored (dynamic loader, license), leave it remote and note it in
   the Phase 7 report.

Rules:
- Component assets are NOT project `assets/` — keep them inside the element folder.
- Do not rename the component's internal files or rewrite its HTML (sanctioned
  exceptions: the `adapter.js` tag and the Phase 1 vendoring URL swaps — see
  Component adapter).

### Phase 2 — Analysis

Goal: enumerate the component's **interactive surface** and classify it into
**state candidates** (values the host can drive → props) and **event candidates**
(user gestures that should fire actions → events).

**A. Read the entry document.** From `index.html` (and any rendered markup), list every
interactive control with its stable anchors — every attribute/property it exposes
(state, configuration, presentation), not just the examples below:

- `button`, `input`, `select`, `[role="switch"|"slider"|"checkbox"]`
- Stable selectors: `id`, unique `data-*`, distinctive class combos — these become
  hook `selector`s.
- State-bearing attributes: `aria-checked`, `aria-pressed`, `aria-valuenow`, `value`,
  `class` state flags (`is-on`, `active`) — these become `read`/observation anchors.
- Configuration attributes: `aria-valuemin`, `aria-valuemax`, `min`, `max`, `step`,
  `disabled` — boundaries and toggles of a control the host may need to drive.

**B. Grep the bundle** (minified is fine — search strings, not logic):

- `addEventListener("…"` — event names the component listens for (inputs, custom events)
- `dispatchEvent` / `CustomEvent(` — events it emits (window/message source candidates)
- `postMessage` — foreign messaging (message source candidates)
- `getElementById("…"` / `querySelector("…"` — internal anchors confirming selectors
- `setAttribute("…"` — attributes the component writes (state and configuration anchors)
- `https?://` — remote asset references still pointing out (vendor candidates —
  Phase 1 step 4; re-check downloaded CSS for nested `@import`/`url(...)`)
- `aria-checked` / `aria-pressed` / `classList.add(` — state toggling mechanisms

**C. Runtime probe (optional, high value).** Ask the user to open the entry document
in a plain browser and operate each control while watching the DOM (devtools): which
attribute/property actually changes per gesture. The **settled** value anchor beats a
guessed one.

**D. Classify.** For every finding decide:

| Finding | Becomes |
| --- | --- |
| A control whose value the host should set (light on/off, level, text) | **prop** (state down) |
| A control the user operates and the result should reach AV Studio | **event** (gesture up). If it also mirrors a state (the host can drive it) → **prop and event, linked** — a state-bearing control is always wired two-way |
| Any other surface a control exposes that the host should drive — configuration (range bounds, step, disabled), presentation, metadata | **prop** (state down) — wired like any other prop (`attribute`/`property` write); the slider's `min`/`max` is the canonical example |
| A pure UI affordance (view reset, zoom, camera) with no AV Studio meaning | skip — do not invent contracts |

These rows map the typical cases, not a closed taxonomy: every attribute or
property a control exposes (value, configuration, presentation) is a candidate —
put it in the gate table and let the user confirm or drop it. Never invent
controls or values that do not exist in the component. When unsure
whether something matters — ask the user.

**E. Adapter check.** If a candidate's behavior cannot be expressed with the
strategy catalog — no state-bearing attribute to read or write, no signal the
bridge can observe (no CustomEvent/postMessage), or state reachable only through
the component's internal API — say so explicitly at the gate: mark the affected
candidates `adapter` in the Hook strategy column. Do not silently drop the
candidate, and do not propose a contract the catalog cannot express.

### Phase 3 — Agreement gate (mandatory)

Present the discovered candidates as a table and get explicit confirmation before
writing anything:

```markdown
| # | Candidate | Kind | Suggested name | Type | Hook strategy | Notes |
|---|-----------|------|----------------|------|---------------|-------|
| 1 | TV power switch (#tv-toggle, aria-checked) | state+event | tvOn / tvPowerChange | boolean | click-if-mismatch + mutation | toggles whole-TV |
| 2 | RGB hue wheel (#rgb-color, aria-valuenow) | state+event | rgbHue / rgbHueChange | number 0-360 | … | workspace only |
```

Let the user rename, change types, drop candidates, or add "I also want X" items.
Only the confirmed rows proceed to Phase 4.

The gate decides **what** to wire (candidates, names, types, payload kinds) and
**how** (hook strategy) — never the **direction**: a state-bearing control is
always two-way (prop + linked change event, the slider-parity loop). Do not ask
the user to choose an integration direction — direction follows the component's
actual surface, not a preference.

### Phase 4 — Manifest

Write `elements/<id>/manifest.json` (exactly this name, next to `index.html`):

```jsonc
{
    "format": "avstudio-component/v1",
    "props": [
        {
            "name": "tvOn",              // identifier, camelCase
            "type": "boolean",           // 'boolean' | 'number' | 'string'
            "label": "TV power",         // sidebar display name
            "bindable": true,            // accepts dynamic tokens (default true)
            "hook": {                    // how the bridge drives the component
                "selector": "#tv-toggle",
                "read": "aria-checked",
                "write": "click-if-mismatch"
            }
        }
    ],
    "events": [
        {
            "name": "tvPowerChange",     // identifier
            "label": "TV power changed", // action form display name
            "payload": "digital",        // 'none' | 'digital' | 'analog' | 'serial'
            "prop": "tvOn",              // link: this event updates this prop
            "hook": {
                "source": "mutation",
                "selector": "#tv-toggle",
                "attribute": "aria-checked",
                "payloadFrom": { "on": "value" } // 'value' = new attribute value
            }
        }
    ]
}
```

Rules:
- `propValues.<name>` in the element JSON holds values: literals or dynamic tokens
  (`$var$`, `%param%`, `#ds:path#`, `!system:...#!`) — resolved by the standard machinery.
- **Link every value-change event to its prop** (`prop` field) — that is what enables
  the slider-parity state model (optimistic update + `beforeChange`/`onChange`/
  `afterChange` on the linked prop).
- Event names: `<subject>Change` for value changes. Payload kinds: boolean-ish →
  `digital`, numeric → `analog`, text → `serial`, bare notification → `none`.
- One prop per state. Do not create props the user did not confirm.

When an `adapter` hook is agreed, the manifest uses only standard strategies
against the adapter's events: prop `write: "dispatch"` (`event` + `detail` with
`$value`; `selector` = the element the adapter listens on) and event
`source: "window"` (`payloadFrom: { value: "detail.value" }`). The adapter-side
contract is defined in Component adapter.

### Hook strategy catalog

**Event sources** (where the bridge observes a gesture):

| source | Use when | Required fields | Notes |
| --- | --- | --- | --- |
| `mutation` | A state-bearing attribute/property reflects the settled value after the gesture (aria-checked, aria-valuenow, value, class) | `selector`, `attribute`; `payloadFrom` | **Preferred for state-bearing controls** — it reads the settled value, not a pre-click guess. Watch the attribute via MutationObserver. |
| `dom` | A discrete DOM event on a specific element (click, change, input) should surface as-is | `selector`, `event`; `payloadFrom` over the event object | Listens capture-phase; matches via `closest(selector)`. |
| `window` | The component dispatches CustomEvents (e.g. `window.dispatchEvent(new CustomEvent('tv-power', {detail}))`) | `event`; `payloadFrom` over the event (`detail.x`) | `target: 'document'` for document-level events. |
| `message` | The component already postMessages (its own protocol) | `filter` (key/value match on the message), `payloadFrom` (`payload.x`) | The bridge ignores its own protocol traffic. |

Read/observation boundary: `read` and `mutation` watch **attributes only**
(`getAttribute` + an attribute-filtered MutationObserver). DOM properties can be
written (`property`) but not observed; `textContent`/element text is neither read
nor observed — a component whose settled state lives only in text needs the
Component adapter.

`payloadFrom` maps output fields → dot-paths over the event object; the special path
`value` is the mutated attribute's new value (mutation source). `transform`:
`boolean` / `number` / `negate` — applied after type coercion. Values are coerced by
the event's `payload` kind (`digital` → boolean accepts `'true'/'1'/'on'`).

**Prop writes** (how the bridge applies a host value):

| write | Use when | Extra fields |
| --- | --- | --- |
| `click-if-mismatch` | The control is a toggle whose state is observable (`read`) and only the component itself can flip it | `read` (attribute name) |
| `property` | A DOM property holds the value (`el.checked = v`, `el.value = v`) | `property` |
| `attribute` | An attribute holds the value | `attribute` |
| `dispatch` | The component accepts control via custom events — the native way for event-driven components | `event`, `detail` template with `$value` (the only placeholder — other entries pass through as literals) |

The bridge normalizes incoming values to the declared prop type (`'true'/'1'/'on'` →
`true` for booleans) before applying — type coercion only, no clamping/range
handling; the component's own logic is authoritative — and suppresses the echo of
its own writes (a mutation matching the just-applied value is not re-emitted as an
event).

### Phase 5 — Validation

After writing the manifest, the file watcher reloads the slice automatically. Verify:

1. **Slice pickup**: select the element — the sidebar Content section shows the
   component card plus one control per confirmed prop. If it shows red issue text
   instead, the manifest failed validation — fix the reported fields (`props[n].hook.…`)
   and re-save.
2. **Events**: open the element's action editor → pick a change behaviour
   (On Change / Before Change / After Change) → the **Event** select must list the
   confirmed events. Empty select = no events in the manifest (or the wrong element).
3. If nothing appears at all: check `[customElement] mount` in the canvas console —
   the `entry` field shows whether `manifest` arrived from the slice.
4. For adapter elements: confirm `adapter.js` loads (frame console / network), that
   a variable change reaches the component (the `av-<subject>-set` dispatch fires),
   and that the first interaction emits the agreed `av-<subject>-change` event.
5. **Diagnostics map.** Canvas console: `[customElement] mount` (entry/manifest
   status, issues), `frame url resolved` / `no frame url resolved`, `frame loaded` /
   `frame failed to load`, `frame event`, `props send failed`. Frame console
   (Webview DevTools → frame context): `[av-bridge]` warnings (`manifest fetch
   failed`, `unknown write strategy` / `unknown event source`, `hook requires
   selector + attribute/event`, `applyProp failed for …`). To see the manifest
   exactly as the bridge reads it: `fetch('./manifest.json').then(r => r.json())`
   in the frame console.

### Phase 6 — End-to-end test

1. Bind one prop to a **test variable** (dynamic picker on the manifest control), set
   a literal first (`true`).
2. Add an action on the element: behaviour **On Change**, Event = the confirmed event,
   write to the same variable (invert or set).
3. Operate the control inside the component (runtime/live): the variable must flip →
   the binding returns the value → the component reflects it (closed loop).
4. Reverse direction: change the variable from another element → the component applies
   it (a toggle control flips via `click-if-mismatch`).
5. Watch diagnostics if anything stalls: `[customElement] frame event` in the canvas
   console, `[av-bridge]` warnings in the frame console (Webview DevTools → frame
   context).

### Phase 7 — Report

Summarize for the user: the element id and location, the agreed props/events table,
what was bound during the test, what remains unbound (if any), and which remote
assets were vendored or left remote.

## Hard rules

1. **Never invent contracts.** Every prop/event must trace to an observed control or
   the user's explicit request.
2. **Agreement gate is mandatory** — no manifest before the user confirms the sets.
3. Prefer the `mutation` source for state-bearing controls; use `dom` only for
   discrete gestures that carry no state.
4. Link value-change events to their prop (`prop` field) — unlinked events fire
   actions without touching state. A state-bearing control is always wired
   two-way (prop + linked event); never ask the user to choose a direction.
5. Do not modify component code (dist) — the single sanctioned exception is the
   one-line `adapter.js` tag (see Component adapter). If a needed behavior is not
   expressible with hook strategies, see Component adapter — do not hack the
   manifest.
6. Identifiers: `camelCase`, unique across props and across events.
7. One source of truth per state: a prop bound to a variable + a component writing
   the same value both work (the bridge suppresses its own echo), but do not create
   two props describing the same control.
8. The manifest is data — validate by reloading, not by assuming. The sidebar issues
   line is the authority on manifest problems.
9. Escape hatch = an `adapter.js` written by the executing agent, injected via one
   `<script>` tag in the entry document, talking to the bridge only through
   documented hook surfaces (`dispatch` write, `window` source). Never inspect
   host/extension sources to discover bridge internals — if the documented contract
   is insufficient, stop and ask the user.

## Component adapter (escape hatch)

When a needed behavior is not expressible with hook strategies (state that never
touches the DOM, bespoke internal APIs), use a **component adapter**: a script named
exactly `adapter.js`, placed in the element folder next to `index.html`. The live
server and project builds copy the element folder as-is, so the adapter ships with
the element.

**The agent executing this skill writes the adapter.** "Wired by the skill author"
means the executing agent creates the file and injects it — it is not something the
user or a third party does.

### Loading

Inject exactly one tag into the entry document, after the component's own scripts,
at the end of `<body>`:

```html
<script src="./adapter.js"></script>
```

This is the only permitted edit to component code, alongside the Phase 1 vendoring
URL swaps (remote asset references → local copies). Do not reformat, rename, or
otherwise touch the component's HTML/CSS/JS — apart from these mechanical
exceptions the files stay byte-identical.

The adapter runs in the same frame as the component. The bridge exposes no globals
(it is a closed IIFE) — the documented event surface is the only channel in either
direction. One adapter per element folder: the folder is self-contained; do not
import from sibling element folders.

### Communication contract — documented surfaces only

The adapter never uses undocumented bridge internals. It talks to the bridge through
the same manifest hook surfaces everything else uses:

- **Downstream (prop → component).** Declare the prop's hook as `write: "dispatch"`
  with `event` (e.g. `av-<subject>-set`) and a `detail` template containing `$value`.
  The bridge dispatches that CustomEvent **on the hook's `selector` element,
  non-bubbling** — the adapter therefore attaches its listener to that same element
  (or uses a capture-phase listener on `window`/`document`; a plain bubble-phase
  `window` listener never fires). Apply the value by driving the component's own
  update path (public globals, its own animation pattern) — never by hand-editing
  rendered state the component owns.
- **Upstream (component → event).** The adapter observes the component's settled
  state in the DOM (attribute/text mutation, or the component's own callbacks when
  exposed as globals), then
  `window.dispatchEvent(new CustomEvent("av-<subject>-change", { detail: { value } }))`.
  Declare the manifest event with `hook.source: "window"`, the same event name, and
  `payloadFrom: { value: "detail.value" }`. The `detail` must actually carry
  `value` — an event whose payload resolves to nothing is dropped by the bridge
  when the event declares a `payload` kind.
- **Change detection.** The adapter emits only when the settled value actually
  changed since its last emission — that is the adapter's job, not "suppression
  logic". It must not add any further echo-suppression machinery: the bridge
  suppresses its own mutation echoes, and the host ignores same-value repeats of
  linked-prop events. An adapter that re-emits on every incoming set floods the
  action pipeline (events without a linked prop fire actions on every receipt).

### Behavior requirements

- Wait for the component's scripts and startup animation before the first emission.
  The bridge applies props only after the asynchronous host handshake, so a classic
  script at the end of `<body>` always has its listeners attached before the first
  dispatch.
- Debounce continuous gestures (emit after a short quiet period, ~100–200 ms) so the
  action pipeline is not flooded per-frame — there is no host-side throttling; every
  emitted event fires its actions immediately.
- The adapter is glue only: analysis, naming, and value semantics live in the
  manifest and the agreement gate, not in the adapter.

### Gate

An adapter is a contract decision: it must appear explicitly in the Phase 3
agreement table (mark the row's Hook strategy with `adapter`) and is written only
after the user confirms. An adapter is never the default: a control whose state
and gestures are observable is always expressible with the strategy catalog
(Phase 2 D/E). If the documented surfaces cannot express the behavior even
with an adapter — stop and discuss; do not read host/extension sources to
reverse-engineer the bridge.
