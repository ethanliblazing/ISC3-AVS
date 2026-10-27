# 04 — Element catalog (15 types)

Every element = common props (03) + type-specific props below. The `type` value is
REQUIRED and must be one of the following. Default `cssClass` per type and template
defaults are listed; you may write as many or as few type props as the design needs.

## Shared helper types used below

```jsonc
// ImageProps (image source block)
{ "imgPath": "assets/images/x.png" | null, "useExternalUrl": false, "externalUrl": "",
  "isLazyLoad": false, "fillType": "fill" | "cover" | "contain",
  "fillAlignX": "left" | "right" | "center", "fillAlignY": "top" | "bottom" | "center",
  "opacity": 100 }                        // opacity 0–100

// IconOptions
{ "iconName": "BiHouse" | null,           // sprite symbol id: <Pack><CamelCase> (e.g. BiHouse,
                                          //   MdHome, FaHome, AiFillHome) — real names come from
                                          //   the editor's icon picker / Icon Explorer, never guess
  "iconPosition": "left" | "top" | "right" | "bottom",
  "iconSize": { "value": 24, "unit": "px" },
  "iconColor": "#ffffff",
  "useImageAsIcon": false,
  "iconImageData": { /* ImageProps */ } }
```

Icon usage, pack activation and the naming rule are covered in `references/11-icons.md`.

## 1. `button` — cssClass `"button"`

```jsonc
{ "type": "button", "text": "<p>Button</p>" /* rich HTML — same tags as §2 text */ }
// + ButtonProps: isPressed, isDisabled, IconOptions, common props, actions
```

Template defaults: `text: "Button"`, `cssClass: "button"`. Buttons are the primary
touch target: add `actions` with `onPress` etc. (see 05). Button `text` is rich HTML and
accepts the same dynamic tags as the `text` element (§2). Example:

```json
{
    "uuid": "09a390f2-e177-4657-8a10-f3aca278cd8b",
    "type": "button",
    "name": "Button_1",
    "cssClass": "button",
    "text": "<p>Open second</p>",
    "actions": [
        {
            "name": "Open second",
            "behaviour": "onPress",
            "pageFlipTarget": "pages/additional/second.page",
            "type": "r"
        }
    ],
    "width": { "width": { "value": 247, "unit": "px" } },
    "height": { "height": { "value": 129, "unit": "px" } }
}
```

Icon attachment (use `useImageAsIcon` + `iconImageData`, **not** an `<img>` in `text`,
see 03 §Assets on elements):

```jsonc
{
    "type": "button",
    "text": "",
    "useImageAsIcon": true,
    "iconImageData": {
        "imgPath": "assets/images/ic_living.svg",
        "useExternalUrl": false,
        "fillType": "contain",
        "isLazyLoad": false,
    },
    // library icon instead: { "iconName": "BiHouse", "iconSize": { "value": 24, "unit": "px" } }
}
```

Pressed state — `"isPressed": true | false | "<string>"`. The stored value is never
rewritten by the editor; it is coerced truthily at render time
(`coerceValue('boolean')`): any non-empty value reads as pressed (`true`, `1`,
`"true"`, `"yes"`, …) except `"false"`, `"0"`, `0` and `""` — those read as not
pressed. A dynamic token (e.g. a `!crestron:...!` digital feedback, resolved like
`activeModeIndex`, see 06 §External feedback tokens) evaluates to a boolean at
runtime; an unresolved token (editor preview, no live connector) reads as NOT
pressed. When true, the element renders with the `isPressed` CSS class and the
theme's `element.button.pressed*` variables replace the button's background,
text/icon and border styling:

| theme key (`element.button`) | pressed default |
| :--- | :--- |
| `pressedBackgroundColor` | `var(--av-project-brandColor)` |
| `pressedTextColor` | `#000000` |
| `pressedIconColor` | `var(--av-element-button-iconColor)` (inherits normal) |
| `pressedBorderColor` | `var(--av-element-button-borderColor)` (inherits normal) |
| `pressedBorderWidth` | `var(--av-element-button-borderWidth)` (inherits normal) |
| `pressedBackgroundImage` | `var(--av-element-button-backgroundImage)` (inherits normal) |
| `pressedBackgroundImageOpacity` | `var(--av-element-button-backgroundImageOpacity)` (inherits normal) |
| `pressedBackgroundImageBlur` | `var(--av-element-button-backgroundImageBlur)` (inherits normal) |
| `pressedBackgroundElementsBlur` | `var(--av-element-button-backgroundElementsBlur)` (inherits normal) |
| `pressedBackgroundGradient` | `var(--av-element-button-backgroundGradient)` (inherits normal) |
| `pressedBackgroundGradientOpacity` | `var(--av-element-button-backgroundGradientOpacity)` (inherits normal) |

