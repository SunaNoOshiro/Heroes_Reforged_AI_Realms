# UI Input Modalities

Per-modality contracts for mouse, touch, keyboard, and gamepad. The
gesture taxonomy itself lives in [`ui-gestures.md`](ui-gestures.md);
this file pins the bridging rules — how each modality maps onto the
canonical gestures, the minimum tap-target size, the active-modality
slot, and the Phase 2 gamepad scope.

> Companions:
> - [`ui-input-arbitration.md`](ui-input-arbitration.md) — single-emit,
>   first-event-wins, animation gates that apply uniformly across
>   modalities.
> - [`ui-hotkeys.md`](ui-hotkeys.md) — keyboard registry, focus order,
>   tab-trap, focus restoration.
> - [`ui-renderer-seam.md`](ui-renderer-seam.md) — pinch / pan / wheel
>   routing into the canvas viewport.

---

## Active Modality Slot

`state.ui.input.activeModality: "mouse" | "touch" | "keyboard" | "gamepad"`
holds the most-recently-used modality. The shell updates the slot on
every input event (mouse move, touch, keypress, gamepad axis past
deadzone). It drives visual affordances only — focus rings on
`keyboard`, larger tap targets on `touch`, controller glyphs on
`gamepad` — and never enters the command log, saves, or replays.

