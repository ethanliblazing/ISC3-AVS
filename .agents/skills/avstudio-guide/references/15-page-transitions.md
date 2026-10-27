# 15 — Page transitions (page-switch animation)

When the app switches from one page to another, the change is animated instead of snapping
instantly. AV Studio uses the browser **View Transitions API**: on navigation the router
captures the old and new page content and cross-animates them.

Only the canvas **content slot** is named for the transition (the `av-page` view-transition
group) — the surrounding chrome is not, so only the page content animates. The effect runs in
**Chromium-based browsers**; everywhere else the router commits the page change instantly with
no animation (a graceful, expected fallback — never a broken state).

## Where the transition is configured

The page-switch animation is a **theme setting**: the `transition*` keys of the `page`
section in the active `.theme` file (the one `avstudio.config` `"theme"` points at —
project-root path, e.g. `"theme/darkhuddle/darkhuddle.theme"`). The editor renders the
matching CSS automatically while that theme is active, so transitions are theme-scoped, not
global. No extra CSS file is required; the Theme Editor exposes the keys in its **Page**
section, under a dedicated collapsible **Page Transitions** group.

```json
{
    "page": {
        "transitionEnter": "fade",
        "transitionExit": "fade",
        "transitionDuration": "300ms",
        "transitionEasing": "cubic-bezier(0.22, 1, 0.36, 1)"
    }
}
```

- `transitionEnter` — animation of the **incoming** page; `transitionExit` — animation of the
  **outgoing** page. Both are preset ids, selected **independently** (any combination is
  valid).
- `transitionDuration` / `transitionEasing` — applied to `::view-transition-group(av-page)`;
  they drive the whole transition (the old/new snapshots inherit them). Raw CSS values.
- Keys missing from the `page` section behave as if they held the built-in defaults
  (`fade` / `fade` / `300ms` / `cubic-bezier(0.22, 1, 0.36, 1)`) — resolved per key, so a
  partial section is fine.
- `"none"` on a side switches that side instantly (no rule is emitted for it); both sides
  `"none"` disables the animation entirely.

## Presets

Presets animate only `opacity`, `translate` and `scale`:

| Preset id    | Label                  | Enter (new page)                    | Exit (old page)                    |
| :----------- | :--------------------- | :---------------------------------- | :--------------------------------- |
| `none`       | None (instant switch)  | instant                             | instant                            |
| `fade`       | Fade (crossfade)       | opacity 0 → 1                       | opacity 1 → 0                      |
| `slide-left` | Slide left             | from right (`translate: 200px 0`)   | to left (`translate: -200px 0`)    |
| `slide-right`| Slide right            | from left (`translate: -200px 0`)   | to right (`translate: 200px 0`)    |
| `slide-up`   | Slide up               | from bottom (`translate: 0 200px`)  | to top (`translate: 0 -200px`)     |
| `slide-down` | Slide down             | from top (`translate: 0 -200px`)    | to bottom (`translate: 0 200px`)   |
| `zoom-in`    | Zoom in                | `scale: 0.85 → 1`                   | `scale: 1 → 1.08`                  |
| `zoom-out`   | Zoom out               | `scale: 1.15 → 1`                   | `scale: 1 → 0.9`                   |
| `pop`        | Pop (scale from center)| `scale: 0 → 1`                      | `scale: 1 → 0`                     |

Directional slides also crossfade (`opacity` rides along both sides). Every preset animates
both sides with the same property family, mirrored.

## What the editor generates

The generated CSS follows the canonical View Transitions structure below — knowing it is
enough to override any part of it (see Custom Advanced):

- `::view-transition-group(av-page)` — the moving/resizing container. Gets the theme's
  `animation-duration` / `animation-timing-function` (+ `isolation: isolate`).
- `::view-transition-old(av-page)` / `::view-transition-new(av-page)` — the outgoing /
  incoming page snapshots; each gets `animation-name: av-page-out-<preset>` /
  `av-page-in-<preset>` with `animation-fill-mode: both`. A `"none"` side gets no rule.
- `@keyframes av-page-in-<preset>` / `av-page-out-<preset>` — emitted only for the selected
  presets. The `av-page-*` keyframe names are reserved (see Do not).

The block is injected as a `<style>` tag **before** the theme's sibling `*.css` stylesheets,
so any theme CSS re-declaring these selectors wins the cascade.

## Custom Advanced (overriding with CSS)

Theme presets cover the common cases; for anything richer (rotate, filter, overshoot,
per-direction choreography, springs) write CSS in the active theme's companion stylesheet:

1. **Preferred: `globalStyles.css`** (sibling of the active `.theme`; create it if missing) —
   add the override rules there. Any other sibling `*.css` name works the same way (any
   number of files, free names — see `references/09-functions-and-assets.md` §Theme
   dependencies). A dedicated `pageTransitions.css` file is a valid convention, but it is
   **not seeded and not required**.
2. Re-declare what you need — duration/easing on the group, or your own `@keyframes` and
   `animation-name` on the pseudos:

```css
/* <theme-folder>/globalStyles.css — Custom Advanced page transition */
::view-transition-group(av-page) {
  animation-duration: 500ms;
  animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes av-page-in {
  from {
    opacity: 0;
    rotate: -6deg;
    scale: 1.2;
  }

  to {
    opacity: 1;
    rotate: 0deg;
    scale: 1;
  }
}

::view-transition-new(av-page) {
  animation-name: av-page-in;
  animation-fill-mode: both;
}
```

Structure notes:

- `::view-transition-old(av-page)` / `::view-transition-new(av-page)` — the outgoing /
  incoming page snapshots. Each names its own `@keyframes`; duration/easing come from the
  group (do not repeat them there).
- `@keyframes` — any animatable property: `opacity`, `translate`, `scale`, `rotate`,
  `filter`, …. `av-page-in` runs on the new page, `av-page-out` on the old one.
- To fully replace the generated effect, override **both** pseudo rules and provide both
  keyframes; the generated `av-page-in-<preset>`/`av-page-out-<preset>` keyframes stop
  mattering once no pseudo references them.
- The editor's base stylesheet already sets
  `html, body { view-transition-name: none !important; }` — never repeat it.

## Adding transitions when there is no theme

The generated transition needs an active theme. If `avstudio.config` `"theme"` is unset or
points at a missing file, ask the user to run the palette command **🅰🅅 Add theme** — it
seeds a complete built-in theme (with the page transition keys in its `page` section and
the `globalStyles.css` companion). Only create a `.theme` file by hand if the user asks: a theme
file is the single source of truth for its values, so a partial file would drop the built-in
defaults for every key it omits — see `references/09-functions-and-assets.md` §Themes.

## Legacy projects

Projects created before the theme-based transition may still carry a seeded
`theme/<dir>/pageTransitions.css`. It keeps working: as a theme sibling it loads **after**
the generated block, so the file's rules win. Editing that file is still valid; deleting it
hands control back to the theme's page transition keys.

## Do not

- Do **not** put the transition rules in `pages/<dir>/*.css` (page-folder stylesheets are
  wrapped in `@scope ([data-av-page-dir="…"])`; the `::view-transition-*` pseudo-elements
  live on the document root and never match inside that scope).
- Do **not** add `html, body { view-transition-name: none !important; }` — the editor
  provides it globally.
- Do **not** name any element `av-page` via `view-transition-name` — that name is reserved for
  the editor's content slot; a second element with the same name aborts the transition.
- Do **not** name custom `@keyframes` `av-page-*` (and do not name the pseudo animations
  anything but your own names) — `av-page-in-*` / `av-page-out-*` are reserved for the
  generated presets and may collide.
