# 01 — Pages (`*.page` files)

Schema: `PageTypes` — the JSON object inside every `pages/<name>.page` file.

## Full schema

```jsonc
{
    // REQUIRED
    "uuid": "2456532b-4f21-44a6-8633-29dac7c9b7bb",      // uuid v4 — always unique
    "name": "start",                                      // display name (no extension)
    "layout": "responsive",                               // "responsive" | "fixed"
    "cssClass": "page",                                   // default "page"

    // CONTENT
    "containers": [ /* ContainerType[], see 02-containers.md */ ] | null,

    // STYLING
    "background": { /* Background, see 03-elements-common.md §Background */ },
    "paddingOptions": { /* Padding */ },
    "border": { /* Border */ } | null,
    "textColor": "#ffffff",
    "fontFamily": null,                                   // Font: string | null
    "fontSize": { "value": 16, "unit": "px" },            // Font: SizeProperty
    "textTransform": "uppercase" | "lowercase" | "capitalize" | "none",
    "allowTextWrap": true,                                // boolean

    // CANVAS
    "enableCustomPageSize": false,                        // bool — custom canvas size on
    "width":  { "width":  { "value": 100, "unit": "%" } },   // Width (only if enableCustomPageSize)
    "height": { "height": { "value": null, "unit": "px" } }, // Height

    // LOGIC
    "parameters": {           // Record<string, Variable> — page parameters
        "roomId": { "type": "number", "defaultValue": 1 }
    },
    "actions": [ /* Action[], see 05-actions.md */ ],
    "pageFlips": {
        "analogPageFlipValue": 1                          // number — Crestron analog flip
    },
    "dynamicDataUsed": {
        "variablesUsed": [],                              // string[] | "*"
        "statesUsed": [],                                 // string[] | "*"
        "datasourceUsed": []                              // string[]
    },

    // LAYOUT (responsive flex defaults for the page root)
    "flow": "row" | "column",
    "gap": { "value": 10, "unit": "px" }
}
```

## Field notes

- **`layout`**: `"responsive"` — containers behave as flex layouts that scale;
  `"fixed"` — the canvas keeps its design size and elements use absolute positioning
  (`top/left/right/bottom/deltaCenterX/Y/constraints*`, see 03 §Positioning).
- **`containers`**: array of ContainerType; may be empty (`[]`) or `null` for an empty
  page. Restructuring keeps the key present. Containers are all top-level — never nested
  (rule 17); the page's `flow`/`gap` arrange them. To embed one page inside another
  (grouping/reusable blocks), use a `subpage` element instead (04 §15, 02 §Grouping
  complex structures).
- **`parameters`**: page-local variables (same `Variable` schema as global variables,
  see 06). Parameters can be bound from subpage elements (`inputParameters`) and have
  their own `actions` (behaviour `onChange`). Page parameters are referenced from any
  string render property as `%parameterName%` tokens (rule 13, 06 §Tokens).
- **`actions`**: page-level actions run with `behaviour: "onLoad"` / `"onExit"` mainly
  (ActionLoadBehaviour). Full Action schema in 05.
- **`dynamicDataUsed`**: cache of dynamic references used on the page — editor-managed,
  do not hand-compute unless mirroring existing style; `"*"` = everything.
- **`width`/`height` nesting**: `Width = { width?: SizeProperty, maxWidth?, minWidth? }`
  and `Height = { height?: SizeProperty, maxHeight?, minHeight? }` — i.e. the inner key
  matches the dimension name. `value: null` with `"unit": "%"`/`"px"` = unset.
- **`enableCustomPageSize`**: only for a genuinely custom canvas (e.g. a fixed-size
  backdrop behind a fixed overlay). A responsive page already fills the viewport
  (`100% × 100%`) — do not enable a custom page size to "match the physical panel",
  and never anchor container/element px math to it (13 §The responsive sizing
  paradigm).
- **font props** on page cascade to containers/elements that don't override them.

## Modular pages (copyable page modules)

A page plus its dependent subpages can be composed as a **self-contained module**: put
the page and everything it embeds into one folder, and reference the subpages with
**relative refs**. The folder then behaves like a component — rename, move or copy it
anywhere under `pages/` and every internal reference keeps working.

Recommended layout:

```
pages/
├── module-a/
│   ├── module-a.page          ← main page of the module
│   └── subs/
│       ├── header.page        ← embedded via subpage elements
│       └── status.page
├── module-b/                  ← same pattern, fully independent
└── start.page                 ← global / shared pages stay at the top level
```

Inside `module-a.page` the subpage elements reference their targets relatively:

```jsonc
{
    "type": "subpage",
    "subpageName": "./subs/header.page",   // relative — resolves against this page's folder
    "inputParameters": { "roomId": "1" }
}
```

