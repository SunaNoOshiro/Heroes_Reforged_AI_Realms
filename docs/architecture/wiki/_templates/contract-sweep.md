# Template — Per-screen Contract Sweep

Apply this template once per screen package, in one commit, when
folding the new cross-screen contracts into a screen. Doing all four
contracts together avoids re-editing the same files four times as the
contracts land.

The four contracts:

1. **Hotkey column** ([`ui-hotkeys.md`](../../ui-hotkeys.md))
2. **Modal stack** ([`ui-routing.md`](../../ui-routing.md))
3. **Gestures** ([`ui-gestures.md`](../../ui-gestures.md))
4. **ErrorState** ([`error-state.schema.json`](../../../../content-schema/schemas/error-state.schema.json))

## Per-file Edits

### `interactions.md`

- [ ] Add a `Hotkey` column to the Actions table. Reference an entry
      id from
      [`hotkey/global-default.hotkey.json`](../../../../content-schema/examples/records/hotkey/global-default.hotkey.json)
      or document a deliberate mouse-only action in AI Implementation
      Notes.
- [ ] Replace any "press X to open Y" prose with canonical gesture
      names from [`ui-gestures.md`](../../ui-gestures.md): `click`,
      `double-click`, `right-click`, `long-press`, `drag`,
      `dragstart`, `dragmove`, `dragend`.
- [ ] If the screen is a modal: add an explicit Esc row matching its
      `severity` per the dismissal table in
      [`ui-routing.md` § Dismissal Policy](../../ui-routing.md#dismissal-policy).
- [ ] If the screen owns drop targets: declare an `accepts` column
      listing the `DragKind` values it accepts.

### `data-contracts.md`

- [ ] If the screen renders errors: add
      [`error-state.schema.json`](../../../../content-schema/schemas/error-state.schema.json)
      to the **Content Schemas And Registries** table and type
      `errors.*` bindings as `ErrorState[]`.
- [ ] If the screen is a modal: add
      [`modal-entry.schema.json`](../../../../content-schema/schemas/modal-entry.schema.json)
      to the table and replace per-screen `callerRoute` bindings with
      `state.ui.modalStack[top].callerRoute`.

### `spec.md`

- [ ] Update **State Bindings** to read `state.ui.modalStack[top].*`
      instead of `state.ui.<name>.callerRoute` when applicable.
- [ ] Add `focusOrder: int` to every interactive control in the
      **Component Tree**.

## Sweep Order

1. **Modal-using screens** first
   (`09`, `20`, `25`, `37`, `40`, `41`, `48`, `51`, `52`, `54`, `60`).
2. **Drag-using screens** next
   (`46-hero-screen`, `51-split-stack-dialog`, `52-artifact-combine-dialog`,
   `26-marketplace`, `36-marketplace-artifact-trading`).
3. **Tooltip-using screens**
   (`18-map-object-tooltip`, `19-status-bar`, `38-combat-screen`,
   `46-hero-screen`, `47-spell-book`, `50-creature-info`).
4. **Remaining screens** for the Hotkey column.

After each batch, run `npm run generate:wiki` and `npm run validate`.
