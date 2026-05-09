# Input Arbitration Contract

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Land the deterministic contract for resolving input conflicts: the
single-emit-per-gesture rule, the per-control debounce token,
first-event-wins on click + hotkey races, the animation gate
(`state.ui.animations.activeTimelineId`), the Esc precedence ladder
(drag → modal → tooltip → system menu), and drag cancellation.
Without this contract, a click + Enter on the End Turn control
dispatches `END_HERO_TURN` twice — producing a divergent command
log between two M5 lockstep peers — and Esc behavior fragments
across screens.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/ui-frame-lag-contract.md`](../../../docs/architecture/ui-frame-lag-contract.md)
- [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
- [`docs/architecture/wiki/README.md`](../../../docs/architecture/wiki/README.md)

Inputs:
- The synchronous reducer contract in
  [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- Existing `state.ui.drag.*` and `state.ui.tooltips.*` slot usage
  across screen packages

Outputs:
- `docs/architecture/ui-input-arbitration.md`
- `docs/architecture/diagrams/29-input-arbitration.md`
- `docs/architecture/diagrams/index.json` (additive entry)

Owned Paths:
- `docs/architecture/ui-input-arbitration.md`
- `docs/architecture/diagrams/29-input-arbitration.md`

Dependencies:
- None

Acceptance Criteria:
- The contract declares the single-emit rule, the per-control
  `debounceUntil[controlId]` token using
  `ruleset.ui.timing.inputDebounceMs`, and the first-event-wins
  modality precedence.
- The animation gate rejects `END_HERO_TURN`, `END_DAY`,
  `BATTLE_ATTACK`, `BATTLE_MOVE`, `BATTLE_WAIT`, `BATTLE_DEFEND`,
  `SPELL_CAST`, and `AUTO_RESOLVE_BATTLE` while
  `state.ui.animations.activeTimelineId` is non-null. Hover and
  modal-open commands are not gated.
- The Esc precedence ladder runs in this strict order: cancel
  active drag → close top modal → close pinned tooltip → open
  system menu. Each fired layer consumes the keystroke; lower
  layers do not run.
- Drag cancellation clears `state.ui.drag.*` and emits
  `feedback.drag.cancel` without dispatching a command.
- The diagram at `diagrams/29-input-arbitration.md` shows a click +
  hotkey race through the debounce token and the animation gate.
- `docs/architecture/determinism.md` includes a forward link to
  this contract under "Single-emit Per Input Gesture".
- `docs/architecture/state-flow.md` cross-references the animation
  gate.

Verify:
- npm run validate:links
- npm run validate:tasks
- npm run validate

Estimated Time:
- 4 hours
