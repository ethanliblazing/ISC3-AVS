# 06 — Gaps: no-equivalent cases and rework strategies

Everything the extractor cannot do mechanically lands in the report as
`todo`/`error`. This file lists each case and how to finish it.

## attachedFunctions / attachedModificators (element-level)

Legacy post-processed element props with user functions
(`attachedFunctions: [{name: propKey, modificatorId}]`, e.g. recomputing
`activeModeIndex` from a variable). The new model has **no per-prop function
hook** — functions run only through `f` actions, variable formatters, and
datasource formatters. **But migrated functions are not blind**: they get the
`window.avstudio` runtime API (the renamed legacy `window.avgatorStudio` —
the extractor rewrites the identifier automatically; same method names for
variables/signals/datasources/navigation).

Selection-mode pattern (the most common case — "highlight the active
selector button", e.g. `setCameraButtonMode`):

1. The legacy function reads the driver variable and returns `1`/`0` for the
   element's mode. Keep the function as-is (renamed bridge).
2. Give the function a result variable (e.g. `activeCameraMode`), and trigger
   it reactively: attach an `f` action with behaviour `onChange` to the
   **driver variable** (`currentCamera`) — variable actions run on change.
3. Inside the function, write the result through the bridge:
   `window.avstudio.setVariableByName({ name: 'activeCameraMode', value: … })`
   — an `f` action's return value is **not consumed**, so the function must
   write state itself.
4. Bind the element prop to the result: `activeModeIndex: "$activeCameraMode$"`.

Fallback strategies when the pattern does not fit:

- **Direct token.** If a program feedback join carries the state, skip the
  function: `activeModeIndex: "!crestron:type=number;name=<join>!"` (number →
  1-based mode index) or bind a variable via `externalBinding` and use `$var$`.
- **Mode-name matching.** A string feedback/variable whose value equals a mode
  name selects that mode — rename the modes to the possible values when the
  program reports names.
- **Per-item list cases** (e.g. `setCameraButtonMode` inside a subpageList):
  there is no per-instance function context — compute an `active` flag into
  the datasource rows (formatter or the program) and bind
  `activeModeIndex: "#ds:*.active#"`, or use a program feedback join.
- **Accept the loss.** Keep the default mode; the element works without the
  highlight. The function source stays in `functions/*.js` for later re-wiring.

Legacy-only bridge methods (`setStoreValue`, `getStoreValue`, `audioControl`)
have no `window.avstudio` equivalent (the legacy "states" store is gone;
audio is an `audio` action type) — the extractor flags them per function.

## Visibility startup behavior

Legacy: digital joins default low → elements with `isVisible_signal_d_fb`
started **hidden** until the first feedback. New: unresolved tokens render
**visible**. For critical overlays, either ensure the program pushes feedback
on connect (CH5 programs normally do) or set an explicit `isVisible: false`
literal where a hidden start is required.

## Keypad substitution

Converted to 12 pulse buttons. Containers do not wrap — arrange the grid by
grouping into rows (one container per row is **not** possible — containers are
top-level only; use a single container and accept a row, or rebuild as a
custom element). Match the legacy look via `cssClass` rules in
`globalStyles.css` (`.keypadElement` classes migrated with the CSS).

## Dropped elements (`player`, `shades`, `htmlblock`)

- `player` — rebuild from `button`s + `slider` + text elements bound to the
  same joins (legacy signal names are in the report snapshot).
- `shades` — approximate with `shadesCompact` or buttons; legacy `shades` had
  frames/headers the compact variant lacks.
- `htmlblock` — recreate as a custom element (`elements/<id>/index.html` +
  `manifest.json` — see `avstudio-custom-element`) and paste the legacy
  `htmlContent`.

## Overlays — sizing

`overlayWidth/Height` are gone. Size the overlay by setting
`enableCustomPageSize: true` + `width`/`height` on the **attached overlay
page**; appearance (mask, blur, radius) comes from the theme's `overlay`
section.

## Portrait / landscape loss

Only the chosen orientation survives (default: project
`defaultOrientation`). The report lists every page/container that had
different portrait/landscape values — review each and, where the landscape
variant matters, create a separate page or adjust values manually.

## Dataset `function` filter and state-template filters

- `condition: 'function'` ran a legacy modificator over the array — rework as
  a datasource `formatterFunction` (transform once at fetch) or preprocess the
  local JSON.
- `state` template values in filters have no counterpart — rework to a
  variable/parameter.

## Datasource-bound variables

Legacy variables fed from a datasource (`datasetID` + `dynamicValue`) have no
equivalent: bind the consuming element props directly to
`#datasources/…:path#` tokens instead.

## Icon packs

Legacy `iconName` values (`FaHome`, `BsMicMuteFill`) are valid new sprite
symbol ids, but a pack renders only while it is **active**:
`assets/icons/<pack>.svg` must exist. The extractor handles this
automatically — it detects the packs in use from the icon-name prefixes and
copies the sprite bundles from the installed AVstudio extension
(`~/.vscode/extensions/*avstudio*/resources/sprites/<pack>.svg`, also
Insiders/Cursor/Windsurf, or the dev checkout; override with `--sprites-dir`).
The report logs every activated pack (`info`) and lists anything it could not
find (`todo`) — finish those by copying the `<pack>.svg` files into
`assets/icons/` yourself (Icon Explorer shows the bundled sprites too).
Dynamic icon names (`iconName: "%buttonIcon%"`) pass through as tokens — make
sure the resolved name belongs to an active pack.

## Theme Reset caveat

Migrated CSS lives in `theme/darkhuddle/globalStyles.css`. `darkhuddle` is a
reserved theme — the editor's **Reset** restores its files and would discard
the migrated CSS. For delivered projects, copy the theme folder to a new name
(`theme/<project>/`) and point `avstudio.config` at the copy.

## Dangling legacy references

Subpage elements/overlays pointing at page uids that do not exist in the build
(deleted pages, template leftovers) are reported as errors with the uid.
Re-point them to real pages or delete the elements — the legacy runtime
rendered nothing for them.

## AMX

AMX connectors convert to files, but legacy AMX action types (`amx-d/a/s`) and
join props (`amxPort/amxChannel`) have no direct new equivalents (mapped to
`d/a/s` + flagged). Verify AMX signal routing in the converted project.

## dbTap

No double-tap behaviour — pick `onClick` + custom logic, or accept single-tap.

## Final verification checklist

1. `migration-report.json` — zero unexplained `error`/`todo` entries.
2. Open in VS Code → health check clean (accept the theme-file restore).
3. Icon packs active (the extractor copies them; verify a legacy icon renders).
4. Fonts render (check `font-family` aliases).
5. Live preview side-by-side with the legacy build in a browser: start page,
   navigation (`r` actions), one subpage + one subpageList with live data,
   overlays, variables reacting to joins.
6. Datasources resolve (`#ds:…#` tokens not staying literal in preview).
