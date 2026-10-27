# 05 — Actions

An `Action` is a single unit of control logic attached to an element, a page, or a
variable/parameter. Actions live in `actions: [...]` arrays of the host entity.

## Where actions live and which behaviours are allowed

| Host                      | Location           | Typical behaviours                                                                                           |
| :------------------------ | :----------------- | :----------------------------------------------------------------------------------------------------------- |
| Element                   | `element.actions`  | `onPress` `onRelease` `onClick` `onHold` `onChange` `beforeChange` `afterChange` `onFocus` `onBlur` `manual` |
| Page                      | `page.actions`     | `onLoad` `onExit` `onChange` `manual`                                                                        |
| Variable / page parameter | `variable.actions` | `onChange` `manual`                                                                                          |

Full behaviour enum (ActionBehaviour):

```
onPress | onRelease | onClick | onHold | onLoad | onExit | onChange |
beforeChange | afterChange | onFocus | onBlur | manual
```

- `onLoad`/`onExit` are page life-cycle behaviours (page.actions).
- `onChange`/`beforeChange`/`afterChange` apply to inputs/sliders/stateControls (when
  their value changes) and to variables (when the variable value changes).
- `manual` actions run programmatically from other actions/functions.
- `forceExecution: true` on tap actions — fire without waiting for hold/momentarily.

## Full schema

```jsonc
{
    // REQUIRED
    "uuid": "574e40dd-a468-467a-9490-cdf0bc4a26f2",   // editor writes "uuid" (type name "uid") — keep the file's existing form
    "name": "Open second",                             // display name
    "behaviour": "onPress",                            // see enum above
    "type": "r",                                       // SignalType, see table below

    // SIGNAL / VALUE TARGETS (by type)
    "signalName_signal": "1",          // signal to publish (d/a/s) — string (Crestron join "1", "2.1", ...)
    "signalName_signal2": "1",         // second signal (range slider second thumb -> mirrors topics/dpts)
    "attachedVariableName": "volume",  // variable name for type "v"
    "attachedVariableName2": "volume", // second variable (range slider)
    "attachedParameterName": "roomId", // page parameter name for type "p"
    "attachedParameterName2": "roomId",
    "value": "50",                     // dynamic value; for http = request body, for audio = playState
    "buttonJoins": { "top": "1", "right": "2" }, // for type "joinMap" — one digital join per button id (D-Pad)
    "channelJoins": { "r": "color_r", "g": "color_g", "b": "color_b" }, // for type "joinMap" — one analog join per color channel (Color Picker, rgb variant)
    "listSignalStep": 1,               // number — step for list signals
    "digitalPushData": "momentarily",  // true | 'true' | false | 'false' | 'pulse' | 'momentarily' | 'toggle'
    "onChangeActionUseCustomValue": false,  // bool — variable onChange fires with custom value
    "attachedStateType": "boolean",    // type string for state-value actions
    "stateId": "",                     // state identifier for state-value binding

    // TIMING
    "delay": 0,                        // number (ms) — fire after delay
    "pulseDelay": 0,                   // number (ms) — pulse length

    // ROUTING / PAGES
    "pageFlipTarget": "pages/additional/second.page", // page ref | "/" | "-1" — type "r"

    // FUNCTIONS
    "attachedFunctionToRun": "",       // function uid — for type "f"

    // WEB / WS / MQTT / KNX / AUDIO
    "connectorUid": "connectors/strapi.web",  // path to connector file — for web/ws/mqtt/knx/audio-if-remote
    "requestUrl": "/api/endpoint?somequery=1",  // URL postfix appended to the connector host — for post/put/get/delete/patch
    "onResponseOk": ["<other-action-uuid>"],     // string[] — action uuids fired on 2xx
    "onResponseError": ["<other-action-uuid>"],  // string[] — action uuids fired on error
    "mqttRetain": false,
    "mqttTopic": "home/lights/1",      // for mqtt
    "mqttTopic2": "home/lights/2",     // range slider second thumb
    "knxDatapointId": 12,              // number — KNX group address (BAOS datapoint) for knx
    "knxDatapointId2": 13,             // range slider second thumb
    "knxFormat": "DPT1",               // see KNX formats below
    "audioLoop": false,
    "audioSrcTargetByName": "",        // audio source/variable name
    "audioVolumePercent": 80           // number 1–100

    // OVERLAY OPTIONS — for type "o" / "co" (see below)
    "overlayPlacement": "fullscreen",
    "overlayAttachedSubpage": "pages/folder/overlay.page",
    ...
}
```

## SignalType table (`type`)