The pressed values are distributed through the button's `--av-element-button-final*`
variables (base = the normal values, `.isPressed` = the `pressed*` values with a
fallback to the normal value), so `BgLayer` (background color/image/gradient/
opacity/blur) and the icon inherit them too. Note:
a normal `backgroundImage` or `backgroundGradient` paints over the pressed
background color — set `pressedBackgroundImage: "none"` /
`pressedBackgroundGradient: "none"` to reveal the solid pressed color.

Restyle the pressed look per project in the `.theme` file / Theme Editor; per element,
add a `cssClass` and override the same variables in the active theme's companion
`globalStyles.css`
(e.g. `.myClass.isPressed { --av-element-button-pressedBackgroundColor: #ff5500; }`).
For two-state on/off styling driven by content, prefer a mode (03 §Modes) — `isPressed`
is the momentary/feedback-driven pressed state.

Disabled state — `"isDisabled": true | false | "<string>"`. Coerced the same way as
`isPressed` (booleanish literals + dynamic feedback tokens; an unresolved token reads as
NOT disabled). When true the button renders with the `isDisabled` class and
`aria-disabled="true"`, its actions are suppressed, and the theme's `element.button.disabled*`
variables dim and grayscale the whole element (background, text, icon):

| theme key (`element.button`) | disabled default |
| :--- | :--- |
| `disabledOpacity` | `0.8` |
| `disabledFilter` | `grayscale(1)` (set `none` to opt out) |

`isDisabled` is an additive overlay on top of the button's current state — a disabled
button keeps its `isPressed` styling, which is then grayscaled and dimmed; its actions are
suppressed. Override per element with a `cssClass` (e.g.
`.myClass.isDisabled { --av-element-button-disabledOpacity: 0.6; }`).

## 2. `text` — cssClass `"text"`

```jsonc
{
    "type": "text",
    "text": "Hello, <varString variableName=\"username\">User</varString>",
}
// + IconOptions, TextProps: textFontSize, textColor, textTransform, allowTextWrap,
//   fontFamily, fontSize, paddingOptions, background, border, actions
```

`text` is rich HTML. Dynamic content: inline tokens (`$var$` / `%param%` — they work
inside the HTML too) or cached toolbar tags — variable tags (`<varString ...>` /
`<varNumber ...>` / `<varBoolean ...>`, global variables only), parameter tags
(`<parameter name="...">Fallback</parameter>` /
`<parameterBoolean name="..." true="..." false="..."/>`) and feedback tags (`<digital_fb ...>` /
`<analog_fb ...>` / `<serial_fb ...>`, live control-system joins) — see SKILL.md rule 13
and 06 §Tokens.

`text` carries **text content only** — do not put images inside it via `<img>`. For an
icon/image on a `text` element use `useImageAsIcon` + `iconImageData` (as in §1), or a
stand-alone `image` element (03 §Assets on elements).

## 3. `image` — cssClass `"image"`

```jsonc
{
    "type": "image",
    "variant": "simple",
    "fillType": "cover",
    "fillAlignX": "center",
    "fillAlignY": "center",
    "opacity": 100,
    "imgPath": "assets/images/my-image.png",
    "useExternalUrl": false,
    "externalUrl": "",
    "isLazyLoad": false,
}
```

Defaults from template: `variant: "simple"`, `fillType: "cover"`, `fillAlignX/Y: "center"`,
`opacity: 100`, `imgPath: null`, `useExternalUrl: false`, `externalUrl: ""`,
`isLazyLoad: false`. `imgPath` must be a real asset path (rule 7). Use `<imgPath>` with
external URL when `useExternalUrl` is true.

`variant` (image element only, not the shared ImageProps block):

