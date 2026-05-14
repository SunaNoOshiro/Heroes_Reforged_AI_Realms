# Template — Per-screen Contract Sweep

Per-screen checklist for folding the four cross-screen contracts into
a screen package in one coordinated commit. The four contracts touch
the same three files (`spec.md`, `interactions.md`,
`data-contracts.md`); applying them in one pass avoids re-editing
each file four times as the contracts land.

> Companion templates:
> - [`animation-states.md`](animation-states.md) — seven-state
>   Animation Contract sweep. Do not batch with this sweep.
>
> Owners:
> - Template + per-screen application:
>   [`tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md`](../../../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md).

---

## 1. The Four Contracts

| # | Contract     | Source of truth |
|---|--------------|-----------------|
| 1 | Hotkey column | [`ui-hotkeys.md`](../../ui-hotkeys.md) |
| 2 | Modal stack   | [`ui-routing.md`](../../ui-routing.md) |
| 3 | Gestures      | [`ui-gestures.md`](../../ui-gestures.md) |
| 4 | ErrorState    | [`error-state.schema.json`](../../../../content-schema/schemas/error-state.schema.json) |

The sweep is **additive**: it adds rows, columns, and bindings; it
must not rewrite a screen's visual contract, mockup, or
authoritative state bindings.

---

## 2. Per-file Edits

### `interactions.md`

- [ ] Add a `Hotkey` column to the Actions table. Reference an entry
      id from
      [`hotkey/global-default.hotkey.json`](../../../../content-schema/examples/records/hotkey/global-default.hotkey.json),
      or document a deliberate mouse-only action in **AI
      Implementation Notes**.
- [ ] Replace any "press X to open Y" prose with canonical gesture
      names from [`ui-gestures.md`](../../ui-gestures.md): `click`,
      `double-click`, `right-click`, `long-press`, `drag`,
      `dragstart`, `dragmove`, `dragend`.
- [ ] If the screen is a modal: add an explicit Esc row matching its
      `severity` per the dismissal table in
      [`ui-routing.md` § Dismissal Policy](../../ui-routing.md#dismissal-policy).
- [ ] If the screen owns drop targets: add an `accepts` column
      listing the `DragKind` values it accepts.

### `data-contracts.md`

- [ ] If the screen renders errors: add
      [`error-state.schema.json`](../../../../content-schema/schemas/error-state.schema.json)
      to the **Content Schemas And Registries** table and type
      `errors.*` bindings as `ErrorState[]`.
- [ ] If the screen is a modal: add
      [`modal-entry.schema.json`](../../../../content-schema/schemas/modal-entry.schema.json)
      to the same table and replace per-screen `callerRoute`
      bindings with `state.ui.modalStack[top].callerRoute`.

### `spec.md`

- [ ] Update **State Bindings** to read
      `state.ui.modalStack[top].*` instead of
      `state.ui.<name>.callerRoute` when applicable.
- [ ] Add `focusOrder: int` to every interactive control in the
      **Component Tree**.

---

## 3. Sweep Order

Apply the sweep in batches; the order maximizes shared edits per
batch.

1. **Modal-using screens** first
   (`09`, `20`, `25`, `37`, `40`, `41`, `48`, `51`, `52`, `54`, `60`).
2. **Drag-using screens** next
   (`26-marketplace`, `36-marketplace-artifact-trading`,
   `46-hero-screen`, `51-split-stack-dialog`,
   `52-artifact-combine-dialog`).
3. **Tooltip-using screens**
   (`18-map-object-tooltip`, `19-status-bar`, `38-combat-screen`,
   `46-hero-screen`, `47-spell-book`, `50-creature-info`).
4. **Remaining screens** for the Hotkey column only.

---

## 4. After Each Batch

Run, in order:

```text
npm run generate:wiki
npm run validate
```

`generate:wiki` must produce no diff against the rendered wiki HTML
other than the swept content; `validate` must pass.

---

## 🔍 Sync Check

- **UI: ✔** — Gesture names, `severity`, `focusOrder`, modal-stack
  binding shape, and the `accepts: DragKind[]` slot match
  [`ui-hotkeys.md`](../../ui-hotkeys.md),
  [`ui-routing.md`](../../ui-routing.md), and
  [`ui-gestures.md`](../../ui-gestures.md). All 11 modal-using, 5
  drag-using, and 6 tooltip-using screen ids resolve under
  [`wiki/screens/`](../../wiki/screens/).
- **Schema: ✔** —
  [`error-state.schema.json`](../../../../content-schema/schemas/error-state.schema.json),
  [`modal-entry.schema.json`](../../../../content-schema/schemas/modal-entry.schema.json),
  and
  [`hotkey/global-default.hotkey.json`](../../../../content-schema/examples/records/hotkey/global-default.hotkey.json)
  all exist; `modalStack[top].callerRoute` /
  `previousFocusElementId` paths match the modal-entry schema's
  required keys.
- **Tasks: ✔** — Owning task
  [`tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md`](../../../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md)
  lists this template in **Read First** and pins the same 11
  modal-using screen ids, the same `Hotkey`-column rule, and the
  same `generate:wiki` + `validate` verify chain.

## ⚠ Issues

_None._
