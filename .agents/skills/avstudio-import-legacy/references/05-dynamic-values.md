# 05 — Dynamic values: dataset options → attachedDatasource + tokens

Legacy bound datasource data to elements through four props on the element:

```jsonc
{
  "dataset": "<datasource uid>",       // which ds
  "datasetPath": "main.readme",        // path inside the ds (first seg is a throwaway keyword)
  "filter": [ { "field": "main.name", "condition": "equal", "variableId": "currentCamera" }, … ],
  "returningField": "resultingArray",  // editor bookkeeping
  "isDynamic": true                    // subpageList items
}
```

Plus legacy `{main.…}` pointers embedded in string props. The new model:
`attachedDatasource: { datasource: 'datasources/X.datasource', steps: JsonStep[] }`
and tokens `#datasources/X.datasource:<path>#`.

## Path translation

Legacy strips the **first segment** of every ds path (`getValueFromPath`), and
pointers must literally start with `{main.`:

| Legacy | Real path | New |
| --- | --- | --- |
| `datasetPath: "main.readme"` | `readme` | pick step `{kind:'pick', path:['readme']}` prepended to steps |
| `datasetPath: "datasource"` | *(whole ds)* | no step |
| filter `field: "main.name"` | `name` | filter step `key: ['name']` |
| filter `field: "main.0.presets"` (extract) | `0.presets` | pick step `path: ['0','presets']` |
| pointer `{main.header}` | `header` | `#…datasource:header#` |
| pointer on a subpageList | item field | `#…datasource:*.header#` |

## Steps order

Steps apply sequentially: datasetPath pick → legacy filters in order
(`extract` becomes an inline pick). The element's bound value = the final
result; own-key `#ds:path#` tokens resolve **against that result** (verified in
`useResolveDatasourceValues`), and `*.` tokens resolve against the current
subpageList item.

## Filter conditions

| Legacy `condition` | New `op` |
| --- | --- |
| `equal` / `not equal` | `equals` / `notEquals` |
| `contains` / `not contains` | `contains` / `notContains` |
| `is null` / `not null` | `nullOrEmpty` / `notNullOrEmpty` |
| `exists` / `not exists` | `exists` / `notExists` |
| `extract` | → a `pick` step (replaces the array with the value at the path) |
| `function` | no equivalent — todo |

Filter values: `variableId` → `$Name$`, `parameterId` → `%name%`, literal
`variable` kept, `state` templates → todo.

## dynamicDataUsed as the checklist

The legacy cache lists every dynamic prop with its token:

```json
"dynamicDataUsed": {
  "variablesUsed": { "state.isPressed_signal_d_fb": "$inputSelectedID$",
                     "activeModeIndex": "$VolumeMute$" },
  "datasourceUsed": { "inputParameters.0.passedValue": "{main.header}" },
  "parametersUsed": { "actions.0.value": "%inputSelected%" }
}
```

Stored prop values already contain the tokens, so conversion walks the strings
and rewrites pointers; `dynamicDataUsed` paths double as the review checklist
(`state.*` paths map to the new flat props — see 02). Legacy `dynamic` /
`attachedModificators` fields are dead weight (never read by the legacy
runtime) and are dropped.

## Token notes

- `$var$` / `%param%` pass through unchanged (same syntax in the new model).
- `#key:path#` — `key` must equal the element's own `attachedDatasource.datasource`;
  numeric path segments are array indexes; empty path = the whole bound value.
- Ds tokens resolve on element render props and element-hosted action fields.
- subpageList `inputParameters` carry the `*.` item tokens; feedback joins can
  nest them: `"!crestron:type=number;name=#ds:*.volume#!"`.