- `"simple"` — static image (default).
- `"stream"` — live Motion-JPEG (MJPEG) preview, e.g. a Roku / Fire Stick screen mirror
  endpoint. Set `useExternalUrl: true` and `externalUrl` to the MJPEG URL. Fully
  manual: every mount requests the stream with a fresh cache-busted URL (a stale
  cached frame is never shown), a refresh hint shines through while the stream is
  blank, any click on the element re-requests the stream and still triggers its
  click actions in parallel, and leaving the page tears the stream connection
  down — no background downloads. `isLazyLoad` is ignored in stream mode. All
  other props behave as in `"simple"`.

Stream example (see also SKILL.md workflow J and rule 19 — never the `video` element,
never hand-rolled `?t=` refresh params):

```jsonc
{
    "type": "image",
    "name": "Roku_Preview",
    "cssClass": "image",
    "variant": "stream",
    "useExternalUrl": true,
    "externalUrl": "http://192.168.1.42/video.mjpeg",
    "fillType": "cover",
    "fillAlignX": "center",
    "fillAlignY": "center",
    "opacity": 100,
    "width": { "width": { "value": 320, "unit": "px" } },
    "height": { "height": { "value": 180, "unit": "px" } },
}
```

`externalUrl` may embed `$var$` / `%param%` tokens (06 §Tokens) — e.g.
`"http://$rokuHost$/video.mjpeg"`; when the resolved URL changes, the stream is
re-requested automatically.

## 4. `spacer` — cssClass `"spacerElement"`

```jsonc
{
    "type": "spacer",
    "width": { "width": { "value": 50, "unit": "px" } },
    "height": { "height": { "value": 50, "unit": "px" } },
}
```

**Default use — invisible flex filler**: for spacing in responsive grids instead of
margins.

**Decorative use**: `spacer` is still a full element (`ElementBase` — `background`,
`border`/`borderRadius`, `boxShadow`, `width`/`height`), so it can be styled into flat
decorative shapes. Reach for it whenever you need a purely visual, non-interactive
graphic (a colored dot, rectangle, divider, line, circle, square). Examples:

```jsonc
// colored dot / circle (.e.g 12×12 with full roundness)
{ "type": "spacer",
  "width": { "width": { "value": 12, "unit": "px" } },
  "height": { "height": { "value": 12, "unit": "px" } },
  "border": { "borderRadius": 6 },                 // half the side → circle
  "background": { "color": "#ea7324" } }

// divider line (full-width hairline)
{ "type": "spacer",
  "width": { "width": { "value": 100, "unit": "%" } },
  "height": { "height": { "value": 2, "unit": "px" } },
  "background": { "color": "rgba(255,255,255,0.2)" } }
```

Squares/rectangles use the same shape with `borderRadius: 0` (or omit it). These are
**static/decorative only** — for anything interactive (touch target) or text-carrying,
use the appropriate element type (`button`, `text`) instead.

## 5. `shadesCompact` — cssClass `"shadesCompactElement"`

```jsonc
{
  "type": "shadesCompact",
  "variant": "left" | "right" | "dual" | "vertical",   // default "vertical"
  "fabricBackground": "gray",     // string
  "fabricBackgroundBlur": 0,      // number (px)
  "minValue": 0, "maxValue": 100, // numbers
  "directValue": 0,               // current position — literal or dynamic token
  "handleSize": 10,               // number (px)
  "handleThickness": 4            // number (px)
}
// + ImageProps (fabric texture image)
```

Incoming position — `directValue` is the position the control shows. It may be a
literal or a dynamic token (`$var$` / `%param%` / `!system:...#!`) resolved at runtime
like other props; an unresolved dynamic token is ignored in the editor. The stable value
is the resolved `directValue`, or `minValue` when unbound. A drag updates the position
immediately (optimistic) and re-syncs to the stable value ~3 s after the interaction
settles.

Template defaults: `variant: "vertical"`, `minValue: 0`, `maxValue: 100`,
`directValue: 0`, `fabricBackground: "gray"`, `fabricBackgroundBlur: 0`,
size `150×200px`.

## 6. `dpad` — cssClass `"dpadElement"`

```jsonc
{
    "type": "dpad",
    "color": "#ffffff", // arrows color
    "pressedColor": "#aaaaaa", // pressed arrows color
    "cornersRadius": 20, // number (px)
    "cornersRaduis": 20, // LEGACY twin of cornersRadius — keep if present
    "thickness": 1, // number (px) — arrow line thickness
    "hideCentralButton": false,
    "hideCetralButton": false, // LEGACY twin of hideCentralButton — keep if present
    "topText": "",
    "rightText": "",
    "bottomText": "",
    "leftText": "",
    "centerText": "",
}
```

