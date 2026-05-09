# Modal Stack Schema + Dismissal Policy

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Land the canonical `state.ui.modalStack` shape and the
severity-driven dismissal policy. Today every modal screen
(`60-confirmation-dialog`, `54-system-menu`,
`09-map-object-dialog`, `25-building-recruitment-dialog`,
`40-pre-battle-dialog`, `48-level-up-dialog`,
`51-split-stack-dialog`, `52-artifact-combine-dialog`) stores a
single `callerRoute`. The existing `54-system-menu` →
`60-confirmation-dialog` chain already implies a 2-level stack, and
3-deep flows (recruitment → confirm overspend → second confirm)
silently lose the bottom caller. Element-level focus restoration is
also unspecified. This task adds the modal-entry schema, the modal
stack rules to
[`docs/architecture/ui-routing.md`](../../../docs/architecture/ui-routing.md),
and the canonical example records. The per-screen replacement of
`callerRoute` bindings is owned by
[`13-screen-package-contract-sweep.md`](./13-screen-package-contract-sweep.md).

Read First:
- [`docs/architecture/ui-routing.md`](../../../docs/architecture/ui-routing.md)
- [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
- `docs/architecture/wiki/screens/54-system-menu/spec.md`
- `docs/architecture/wiki/screens/54-system-menu/interactions.md`
- `docs/architecture/wiki/screens/60-confirmation-dialog/spec.md`
- `docs/architecture/wiki/screens/60-confirmation-dialog/interactions.md`
- `docs/architecture/wiki/screens/25-building-recruitment-dialog/spec.md`

Inputs:
- The eleven modal screen packages under
  [`docs/architecture/wiki/screens/`](../../../docs/architecture/wiki/screens/)
- [`docs/architecture/wiki/screens/index.json`](../../../docs/architecture/wiki/screens/index.json)
  for the closed `ModalId` enum
- [`content-schema/schemas/command.schema.json`](../../../content-schema/schemas/command.schema.json)

Outputs:
- `content-schema/schemas/modal-entry.schema.json`
- `content-schema/examples/records/modal-entry/system-menu.modal-entry.json`
- `content-schema/examples/records/modal-entry/quit-confirmation.modal-entry.json`
- `content-schema/examples/records/modal-entry/recruitment.modal-entry.json`

Owned Paths:
- `content-schema/schemas/modal-entry.schema.json`
- `content-schema/examples/records/modal-entry/system-menu.modal-entry.json`
- `content-schema/examples/records/modal-entry/quit-confirmation.modal-entry.json`
- `content-schema/examples/records/modal-entry/recruitment.modal-entry.json`

Owned Paths (shared):
- `docs/architecture/ui-routing.md`

Dependencies:
- mvp.07-ui-shell.11-screen-router-fsm

Acceptance Criteria:
- This task is additive: it populates the § Modal Stack and
  § Dismissal Policy sections of
  [`docs/architecture/ui-routing.md`](../../../docs/architecture/ui-routing.md).
  The host doc is primarily owned by
  [`11-screen-router-fsm.md`](./11-screen-router-fsm.md); this task
  must not rewrite the router FSM, transition graph, or generator
  invariants.
- `modal-entry.schema.json` defines `ModalEntry` with required
  fields `id`, `openedAt`, `callerRoute`, `previousFocusElementId`,
  `severity`, `params`, and `additionalProperties: false`.
- `severity` is a closed enum of `info | warn | destructive |
  system`. The dismissal policy in `ui-routing.md` declares Esc and
  click-outside behavior for each severity tier.
- `modalStack.length` MUST NOT exceed 3. The reducer-side rejection
  is documented in `ui-routing.md` and emits an `ErrorState` with
  `code: "ui.modalStack.overflow"`.
- The three canonical examples cover the system-menu push, the
  destructive quit-confirmation push from the system menu, and the
  recruitment-from-town push.
- `state.ui.modalStack` is excluded from saves and replays per the
  rule in
  [`docs/architecture/determinism.md` § UI Draft Slice](../../../docs/architecture/determinism.md#ui-draft-slice).
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
  and [`content-schema/schemas/README.md`](../../../content-schema/schemas/README.md)
  register the schema.

Verify:
- npm run validate:contracts
- npm run validate:tasks
- npm run validate

Estimated Time:
- 5 hours
