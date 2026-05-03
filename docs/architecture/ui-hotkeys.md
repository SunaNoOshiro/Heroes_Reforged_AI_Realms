# UI Hotkey Registry

Global hotkey registry, focus-order rules, tab-trap contract, and
element-level focus restoration. Each screen's `interactions.md` MUST
include a `Hotkey` column whose values resolve to entries in
[`hotkey.schema.json`](../../content-schema/schemas/hotkey.schema.json);
the canonical default registry is
[`hotkey/global-default.hotkey.json`](../../content-schema/examples/records/hotkey/global-default.hotkey.json).

> Companions:
> - [`ui-input-arbitration.md`](ui-input-arbitration.md) for the
>   single-emit rule, Esc ladder, and animation gates that interact
>   with hotkey scopes.
> - [`ui-routing.md` § Modal Stack](ui-routing.md#modal-stack) for the
>   `previousFocusElementId` slot that drives focus restoration.
> - [`ui-input-modalities.md`](ui-input-modalities.md) for keyboard
>   parity with touch and gamepad.

---

## Naming Convention

```text
global.<action>                        — registry-wide bindings (Esc, F10, F1, ...)
screen.<screen-slug>.<action>          — bindings active only on the named screen
modal.<modal-slug>.<action>            — bindings active only when the modal is on top of state.ui.modalStack
```

`<screen-slug>` and `<modal-slug>` are derived from
`wiki/screens/index.json` (numbered prefix dropped). Hotkey ids match
the regex pinned in
[`hotkey.schema.json`](../../content-schema/schemas/hotkey.schema.json):
`^(global|screen)\.[a-z0-9-]+(\.[a-z0-9-]+)*$`. The `modal.` prefix
above is a usage convention; under the schema it is `screen.` with
`scope: "modal"` and `screenId` set to the modal package id.

`defaultBinding` uses W3C `KeyboardEvent.code` form: `Escape`,
`Enter`, `F1`, `KeyZ`, `Control+Z`, `Control+Shift+Z`. Modifier order
is fixed: `Control`, `Alt`, `Shift`, `Meta`.

---

## Scopes

| `scope`  | Fires when …                                                                |
| -------- | --------------------------------------------------------------------------- |
| `global` | Always, regardless of focus or active screen.                               |
| `screen` | Only when `state.ui.router.active` matches the entry's `screenId`.          |
| `modal`  | Only when `state.ui.modalStack[top].id` matches the entry's `screenId`.     |

A `modal`-scoped binding wins over a `screen`-scoped binding with the
same key sequence; `screen` wins over `global`. This is the standard
"innermost active scope first" rule and is enforced by the dispatch
table, not the user.

---

## Global Bindings

The canonical defaults are:

| Hotkey id                | Default     | Notes                                                              |
| ------------------------ | ----------- | ------------------------------------------------------------------ |
| `global.system-menu`     | `Escape`    | Routes through the Esc ladder in [`ui-input-arbitration.md`](ui-input-arbitration.md). Not rebindable. |
| `global.confirm`         | `Enter`     | Activates the focused control. Not rebindable.                     |
| `global.help`            | `F1`        | Opens the contextual help overlay. Rebindable.                     |

See [`hotkey/global-default.hotkey.json`](../../content-schema/examples/records/hotkey/global-default.hotkey.json)
for the full default set including adventure-map and editor bindings.

---

## Focus Order

Every interactive element in a screen `spec.md`'s **Component Tree**
MUST declare a `focusOrder: int`. The DOM shell walks the order on
`Tab` (ascending) and `Shift+Tab` (descending). Two elements may share
a `focusOrder` when they form a horizontally arranged group (e.g. the
Confirm/Cancel pair) — within a group, left-to-right order wins.

A screen package without `focusOrder` declarations on every interactive
element fails the per-screen sweep validation.

---

## Tab Trap (Modals)

When `state.ui.modalStack.length > 0`, `Tab` and `Shift+Tab` cycle
**only within the top modal's controls.** Focus does not escape into
the underlying screen until the modal closes. The trap is implemented
by the modal shell, not by individual modals.

The trap is per-modal-entry: a 2-deep stack traps inside the topmost
modal, not inside the bottom one.

---

## Element-Level Focus Restoration

Every `MODAL_OPEN` captures the current focused-element id into
`state.ui.modalStack[top].previousFocusElementId`. On `MODAL_CLOSE`,
the shell sets focus to that id (or to the screen's first
`focusOrder`-declared element when null).

Focus restoration runs in the same frame as the close — there is no
intermediate frame where focus is on the document body. Keyboard
users moving through a confirm-on-confirm sequence return to exactly
the trigger control they activated, not to the screen's default.

The `previousFocusElementId` slot is part of the modal-entry shape in
[`modal-entry.schema.json`](../../content-schema/schemas/modal-entry.schema.json).

---

## Per-screen `Hotkeys` Column

Every screen's `interactions.md` Actions table MUST gain a `Hotkey`
column. Cells reference an entry id from the registry; an empty cell
means the action is mouse-only by design (rare; document the reason in
the screen's AI Implementation Notes).

`validate` rejects:

- a `Hotkey` cell whose id does not resolve to a registry entry;
- a `Hotkey` cell whose `scope` is `screen` but whose `screenId` does
  not match the screen package;
- two registry entries with the same `defaultBinding` and overlapping
  scopes (a global + screen binding on `Enter` is allowed because
  `screen` shadows `global`; two `screen` bindings on the same key on
  the same screen is a conflict).

The per-screen sweep adding the column is owned by
[`tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md`](../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md).

---

## Related Docs

- [`overview.md`](overview.md) — architecture index
- [`ui-input-arbitration.md`](ui-input-arbitration.md) — Esc ladder,
  single-emit, animation gates
- [`ui-routing.md`](ui-routing.md) — modal stack and dismissal policy
- [`ui-input-modalities.md`](ui-input-modalities.md) — keyboard parity
  with touch and gamepad
- [`wiki/README.md`](wiki/README.md) — `interactions.md` MUST include
  the `Hotkey` column