Template defaults: `cornersRadius: 20`, `thickness: 1`, `hideCentralButton: false`,
all texts `""`, size `150×150px`.

Per-button Crestron joins are **not element props**. Bind each button to its own
digital join with a `joinMap` action on the element (`type: "joinMap"`,
`buttonJoins: { top, right, bottom, left, center }`), see `05-actions.md`.

## 7. `stateControl` — cssClass `"stateControlElement"`

```jsonc
{
  "type": "stateControl",
  "variant": "switch" | "checkbox" | "toggle",   // default "switch"
  "text": "State Control Label",   // optional label
  "color": "#ffffff",              // control color
  "backgroundUnchecked": "#555555",
  "thumbCheckedBackground": "#ffffff",
  "thumbUncheckedBackground": "#888888",
  "textOn": "ON", "textOff": "OFF",
  "textOnColor": "#00ff00", "textOffColor": "#ff0000",
  "reverseOrder": false,           // swap label/control order
  "size": 24                       // number (px)
}
// + Font props
```

Incoming state — `"value": true | false | "<booleanish>" | "<feedback token>"`. When
present it drives the checked state (resolved at runtime like other props); an
unresolved dynamic token is treated as not checked in the editor. The stable value is
the resolved `value`, or `false` when unbound. A toggle updates the UI immediately
(optimistic) and re-syncs to the stable value ~3 s after the interaction settles.

Template defaults: `variant: "switch"`, `text: "State Control Label"`, `textOn: "ON"`,
`textOff: "OFF"`, `reverseOrder: false`.

## 8. `input` — cssClass `"inputElement"`

```jsonc
{
  "type": "input",
  "placeholder": "Enter text...",
  "autofocus": false,
  "displayAsPassword": false,
  "displayAsNumber": false,
  "input_signal_s_fb": "",        // reserved: serial FB signal name (not yet rendered)
  "input_direct_value": "",       // text shown/edited — literal or dynamic token
  "activeValueStateSource": "crestron" | "direct",  // reserved (not yet rendered)
  "makeInFocus_signal_d": ""      // digital signal to focus the field
}
// + Font props
```

Incoming value — `input_direct_value` is the text the field shows and edits. It may
be a literal or a dynamic token (`$var$` / `%param%` / `!system:...#!`) resolved at
runtime like other props; any scalar is coerced to text. An unresolved dynamic token
is ignored in the editor. The stable value is the resolved `input_direct_value`, or
empty when unbound. Typing updates the field immediately (optimistic) and re-syncs to
the stable value ~3 s after the last keystroke.

Template defaults: `placeholder: "Enter text..."`, `displayAsPassword: false`,
`displayAsNumber: false`, `autofocus: false`.

## 9. `dateTime` — cssClass `"dateTimeElement"`

```jsonc
{
  "type": "dateTime",
  "variant": "analog" | "digital" | "datetime",
  "text": "",                       // optional override text
  "gap": { "value": 4, "unit": "px" },   // SizeProperty between label sections
  "labelPosition": "top" | "bottom",
  // Analog clock
  "minuteMarkColor": "rgba(255,255,255,0.75)",
  "hourMarkColor": "rgba(168,255,196,1)",
  "hourHandColor": "#ffffff",
  "minuteHandColor": "#ffffff",
  "secondHandColor": "#ff3b30",
  // Digital / DateTime
  "useAmPm": false, "showSeconds": true, "showDate": true, "showTime": true,
  "datePosition": "before" | "after" | "top" | "bottom",
  "dateColor": "#ffffff",
  "dateFontSize": { "value": 12, "unit": "px" },
  "locale": "en-US",                // string (BCP 47)
  "timeZone": ""                    // string (IANA, e.g. "America/New_York")
}
// + Font props
```

Template defaults: `variant: "analog"`, `labelPosition: "bottom"`, mark/hand colors as
above, `useAmPm: false`, `showSeconds: true`, `showDate: true`, `showTime: true`,
`datePosition: "bottom"`, size `150×150px`.

## 10. `video` — cssClass `"videoElement"`

