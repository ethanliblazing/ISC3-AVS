# 02 — Elements: old → new

Legacy types: `avs-app/src/features/pages/pageTypes.ts`. New types:
`packages/types/src/_types.ts` (`AvstudioElement`). 17 new types; these tables map 26 legacy ones for the page-by-page migration.

## Type map

| Legacy | New | Notes |
| --- | --- | --- |
| `text` | `text` | 1:1 |
| `button` | `button` | `buttonDesign` dropped (theme-driven) |
| `image` | `image` | + `variant: 'simple'` |
| `spacer` | `spacer` | 1:1 |
| `input` | `input` | signal prop → token, see below |
| `video` | `video` | `variant` inferred from `videoUrl` (rtsp→`rtsp`, `.m3u8`→`hls`, else `standard`) |
| `subpage` | `subpage` | `subpageId` (uid) → `subpageName: 'pages/X.page'` |
| `subpageList` | `subpageList` | `variant: 'grid'` when `listColumns`/`listRows` set, else `'boxless'` |
| `shadesCompact` | `shadesCompact` | 1:1 |
| `autonomic` | `autonomic` | 1:1 |
| `roundSlider` | `roundSlider` | `value_signal_a` → `value_direct` token |
| `rgbPicker` | `rgbPicker` | hex-only legacy → `variant: 'hex'`, `value_hex_signal_s` → `value_hex` token |
| `slider2` | `slider` | props 1:1 (`trackIcon*` dropped) |
| `slider` (v1) | `slider` | `variant: 'simple'`; `minBackground`→`trackBackground`, `maxBackground`→`progressEndColor`, `input_signal_a_fb`→`directValue1` token; `output_signal_a_fb`, `increment/decrement_signal_d`, `isBarSlider`, `hideThumb`, `showControls`, `useDynamicBackround` dropped (deprecated in legacy too / theme-driven) |
| `switch` / `checkbox` / `toggle` | `stateControl` | `variant` = legacy type; see below |
| `clock` | `dateTime` | `variant: 'analog'`; hand colors map 1:1 |
| `dateTime` | `dateTime` | `variant: 'datetime'` when `showDate`, else `'digital'` |
| `dpad` | `dpad` | `cornersRaduis`→`cornersRadius`, `hideCetralButton`→`hideCentralButton`; per-button `*_signal_d` → one `joinMap` action (`buttonJoins`) |
| `keypad` | **12 × `button`** | substitution; joins preserved as pulse actions |
| `circleSlider` | `roundSlider` | `variant: 'round'`; text overlays dropped |
| `player` | — dropped | recreate with buttons/sliders + joins |
| `shades` | — dropped | only `shadesCompact` exists |
| `htmlblock` | — dropped | recreate as custom element (`elements/<id>/`) |

## Common props (`defaultElementProps` → `ElementBase`)

| Legacy | New |
| --- | --- |
| `name`, `cssClass`, `text`, `textColor`, `textTransform`, `allowTextWrap`, `fontFamily`, `isWidget`, `isStaticElement` | same |
| `textFontSize`, `gap`, `iconSize`, `lettersFontSize` | same (`SizeProperty {value, unit}`) |
| `width` / `height` `{width:{…},maxWidth…}` | same shape |
| `padding`, `paddingLeft/Top/Right/Bottom` | wrapped into `paddingOptions` |
| `backgroundColor` | `background.color` |
| `backgroundBlur` | `background.backgroundElementsBlur` |
| `border` | same object |
| `boxShadow` / `boxReflect` | same objects (`isEnabled` respected) |
| `modes`, `activeModeIndex` | same (modeProps re-mapped recursively) |
| `actions` | mapped (see 03) |
| `top/left/right/bottom`, `constraintsVertical/Horizontal`, `deltaCenterX/Y`, `zIndex` | same |
| `size: 'small'\|'normal'\|'large'` | dropped (theme-driven) |
| `contentAlign` | dropped |
| `preset`, `parentData`, `index`, `listIndex`, `containerIndex`, `indexInList`, `currentPageContainersFlow`, `staticListOverrides`, `elementCalculatedDs`, `style`, `data` | dropped (runtime/editor bookkeeping) |
| `attachedFunctions`, `attachedModificators` | dropped — see 06 §attachedFunctions |
| `dynamicDataUsed` | dropped (derived cache, different shape now) |

`attachedDatasource` is **required** on every element: `{ datasource: null|path, steps: [] }`.

