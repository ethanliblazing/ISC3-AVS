# Icons (library sprite symbols)

Icons on element types with `IconOptions` (`button`, `text`) are rendered from SVG
**sprite symbols** — you do not hand-write paths or inline `<img>`/`<div>` markup.
Asset images (real files) are a separate mechanism (`useImageAsIcon` +
`iconImageData`, or a dedicated `image` element — see 03 §Assets).

## The two layers

- **Render (page element)** — an `iconName` renders on the page (editor preview **and**
  Live Preview) only when the **pack is active**. The preview injects the sprite from the
  project's `assets/icons/<pack>.svg` (`IconBundleDevInject`); the element renders
  `<use href="#<Pack><Name>">`, which is empty when the symbol is not in the DOM. **Pack
  activation IS required for an icon to render on an element** — without an active pack the
  icon is blank. The extension's bundled sprites (`extension/resources/sprites/*.svg`)
  exist for every pack but are NOT injected into the page render.
- **Authoring picker** — the sidebar icon picker lists icons **only from active packs**
  (`assets.data.icons` → `assets/icons/*.svg`). You cannot even select an icon whose pack is
  not active. The small preview thumbnails inside the picker and the **Icon Explorer**
  (`avstudio-editor.openIconExplorer`) are the only places that fetch the bundled sprites
  directly, so thumbnails work even before activation — but that does not make the icon
  render on the page.

## `iconName` format

`iconName` is a sprite **symbol id**: `<Pack><Name>` in CamelCase, e.g.

`BiHouse` · `MdHome` · `FaHome` · `AiFillHome` · `Io5Flower` · `TfiWheelchair` · `VscCheck`

The pack code is the leading 2–3 characters (case-insensitive): `bi`, `md`, `fa`, `fa6`,
`hi2`, `io`, `io5`, `tfi`, `lia`, `vsc`, … **Always take real symbol names from the
editor's icon picker / Icon Explorer — never invent or guess a name.** Unused icon fields
use `null`.

## Available packs (31)

`ai` (AntDesign) · `bi` (BoxIcons) · `bs` (Bootstrap) · `cg` (CssGg) · `ci` (Circum Icons) ·
`di` (DevIcons) · `fa` (Fontawesome 5) · `fa6` (Fontawesome 6) · `fc` (Flat Color Icons) ·
`fi` (Feather) · `gi` (Game Icons) · `go` (Github Octicons) · `gr` (Grommet-Icons) ·
`hi` (Heroicons 1) · `hi2` (Heroicons 2) · `im` (IcoMoon Free) · `io` (Ionicons 4) ·
`io5` (Ionicons 5) · `lia` (Line Awesome) · `lu` (Lucide) · `md` (Material Design) ·
`pi` (Phosphor) · `ri` (Remix Icons) · `rx` (Radix Icons) · `si` (Simple Icons) ·
`sl` (Simple Line Icons) · `tb` (Tabler Icons) · `tfi` (Themify Icons) · `ti` (Typicons) ·
`vsc` (VS Code Icons) · `wi` (Weather Icons).

These match the pack labels shown in the **Icon Explorer** and the `assets/icons/*.svg`
bundle names. Note the two similarly-named but distinct Bootstrap libraries: `bs`
(Bootstrap) and `bi` (BoxIcons, which is **not** "Bootstrap Icons") — never mix them up
when proposing a pack.

## Defining an icon on an element

```jsonc
{
    "type": "button", "text": "",
    "iconName": "BiHouse",                       // library sprite symbol
    "iconPosition": "top",                       // "left" | "top" | "right" | "bottom"
    "iconSize": { "value": 24, "unit": "px" },
    "iconColor": "#ffffff"
}
```

For a real image icon (an asset file) use `useImageAsIcon: true` + `iconImageData`
(03 §Assets on elements) — never an inline `<img>` in `text`.

## Icon workflow (activation is required — ask the user first)

A pack is **active** if and only if `assets/icons/<pack>.svg` exists in the project. There
is **no `iconLibraries` setting** — file presence is the only source of truth, and it is
kept in sync automatically (the editor watches `assets/` and updates the assets slice, so
the sidebar picker / Icon Explorer react to file changes immediately). An icon on an
element **never** renders until its pack is active. Activation also gates the sidebar
picker (inactive packs are not selectable). Active packs are managed through the **Icon
Explorer** (`avstudio-editor.openIconExplorer`) — enabling copies the sprite bundle into
`assets/icons/`, disabling deletes it. Never manipulate these files on your own.

### A. When the user already has the pack active

1. Read the real symbol name from the sidebar icon picker or **Icon Explorer**
   (`avstudio-editor.openIconExplorer`) — never invent or guess a name.
2. Set `iconName` to the `<Pack><Name>` symbol id (e.g. `BiHouse`) and continue.

### B. When the needed pack is not active

1. **Stop and ask the user** for consent. Propose the relevant pack(s) from the list
   above (e.g. `bi`/`bs` for UI/button glyphs, `md` for Material, `fa`/`fa6` for Font
   Awesome, `ai` for AntDesign) — say the exact pack **code** and **label** so `bi`
   (BoxIcons) is never confused with `bs` (Bootstrap).
2. Ask the user to activate it in the **Icon Explorer** (`avstudio-editor.openIconExplorer`)
   — the extension copies `resources/sprites/<pack>.svg` into `assets/icons/<pack>.svg`,
   which activates the pack. Do **not** create or delete files in `assets/icons/` yourself.
3. Once active, take the real symbol names from the picker and set `iconName`.
4. Continue with the element.

### C. After any change

- Refresh the preview (F5 / Live Preview) so the injected sprite is picked up.
- If an icon still does not render, verify the pack is active (does `assets/icons/<pack>.svg`
  exist?) and that `iconName` is an exact symbol id from the picker — a typo or a
  non-active pack is the usual cause.

> **Anti-pattern — never do this:** injecting the icon as inline `<img>`/`<div>` markup
> inside `element.text`. Icons belong in `iconName` (sprite) or `useImageAsIcon` +
> `iconImageData` (image), never in text HTML. If no pack is active and the user has not
> added one, stop and ask (flow B above) — do not fall back to inline markup.