```jsonc
{
  "type": "video",
  "variant": "standard" | "hls" | "rtsp",
  "videoUrl": "",
  "autoplay": false, "loop": false, "muted": false,
  "hideAllControls": false
}
// + ImageProps (poster frame)
```

Template defaults: `variant: "standard"`, `autoplay/loop/muted/hideAllControls:
false`, `videoUrl: ""`, size `255×150px`.

### Variant descriptions

- **`"standard"`** — native HTML5 `<video>` player. Supports MP4, WebM, OGG. Browser controls visible unless `hideAllControls: true`.

- **`"hls"`** — HLS streaming via `hls.js`. Supports `.m3u8` playlists. Shows a loading spinner while buffering. Falls back to native HLS on Safari/iOS.

- **`"rtsp"`** — RTSP camera stream via App Container native overlay. **Requires [App Container](https://github.com/AVstudio-Inc/App-Container) runtime** (AVS panels or mobile devices with the app installed). The stream is rendered natively above the WebView with zero added latency and hardware decoding.

### RTSP variant details

When `variant: "rtsp"`:

1. The component renders a placeholder `<div>` with `id="av-video-{uuid}"`.
2. On mount, it detects `window.appcontainer.streamBridge` (App Container) or falls back to `window.streamBridge` (legacy).
3. Posts `{ action: "open", id, url, divId }` to the native bridge — the overlay is positioned over the placeholder div.
4. Polls the placeholder position every 500ms and sends `{ action: "resize", id, divId }` when dimensions change.
5. On unmount, posts `{ action: "close", id }` to release the stream.

**Fallback**: If the bridge is unavailable (e.g., in a regular browser or VS Code Live Preview), the component shows a "Requires App Container runtime" message.

**Camera URL format**: Use a standard RTSP URL, e.g. `rtsp://192.168.1.100:554/stream`.

```jsonc
{
    "type": "video",
    "variant": "rtsp",
    "videoUrl": "rtsp://192.168.1.100:554/stream",
    "autoplay": true,
}
```

## 11. `slider` — cssClass `"sliderElement"`

```jsonc
{
  "type": "slider",
  "variant": "simple" | "range" | "fat",      // "range" = two thumb handles
  "isVertical": false, "reverse": false,
  // Thumb
  "thumbWidth": { "value": 30, "unit": "px" }, "thumbHeight": { "value": 30, "unit": "px" },
  "thumbBorder": { /* Border — see 03 */ } | null,
  "thumbBackground": "currentColor",
  // Track
  "trackSize": { "value": 10, "unit": "px" },
  "trackBorder": { /* Border — see 03 */ } | null,
  "trackBackground": "gray",
  "progressStartColor": "#00ff00", "progressEndColor": "#00aaff",   // gradient fill
  // Value labels (text on each side)
  "labelTopText": "", "labelRightText": "", "labelBottomText": "", "labelLeftText": "",
  // Tooltips over the thumbs
  "valueTooltipText": "Tooltip", "valueTooltipPlacement": "before" | "after",
  "valueTooltip2Text": "Tooltip 2", "valueTooltip2Placement": "before" | "after",  // range thumb 2
  "valueTooltipColor": "currentColor",
  "valueTooltipVisibility": "always" | "active" | "hidden",
  "valueTooltipFontSize": { "value": 12, "unit": "px" },
  // Values
  "minValue": 0, "maxValue": 100, "step": 1,
  "directValue1": 0, "directValue2": 100     // current thumb positions (1 = only thumb)
}
```

Incoming positions — `directValue1` (and `directValue2` for the range variant) are the
thumb positions the slider shows. Each may be a literal or a dynamic token
(`$var$` / `%param%` / `!system:...#!`) resolved at runtime like other props; an
unresolved dynamic token is ignored in the editor. The stable value is the resolved
`directValue*`, or the range bound (`minValue` / `maxValue`) when unbound. A drag updates
the thumb immediately (optimistic) and re-syncs to the stable value ~3 s after the
interaction settles.

Template defaults: `variant: "simple"`, `minValue: 0`, `maxValue: 100`, `step: 1`,
`directValue1: 0`, `directValue2: 100`, `trackSize: 10px`, thumb `30×30px`,
`thumbBackground: "currentColor"`, `trackBackground: "gray"`, tooltips hidden,
size `200×40px`. Action fields `signalName_signal` (thumb 1) and `signalName_signal2`
(thumb 2) live in the element's actions — see 05.

## 12. `autonomic` — cssClass `"autonomicElement"`

```jsonc
{
    "type": "autonomic",
    "autonomicBaseUrl": "", // base URL of the Autonomic player API
    "autonomicDefaultPlayerName": "", // default player zone
    "hidePlayerSelector": false, // hide zone selector UI
}
// + ImageProps (album art fallback)
```

Template defaults: empty base url/player, `hidePlayerSelector: false`, size
`350×450px`.

## 13. `rgbPicker` — cssClass `"rgbPickerElement"`

```jsonc
{
    "type": "rgbPicker",
    "variant": "rgb" | "hex",   // value format; unset → "rgb"
    "value_r": 255,             // rgb variant: red channel 0..255 — literal or dynamic token
    "value_g": 255,             // green channel
    "value_b": 255,             // blue channel
    "value_hex": "#ff8800"      // hex variant: single hex color string
}
// + ImageProps
```

Incoming color — the picker is driven by its `variant` value format; the two are
mutually exclusive.

**`variant: "rgb"` (default)** — three channels `value_r` / `value_g` / `value_b`
(0–255). Each may be a literal, a dynamic token (`$var$` / `%param%` / `!system:...#!`)
resolved at runtime like other props, or omitted; a missing channel, an out-of-range
value or an unresolved dynamic token falls back to `255` (white). A pick updates the
picker immediately (optimistic) and re-syncs to the stable channel values ~3 s after the
interaction settles. The picker emits a serial change value `rgb(r, g, b)` (plus the
individual `r` / `g` / `b` numbers) to its `beforeChange` / `onChange` / `afterChange`
actions. Per-channel Crestron joins are **not element props** — bind each channel to its
own analog join with a `joinMap` action (`channelJoins: { r, g, b }`), see
`05-actions.md`.

**`variant: "hex"`** — a single `value_hex` string (`#RRGGBB`, 3-digit shorthand
`#RGB` accepted; invalid, empty or unresolved values fall back to white `#ffffff`).
Bound like any other string prop (literal or dynamic token). A pick emits a serial
change value `#rrggbb` (lowercase, as produced by the picker) to the same three change
triggers; there are **no channel joins** — the `joinMap` action is not offered in this
variant, and the element context exposes `@context:hex@` instead of the channel keys.

Template defaults: `variant: "rgb"`, `value_r: 255`, `value_g: 255`, `value_b: 255`,
size `200×200px`.

## 14. `roundSlider` — cssClass `"roundSliderElement"`

```jsonc
{
  "type": "roundSlider",
  "variant": "round" | "horseshoe" | "half-top" | "half-bottom" | "half-left" | "half-right",
  "reverse": false,
  "value_signal_a": "",        // analog signal name for the value
  "value_direct": 50,          // direct value when no signal bound
  "minValue": 0, "maxValue": 100, "valueStep": 1,
  "startColor": "#00ff00", "endColor": "#00aaff",   // track gradient
  "defaultTrackColor": "#555555",
  "handleColor": "#ffffff",
  "trackSize": 25,             // number (px)
  "handleSize": 28,            // number (px)
  "handleShadow": { /* BoxShadow — see 03 */ },
  "handleBorder": { /* Border — see 03 */ } | null
}
// + ImageProps + Font (text shown in the middle)
```

Template defaults: `variant: "round"`, `minValue: 0`, `maxValue: 100`, `valueStep: 1`,
`value_direct: 50`, `trackSize: 25`, `handleSize: 28`, `text: "Content"`, size
`200×200px`.

## 15. `subpage` — cssClass `"subpage"`

```jsonc
{
    "type": "subpage",
    "subpageName": "./subs/inner.page", // relative when nested under the page folder
    "inputParameters": {
        // values passed to the subpage's parameters
        "roomId": "1",
    },
}
```

- `subpageName` = an absolute project-root page ref such as `"pages/start.page"` or
  `"pages/folder/page.page"`, `"/"` = start page, or a **relative ref**
  (`"./inner.page"`, `"./subs/inner.page"`) when the target page lives in the same
  folder as (or a descendant of) the page that contains the element. Relative refs keep
  the page folder copyable/movable — the editor stores them automatically; absolute refs
  are used for targets outside that scope. For
  composing a page with its dependent subpages as a reusable, copyable module, see
  `references/01-pages.md` §Modular pages. Only reference existing page files (or
  newly created ones).
- `inputParameters` is `Record<string, unknown>` — keys should match parameter names
  declared in the target page's `parameters`. Values may be literals or any dynamic token
  (`$var$` / `%param%` / `#ds:...#` / `!crestron:...#!`); a feedback token makes the target
  parameter receive the resolved live value (06 §External feedback tokens).
- The subpage renders the target page inside the element bounds — size via
  `width`/`height`/`top` etc. like any element.
- `subpage` always renders **exactly one** instance. For a **repeated, datasource-driven
  list** of subpages (one instance per array item, boxless or grid layout) use the
  `subpageList` element (§16) instead — a `subpage` with an attached datasource still
  renders once and receives no item data.
- **Editor states**: with no `subpageName` the editor draws a "Select Subpage" curtain
  over the element; a `subpageName` that does not resolve to a page draws
  "Subpage … not found". The element keeps its own box/size, so production renders it
  empty (no curtain text ever appears in production).

## 16. `subpageList` — cssClass `"subpageList"`

```jsonc
{
    "type": "subpageList",
    "subpageName": "./subs/room.page", // same ref rules as `subpage`
    "inputParameters": {
        // passed to EVERY instance; supports tokens
        "roomId": "#datasources/rooms.datasource:*.id#", // item-relative (see below)
        "label": "$listLabel$",
    },
    "attachedDatasource": {
        // REQUIRED to render instances — the list repeats this result
        "datasource": "datasources/rooms.datasource",
        "steps": [],
    },
    "variant": "grid", // "boxless" | "grid" (template default "grid"; an omitted variant renders "boxless")
    "rows": 2, // grid: visible matrix rows (inherits theme default 2)
    "columns": 2, // grid: visible matrix columns (inherits theme default 2)
    "gridFlow": "row", // "row": fill rows, extra scroll down (default); "column": fill columns, scroll right
    "scrollMode": "scroll", // grid: "disabled" | "scroll" | "scrollHidden"; unset → theme element.subpageList.scrollMode (default "scroll")
    "scrollSnap": false, // grid: CSS scroll snap (scroll-snap-type: both mandatory + scroll-snap-align on cells); off by default
    "scrollSnapAlign": "start", // grid: "start" (default) | "center" | "end"; snap alignment of the cells, applies when scrollSnap is on
    "scrollbarThumbBackground": "auto", // grid: CSS color or "auto"; unset → theme --av-element-subpageList-scrollbarThumbBackground
    "gap": { "value": 8, "unit": "px" }, // inter-cell spacing (unset → theme default 0px)
}
```

- **Template defaults**: `variant: "grid"`, size `300×400px`, `cssClass: "subpageList"`.
- **Datasource-driven repeater.** The element renders the referenced subpage **once per
  item of its own `attachedDatasource` result** (the datasource after its `steps`). No
  datasource attached, or a result that is not an array (object/primitive, or not
  resolved yet), renders **no instances** — a single static subpage is the `subpage`
  element (§15), never this one. An empty array is a valid empty list.
- **Per-item data — item-relative tokens.** Each instance's `inputParameters` may read a
  field from **that instance's own array item** with `#<datasourceKey>:*.<path>#`, where
  `<datasourceKey>` must equal the list's `attachedDatasource.datasource` (the full
  datasource key, e.g. `datasources/rooms.datasource`) and `*` = the current item
  (`"inputParameters": { "roomId": "#datasources/rooms.datasource:*.id#" }`). `$var$` /
  `%param%` / absolute `#<key>:<path>#` tokens work too; an item-relative token resolves
  only inside a matching list scope and stays literal elsewhere. Syntax: 06 §Tokens,
  §Datasource tokens.
