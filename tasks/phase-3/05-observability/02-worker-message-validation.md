# Worker-Message Boundary Validation

Status: planned

Module: [Observability & Trust Boundaries](../05-observability.md)

Description:
Land the closed envelope for every `postMessage` between the
main thread and the AI bot Web Worker. Both ends `Zod.parse`
against
[`content-schema/schemas/worker-message.schema.json`](../../../content-schema/schemas/worker-message.schema.json)
before dispatch; the inner `payload.command` is validated
against
[`content-schema/schemas/command.schema.json`](../../../content-schema/schemas/command.schema.json)
before the reducer is invoked. Mismatched `version` drops the
message and emits
`SecurityEvent { kind: 'worker_message_invalid' }`.

Read First:
- [`docs/architecture/trust-boundaries.md`](../../../docs/architecture/trust-boundaries.md)
  § 4
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md)
- [`tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md`](../../mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)

Inputs:
- [`content-schema/schemas/worker-message.schema.json`](../../../content-schema/schemas/worker-message.schema.json)
- [`content-schema/schemas/command.schema.json`](../../../content-schema/schemas/command.schema.json)
- [`services/shared/logger.ts`](../../../services/shared/logger.ts)
  `securityLog()` helper from Task 01.

Outputs:
- `src/ai/worker/envelope.ts` — typed parser that re-uses the schema; throws `TrustViolationError` per [`docs/architecture/fail-loud.md`](../../../docs/architecture/fail-loud.md) on mismatch; on the main-thread side dispatches `securityLog({ kind: 'worker_message_invalid' })`.
- `src/ai/worker/__tests__/envelope.test.ts` — fixtures from `content-schema/examples/worker-message/` round-trip through the parser; rejected fixtures emit the expected SecurityEvent.

Owned Paths:
- `src/ai/worker/envelope.ts`
- `src/ai/worker/__tests__/envelope.test.ts`
- `content-schema/schemas/worker-message.schema.json`
- `content-schema/examples/worker-message/`

Dependencies:
- phase-3.05-observability.01-shared-logger-and-redaction

Acceptance Criteria:
- Every inbound `postMessage` is `Zod.parse`-validated against
  [`worker-message.schema.json`](../../../content-schema/schemas/worker-message.schema.json).
- `event.source` is checked; messages from any source other
  than the spawned worker reference are dropped without
  reaching the reducer.
- Invalid messages emit `SecurityEvent { kind:
  'worker_message_invalid', messageKind, envelopeVersion }`
  via `securityLog()` and do not enter the reducer.
- Envelope `version` field gates parsing; mismatched version
  drops the message.
- Inner `payload.command` is validated against
  [`command.schema.json`](../../../content-schema/schemas/command.schema.json)
  before reducer dispatch.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