The slot is registered under `state.ui.*` in
[`ui-state-contract.md` § State Slot Inventory (UI-owned)](ui-state-contract.md#state-slot-inventory-ui-owned).

---

## Mouse

The baseline modality. Every gesture in
[`ui-gestures.md`](ui-gestures.md) is defined first against mouse
input; touch, keyboard, and gamepad bridge onto it. No special
bridging rules — mouse-event names map 1:1 to the gesture FSM.

---

## Touch

Tablets are an MVP target per
[`renderer-technology-choice.md`](renderer-technology-choice.md). The
following bridging rules MUST hold:

- **Minimum tap-target size: 44 × 44 px.** Every DOM-overlay control
  (buttons, list rows, panel controls) declares this as a floor.
  Smaller hit-test regions on the canvas ride through the seam
  adapter ([`ui-renderer-seam.md`](ui-renderer-seam.md)). The floor
  matches the WCAG 2.5.5 Target Size criterion and the iOS / Android
  HIG defaults.
- **Long-press maps to right-click / context.** A touch hold of
  ≥ `longPressMs` (default `600`) emits the same `right-click` /
  `context` event a mouse secondary-button press would, per
  [`ui-gestures.md` § `right-click` / `context`](ui-gestures.md#right-click--context).
- **Pinch and pan are viewport-only.** Map zoom and scroll route
  through the canvas seam; DOM panels do not consume these gestures.
- **Tap honors `dragThresholdPx`.** A touch that moves more than the
  threshold during press becomes a drag, not a tap, per
  [`ui-gestures.md` § `drag`](ui-gestures.md#drag).

Per-screen `data-contracts.md` for buttons and list controls MUST
list the `min-tap-target: 44px` property; the per-screen contract
sweep ([`mvp.07-ui-shell.13-screen-package-contract-sweep`](../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md))
adds it where missing.

---

## Keyboard

Keyboard parity is required for every screen. The hotkey registry
([`ui-hotkeys.md`](ui-hotkeys.md)) plus its focus-order, tab-trap,
and focus-restoration rules cover the keyboard surface in full.

Keyboard events enter the same single-emit pipeline as mouse and
touch; a key-equivalent bound to a control fires the same command
via the same dispatch path
([`ui-input-arbitration.md` § Single-emit Rule](ui-input-arbitration.md#single-emit-rule)).

---

## Gamepad (Phase 2 scope)

Gamepad support is deferred to Phase 2. The MVP commitment is:

- Reserve the `gamepad.*` hotkey-id namespace. Future gamepad
  bindings land as hotkey-registry entries with `scope: "global"` or
  `scope: "screen"`.
- Reserve `state.ui.input.activeModality = "gamepad"`. The shell
  does not emit it in MVP; selectors and renderers MUST handle it
  without crashing.
- The Phase 2 task that builds the actual binding map and
  analog-stick contract is a placeholder pointing at
  [`tasks/phase-2/07-ui-screen-backlog/`](../../tasks/phase-2/07-ui-screen-backlog/).
  Until then, plugging in a gamepad on a Phase 2 build does nothing.

No gamepad-specific code or data lands in MVP. Reserving the namespace
keeps Phase 2 a contract extension instead of a contract rewrite.

---

## Modality Bridging Summary

| Mouse                 | Touch                  | Keyboard                  | Gamepad (Phase 2)         |
| --------------------- | ---------------------- | ------------------------- | ------------------------- |
| `click`               | tap                    | `Enter` on focused        | `A` / confirm             |
| `right-click`         | `long-press`           | `Shift+F10` / context key | `Y` / context             |
| `double-click`        | double-tap             | `Enter` twice             | `A` twice                 |
| `drag`                | drag (after threshold) | not bound                 | left stick + `A` (Phase 2)|
| `wheel` (viewport)    | pinch / pan (viewport) | arrow keys (panning)      | right stick (Phase 2)     |
| hover                 | hold without movement  | focus                     | controller focus          |

Hover on touch is approximated by a `feedback.long-press.start`
preview frame so anchored tooltips can still surface their public
info.

---

## Related Docs

- [`overview.md`](overview.md) — architecture index
- [`renderer-technology-choice.md`](renderer-technology-choice.md) —
  tablet / desktop browser scope
- [`ui-state-contract.md`](ui-state-contract.md) — `activeModality`
  slot in the state inventory
- [`ui-gestures.md`](ui-gestures.md) — canonical gesture names
- [`ui-input-arbitration.md`](ui-input-arbitration.md) — first-event
  wins across modalities
- [`ui-renderer-seam.md`](ui-renderer-seam.md) — viewport gesture
  routing

---

## 🔍 Sync Check

- **UI: ⚠** — No `wiki/screens/*/data-contracts.md` currently carries the `min-tap-target: 44px` row this doc mandates; the gap is meant to close via [`mvp.07-ui-shell.13-screen-package-contract-sweep`](../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md), but that task's Acceptance Criteria do not yet enumerate the tap-target row. See Issues.
- **Schema: ✔** — `longPressMs`, `dragThresholdPx`, `doubleClickWindowMs` are defined under `ui.timing` in [`ruleset.schema.json`](../../content-schema/schemas/ruleset.schema.json) with baselines (`600` / `8` / `400`) matching [`ui-gestures.md`](ui-gestures.md); `state.ui.input.activeModality` is a UI-only slot excluded from saves/replays per [`ui-routing.md` § Save / Replay Rule](ui-routing.md#save--replay-rule), so no `data-inventory.md` row is required.
- **Tasks: ✔** — Doc is owned by [`mvp.07-ui-shell.19-input-modalities`](../../tasks/mvp/07-ui-shell/19-input-modalities.md); every Acceptance Criterion (44 × 44 px floor, long-press → right-click, viewport-only pinch/pan, gamepad namespace reservation, modality-bridging table, renderer-technology-choice reciprocal link) is covered by this file; [`renderer-technology-choice.md`](renderer-technology-choice.md) links back to this doc in its *Related Files* block.

## ⚠ Issues

- **Per-screen sweep does not yet enumerate the `min-tap-target: 44px` row.** This doc states "the per-screen contract sweep adds it where missing", but [`mvp.07-ui-shell.13-screen-package-contract-sweep`](../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md) Acceptance Criteria list only the Animation Contract, `Hotkey` column, modal-stack bindings, canonical gesture vocabulary, and `ErrorState` typing — `min-tap-target` is absent. Per [`.agents/rules/tasks.md`](../../.agents/rules/tasks.md) (every described logic must have a task) the sweep task should add an Acceptance Criterion: "every `data-contracts.md` for screens with interactive controls lists `min-tap-target: 44px` for buttons and list rows (per [`ui-input-modalities.md`](../../docs/architecture/ui-input-modalities.md#touch))". Skill did not edit the sweep task (Hard Prohibition D — never edit cross-checked files).
- **Phase 2 gamepad placeholder points at a directory, not a task.** This doc and the owning task's Acceptance Criterion 4 both deliberately defer the gamepad binding map to a placeholder at [`tasks/phase-2/07-ui-screen-backlog/`](../../tasks/phase-2/07-ui-screen-backlog/); the directory holds per-screen backlog tasks, none of which own the gamepad binding map or analog-stick contract. Not CI-blocking — the placeholder is by design — but readers entering Phase 2 will need a real task id once the binding map work is scoped. Owner: a Phase 2 task-curation pass should mint `phase-2.07-ui-screen-backlog.NN-gamepad-binding-map` (or similar) before the gamepad surface opens.
