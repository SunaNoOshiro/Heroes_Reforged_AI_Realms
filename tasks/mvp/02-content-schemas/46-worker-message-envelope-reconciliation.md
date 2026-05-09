# Worker-Message Envelope Reconciliation (8-Kind Enum)

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Reconcile
[`content-schema/schemas/worker-message.schema.json`](../../../content-schema/schemas/worker-message.schema.json)
with the AI worker token coverage table by extending the `kind` enum
**additively** to include `AI_ERROR`, `AI_TRACE_REQUEST`, and
`AI_TRACE_RESULT`. Closes CF-1 (Reconcile the AI worker
envelope). The two `AI_TRACE_*` tokens are dev-only and gated behind
the AI inspector overlay build flag; production builds MUST NOT emit
them.

Read First:
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md)
- [`docs/architecture/task-command-token-coverage.json`](../../../docs/architecture/task-command-token-coverage.json)
- [`tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`](../../mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)
- [`tasks/phase-3/05-observability/02-worker-message-validation.md`](../../phase-3/05-observability/02-worker-message-validation.md)

Inputs:
- Existing `worker-message.schema.json` envelope.
- AI token list (`AI_ERROR`, `AI_TRACE_REQUEST`,
  `AI_TRACE_RESULT`).
- Existing canonical examples under
  `content-schema/examples/worker-message/`.

Outputs:
- Three additional `kind` enum values
  (`AI_ERROR`, `AI_TRACE_REQUEST`, `AI_TRACE_RESULT`) in the
  worker-message schema (8 values total) with matching `$defs`
  payload branches § CF-1 required-field shapes.
- Refreshed enum snapshot via
  `npm run generate:enum-snapshot`.
- Per-kind reference table in
  [`docs/architecture/ai-contract.md` § 3](../../../docs/architecture/ai-contract.md#3-worker-protocol)
  listing all 8 kinds and their owning tasks.

Owned Paths:
- (none — this task is a doctrine reconciliation that ships only
  as additive extensions to schemas and docs primary-owned
  elsewhere; see Owned Paths (shared) for the per-file primary
  owners)

Owned Paths (shared):
- `content-schema/schemas/worker-message.schema.json` — primary
  owner is
  [`tasks/phase-3/05-observability/02-worker-message-validation.md`](../../phase-3/05-observability/02-worker-message-validation.md);
  this task adds three `kind` enum values (`AI_ERROR`,
  `AI_TRACE_REQUEST`, `AI_TRACE_RESULT`) and the matching
  `$defs` payload branches **additively** and must not rewrite
  the existing `COMPUTE_MOVE` / `MOVE_RESULT` / `ABORT` / `PING`
  / `PONG` shapes.
- `content-schema/enums.snapshot.json` — primary owner is
  [`tasks/mvp/02-content-schemas/24-enum-lifecycle-and-snapshot-gate.md`](./24-enum-lifecycle-and-snapshot-gate.md);
  this task regenerates the snapshot **additively** to reflect
  the three new enum values and must not remove or alias any
  existing entries.
- `docs/architecture/ai-contract.md` — primary owner is the AI
  module index; this task adds the per-kind reference table to
  § 3 (Worker Protocol) **additively** and must not rewrite
  earlier semantics.

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas
- mvp.02-content-schemas.24-enum-lifecycle-and-snapshot-gate

Acceptance Criteria:
- The `kind` enum in `worker-message.schema.json` carries exactly 8
  values: `COMPUTE_MOVE`, `MOVE_RESULT`, `ABORT`, `PING`, `PONG`,
  `AI_ERROR`, `AI_TRACE_REQUEST`, `AI_TRACE_RESULT`.
- `AI_ERROR` payload branch requires `requestId` and
  `reason: string`; `code` and `details` are optional.
- `AI_TRACE_REQUEST` payload branch requires `requestId`; optional
  `verbosity`. The schema description marks it dev-only.
- `AI_TRACE_RESULT` payload branch requires `requestId`, `wants`,
  `scored`, `command`, `reasoning`. The schema description marks it
  dev-only.
- `npm run generate:enum-snapshot` produces a clean diff that lands
  in the same change.
- `npm run validate:enums` passes.
- Existing canonical examples under
  `content-schema/examples/worker-message/` remain valid.
- [`tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`](../../mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)
  and
  [`tasks/phase-3/05-observability/02-worker-message-validation.md`](../../phase-3/05-observability/02-worker-message-validation.md)
  cite the 8-kind enum.
- The `AI_TRACE_REQUEST` and `AI_TRACE_RESULT` descriptions declare
  them dev-only and gated behind the AI inspector overlay build flag.

Owned Paths (shared) acceptance:
- The worker-message schema is **owned by**
  `phase-3.05-observability.02-worker-message-validation` (the
  primary contract). This task is **additive**: three new `kind`
  enum values and matching `$defs` branches are appended; this
  task must not rewrite the pre-existing `COMPUTE_MOVE` /
  `MOVE_RESULT` / `ABORT` / `PING` / `PONG` shapes.
- The enum snapshot is **owned by**
  `mvp.02-content-schemas.24-enum-lifecycle-and-snapshot-gate`
  (the primary contract). This task regenerates the snapshot
  **additively** for the three new values and must not remove or
  alias any existing entries.
- The AI contract doc is **owned by** the AI module index. This
  task adds the per-kind reference table **additively** and must
  not rewrite earlier semantics.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
