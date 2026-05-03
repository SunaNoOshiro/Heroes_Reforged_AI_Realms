# Per-Screen Contract Sweep

Status: planned

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Apply the cross-screen contracts (component-state matrix, hotkey
column, modal-stack bindings, gesture vocabulary, ErrorState typing)
to every screen package. Running each contract sweep independently
would re-edit the same files four times; running them in one
coordinated pass keeps screens coherent and avoids drift between
contracts as they land at different times.

Source audit:
[`docs/readiness-audit/03-ui-state-and-interactions.md`](../../../docs/readiness-audit/03-ui-state-and-interactions.md)
(Q52, Q53, Q54, Q56, Q58, Q60, Issues 3.D-1 and 3.D-2).

Read First:
- [`docs/implementation-plans/03-ui-state-and-interactions-plan.md`](../../../docs/implementation-plans/03-ui-state-and-interactions-plan.md)
- [`docs/architecture/wiki/_templates/animation-states.md`](../../../docs/architecture/wiki/_templates/animation-states.md)
- [`docs/architecture/wiki/_templates/contract-sweep.md`](../../../docs/architecture/wiki/_templates/contract-sweep.md)
- [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
- [`docs/architecture/ui-routing.md`](../../../docs/architecture/ui-routing.md)
- [`docs/architecture/ui-gestures.md`](../../../docs/architecture/ui-gestures.md)
- [`docs/architecture/ui-hotkeys.md`](../../../docs/architecture/ui-hotkeys.md)
- `docs/architecture/wiki/screens/07-adventure-map/spec.md`
- `docs/architecture/wiki/screens/24-town-screen/spec.md`
- `docs/architecture/wiki/screens/38-combat-screen/spec.md`
- `docs/architecture/wiki/screens/46-hero-screen/spec.md`
- `docs/architecture/wiki/screens/54-system-menu/interactions.md`
- `docs/architecture/wiki/screens/60-confirmation-dialog/interactions.md`
- `docs/architecture/wiki/screens/65-map-editor/spec.md`

Inputs:
- The two sweep templates under
  [`docs/architecture/wiki/_templates/`](../../../docs/architecture/wiki/_templates/)
- The 65 screen packages under
  [`docs/architecture/wiki/screens/`](../../../docs/architecture/wiki/screens/)
- [`content-schema/schemas/error-state.schema.json`](../../../content-schema/schemas/error-state.schema.json)
- [`content-schema/schemas/modal-entry.schema.json`](../../../content-schema/schemas/modal-entry.schema.json)
- [`content-schema/schemas/hotkey.schema.json`](../../../content-schema/schemas/hotkey.schema.json)

Outputs:
- A sweep-progress index file listing every screen and the
  contracts applied
- Per-screen edits to `spec.md`, `interactions.md`, and
  `data-contracts.md` covering the four contracts in the
  contract-sweep template

Owned Paths:
- `docs/architecture/wiki/_sweep-progress.md`

Owned Paths (shared):
- `docs/architecture/wiki/screens/01-main-menu/`
- `docs/architecture/wiki/screens/24-town-screen/`
- `docs/architecture/wiki/screens/38-combat-screen/`
- `docs/architecture/wiki/screens/46-hero-screen/`
- `docs/architecture/wiki/screens/54-system-menu/`
- `docs/architecture/wiki/screens/60-confirmation-dialog/`

Dependencies:
- mvp.07-ui-shell.12-component-state-matrix
- mvp.07-ui-shell.14-modal-stack
- mvp.07-ui-shell.16-gesture-taxonomy
- mvp.07-ui-shell.18-hotkey-registry
- mvp.02-content-schemas.21-error-state-schema

Acceptance Criteria:
- The sweep is additive: it adds the seven-state Animation Contract
  block, the `Hotkey` column, modal-stack bindings, canonical
  gesture vocabulary, and `ErrorState` typing to existing screen
  packages without rewriting their visual contract, mockup, or
  authoritative state bindings.
- This task must not rewrite or invent gameplay rules — screen
  packages remain owned by their primary screen-curation tasks; this
  sweep is a coordinated additive pass and does not change which
  task owns the primary screen contract.
- Each modal-using screen
  (`09`, `20`, `25`, `37`, `40`, `41`, `48`, `51`, `52`, `54`, `60`)
  has its `callerRoute` binding replaced by
  `state.ui.modalStack[top]` and an explicit Esc row matching its
  `severity`.
- Every `interactions.md` Actions table includes a `Hotkey` column;
  cells reference an entry id in
  [`hotkey/global-default.hotkey.json`](../../../content-schema/examples/records/hotkey/global-default.hotkey.json)
  or the row documents a deliberate mouse-only action in AI
  Implementation Notes.
- Every `spec.md` Animation Contract enumerates the seven normative
  states or waives an inapplicable state with a one-line
  justification per
  [`docs/architecture/ui-state-contract.md` § Component State Matrix](../../../docs/architecture/ui-state-contract.md#component-state-matrix).
- Every screen that renders errors lists
  [`error-state.schema.json`](../../../content-schema/schemas/error-state.schema.json)
  in its `data-contracts.md` Content Schemas And Registries table.
- `npm run generate:wiki` succeeds and produces no diff against the
  rendered wiki HTML other than the swept content.

Verify:
- npm run generate:wiki
- npm run validate:contracts
- npm run validate:tasks
- npm run validate

Estimated Time:
- 6 hours
