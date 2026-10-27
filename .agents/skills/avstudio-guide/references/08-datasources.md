# 08 — Datasources

A datasource feeds data into the UI. Datasource files are **flat** under `datasources/`
— the datasource name is the file name (without the extension):

```
datasources/
├── rooms.datasource      ← REQUIRED config file
├── formatter.js          ← optional JS formatter (compiled into functions)
└── tester.json           ← local data file referenced by localJson
```

## `<name>.datasource` — Datasource schema

```jsonc
{
    "localJson": "./tester.json",      // LOCAL data path (relative to the datasource folder)
    "urlPostfix": "",                      // OPTIONAL: url postfix for remote fetch
    "formatterFunction": "./formatter.js",    // OPTIONAL: formatter file path (uid)
    "isImagePreloadSource": false,        // boolean — preload referenced images
    "wsConnectorUid": "connectors/ws.websocket",     // string | null
    "wsMessagePath": null,                 // string | null — JSON path to extract from each incoming message
    "amxConnectorUid": "connectors/amx.amx",         // string | null
    "webConnectorUid": "connectors/strapi.web",      // string | null
    "mqttConnectorUid": "connectors/nodeRed.mqtt",   // string | null
    "mqttTopic": null,                    // string | null — topic for mqtt sources
    "pollingInterval": null,              // number | null (ms) — forced refetch interval
    "remoteFetchType": null               // "websocket" | "web" | "amx" | "mqtt" | "crestron" | "knx" | "doorbird" | null
}
```

Rules:

- `localJson` = local JSON data (relative path starting with `./`), and/or
  `urlPostfix` for remote.
- Connector bindings reference connector files by project-root path with the
  `connectors/` prefix (`"connectors/strapi.web"`) or `null` — never a bare file name.
- `formatterFunction` references the formatter `.js` inside the same datasource folder
  (relative `./formatter.js` / with `./`).

## WebSocket datasources

A datasource with `remoteFetchType: "websocket"` is **push-based**: the connector driver
opens the socket and every incoming **JSON** message is routed to the datasource (non-JSON
messages are dropped).

- `wsMessagePath` — JSON path to the value inside each incoming message, e.g. `payload.value` or
  `items[0].name` (dot keys + `[n]` array indices). Empty/null = the whole incoming message.
- `formatterFunction` (if any) runs on the extracted value before it is stored.

```jsonc
{
    "localJson": "./tester.json",
    "remoteFetchType": "websocket",
    "wsConnectorUid": "connectors/panel.websocket",
    "wsMessagePath": "payload.value"
}
```


## formatter.js

Plain JS exports a data transform function. The compiled formatter receives the raw
source data and must return it (array expected by the UI):

```js
const formatData = (data) => {
  return [data]; // transform data into an array
}
```

Keep it dependency-free and synchronous.

## Local data files

Any JSON you add inside the datasource folder (e.g. `tester.json`) is usable as
`localJson`. Example:

```json
[
  { "id": 1, "name": "Conference Space A" },
  { "id": 2, "name": "Conference Space B" }
]
```

## Attaching a datasource to an element

Every element carries `attachedDatasource` (schema + step map: 06 §attachedDatasource) —
it is the datasource that element consumes:

```jsonc
{
    "attachedDatasource": {
        "datasource": "datasources/rooms.datasource",  // the datasource KEY | null
        "steps": []                                      // optional pick/filter chain
    }
}
```

- `datasource` = the datasource **key**, i.e. its project-root path **including** the
  `.datasource` extension (`datasources/rooms.datasource`; subfolders allowed:
  `datasources/api/weather.datasource`). It is not the bare file name.
- Any element can read from its attached result with render tokens `#key:path#`
  (06 §Datasource tokens).
- `subpageList` uses the attached result as its **replication source** — one subpage
  instance per array item (04 §16).
- `steps` (pick/filter) narrows the result before it is used; it mirrors the filters in
  the datasource UI. Prefer configuring it there.

## Reference rules

- Datasources live under `datasources/`; the datasource **name** is the file name without
  the `.datasource` extension. Subfolders are allowed (`datasources/api/weather.datasource`).
- Element/config references use the full **key** (project-root path incl. `.datasource`),
  e.g. `"datasource": "datasources/rooms.datasource"`.
- Never put extra top-level keys into the `.datasource` config beyond the schema above.