- **Feedback in `inputParameters`.** A value may be a full external feedback token whose
  join is item-relative, e.g.
  `"volumeLevelPercent": "!crestron:type=number;name=#datasources/rooms.datasource:*.volume#!"`.
  It is resolved **per instance** — after `*` binds to that instance's array item and
  before the subpage's parameters are applied — so the subpage parameter holds the live
  value; consume it with `%volumeLevelPercent%` or
  `<parameter name="volumeLevelPercent">`. Resolving once per instance shares the value
  across every consumer in the subpage (06 §Feedback through parameters).
- **Editor states** (drawn as a curtain overlay on the element box): no `subpageName`
  → "Select Subpage"; broken `subpageName` → "Subpage … not found"; no attached
  datasource → "Datasource is not attached"; attached result not an array →
  "Datasource result is not a list"; empty array → "Empty list". These hints exist only
  in the editor — in production a **boxed** list (grid / fixed layout) keeps its empty
  box in its own size/styling, while a **boxless** list renders nothing.
- `variant: "boxless"` (opt-in; newly created elements default to `grid`) generates
  **no box** in a responsive page: instances are laid out directly by the parent
  container's flow/gap/align at the subpage's own size, and element `width`/`height` plus
  box styling (background/border/shadow/reflection/padding/gap) are inert. In a **fixed
  layout** the element keeps a positioned box with instances stacked and filling the
  cross axis.
