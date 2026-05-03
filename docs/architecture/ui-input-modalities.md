# UI Input Modalities

Per-modality contracts for mouse, touch, keyboard, and gamepad. The
gesture taxonomy itself is in [`ui-gestures.md`](ui-gestures.md);
this file pins the bridging rules — how each modality maps onto the
canonical gestures, the minimum tap-target size, the active-modality
slot, and the Phase 2 gamepad scope.

> Companions:
> - [`ui-input-arbitration.md`](ui-input-arbitration.md) — single-emit,
>   first-event-wins, animation gates that apply uniformly across
>   modalities.
> - [`ui-hotkeys.md`](ui-hotkeys.md) — keyboard registry and focus
>   order.
> - [`ui-renderer-seam.md`](ui-renderer-seam.md) — pinch / pan / wheel
>   routing into the canvas viewport.

---

## Active Modality Slot

`state.ui.input.activeModality: "mouse" | "touch" | "keyboard" | "gamepad"`
holds the most-recently-used modality. The shell updates the slot on
every input event (mouse move, touch, keypress, gamepad axis past
deadzone). The slot drives visual affordances only — focus rings on
`keyboard`, larger tap targets on `touch`, controller glyphs on
`gamepad` — and never enters the command log or saves.

The slot is part of the global UI state inventory in
[`ui-state-contract.md` § Command Lifecycle](ui-state-contract.md#state-slot-inventory-ui-owned).

---

## Mouse

The baseline modality. Every gesture in
[`ui-gestures.md`](ui-gestures.md) is defined first against mouse
input; touch and gamepad bridge through. No special bridging rules —
mouse-event names map 1:1 to the gesture FSM.

---

## Touch

Tablets are an MVP target per
[`renderer-technology-choice.md`](renderer-technology-choice.md). The
following bridging rules MUST hold:

- **Minimum tap-target size: 44 × 44 px.** Every interactive control
  declares this as a floor; smaller hit-test regions on the canvas
  ride through the seam adapter
  ([`ui-renderer-seam.md`](ui-renderer-seam.md)) but the DOM overlay
  must enforce 44 px on every button, list row, and panel control.
  This matches the WCAG 2.5.5 "Target Size" floor and the iOS / Android
  HIG defaults.
- **Long-press maps to right-click / context.** A touch hold of
  ≥ `longPressMs` (default `600`) emits the same `right-click` /
  `context` event a mouse secondary-button press would.
- **Pinch and pan are viewport-only.** Map zoom and scroll route
  through the canvas seam; UI panels do not consume these gestures.
- **Tap honors `dragThresholdPx`.** A touch that moves more than the
  threshold during press becomes a drag, not a tap.

`data-contracts.md` for buttons and list controls MUST list the
`min-tap-target: 44px` property; the per-screen sweep adds it where
missing.

---

## Keyboard

Keyboard parity is required for every screen. The hotkey registry
([`ui-hotkeys.md`](ui-hotkeys.md)) plus the focus-order /
tab-trap / focus-restoration rules cover the keyboard surface.

Keyboard events enter the same single-emit pipeline as mouse and
touch; a key-equivalent bound to a control fires the same command via
the same dispatch path.

---

## Gamepad (Phase 2 scope)

Gamepad support is deferred to Phase 2. The MVP commitment is:

- Reserve the `gamepad.*` hotkey-id namespace. New gamepad bindings
  land as registry entries with `scope: "global"` or
  `scope: "screen"`.
- Reserve the `state.ui.input.activeModality = "gamepad"` value. The
  shell does not emit it in MVP; selectors and renderers MUST handle
  it without crashing.
- The Phase 2 task that builds the actual binding map and analog-stick
  contract is
  [`tasks/phase-2/07-ui-screen-backlog/`](../../tasks/phase-2/07-ui-screen-backlog/).
  Until then, plugging in a gamepad on a Phase 2 build does nothing.

No gamepad-specific code or data lands in MVP. Reserving the namespace
keeps Phase 2 a contract extension instead of a contract rewrite.

---

## Modality Bridging Summary

| Mouse                 | Touch                  | Keyboard                  | Gamepad (Phase 2)        |
| --------------------- | ---------------------- | ------------------------- | ------------------------ |
| `click`               | tap                    | `Enter` on focused        | `A` / confirm            |
| `right-click`         | `long-press`           | `Shift+F10` / context key | `Y` / context            |
| `double-click`        | double-tap             | `Enter` twice             | `A` twice                |
| `drag`                | drag (after threshold) | not bound                 | left stick + `A` (Phase 2)|
| `wheel` (viewport)    | pinch / pan (viewport) | arrow keys (panning)      | right stick (Phase 2)    |
| hover                 | hold without movement  | focus                     | controller focus         |

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
