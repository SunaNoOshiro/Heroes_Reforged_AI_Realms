# Touch + Keyboard + Gamepad Input Modalities

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Land [`docs/architecture/ui-input-modalities.md`](../../../docs/architecture/ui-input-modalities.md):
the per-modality contracts for mouse (baseline), touch (44 × 44 px
minimum tap targets, long-press → right-click bridge, viewport-only
pinch/pan), keyboard (parity through the hotkey registry), and
gamepad (Phase 2 — namespace reserved). Tablet is an MVP target,
but per-screen tap-target floors and touch interaction contracts
are unspecified today, and there is no reserved slot for gamepad
support.

Source audit:
[`docs/readiness-audit/03-ui-state-and-interactions.md`](../../../docs/readiness-audit/03-ui-state-and-interactions.md)
(Q57, Issue 3.A-10).

Read First:
- [`docs/implementation-plans/03-ui-state-and-interactions-plan.md`](../../../docs/implementation-plans/03-ui-state-and-interactions-plan.md)
- [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)
- [`docs/architecture/ui-renderer-seam.md`](../../../docs/architecture/ui-renderer-seam.md)
- [`docs/architecture/ui-gestures.md`](../../../docs/architecture/ui-gestures.md)
- [`docs/architecture/ui-hotkeys.md`](../../../docs/architecture/ui-hotkeys.md)
- [`docs/architecture/ui-input-arbitration.md`](../../../docs/architecture/ui-input-arbitration.md)
- `docs/architecture/wiki/screens/07-adventure-map/spec.md`
- `docs/architecture/wiki/screens/24-town-screen/spec.md`

Inputs:
- Audit Q57 in
  [`docs/readiness-audit/03-ui-state-and-interactions.md`](../../../docs/readiness-audit/03-ui-state-and-interactions.md)
- The Component State Matrix host doc anchor
  ([`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md))
  for the `state.ui.input.activeModality` slot

Outputs:
- `docs/architecture/ui-input-modalities.md`

Owned Paths:
- `docs/architecture/ui-input-modalities.md`

Dependencies:
- mvp.07-ui-shell.16-gesture-taxonomy

Acceptance Criteria:
- The contract reserves `state.ui.input.activeModality:
  "mouse" | "touch" | "keyboard" | "gamepad"` and lists it under
  the Command Lifecycle state slot inventory in
  [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md).
- Touch contract pins a minimum tap-target size of 44 × 44 px;
  long-press maps to right-click; pinch and pan are viewport-only.
- Keyboard parity defers to
  [`docs/architecture/ui-hotkeys.md`](../../../docs/architecture/ui-hotkeys.md)
  for bindings, focus order, tab-trap, and focus restoration.
- Gamepad scope is explicitly Phase 2: the `gamepad.*` hotkey-id
  namespace and the `activeModality = "gamepad"` value are
  reserved; the binding map is a placeholder pointing at
  `tasks/phase-2/07-ui-screen-backlog/`.
- A modality-bridging table maps mouse / touch / keyboard / gamepad
  onto the canonical gesture vocabulary from
  [`docs/architecture/ui-gestures.md`](../../../docs/architecture/ui-gestures.md).
- [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)
  links to this modalities doc.

Verify:
- npm run validate:links
- npm run validate:tasks
- npm run validate

Estimated Time:
- 3 hours