- `variant: "grid"` (template default) carves the element box into a **`rows` × `columns`
  matrix of equal cells** and clips one instance per cell. `gridFlow: "row"` (default)
  fills row by row —
  extra instances appear in rows below (**vertical** scroll); `gridFlow: "column"` fills
  column by column — extra instances appear to the right (**horizontal** scroll). Cell
  sizing: the instance uses the target page's own `width`/`height` when that page sets
  `enableCustomPageSize: true`, otherwise it fills the cell (`100%` × `100%`). `gap` is
  the inter-cell spacing; cells are pure geometry (the editor outlines them when the
  element is selected).
- **Grid scroll**: `scrollMode` — `"disabled"` (no scroll) / `"scroll"` (scrollable,
  bar visible) / `"scrollHidden"` (scrollable, bar hidden) — and `scrollbarThumbBackground`
  (CSS color or `"auto"`). Both mirror the container scroll settings (02 §Grid building
  rules) and fall back to the theme keys `element.subpageList.scrollMode` /
  `--av-element-subpageList-scrollbarThumbBackground`. `scrollSnap` (boolean, off by
  default) locks scroll resting positions to cell boundaries when the list is
  scrollable: `scroll-snap-type: both mandatory` on the element box +
  `scroll-snap-align` on the cells (same card as containers, 02 rule 10);
  `scrollSnapAlign` (`"start"` default / `"center"` / `"end"`) positions the
  cells relative to the snapport.
  **Availability** (hard rule 22): snap is a **grid-variant-only** feature - a
  `boxless` list generates no box of its own, exposes no snap card in the
  sidebar, and ignores the keys (including the boxless boxed fallback in fixed
  layout, which has `overflow: hidden` and never scrolls). A **grid** list
  scrolls and snaps in both responsive and fixed layouts; `scrollMode` must not
  be `"disabled"` (the sidebar card hides otherwise). Snap targets are the grid
  cells only; there are **no theme keys** for snap - element props only.