## Image references (`imgId` → `imgPath`)

Legacy `imgId` (Strapi media id) maps to the new string asset key:
- **Literal ids** map through the media collection (`2993` →
  `assets/images/presentation_bg.jpg`);
- **Dynamic ids** (`imgId: "%param%"`) pass through as `imgPath` tokens, and
  the referenced parameter/variable is coerced to `type: 'string'` with
  asset-path values — numeric caller values are rewritten the same way
  (see 04 §Page parameters).

## `element.state` → new model

| Legacy `state` | New |
| --- | --- |
| `isVisible_signal_d_fb: "<join>"` | `isVisible: "!crestron:type=boolean;name=<join>!"` |
| `isVisible_directValue` | `"0"` → `isVisible: false`; `""`/other → omit (visible) |
| `isVisible_reserve_space` | `isVisibleReserveSpace` |
| `isPressed_signal_d_fb` (button) | `isPressed: token` |
| `isDisabled_signal_d_fb` | `isDisabled: token` — **button only** |
| `checkedState_signal` (switch/checkbox/toggle) | `stateControl.value: "!crestron:type=boolean;name=<join>!"` |
| `checkedState_direct_value` (+`activeCheckedStateSource: 'direct'`) | `stateControl.value: literal` |
| `displayAsPassword` / `displayAsNumber` (input) | same (live props) |
| `setFocusOn/Off_signal_d`, `makeInFocus_signal_d` | dropped — dead in legacy too |
| `orientationVisibility` | dropped (no orientations) |
| `listState` (subpageList) | `isVisible*` mapped onto the element; the rest dropped |

Startup nuance: legacy hid elements until the first digital feedback; the new
model renders unresolved tokens as **visible**. Elements whose legacy default
was hidden get a report flag.

## Value props (token-bindable)

Old dedicated `*_signal_*` feedback props are gone — feedback is a dynamic
token written into the semantic prop. Always map into the prop the runtime
actually reads (audit `webviews/packages/ui/src/components/render/element/<type>/`):

| Legacy | New |
| --- | --- |
| `input.input_signal_s_fb` | `input_direct_value: "!crestron:type=string;name=<join>!"` |
| `roundSlider.value_signal_a` | `value_direct: "!crestron:type=number;name=<join>!"` |
| `rgbPicker.value_hex_signal_s` | `value_hex: "!crestron:type=string;name=<join>!"` |
| slider v1 `input_signal_a_fb` | `slider.directValue1: token` |
| `stateControl.value` | token or literal |

Unresolved tokens fall back safely (`minValue` / empty / visible) — that is the
new runtime contract, not a bug.

## stateControl specifics

- `switch`: `color`, `backgroundUnchecked`, `reverseOrder`, `textOn/textOff`,
  `textOnColor/textOffColor`, `thumb*Background` map 1:1; named `size`
  dropped, numeric kept.
- `checkbox`: `tickColor`, `labelPosition` dropped.
- `toggle`: `onText`→`textOn`, `offText`→`textOff`,
  `stateOnActiveBackground`→`color`, `stateOnActiveTextColor`→`textOnColor`,
  `reverse`→`reverseOrder`; `isVertical`, `onIcon/offIcon` dropped.
- No state config at all → `value: false` (health check requires a value).

## subpage / subpageList

- `subpageId` (uid) → `subpageName` = absolute page ref `pages/<Name>.page`;
  `isSourceByName` → resolve by name.
- `inputParameters: [{parameterName, passedValue, parameter_signal_fb}]` →
  `Record<name, value>`; FB-bound params become crestron tokens (type inferred
  from the legacy parameter type).
- Parameters passed to a page are merged into that page's `parameters` if
  missing (legacy kept a loose pool; the new model declares them on the page).
- `subpageList` list appearance props (`listWidth/Height/Padding/Gap/
  BackgroundColor/Border/…Positions/EmptyText/NumberOfItems/ForceFill*`) are
  dropped — the list look is theme/subpage-driven; `listUseCarousel` →
  `scrollMode: 'scroll'`; `listElementsFlow` → `gridFlow`.

## Keypad substitution

12 keys in legacy order `1…9, Extra1(✱), 0, Extra2(#)`; every configured
`buttonN_signal_d` becomes a `button` with a pulse `d` action
(`digitalPushData: 'pulse'`). Containers do not wrap — arrange the grid
manually (e.g. re-group into rows) or rebuild as a custom element.