| type                                | meaning                | key fields                                                                     |
| :---------------------------------- | :--------------------- | :----------------------------------------------------------------------------- |
| `d`                                 | publish digital        | `signalName_signal`, `digitalPushData`                                         |
| `joinMap`                           | per-target join map    | `buttonJoins` (`{ buttonId: join }`, digital, D-Pad) **or** `channelJoins` (`{ r/g/b: join }`, analog, Color Picker rgb variant) |
| `a`                                 | publish analog         | `signalName_signal`, `value`                                                   |
| `s`                                 | publish serial         | `signalName_signal`, `value`                                                   |
| `r`                                 | routing (page flip)    | `pageFlipTarget`                                                               |
| `v`                                 | set variable           | `attachedVariableName`, `value`                                                |
| `p`                                 | set page parameter     | `attachedParameterName`, `value`                                               |
| `o`                                 | open overlay           | `overlayAttachedSubpage` + OverlayProps                                        |
| `co`                                | close overlay          | (overlay placement props)                                                      |
| `f`                                 | run function           | `attachedFunctionToRun` (function uid)                                         |
| `post` `put` `get` `delete` `patch` | HTTP request           | `connectorUid` (required), `requestUrl` (optional postfix), `onResponseOk`, `onResponseError` |
| `audio`                             | audio control          | `audioLoop`, `audioSrcTargetByName`, `audioVolumePercent`, `value` (playState) |
| `ws`                                | send websocket message | `connectorUid`, `value`                                                        |
| `mqtt`                              | publish mqtt           | `connectorUid`, `mqttTopic`, `value`, `mqttRetain`                             |
| `knx`                               | write KNX datapoint    | `connectorUid`, `knxDatapointId`, `knxFormat`, `value` (bool for DPT1)         |

Action fields (`value`, signal names, `requestUrl`, …) accept the same dynamic tokens as
render properties, but **where** they resolve depends on the action's host:

- **element-hosted** actions resolve `$var$` / `%param%` / `#ds:path#` **and external
  feedback tokens** through the render pipeline (the element snapshot is resolved as a
  whole, actions included);
- **page-hosted** actions resolve `$var$` / `%param%` **and external feedback tokens**
  (not `#ds` — a page has no `attachedDatasource`);
- **variable-/parameter-hosted** actions resolve `$var$` / `%param%` at action time
  (not `#ds`, not feedback).

"Dynamic" can also mean the change value picked up via `onChangeActionUseCustomValue` /
`ctx.changeValue` when the action fires from a UI event — available to `beforeChange`,
`onChange` and `afterChange` (the last change value is replayed to the debounced
`afterChange`).

The one exception is the `@context:<key>@` marker family: inside a JSON message body
(`value`) it is replaced at action time with the element's runtime context. Each element
declares its keys in `ElementContextRegistry`:

| Element | Marker | JSON type |
| :-- | :-- | :-- |
| *all* | `@context:elementName@` — the element's friendly name (`ElementBase.name`) | string |
| `dpad` | `@context:pressedButton@` — pressed button id (`top`/`right`/`bottom`/`left`/`center`) | string |
| `rgbPicker` (`rgb` variant) | `@context:red@` / `@context:green@` / `@context:blue@` — channel values (0–255) | number |
| `rgbPicker` (`hex` variant) | `@context:hex@` — the hex change value (`#rrggbb`) | string |
| `stateControl` | `@context:value@` — the toggle's change value | boolean |
| `slider` | `@context:value@` (lower/only thumb), `@context:value2@` (upper thumb of the range variant) | number |
| `roundSlider` | `@context:value@` — the knob value | number |
| `shadesCompact` | `@context:value@` — the shades position | number |
| `input` | `@context:text@` — the field's serial change value | string |

The `elementName` key is available on every element; the rest are element-specific
(declared in `ElementContextRegistry`). The JSON Message editor offers these keys through
the "Context" insert control. Numeric and boolean
keys may stand as bare JSON values (`{"r": @context:red@}` → `{"r": 128}`,
`{"on": @context:value@}` → `{"on": true}`); string keys
must sit inside a string (`"@context:pressedButton@"`). Markers resolve in the JSON message
body only (mqtt/ws/web `value`) — not in serial values or the `requestUrl`. A `ws` action
sends `value` as the message body over the selected `.websocket` connector; the string is
sent verbatim. Incoming messages are routed back into the project via a datasource
`wsMessagePath` (08) or a variable/parameter `externalBinding` of kind `websocket` with a
`path` (06).

An HTTP action (`get`/`post`/`put`/`delete`/`patch`) requires a `.web` connector
(`connectorUid`); `requestUrl` is an **optional URL postfix** appended to the connector
host (`host + requestUrl`) — never a full URL. `post`/`put`/`patch` send `value` as the
request body; `get`/`delete` send none.

`joinMap` actions publish to a per-target map, and the target kind depends on the
element:

- **Button targets** (D-Pad) — `buttonJoins`, digital and always **momentary**: the
  bound join is set to True on press and False on release. Their `behaviour` is fixed
  to `onPress` (the editor hides the field), regardless of the value stored in the file.
- **Channel targets** (Color Picker, `rgb` variant) — `channelJoins`, analog, fired on
  the chosen change behaviour (`beforeChange` / `onChange` / `afterChange`): on each
  color change the resolved channel value (0–255) is written to its join
  (`r` / `g` / `b`). The `hex` variant has a single serial value and no channel
  targets, so `joinMap` is not offered for it.

## KNX datapoint formats (`knxFormat`)

`DPT1` (1-bit boolean) · `DPT5.001` (0–100 %) · `DPT5.010` (0–255 counter) ·
`DPT7` · `DPT8` · `DPT9` · `DPT12` · `DPT13` · `DPT14` (numeric) · `DPT16` (string).

## Overlay props (for `o` / `co`, also valid on any action)

```jsonc
"overlayPlacement": "top" | "top-start" | "top-end" | "left-start" | "left" |
    "left-end" | "right-start" | "right" | "right-end" | "bottom-start" | "bottom" |
    "bottom-end" | "fullscreen",
"overlayOffset": 10,                       // number (px) from the trigger
"overlayAttachedSubpage": "pages/folder/overlay.page", // page ref, or a $var$/%param% token holding one
"showMask": true,
"showCloseButton": true,                   // fullscreen placement only
"outsideClose": false,                     // click outside closes
"anyClickClose": false,                    // any click closes
"useOverlayTimer": false,                  // auto-close after inactivity
"overlayTimer": 60                         // number (seconds); default 60 when enabled
```

Overlay **appearance** is project-wide and lives in the theme `overlay` section
(`maskColor`, `maskOpacity`, `maskBlur`, `backgroundColor`, `closeButtonColor`,
`closeButtonSize`, `closeButtonOffset` → `--av-overlay-*`), not in the action. The
close button keys apply to fullscreen overlays only.
Overlay **size** comes from the attached subpage's own size settings (its
`enableCustomPageSize` width/height, otherwise the theme page size).

`overlayAttachedSubpage` accepts either a project-root page ref (`pages/...`) or a
dynamic token that resolves to one. Resolution uses the scope of the action that
opens the overlay, when it opens:

- **element actions** resolve `$var$`, `%param%`, `#ds:...#` and external feedback tokens
  (datasource tokens use the element's own or a foreign datasource; item-relative
  `#key:*.<path>#` resolves only inside a subpageList item);
- **page-level actions** (`onLoad` / `onExit`) resolve `$var$`, `%param%` and external
  feedback tokens (not `#ds`).

This is the documented exception to rule 13 for the overlay target; the general
action-field guidance is unchanged.

### Overlay behavior (runtime)

- The overlay is anchored to the trigger element; when the preferred placement
  overflows the container it flips to the opposite side, and is clamped inside the
  container. `fullscreen` is centered.
- Firing the same trigger again **toggles** the overlay closed.
- `outsideClose` closes on a click outside the overlay (but not on the trigger);
  `anyClickClose` closes on any click except the trigger.
- Navigating away (`hashchange`/`popstate`) closes an open overlay; removing the
  trigger element also closes it.
- `showCloseButton` renders only for `fullscreen` placement.
- `useOverlayTimer` auto-closes the overlay after `overlayTimer` seconds of
  inactivity; the countdown pauses while the pointer is held down on the overlay
  content and restarts on release.

## Real-world examples

Element action — page flip (observed in project files):

```json
{
    "name": "Open second",
    "behaviour": "onPress",
    "pageFlipTarget": "pages/additional/second.page",
    "type": "r"
}
```

Variable action — publish FB on change (observed in global.variables):

```json
{
    "name": "set FB",
    "behaviour": "onChange",
    "signalName_signal": "111",
    "type": "d",
    "onChangeActionUseCustomValue": false
}
```

Page flip to start page: `"pageFlipTarget": "/"`.

## Chaining and references

- `onResponseOk` / `onResponseError` contain `uuid`s of other actions (same or
  different host). The fields are part of the data model, but the runtime does **not**
  fire them yet — HTTP actions execute and log the response status only.
- `attachedFunctionToRun` references a compiled JS function by its uid (functions are
  defined in `functions/` or as datasource formatters — the editor compiles them and
  exposes uids; when an action references a function that doesn't exist, say so).
- `connectorUid` values are paths from the project root, always with the
  `connectors/` prefix: `"connectors/strapi.web"`, `"connectors/nodeRed.mqtt"` — never a
  bare file name; only reference existing connector files (see 07).