- `rows` (2), `columns` (2), `gridFlow` (`"row"`), `gap` (`0px`) and the scroll keys all
  inherit from the theme `element.subpageList` section when the element prop is unset; an
  explicit element value overrides the theme (e.g. a theme can set `gridFlow: "column"`
  and every list without its own `gridFlow` scrolls horizontally).
- Background, border, shadow, reflection and padding apply to the **element box** (grid
  variant); `subpageName`/`inputParameters` follow the exact same ref/parameter rules as
  `subpage` (§15).

## Element type summary

| type          | cssClass               | section |
| :------------ | :--------------------- | :------ |
| button        | `button`               | 1       |
| text          | `text`                 | 2       |
| image         | `image`                | 3       |
| spacer        | `spacerElement`        | 4       |
| shadesCompact | `shadesCompactElement` | 5       |
| dpad          | `dpadElement`          | 6       |
| stateControl  | `stateControlElement`  | 7       |
| input         | `inputElement`         | 8       |
| dateTime      | `dateTimeElement`      | 9       |
| video         | `videoElement`         | 10      |
| slider        | `sliderElement`        | 11      |
| autonomic     | `autonomicElement`     | 12      |
| rgbPicker     | `rgbPickerElement`     | 13      |
| roundSlider   | `roundSliderElement`   | 14      |
| subpage       | `subpage`              | 15      |
| subpageList   | `subpageList`          | 16      |
