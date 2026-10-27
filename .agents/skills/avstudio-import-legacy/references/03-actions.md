# 03 — Actions: old → new

Legacy: `action` in `avs-app/src/features/pages/pageTypes.ts`.
New: `Action` in `packages/types/src/_types.ts` (+ guide 05).

## Key renames

- **`uid` → `uuid`** — the editor writes `uuid` in files (type field name is
  `uid`). `onResponseOk`/`onResponseError` arrays reference other actions by
  that uuid.
- Actions missing a `uid` get a generated one.

## `behaviour`

| Legacy | New |
| --- | --- |
| `tap` | `onClick` |
| `hold` | `onHold` |
| `dbTap` | `onClick` + todo (no equivalent) |
| `onload` / `onexit` | `onLoad` / `onExit` |
| `onFocus`, `onBlur`, `onChange`, `beforeChange`, `afterChange`, `manual` | same |

## `type` (signal)

| Legacy | New |
| --- | --- |
| `d`, `a`, `s`, `r`, `v`, `p`, `o`, `co`, `f`, `post`, `put`, `get`, `delete`, `patch`, `audio`, `ws`, `mqtt` | same |
| `st` (internal state store) | **dropped** — no equivalent; `#name#` state tokens died with it |
| `amx-d` / `amx-a` / `amx-s` | mapped to `d`/`a`/`s` + todo (AMX routing changed) |
| `knx`, `joinMap` | new-only (not produced by conversion, except dpad → `joinMap`) |

## Targets and references

| Legacy | New |
| --- | --- |
| `pageFlipTarget: "<page uid>"` | `pageFlipTarget: 'pages/<Name>.page'` |
| `pageFlipTarget: '/'` | kept (`'/'` = start page) |
| `pageFlipTargetByName` | resolved to a path when the name is static; else todo |
| `overlayAttachedSubpage` (uid) | absolute page ref |
| `overlayAttachedSubpageName` | resolved to a path when static; else todo |
| `connectorUid` (connector uid) | `connectorUid: 'connectors/<Name>.<ext>'` |
| `attachedFunctionToRun` (modificator uid) | `attachedFunctionToRun: 'functions/<Name>.js'` |

`pageFlipTarget` and `overlayAttachedSubpage` are **absolute-only** in the new
model; relative refs are allowed only on `subpageName`.

## Overlay props kept

`overlayPlacement`, `overlayOffset`, `showMask`, `showCloseButton`,
`outsideClose`, `anyClickClose`, `useOverlayTimer`, `overlayTimer`.

## Overlay props dropped

`overlayWidth`, `overlayHeight`, `overlayBorder`, `overlayBackgroundColor`,
`overlayBackgroundBlur`, `overlayMaskBackgroundColor`, `useLocalMask`,
`localMaskSize` — overlay appearance is theme-driven; overlay size comes from
the attached page's `enableCustomPageSize` + `width`/`height` (see 06).

## Required fields per type (health-check mirror)

`d/a/s` → `signalName_signal` · `r` → `pageFlipTarget` · `v` →
`attachedVariableName` · `p` → `attachedParameterName` · `f` →
`attachedFunctionToRun` · `o` → `overlayAttachedSubpage` ·
`post/put/get/delete/patch/ws` → `connectorUid` · `mqtt` → `connectorUid` +
`mqttTopic` · `knx` → `connectorUid` + `knxDatapointId` · `joinMap` →
`buttonJoins` or `channelJoins`.

## Unchanged passthrough

`name`, `forceExecution`, `signalName_signal`, `signalName_signal2`,
`buttonJoins`, `channelJoins`, `attachedVariableName(2)`,
`attachedParameterName(2)`, `value` (numbers stringified), `listSignalStep`,
`digitalPushData`, `onChangeActionUseCustomValue`, `delay`, `pulseDelay`,
`requestUrl`, `onResponseOk/Error`, `audioLoop`, `audioSrcTargetByName`,
`audioVolumePercent`, `mqttRetain`, `mqttTopic(2)`.

Dropped: `amxPort`, `amxChannel`, `amxPort2`, `amxChannel2`.
