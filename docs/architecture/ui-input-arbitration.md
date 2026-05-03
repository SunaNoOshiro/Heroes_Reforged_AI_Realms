# UI Input Arbitration

The deterministic contract for resolving input conflicts: click +
hotkey races, drag-in-progress + Esc, end-turn during AI animation,
modal opens during tooltip fade, and double-click vs. debounce. The
reducer is synchronous and the network transport (M5 lockstep) is
deterministic; that means the UI shell, not the engine, is the
arbiter — and it has to make the same choices on every client.

> Companions:
> - [`ui-state-contract.md` § Command Lifecycle](ui-state-contract.md#command-lifecycle)
>   for the four phases.
> - [`ui-gestures.md`](ui-gestures.md) for gesture detection thresholds.
> - [`ui-routing.md` § Modal Stack](ui-routing.md#modal-stack) for stack
>   push/pop semantics.

---

## Single-emit Rule

**Every input gesture emits at most one command.** A gesture starts at
`pointerdown` / `keydown` and ends at `pointerup` / `keyup` (touch:
`touchstart` / `touchend`).

The DOM shell holds a per-control debounce token:

```text
debounceUntil[controlId] = now + ruleset.ui.timing.inputDebounceMs   // default 50 ms
```

While `now < debounceUntil[controlId]`, additional gestures targeting
the same control are silently dropped. The token clears on
`pointerup` and on `keyup`, whichever is later.

**Why this rule:** the reducer is pure and synchronous, but
`requestAnimationFrame` and the React batching layer can deliver two
events in the same logical "frame". A click + keyboard activation on
the same End Turn control would otherwise dispatch two
`END_HERO_TURN` commands, producing a divergent command log between
two M5 peers — both clients see the same input, but one peer's
batching coalesces the events and the other's does not. The single-emit
gate makes the dispatcher's input identical regardless of modality.

The numeric `inputDebounceMs` constant lives in
[`ruleset.schema.json` § ui.timing](../../content-schema/schemas/ruleset.schema.json)
so QA can tune it without a code change.

---

## Modality Precedence

When a click and a hotkey fire on the same control within the same
frame, the **first** one (by browser-event timestamp) wins. The second
hits the debounce gate and is dropped. The dropped event is logged
through the telemetry sink with `code: "ui.input.coalesced"` and
`severity: "info"` so we can detect runaway races during playtest.

There is no "modality wins" rule (e.g. mouse > keyboard) because that
would let a single physical action fire two commands depending on
which modality the player happens to use. First-event-wins is the
only deterministic answer.

---

## Animation Gate

`state.ui.animations.activeTimelineId` is the canonical
"animation in flight" slot. While it is non-null, the dispatcher
rejects every turn-affecting command with
`code: "ui.input.animationInFlight"`, `severity: "warn"`,
`messageKey: "ui.errors.waitForCurrentTurn"`:

- `END_HERO_TURN`
- `END_DAY`
- `BATTLE_ATTACK`
- `BATTLE_MOVE`
- `BATTLE_WAIT`
- `BATTLE_DEFEND`
- `SPELL_CAST`
- `AUTO_RESOLVE_BATTLE`

Hover, tooltip, and modal-open commands are **not** gated — the player
can still inspect state mid-animation. The gate is a guard, not a
freeze; rejection is loud (a localized warning) so the user knows why
their input was dropped.

The maximum animation duration is bounded by
`ruleset.ui.timing.endTurnAnimationMaxMs` (default `4000`). If the
renderer fails to clear `activeTimelineId` within the bound, the gate
auto-clears and emits a `severity: "error"` telemetry record so we can
trace runaway animations.

---

## Esc Precedence Ladder

`Escape` is the universal "step back" key, and several layers compete
for it. The shell resolves them in this strict order (top first):

1. **Cancel an active drag.** If `state.ui.drag.sourceId` is set,
   clear all `state.ui.drag.*` slots and emit
   `feedback.drag.cancel`. Esc does nothing else this frame.
2. **Close the top modal.** If `state.ui.modalStack.length > 0`, apply
   the dismissal policy from
   [`ui-routing.md` § Dismissal Policy](ui-routing.md#dismissal-policy)
   for the top entry's `severity` and pop the stack accordingly.
3. **Close a pinned tooltip.** If `state.ui.tooltips.pinnedObjectId`
   is set, clear it and play `tooltipFadeOutMs`.
4. **Open the system menu.** Push `54-system-menu` onto the modal
   stack with `severity: "system"`.

Each layer that fires consumes the keystroke; lower layers do not run.
Implementations MUST keep this ladder identical across modalities — a
controller "B" button or a touch back-swipe maps to the same ladder.

---

## Drag Cancellation

Pressing Esc during a drag clears all `state.ui.drag.*` slots and
emits `feedback.drag.cancel`. The drop target highlight clears in the
same frame. The drag never produces a command (drops are commands;
cancels are not), so there is no replay-divergent input.

If the user releases the pointer over a non-accepting target, the
shell treats it as a cancel — same drag-clear, same feedback — and
again no command is emitted. Drop acceptance is governed by the
`accepts: DragKind[]` array per drop target in
[`ui-gestures.md` § Drop Acceptance](ui-gestures.md#drop-acceptance).

---

## Replay Safety

Every command goes through the same dispatch path:

```text
gesture → debounce → animation gate → MODAL_* / drag check → reducer
```

Click, keyboard activation, touch tap, and gamepad confirm all enter
this pipeline at the same point. The command emitted is identical
regardless of input modality, so the command log is identical across
peers and across replays. M5 lockstep
([`ui-frame-lag-contract.md`](ui-frame-lag-contract.md)) depends on
this property.

The `state.ui.input.activeModality` slot
([`ui-input-modalities.md`](ui-input-modalities.md)) is updated for
visual affordances only — it is part of `state.ui.*` and never enters
the command log.

---

## Related Diagram

A full sequence diagram of the click + hotkey race through the
debounce token lives at
[`diagrams/29-input-arbitration.md`](diagrams/29-input-arbitration.md).

---

## Related Docs

- [`overview.md`](overview.md) — architecture index
- [`determinism.md`](determinism.md) — single-emit per gesture is the
  UI-side analogue of "no async timing in deterministic paths"
- [`state-flow.md`](state-flow.md) — turn loop and reducer cadence
- [`ui-state-contract.md`](ui-state-contract.md) — command lifecycle
  and animation slot
- [`ui-gestures.md`](ui-gestures.md) — gesture taxonomy
- [`ui-routing.md`](ui-routing.md) — modal stack push/pop
- [`wiki/README.md`](wiki/README.md) — `interactions.md` MUST declare
  any animation gates that diverge from the defaults above
