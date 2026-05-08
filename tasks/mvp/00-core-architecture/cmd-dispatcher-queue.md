# Dispatcher queue + overflow policy

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
A command **log** is documented; a command **input queue** was not.
Single-player turn-based play does not need one (synchronous
`apply`), but multiplayer lockstep, AI co-actors, and scripted
scenarios all need a bounded queue with a clear overflow rule. This
task pins that contract.

The contract is one bounded FIFO per engine instance, capacity 1024,
single-threaded synchronous drain, dedup on enqueue using the nonce
rule, and a hard-reject overflow policy that returns
`{ kind: 'queue_overflow', capacity, queued }` rather than silently
dropping. The M5 lockstep transport wraps this queue with a network-
frame demuxer; the per-engine queue contract does not change.

Source audit:
[`docs/readiness-audit/01-core-architecture.md`](../../../docs/readiness-audit/01-core-architecture.md)
(Q15, Issue 3.B-2).

Read First:
- [`docs/implementation-plans/01-core-architecture-plan.md`](../../../docs/implementation-plans/01-core-architecture-plan.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Audit Q15 in
  [`docs/readiness-audit/01-core-architecture.md`](../../../docs/readiness-audit/01-core-architecture.md)

Outputs:
- New "Dispatcher Queue" section in
  [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- Boundary-table row "Command queue" added to
  [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- "Dispatcher queue" entry in
  [`docs/architecture/glossary.md`](../../../docs/architecture/glossary.md)

Owned Paths:
- (none — additive sections inside the existing command-schema, state-flow, and glossary docs; no net-new files. Primary owner of command-schema.md is mvp.01-engine-core.06b-extend-command-schema-coverage-checklist.)

Dependencies:
- mvp.00-core-architecture.cmd-nonce

Acceptance Criteria:
- "Dispatcher Queue" section documents capacity, FIFO drain, dedup,
  overflow policy, and the structured `queue_overflow` error shape.
- Reference to the `command.schema.json` schema by canonical path
  `content-schema/schemas/command.schema.json` is preserved in the
  command-schema doc.
- `state-flow.md` boundary table lists "Command queue" with the
  doc-anchor link.
- `glossary.md` has a "dispatcher queue" entry.

Verify:
- npm run validate

Estimated Time:
- 2 hours
