# Template — Animation Contract Seven-State Sweep

Per-control fill-in form for each screen `spec.md` **Animation
Contract**. The seven normative states and their precedence are
canonical in
[`ui-state-contract.md` § Component State Matrix](../../ui-state-contract.md#component-state-matrix);
this template is the checklist that lands them in every screen.

> Companion templates:
> - [`contract-sweep.md`](contract-sweep.md) — four-contract sweep
>   (hotkey column, modal stack, gestures, `ErrorState`). Do not
>   batch with this sweep.
>
> Owners:
> - Template +
>   [`ui-state-contract.md`](../../ui-state-contract.md):
>   [`tasks/mvp/07-ui-shell/12-component-state-matrix.md`](../../../../tasks/mvp/07-ui-shell/12-component-state-matrix.md).
> - Per-screen application:
>   [`tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md`](../../../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md).

For every control listed in the screen's **Component Tree**,
enumerate the seven states below, or waive an inapplicable state
with a one-line justification. Never omit a row.

## 1. State Block

```text
- <ControlName>:
    idle:     <visual rule>
    hover:    <visual rule>            // or: waived: <reason> — when no hover surface
    pressed:  <visual rule>            // or: waived: <reason> — when control does not actuate
    disabled: <visual rule>
    focused:  <visual rule>            // a11y: focus ring must always be visible
    error:    <visual rule>            // or: waived: <reason> — when no error path
    loading:  <visual rule>            // or: waived: <reason> — when control resolves synchronously
```

A waiver replaces the `<visual rule>` slot with
`waived: <one-line reason>`. Keep the row — never delete a state.

## 2. Precedence

These rules mirror
[`ui-state-contract.md` § Component State Matrix](../../ui-state-contract.md#component-state-matrix);
the host doc is canonical. If the two disagree, fix the screen to
match the host, not the template.

- `disabled` suppresses `hover` and `pressed` but **not** `focused`.
- `error` overlays every state except `loading`; when both fire,
  `error` wins.
- `loading` overlays `idle` only.
- `focused` is always rendered when present; the focus ring must
  remain visible under `disabled` (a11y).

## 3. Per-screen Workflow

1. Read the existing `spec.md` **Animation Contract**.
2. Mark gaps with `TODO(state-matrix)`.
3. Replace each TODO with the State Block above (or a
   `waived: <reason>` line for any inapplicable row).
4. Run `npm run generate:wiki` so the rendered wiki reflects the
   change.
5. Commit one screen per PR, or one chunk of ten per PR. Do **not**
   batch this seven-state sweep with the four-contract sweep — see
   [`contract-sweep.md`](contract-sweep.md).

---

## 🔍 Sync Check

- **UI: ✔** — The seven states (`idle`, `hover`, `pressed`,
  `disabled`, `focused`, `error`, `loading`) and the four
  precedence rules match
  [`ui-state-contract.md` § Component State Matrix](../../ui-state-contract.md#component-state-matrix);
  the `#component-state-matrix` anchor resolves; sibling template
  [`contract-sweep.md`](contract-sweep.md) exists.
- **Schema: ✔** — N/A. The template references no schemas; the
  Animation Contract block is freeform per-control prose.
- **Tasks: ✔** — Primary owner
  [`tasks/mvp/07-ui-shell/12-component-state-matrix.md`](../../../../tasks/mvp/07-ui-shell/12-component-state-matrix.md)
  lists this file under **Owned Paths** and **Outputs**; per-screen
  sweep
  [`tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md`](../../../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md)
  lists this file under **Read First**. Cross-linked from
  [`wiki/README.md` § 6.3](../README.md) and
  [`wiki/missing-states.md`](../missing-states.md).

## ⚠ Issues

_None._
