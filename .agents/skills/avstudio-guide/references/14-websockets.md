# 14 — WebSocket

A `.websocket` connector opens one socket to a server and exchanges **JSON messages**.
It has three independent integration points — an AI agent can use any combination:

| Direction | Integration | Config lives in |
| :--- | :--- | :--- |
| receive | fill a **datasource** from incoming messages | `datasources/<name>.datasource` (`wsConnectorUid` + `wsMessagePath`) |
| receive | set a **variable / page parameter** from incoming messages | `externalBinding` kind `websocket` + `path` |
| send | send a message when an **action** fires | `Action` `type: "ws"` + `connectorUid` + `value` |

The socket only runs in **Live Preview / build** — never in the editor canvas. Editing the
files is always safe; the connection is opened by the runtime.

## Connector file (`.websocket`)

`connectors/<name>.websocket` (flat folder; file name may contain spaces). Full schema in
`references/07-connectors.md`. WebSocket has **no extra fields** beyond the common base:

```jsonc
{ "type": "websocket", "host": "10.0.0.9", "port": 8080, "path": "",
  "isSecure": false, "reconnectTimeout": 5000 }
```

- `host` is REQUIRED. A bare host/IP gets a scheme from `isSecure`
  (`false` → `ws://`, `true` → `wss://`). A host that already starts with `ws://` / `wss://`
  is used verbatim.
- `port` is optional (appended when set). `reconnectTimeout` (ms) defaults to `5000`.
- `path` is optional; it is appended to the URL. A missing leading `/` is added
  automatically (`"socket"` → `…/socket`, `"/realtime"` → `…/realtime`); empty = no path.
- No auth / headers / protocols support — do not invent fields like `token`, `headers`,
  `protocols`.

The driver reconnects automatically after an abnormal close (any close code except `1000`).

## Incoming messages

Every incoming text message must be **JSON** (object or array). Non-JSON messages are
dropped. The whole parsed message is the **root** that every path below is resolved against.

## JSON path syntax (`wsMessagePath` / `path`)

A path is a dot-separated string with optional `[n]` array indices, resolved from the root:

| path | message | extracts |
| :--- | :--- | :--- |
| *(empty)* | `{"a":1}` | the whole message `{"a":1}` |
| `payload.value` | `{"payload":{"value":22.5}}` | `22.5` |
| `items[0].name` | `{"items":[{"name":"A"}]}` | `"A"` |
| `meta.device` | `{"meta":{"device":"panel-1"}}` | `"panel-1"` |

If the path does not exist in a message, that message is ignored for that binding.

## Receive into a datasource

A datasource is **push-based** when `remoteFetchType` is `"websocket"` — no polling. For
each incoming message the driver extracts the value at `wsMessagePath`, optionally runs
`formatterFunction`, and stores the result as the datasource value.

```jsonc
// datasources/weather/weather.datasource
{
    "localJson": "./weather.json",
    "formatterFunction": "",
    "remoteFetchType": "websocket",
    "wsConnectorUid": "connectors/panel.websocket",
    "wsMessagePath": "payload.weather"
}
```

- `wsConnectorUid` is the connector **file path** from the project root (`connectors/...`),
  never a bare file name.
- `wsMessagePath` empty/null = the whole message becomes the datasource value.
- Elements read the stored value with render tokens `#datasources/weather/weather.datasource:path#`
  (or item-relative forms) — see `references/08-datasources.md` and 06 §Datasource tokens.
- For an array message, attach the datasource to a `subpageList` to replicate per item.

## Receive into a variable / page parameter

A `Variable` (global variable or page parameter) with an `externalBinding` of kind
`"websocket"` is set from the extracted value on every matching message. Only **scalars**
(`boolean` / `number` / `string`) are delivered to variables — if the path resolves to an
object/array the message is ignored for that binding, so point `path` at the scalar you want.

```jsonc
// global.variables
{
    "kitchenTemp": {
        "type": "number",
        "defaultValue": 0,
        "currentValue": 0,
        "externalBinding": {
            "connectorName": "connectors/panel.websocket",
            "kind": "websocket",
            "path": "payload.weather.temp"
        }
    }
}
```

- `connectorName` is the same project-root connector file path.
- `path` empty = the whole message; use it only if the message itself is a scalar.
- Page parameters use the identical `Variable` shape under the page's `parameters`.
- `onChange` actions on the variable/parameter fire after each update, like any other
  external binding (see 06).

## Send a message (action)

An action with `type: "ws"` sends its `value` over the connector when it fires.

```jsonc
{
    "uid": "<uuid-v4>", "name": "Send on", "behaviour": "onPress", "type": "ws",
    "connectorUid": "connectors/panel.websocket",
    "value": "{\"cmd\":\"on\"}"
}
```

- `connectorUid` = connector file path (`connectors/...`).
- `value` is sent **verbatim** as the message body. It does **not** resolve `$` / `%` /
  `#datasource:path#` tokens (same contract as every other action `value`, rule 13).
- The one exception is the `@context:<key>@` markers: in `value` they are replaced at
  action time with the element's runtime context (pressed D-Pad button id, RGB channel
  values), see 05.
- If the socket is not connected at that moment, the send is skipped (logged), not queued.

## Routing limitation (important)

There is **no per-consumer discriminator filter** on a WebSocket connector. Every consumer
bound to the same connector receives every message whose path exists:

- A datasource with `wsMessagePath: "payload.value"` updates on **all** messages that have
  `payload.value` — regardless of any `topic`/`type` field they carry.
- Two variables bound to the same connector+path both update from the same messages.

To separate logical streams, use **distinct paths** that only exist in the relevant message
shape (e.g. `sensorA.value` vs `sensorB.value`), or use **separate connectors/sockets**.
Do not invent a `matchPath`/`matchValue`/`filter` field — it is not part of the schema.

## End-to-end example

```jsonc
// 1. connectors/panel.websocket
{ "type": "websocket", "host": "10.0.0.9", "port": 8080, "isSecure": false }

// 2. datasources/status/status.datasource — receive the full status object
{ "localJson": "./status.json", "remoteFetchType": "websocket",
  "wsConnectorUid": "connectors/panel.websocket", "wsMessagePath": "payload.status" }

// 3. global.variables — receive just the temperature scalar
{ "roomTemp": { "type": "number", "defaultValue": 0, "currentValue": 0,
    "externalBinding": { "connectorName": "connectors/panel.websocket",
                         "kind": "websocket", "path": "payload.status.temp" } } }

// 4. element action — send a command
{ "uid": "...", "name": "Lights on", "behaviour": "onPress", "type": "ws",
  "connectorUid": "connectors/panel.websocket", "value": "{\"cmd\":\"lightsOn\"}" }
```

## Gotchas

- Messages are JSON-only; non-JSON is dropped. The server must send valid JSON.
- `wsMessagePath` / `path` are root-relative (`payload.value`), never `$.payload` or
  `message.payload`.
- Empty path = whole message. Pointing a **variable** at a non-scalar extracts nothing.
- `ws` action `value` is literal (no `$`/`%`/`#ds#` token resolution); `@context:<key>@`
  markers are the only substitution.
- The connection runs only in Live Preview/build, not in the editor canvas.
- Connector references everywhere are project-root paths with the `connectors/` prefix.
