# Template — Animation Contract Seven-State Sweep

Apply this checklist to every screen package's `spec.md` Animation
Contract. The contract is pinned in
[`ui-state-contract.md` § Component State Matrix](../../ui-state-contract.md#component-state-matrix).

For each control listed in the screen's **Component Tree**, enumerate
the seven normative states or waive an inapplicable state with a
one-line justification.

```text
- <ControlName>:
    idle:     <visual rule>
    hover:    <visual rule>            (waived: <reason> — when hover does not apply)
    pressed:  <visual rule>            (waived: <reason> — when pressed does not apply)
    disabled: <visual rule>
    focused:  <visual rule>            // a11y rule: must always be visible
    error:    <visual rule>            (waived: <reason> — when no error path exists)
    loading:  <visual rule>            (waived: <reason> — when control resolves synchronously)
```

## Precedence Reminders

- `disabled` suppresses `hover` and `pressed` but **not** `focused`.
- `error` overlays every state except `loading`.
- `loading` overlays `idle` only; `error` wins if both fire.
- `focused` is always rendered when present.

## Per-screen Workflow

1. Read the existing `spec.md` Animation Contract.
2. Mark gaps with `TODO(state-matrix)`.
3. Replace each TODO with the seven-state block above (or a waiver line).
4. Run `npm run generate:wiki` so the rendered wiki reflects the change.
5. Commit one screen per PR or one chunk of ten per PR; do not batch
   mixed sweeps with the contract sweep template (see
   [`contract-sweep.md`](contract-sweep.md)).
