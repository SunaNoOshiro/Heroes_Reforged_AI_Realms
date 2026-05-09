# Autoplay Policy

> Companion to [`docs/architecture/wiki/screens/01-main-menu/`](./wiki/screens/01-main-menu/),
> [`docs/architecture/wiki/screens/05-intro-cinematic/`](./wiki/screens/05-intro-cinematic/),
> and [`docs/architecture/animation-contract.md`](./animation-contract.md).
>  introduces this contract to handle the "Autoplay
> surprise" risk and align with browser autoplay-mute defaults.

## 1. Rule

Until the **first user gesture** on `01-main-menu` (any
`pointerdown`, `keydown`, or `touchstart`):

- All `<audio>` and `<video>` elements load `muted`.
- All animations honor `prefers-reduced-motion`.
- The audio context is **not** unlocked.
- The intro cinematic does not autoplay; it shows a click-to-play card
  per [`05-intro-cinematic/spec.md`](./wiki/screens/05-intro-cinematic/spec.md).

The first qualifying gesture dispatches `UNLOCK_MEDIA_AUTOPLAY` which
sets `state.runtime.media.unlocked = true` and resumes the audio
context. Subsequent transitions ignore the gate.

## 2. Cinematic Constraint

The intro cinematic asset MUST tolerate a muted first frame: no
critical audio cues in the first second. The `05-intro-cinematic`
package is the canonical source of the asset spec; if that screen is
revised, this document moves with it.

## 3. Reduced-Motion Hook

Reduced-motion is governed by
[`animation-contract.md`](./animation-contract.md) and the per-screen
contract in
[`docs/architecture/ui-frame-lag-contract.md`](./ui-frame-lag-contract.md).
This document only restates the gate: until first gesture, animations
behave as if `prefers-reduced-motion: reduce` is set, regardless of the
user's OS preference.

## 4. CI Enforcement

A CI lint scans `src/` for direct calls to:

- `HTMLMediaElement.play` outside an `unlockMedia` helper that
  inspects `state.runtime.media.unlocked`.
- `new Audio(...).play` direct invocations.
- `AudioContext.resume` outside the unlock helper.

Each match must import the unlock helper or carry an explicit
allowlist annotation.

## 5. Cross-Cuts

- **Onboarding**: `76-onboarding-consent` is reachable before the
  first gesture is registered, but it never plays media; only
  `01-main-menu` and `05-intro-cinematic` rely on the unlock.
- **Save / replay**: `state.runtime.media.unlocked` is presentation-only
  and never enters saves, replays, or the canonical state hash.
