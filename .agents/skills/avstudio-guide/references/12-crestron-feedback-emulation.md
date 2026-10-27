# 12 — Crestron feedback emulation (browser console)

> **FOR CRESTRON** — this applies only to crestron connectors, not web/websocket/mqtt/amx/knx.

`window.CrComLib` exists only in the running webview / Live Preview — it is defined when
the `useCrestron` module is loaded (`webviews/packages/ui/src/hooks/useCrestron/useCrestron.tsx`)
and typically only after a crestron connector becomes active. It is **not** available in a
plain script context unless that module has been imported.

Inspect what is actually exposed:

```js
Object.keys(window.CrComLib)
```

## Emulate Crestron → UI feedback (inject a signal into live hooks)

These mirror the signal coming **from** the native processor into the running UI (digital /
analog / serial). Existing `useSubscribe*` hooks and the crestron driver's `subscribe()` /
`read()` pick the value up immediately.

```js
window.CrComLib.bridgeReceiveBooleanFromNative('1', true)    // boolean / digital
window.CrComLib.bridgeReceiveIntegerFromNative('1', 5)       // number / analog
window.CrComLib.bridgeReceiveStringFromNative('1', 'hello')  // string / serial
```

## UI → Crestron (send to the native side)

```js
window.CrComLib.publishEvent('boolean', '1', true)
```

## Read / subscribe

```js
window.CrComLib.getState('boolean', '1')                                    // current value
window.CrComLib.subscribeState('boolean', '1', (v) => console.log(v))       // live updates
```

## Emulate from the AVStudio DevTools panel

The extension ships an **AVStudio DevTools** Chrome DevTools panel with a **Crestron
Emulation** tab — a form that calls the same `bridgeReceive*FromNative` bridge without
typing console commands: pick the signal type (Digital / Analog / Serial), enter the join
and the value, and send. Use it for a repeatable, click-through way to inject test signals;
the console calls above remain the scriptable equivalent.

## Bind a property directly to a join (external feedback token)

Instead of creating a variable with an external setter, a render property can bind straight
to a crestron join with `!crestron:type=<boolean|number|string>;name=<join>!` (see
06 §External feedback tokens). `name` is a join number or a text signal name, and may embed
`$`/`%`/`#ds` tokens (including item-relative `#ds:*.<path>#`) for dynamic joins. The same
`window.CrComLib.bridgeReceive*FromNative` calls above drive those tokens in Live
Preview / production; in the editor they stay literal (no live feedback).

```jsonc
"background": { "color": "!crestron:type=string;name=RoomName!" }
```

Usage patterns — direct property, dynamic join, through a subpage parameter, as a mode
selector, and rich-text tags (`<digital_fb>` / `<analog_fb>` / `<serial_fb>`) — are
collected in `06 §External feedback tokens` (§Feedback through parameters, §Feedback as a
mode selector, §Feedback patterns).

## Pitfalls

- `receiveStateChange` does **not** exist — neither in this codebase nor in
  `@crestron/ch5-crcomlib`. Calling it throws `TypeError: ... is not a function`
  (or, if typed as a bare name, `ReferenceError: X is not defined`).
- Always use the `window.` prefix; a bare `CrComLib` identifier throws
  `ReferenceError: CrComLib is not defined`.
- Works only where `useCrestron` is loaded and a crestron connector is active in the
  running project.
