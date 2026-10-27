# 07 — Connectors

Connector files live in `connectors/` (flat). The **file extension decides the type**:

| file extension | type |
| :--- | :--- |
| `.web` | web (HTTP) |
| `.websocket` | websocket |
| `.mqtt` | mqtt |
| `.crestron` | crestron |
| `.amx` | amx |
| `.knx` | knx |
| `.doorbird` | doorbird (DoorBird LAN-2-LAN, one file = one device) |

File content is a single JSON object. Connector references elsewhere
(`connectorUid`, `externalBinding.connectorName`, `externalSetterConnectorType`,
datasource `*ConnectorUid`) are **paths from the project root and always include the
`connectors/` prefix**: `"connectors/strapi.web"`, `"connectors/crestron cp4.crestron"`
(spaces in file names are fine). Never write a bare file name (`"strapi.web"`) — the
reference must exactly match the created file `connectors/<name>.<ext>`.

## Common base fields (all types)

```jsonc
{
    "name": "my connector",      // optional display name
    "type": "<see table>",       // REQUIRED — must match the file extension
    "host": "192.168.1.100",     // REQUIRED
    "port": 8080,                // number | string — optional per type (blank "" allowed)
    "isSecure": false,           // boolean — TLS
    "reconnectTimeout": 5000,    // number (ms) — reconnect interval
    "keepaliveTimeout": 30000    // number (ms) — session keepalive
}
```

Type-specific extras:

## `.web` (WebConnector)

```jsonc
{ "type": "web", "host": "", "headers": [] }
// headers: [{ "key": "Authorization", "value": "Bearer ..." }]
```

Template default: `{ "type": "web", "host": "", "headers": [] }`.

## `.websocket` (WebsocketConnector)

```jsonc
{ "type": "websocket", "host": "wss://...", "port": "", "path": "",
  "isSecure": false, "reconnectTimeout": 5000, "keepaliveTimeout": 30000 }
```

`host` may be a bare host/IP (scheme is derived from `isSecure`: `false` → `ws://`,
`true` → `wss://`) or a full `ws://` / `wss://` URL (used verbatim). `path` is optional and
appended to the URL — a missing leading `/` is added automatically (e.g. `path: "socket"`
→ `ws://host:port/socket`; empty = no path). Messages are expected to be **JSON**; routing
to datasources / variables / parameters is configured on the consumer side via a JSON
path (08 §WebSocket datasources, 06 §externalBinding). Sending is a `ws` action (05).
Full end-to-end guide: `references/14-websockets.md`.

## `.mqtt` (MqttConnector)

```jsonc
{ "type": "mqtt", "host": "broker.local", "port": "1883", "isSecure": false,
  "reconnectTimeout": 5000, "keepaliveTimeout": 60,   // seconds for keepalive!
  "path": "", "username": "", "password": "" }
```

## `.crestron` (CrestronConnector)

```jsonc
{ "type": "crestron", "host": "1.1.1.1", "ipId": "", "roomId": "", "authToken": "",
  "globalJoins": {
      "analogPageFlip_signal_a_fb": "",       // analog FB: page flip value
      "serialPageFlip_signal_s_fb": "",       // serial FB: page name
      "notification_signal_s_fb": "",         // serial FB: notifications
      "refreshDataSources_signal_d_fb": "",   // digital FB: refresh all datasources
      "refreshSingleDataSource_signal_s_fb": "",  // serial FB: refresh one datasource
      "connected_signal_d_fb": ""             // digital FB: connection state
  } }
```

`ipId`, `roomId`, `authToken` may be `null`. `globalJoins` is REQUIRED (may hold empty
strings / nulls). Example observed:

```json
{ "type": "crestron", "host": "1.1.1.1", "ipId": "", "roomId": "", "authToken": "",
  "globalJoins": { "analogPageFlip_signal_a_fb": null, "serialPageFlip_signal_s_fb": "",
    "notification_signal_s_fb": "", "refreshDataSources_signal_d_fb": "",
    "refreshSingleDataSource_signal_s_fb": "", "connected_signal_d_fb": "" } }
```

> For emulating feedback from the native side in the browser console (testing signals before
> a real processor is connected), see `references/12-crestron-feedback-emulation.md`.

## `.amx` (AmxConnector)

```jsonc
{ "type": "amx", "host": "192.168.1.20", "port": "",
  "room": "", "key": "", "username": "", "password": "",
  "isSecure": false, "reconnectTimeout": 5000, "keepaliveTimeout": 30000 }
```

`host` is REQUIRED. `room` is the AMX room id used in the WebSocket URL path
(`/web/ui/<room>/ws`). `key` is the RSA public key used to encrypt the password
into the auth token; `username`/`password` are the AMX credentials. All four are
optional (empty strings in the template).

In live mode the connector opens a WebSocket to
`ws(s)://<host>:<port>/web/ui/<room>/ws?token=<token>` (`port` defaults to `8080`;
`isSecure` selects `wss`). The token is `base64(JSON { username, password })` with
the password RSA-encrypted with `key`; when `key` is empty the `token` query is
omitted. Unexpected closes reconnect after `reconnectTimeout`, and while open a
`disco {"params":["version"]}` keepalive is sent every `keepaliveTimeout` ms. The
connection/status is surfaced in the live Connectors tab; variable read/write
(`get`/`set`) is not wired up yet.

Template default: `{ "type": "amx", "host": "", "port": "", "room": "", "key": "",
"username": "", "password": "", "isSecure": false, "reconnectTimeout": 5000,
"keepaliveTimeout": 30000 }`.

## `.knx` (KnxConnector — BAOS 777 gateway)

```jsonc
{ "type": "knx", "connectionType": "baos", "host": "", "port": "",
  "isSecure": false, "reconnectTimeout": 5000, "keepaliveTimeout": 60,
  "username": "", "password": "" }
```

`connectionType: "baos"` is the only supported value today. KNX writes from actions use
`knxDatapointId` + `knxFormat` (see 05); variables bind via `externalBinding`
`{ kind: "knx", datapointId, format }` (see 06).

## `.doorbird` (DoorbirdConnector — DoorBird / BirdGuard LAN-2-LAN API)

One file = one device. For two doors create two files
(`connectors/калитка.doorbird`, `connectors/дверь.doorbird`).

```jsonc
{ "type": "doorbird", "host": "192.168.1.50", "port": "",
  "username": "abcdef0001", "password": "",
  "isSecure": false,     // false = http:80, true = https:443 (self-signed)
  "reconnectTimeout": 5000, "keepaliveTimeout": 30000 }
```

`host` is REQUIRED (IP/hostname of the station). `username`/`password` are the
DoorBird App credentials (first 6 chars of username = device ID). `port` is
optional — empty means auto (80 for http, 443 for https). The relay to trigger
(`open-door.cgi?r=`, `"1"` | `"2"` | `"<controllerID>@<relay>"`) is chosen per
button/widget, not in the connector; the available relays come from `info.cgi`
`RELAYS`. API limits: max 1 conn/sec per device, 423 on wrong-auth
flood, 503 when the line is busy, 204 when the user has no live-view permission.

## Reference rules

- Never create a connector of a type whose file you can't create (extension must match
  `type` — `.mqtt` file with `"type": "mqtt"`).
- `host` REQUIRED for all — empty string only in templates right after creation.
- Don't add custom keys (e.g. `"host2"`, `"topic"` on top level) — unsupported.
