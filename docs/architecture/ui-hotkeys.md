# UI Hotkey Registry

Global hotkey registry, focus order, modal tab-trap, and element-level
focus restoration. Every screen's `interactions.md` Actions table
references entries here via a `Hotkey` column; the registry is the
single source of truth.

- Schema: [`hotkey.schema.json`](../../content-schema/schemas/hotkey.schema.json)
- Canonical default record: [`hotkey/global-default.hotkey.json`](../../content-schema/examples/records/hotkey/global-default.hotkey.json)

> Companions:
> - [`ui-input-arbitration.md`](ui-input-arbitration.md) — single-emit
>   rule, Esc precedence ladder, animation gates.
> - [`ui-routing.md` § Modal Stack](ui-routing.md#modal-stack) — modal
>   stack shape and the `previousFocusElementId` slot used here.
> - [`ui-input-modalities.md`](ui-input-modalities.md) — keyboard
>   parity with touch and gamepad.

---

## Naming Convention

```text
global.<action>                  — registry-wide bindings (Esc, F10, F1, …)
screen.<screen-slug>.<action>    — active only on the named screen
modal.<modal-slug>.<action>      — active only when the modal is on top of state.ui.modalStack
```

Slugs are derived from `wiki/screens/index.json` with the numbered
prefix dropped (`07-adventure-map` → `adventure-map`).

The id pattern pinned by
[`hotkey.schema.json`](../../content-schema/schemas/hotkey.schema.json)
is `^(global|screen)\.[a-z0-9-]+(\.[a-z0-9-]+)*$`. The `modal.`
prefix above is a documentation convention only: in the schema, a
modal-scoped entry uses the `screen.` id prefix together with
`scope: "modal"` and a `screenId` set to the modal package id
(numbered form, e.g. `60-confirmation-dialog`).

`defaultBinding` is W3C `KeyboardEvent.code` form (`Escape`, `Enter`,
`F1`, `KeyZ`, `Control+Z`, `Control+Shift+Z`). Modifier order is fixed:
`Control`, `Alt`, `Shift`, `Meta`.

---

## Scopes

| `scope`  | Fires when …                                                            |
| -------- | ----------------------------------------------------------------------- |
| `global` | Always, regardless of focus or active screen.                           |
| `screen` | `state.ui.router.active` matches the entry's `screenId`.                |
| `modal`  | `state.ui.modalStack[top].id` matches the entry's `screenId`.           |

Precedence is innermost-active-first: `modal` > `screen` > `global`
for the same key sequence. Precedence is enforced by the dispatch
table, not by individual handlers.

---

## Global Bindings

| Hotkey id            | Default  | Notes                                                                                                              |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `global.system-menu` | `Escape` | Routes through the Esc ladder in [`ui-input-arbitration.md`](ui-input-arbitration.md). Not rebindable.             |
| `global.confirm`     | `Enter`  | Activates the focused control. Not rebindable.                                                                     |
| `global.help`        | `F1`     | Opens the contextual help overlay. Rebindable.                                                                     |

The full default set (including adventure-map and map-editor screen
bindings) is in
[`hotkey/global-default.hotkey.json`](../../content-schema/examples/records/hotkey/global-default.hotkey.json).

---

## Focus Order

Every interactive element listed in a screen `spec.md` **Component
Tree** declares `focusOrder: int`. The DOM shell walks ascending order
on `Tab`, descending on `Shift+Tab`. Two elements may share a
`focusOrder` value when they form a horizontally arranged group
(e.g. a Confirm/Cancel pair) — within the group, left-to-right order
decides.

A screen package missing `focusOrder` on any interactive element
fails the per-screen sweep validation.

---

## Tab Trap (Modals)

When `state.ui.modalStack.length > 0`, `Tab` and `Shift+Tab` cycle
**only within the top modal's controls**; focus does not escape into
the underlying screen until the modal closes. The trap is implemented
by the modal shell, not by individual modals.

The trap is per-modal-entry: a 2-deep stack traps inside the topmost
modal, not inside the one beneath it.

---

## Element-Level Focus Restoration

- **On `MODAL_OPEN`**: the shell captures the currently focused
  element id into `state.ui.modalStack[top].previousFocusElementId`
  (or `null` when nothing was focused).
- **On `MODAL_CLOSE`**: the shell restores focus to that id, or — if
  it was `null` — to the screen's first `focusOrder`-declared element.
- Restoration runs in the same frame as the close; focus never lands
  on the document body in an intermediate frame. Keyboard users
  stepping through a confirm-on-confirm chain return to the exact
  trigger control they activated, not to the screen's default focus.

The `previousFocusElementId` slot is part of the modal-entry shape in
[`modal-entry.schema.json`](../../content-schema/schemas/modal-entry.schema.json).

---

## Per-screen `Hotkey` Column

Every screen's `interactions.md` Actions table MUST include a
`Hotkey` column. Each non-empty cell references an entry id in the
registry; an empty cell means the action is mouse-only by design
(rare — document the reason in the screen's AI Implementation Notes).

`validate` rejects:

- a `Hotkey` cell whose id does not resolve to a registry entry;
- a `Hotkey` cell whose `scope` is `screen` but whose `screenId`
  does not match the screen package;
- two registry entries with the same `defaultBinding` and
  overlapping scopes — a `global` + `screen` binding on `Enter` is
  allowed because `screen` shadows `global`; two `screen` bindings
  on the same key on the same screen is a conflict.

The per-screen sweep that adds the column to every package is owned
by
[`tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md`](../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md).

---

## Related Docs

- [`overview.md`](overview.md) — architecture overview
- [`ui-input-arbitration.md`](ui-input-arbitration.md) — Esc ladder,
  single-emit, animation gates
- [`ui-routing.md`](ui-routing.md) — modal stack and dismissal policy
- [`ui-input-modalities.md`](ui-input-modalities.md) — keyboard parity
  with touch and gamepad
- [`wiki/README.md`](wiki/README.md) — wiki-wide rule that every
  `interactions.md` Actions table includes the `Hotkey` column

---

## 🔍 Sync Check

- **UI: ⚠** — [`wiki/README.md`](wiki/README.md) and
  [`ui-input-modalities.md`](ui-input-modalities.md) both reference
  the registry correctly, but no `interactions.md` Actions table
  under `wiki/screens/*/` carries a `Hotkey` column yet. Closing
  this gap is owned by
  [`tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md`](../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md)
  (planned).
- **Schema: ✔** — [`hotkey.schema.json`](../../content-schema/schemas/hotkey.schema.json)
  id regex, `scope` enum (`global` / `screen` / `modal`), and
  `defaultBinding` description match this doc; the
  `HotkeyRegistry` row in
  [`schema-matrix.md`](./schema-matrix.md) delegates here; the
  `previousFocusElementId` field in
  [`modal-entry.schema.json`](../../content-schema/schemas/modal-entry.schema.json)
  aligns with § Element-Level Focus Restoration.
- **Tasks: ✔** — Owning task
  [`mvp.07-ui-shell.18-hotkey-registry`](../../tasks/mvp/07-ui-shell/18-hotkey-registry.md)
  lists this doc and both schemas in its `Owned Paths`; the
  consumer sweep task `mvp.07-ui-shell.13-screen-package-contract-sweep`
  reads this doc and references the canonical default record.

## ⚠ Issues

- **`Hotkey` column not yet present on any `wiki/screens/*/interactions.md`.**
  The contract here mandates the column on every screen, but a grep
  across `docs/architecture/wiki/screens/*/interactions.md` finds
  zero files carrying it. Per
  [`wiki/README.md`](wiki/README.md) and this doc, the gap closes
  when
  [`tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md`](../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md)
  runs; the task is `planned` in
  [`tasks/task-status.json`](../../tasks/task-status.json). No
  rewrite of screen packages is performed here (Hard Prohibition D
  — never edit cross-checked files).
- **`MODAL_OPEN` / `MODAL_CLOSE` are not registered in
  [`command-schema.md`](./command-schema.md).** Both are referenced
  by this doc and by
  [`ui-routing.md` § Modal Stack](ui-routing.md#modal-stack) as the
  triggers for stack push / pop and focus capture / restore.
  Whether they are formal `command-schema.md` entries or runtime-only
  reducer events should be decided in the modal-stack runtime task
  ([`mvp.07-ui-shell.14-modal-stack`](../../tasks/mvp/07-ui-shell/14-modal-stack.md));
  if formal, add rows there. The target is left untouched because
  the canonical declaration belongs in `ui-routing.md` / the
  command schema, not here.
