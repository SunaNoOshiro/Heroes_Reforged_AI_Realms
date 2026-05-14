# Autoplay Policy

> Companion to
> [`docs/architecture/wiki/screens/01-main-menu/`](./wiki/screens/01-main-menu/),
> [`docs/architecture/wiki/screens/05-intro-cinematic/`](./wiki/screens/05-intro-cinematic/),
> and [`docs/architecture/animation-contract.md`](./animation-contract.md).

This contract addresses the "autoplay surprise" risk and aligns the
shell with browser autoplay-mute defaults: until the player produces
a deliberate input on the boot screen, no sound plays and no
animation runs.

---

## 1. Rule

Until the **first user gesture** on `01-main-menu` (any
`pointerdown`, `keydown`, or `touchstart`):

- All `<audio>` and `<video>` elements load `muted`.
- All animations honor `prefers-reduced-motion` regardless of OS
  preference (see § 3).
- The audio context is **not** unlocked.
- The intro cinematic does not autoplay; it shows a click-to-play
  card per
  [`05-intro-cinematic/spec.md`](./wiki/screens/05-intro-cinematic/spec.md).

The first qualifying gesture dispatches `UNLOCK_MEDIA_AUTOPLAY`
(local-ui; registered in
[`command-schema.md`](./command-schema.md)), which sets
`state.runtime.media.unlocked = true` and resumes the audio context.
Subsequent transitions ignore the gate.

---

## 2. Cinematic Constraint

The intro cinematic asset MUST tolerate a muted first frame: no
critical audio cues in the first second. The
[`05-intro-cinematic`](./wiki/screens/05-intro-cinematic/) package
is the canonical source of the asset spec; if that screen is
revised, this document moves with it.

---

## 3. Reduced-Motion Hook

Reduced-motion is governed by
[`animation-contract.md`](./animation-contract.md) and the per-screen
contract in
[`ui-frame-lag-contract.md`](./ui-frame-lag-contract.md). This
document only restates the gate: until the first gesture, animations
behave as if `prefers-reduced-motion: reduce` is set, regardless of
the user's OS preference.

---

## 4. CI Enforcement

A CI lint scans `src/` for direct calls to:

- `HTMLMediaElement.play` outside an `unlockMedia` helper that
  inspects `state.runtime.media.unlocked`.
- `new Audio(...).play` direct invocations.
- `AudioContext.resume` outside the unlock helper.

Each match must import the unlock helper or carry an explicit
allowlist annotation.

---

## 5. Cross-Cuts

- **Onboarding.** [`76-onboarding-consent`](./wiki/screens/76-onboarding-consent/)
  is reachable before the first gesture is registered, but it never
  plays media; only `01-main-menu` and `05-intro-cinematic` rely on
  the unlock.
- **Save / replay.** `state.runtime.media.unlocked` is
  presentation-only — never persisted, never serialized into the
  command log, never part of the canonical state hash. No
  [`data-inventory.md`](./data-inventory.md) row is required.
- **New-install defaults.** The two rows for `prefers-reduced-motion`
  (system honored until first gesture) and media autoplay (muted
  until first gesture) live in
  [`new-install-defaults.md`](./new-install-defaults.md) and link
  back here as canonical.

---

## 🔍 Sync Check

- **UI: ⚠** — Spec / interactions / data-contracts files for both
  [`01-main-menu`](./wiki/screens/01-main-menu/) and
  [`05-intro-cinematic`](./wiki/screens/05-intro-cinematic/) do not
  mention the first-gesture gate, the `UNLOCK_MEDIA_AUTOPLAY`
  command, or the click-to-play card; only the package `mockup.html`
  files apply `@media (prefers-reduced-motion: reduce)` CSS. Detail
  in Issues.
- **Schema: ✔** — No schemas referenced. The command
  `UNLOCK_MEDIA_AUTOPLAY` is registered in
  [`command-schema.md`](./command-schema.md) (line 690) as
  `local-ui` with the same effect described here.
- **Tasks: ⚠** — No task `.md` under `tasks/` references this doc or
  the `UNLOCK_MEDIA_AUTOPLAY` command. The runtime owner (the lint,
  the unlock helper, the click-to-play card) has no scheduled task.
  Detail in Issues.

## ⚠ Issues

- **`UNLOCK_MEDIA_AUTOPLAY` and the click-to-play card are missing
  from the `01-main-menu` and `05-intro-cinematic` package files.**
  This doc says the first gesture on `01-main-menu` dispatches
  `UNLOCK_MEDIA_AUTOPLAY`, and that `05-intro-cinematic` shows a
  click-to-play card pre-unlock. Neither claim is reflected in
  [`01-main-menu/interactions.md`](./wiki/screens/01-main-menu/interactions.md)
  (Actions table covers New Game / Load Game / High Score / Credits
  / Quit / Privacy only),
  [`05-intro-cinematic/interactions.md`](./wiki/screens/05-intro-cinematic/interactions.md)
  (Actions: `cinematic.skip`, `cinematic.complete`,
  `cinematic.subtitles` only), nor either screen's `data-contracts.md`.
  Per `.agents/rules/ui.md` ("Read all five together when
  implementing a screen"), the gate must surface in the screen
  package or the implementer will miss it. Suggested values: add an
  `mainMenu.firstGestureUnlock` action row to
  `01-main-menu/interactions.md` (`Type: local-ui`,
  `Command: UNLOCK_MEDIA_AUTOPLAY`, `Data Updated:
  state.runtime.media.unlocked = true`); add a `ClickToPlayCard`
  component and `intro.unlockAndPlay` action to
  `05-intro-cinematic/spec.md` + `interactions.md`. Skill did not
  edit the screen packages (anti-cheat rule D — the audit reads
  cross-checked files but does not write them).
- **CI lint described in § 4 has no implementing script.** A Grep of
  `scripts/` finds no file that scans `src/` for `HTMLMediaElement.play`
  / `new Audio(...).play` / `AudioContext.resume`, and
  `scripts/check-repo-contracts.mjs` does not cover those patterns.
  `src/` does not yet contain any `unlockMedia` helper either. The
  rule is correctly stated as a forward-looking contract, so this is
  not a doc defect; it is a missing runtime task. Per CLAUDE.md
  ("Failures fail `npm run validate`"), the lint must exist before
  any audio/video playback code lands. Suggested values: add a UI
  task under `tasks/mvp/07-ui-shell/` that owns
  `scripts/check-autoplay-policy.mjs`, the `unlockMedia` helper at
  `src/ui/unlockMedia.ts`, and the click-to-play card at
  `src/ui/cinematic/ClickToPlayCard.tsx`; cite this doc in its
  *Read First*. Skill did not create the task (anti-cheat rule B —
  never invent features; D — never edit cross-checked files).
- **Doc not listed in [`INDEX.md`](./INDEX.md).** The architecture
  index is selective by design, but `autoplay-policy.md` is the
  canonical source for two rows in `new-install-defaults.md` and is
  the only home for the `UNLOCK_MEDIA_AUTOPLAY` rule. The "UI
  surface" cluster (entries 11–28) is the natural home if the index
  owner wants to surface it. Not CI-blocking. Skill did not edit
  `INDEX.md` (anti-cheat rule D).
