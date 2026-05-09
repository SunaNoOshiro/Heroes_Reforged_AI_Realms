# Hotkey Registry + Focus Order

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Land [`docs/architecture/ui-hotkeys.md`](../../../docs/architecture/ui-hotkeys.md),
the `hotkey.schema.json` global registry shape, and the canonical
default-binding example. Define the focus-order rule, the modal
tab-trap, and element-level focus restoration via
`state.ui.modalStack[top].previousFocusElementId`. Today
`selectedRow` bindings are described as supporting "keyboard and
pointer navigation" but no global registry exists, hotkey
conflicts between screens are undetectable, and modal-heavy
screens ship as mouse-only.

Read First:
- [`docs/architecture/ui-routing.md`](../../../docs/architecture/ui-routing.md)
- [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
- [`docs/architecture/ui-input-arbitration.md`](../../../docs/architecture/ui-input-arbitration.md)
- `docs/architecture/wiki/screens/07-adventure-map/interactions.md`
- `docs/architecture/wiki/screens/24-town-screen/interactions.md`
- `docs/architecture/wiki/screens/46-hero-screen/interactions.md`
- `docs/architecture/wiki/screens/54-system-menu/interactions.md`
- `docs/architecture/wiki/screens/60-confirmation-dialog/interactions.md`
- `docs/architecture/wiki/screens/65-map-editor/interactions.md`

Inputs:
- The modal-stack `previousFocusElementId` field defined by
  [`14-modal-stack.md`](./14-modal-stack.md)
- Existing hotkey hints in screen `interactions.md` Description
  paragraphs

Outputs:
- `docs/architecture/ui-hotkeys.md`
- `content-schema/schemas/hotkey.schema.json`
- `content-schema/examples/records/hotkey/global-default.hotkey.json`

Owned Paths:
- `docs/architecture/ui-hotkeys.md`
- `content-schema/schemas/hotkey.schema.json`
- `content-schema/examples/records/hotkey/global-default.hotkey.json`

Dependencies:
- mvp.07-ui-shell.14-modal-stack

Acceptance Criteria:
- `hotkey.schema.json` defines `HotkeyRegistry` with
  `additionalProperties: false`, a non-empty `entries` array, and
  the regex
  `^(global|screen)\.[a-z0-9-]+(\.[a-z0-9-]+)*$` for entry ids.
- Every entry declares `defaultBinding` in W3C `KeyboardEvent.code`
  form (`Escape`, `Enter`, `F1`, `KeyZ`, `Control+Z`,
  `Control+Shift+Z`, ...) with modifiers in canonical order
  (`Control`, `Alt`, `Shift`, `Meta`).
- `scope` is one of `global`, `screen`, `modal`. `screen` and
  `modal` entries require `screenId` matching a package id from
  [`docs/architecture/wiki/screens/index.json`](../../../docs/architecture/wiki/screens/index.json).
- The host doc declares the focus-order rule (every interactive
  control in a screen `spec.md` Component Tree carries
  `focusOrder: int`), the modal tab-trap (Tab cycles only inside
  the top modal's controls), and element-level focus restoration
  via `state.ui.modalStack[top].previousFocusElementId`.
- Global defaults pin: `global.system-menu` = `Escape`
  (rebindable: false), `global.confirm` = `Enter`
  (rebindable: false), `global.help` = `F1` (rebindable: true).
- The canonical example covers global, screen-scoped (adventure
  map and editor), and modal-scoped (confirmation dialog) entries.
- [`docs/architecture/wiki/README.md`](../../../docs/architecture/wiki/README.md)
  requires a `Hotkey` column in `interactions.md` Actions tables.
  The per-screen sweep is owned by
  [`13-screen-package-contract-sweep.md`](./13-screen-package-contract-sweep.md).
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
  registers `HotkeyRegistry`.

Verify:
- npm run validate:contracts
- npm run validate:tasks
- npm run validate

Estimated Time:
- 5 hours