Rules and recommendations:

- **Relative refs** (`"./inner.page"`, `"./subs/inner.page"`) are used for targets in
  the same folder as (or a descendant of) the page containing the element — that is the
  scope where the reference stays valid after moving/copying the folder.
- **Absolute refs** (`"pages/folder/page.page"`, `"pages/start.page"`) are used for
  targets outside that scope; they create an explicit cross-folder dependency that
  breaks when the source folder is moved without moving the target.
- Keep a module's dependencies **inside its own folder**; only shared/global pages
  (start page, login, 404) belong at the `pages/` top level and are referenced
  absolutely.
- The editor stores relative refs automatically when the subpage is picked from the
  "Nested pages" group; when writing `subpageName` by hand, follow the same rule.
- Relative refs apply to `subpageName` only — `pageFlipTarget` and
  `overlayAttachedSubpage` always use absolute project-root page refs with `pages/`.

## Sibling stylesheets (`pages/<dir>/*.css`)

> ⚠️ **Last resort, not a styling tool.** Page CSS is an antipattern by default:
> always style through editor properties, theme variables/`.theme` edits, and
> `cssClass` + the active theme's companion `globalStyles.css` first (SKILL.md rule 5a, 09 §Where to style what).
> Create or edit `pages/*.css` **only when the user explicitly asks for custom
> page CSS** and the goal cannot be expressed through the built-in layers. Never
> generate these files proactively; when a request is achievable without them,
> do it without them.

Any `*.css` file inside a page folder is **automatically injected** into a single
`<style>` tag — no `<link>`, no config. One `@scope` block per folder, files
concatenated alphabetically:

```
pages/
├── module-a/
│   ├── module-a.page
│   ├── module-a.css      ← applies to pages of module-a/
│   └── extra.css         ← same, concatenated after module-a.css
└── start.page            ← pages/start.css would apply to it (dir ".")
```

Rules:

- **Scope unit = folder.** All `*.css` of a folder apply to every page of that
  folder. Pages at the `pages/` top level use the `"."` bucket.
- **Any names, any count.** Every `*.css` in the folder is picked up regardless of
  its file name, and there is no limit on how many files a folder holds — they are
  concatenated alphabetically into one scoped block.
- **Scoping.** Each folder's CSS is wrapped as
  `@scope ([data-av-page-dir="<dir>"]) { ... }`. Every page renders the
  `data-av-page-dir` attribute on its outer wrapper (not stored in the `.page`
  JSON), so the page root (`.page`) and all its content are matched as scope
  descendants — while pages of other folders never match. Style the page root
  itself with the plain `.page` selector; `:scope` refers to the wrapper above
  it and is rarely needed.
- **Nesting inherits (by design).** A subpage embedded inside a page sits in its
  DOM subtree, so the parent folder's scoped CSS also applies to the subpage's
  content — treat the subpage as visually subordinate to its host. The subpage's
  own folder CSS applies additively via its own `data-av-page-dir` attribute; on
  conflicting selectors normal cascade decides (closer/later wins). Isolation
  holds between different routes/folders, not "downward" through embedding.
- **Everywhere.** Works identically in the editor, live preview, and production
  builds (CSS travels inside the `pages` slice payload — offline-safe, no extra
  files copied to `build/`). Editing a `.css` file hot-reloads the style.
- Keep a module's stylesheets **inside its own folder** so the folder stays
  copyable/movable like the page module itself.

## Real-world example (trimmed)

```json
{
    "uuid": "b3864e6e-f6b6-4728-befe-a06254927f5c",
    "name": "second",
    "layout": "responsive",
    "cssClass": "page",
    "containers": [
        {
            "uuid": "f815fc2a-239c-4337-a2bf-4581db5d01d9",
            "name": "Container",
            "elements": [
                {
                    "uuid": "39678885-18d4-431d-88e6-f3a22bb103cf",
                    "type": "button",
                    "name": "Button_1",
                    "cssClass": "button",
                    "text": "<p>Open Home</p>",
                    "actions": [
                        {
                            "name": "Home",
                            "behaviour": "onPress",
                            "type": "r",
                            "pageFlipTarget": "/"
                        }
                    ]
                }
            ],
            "cssClass": "container"
        }
    ],
    "background": { "color": "" },
    "width": { "width": { "value": null, "unit": "%" } },
    "height": { "height": { "value": null, "unit": "px" } },
    "enableCustomPageSize": true
}
```

Note: `"pageFlipTarget": "/"` = the start page; `"pages/start.page"` /
`"pages/folder/page.page"` = specific page refs. The editor may store extra `uuid` keys on nested objects
(`boxShadow.uuid`, `width.uuid`, ...) — optional per SKILL.md rule 2.
