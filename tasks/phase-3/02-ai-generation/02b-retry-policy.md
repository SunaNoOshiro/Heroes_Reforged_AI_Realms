# Retry Policy (shape / coherence / balance)

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
Author the canonical
[`content-schema/schemas/retry-policy.schema.json`](../../../content-schema/schemas/retry-policy.schema.json)
that codifies how the orchestrator retries on shape, coherence, and
balance failures. The pipeline doc's failure-modes table currently
says coherence errors *may* route to "regenerate with resolved IDs"
and balance failures *may* route to the optimizer — informal prose
that lets two implementers ship two different policies and produce
divergent UX. The schema pins maxAttempts, onExhaust, and backoff
per failure class so cost-per-generation is bounded and "why did my
generation succeed yesterday but fail today?" has a documented
answer.

The optimizer's hard cap of 10 iterations stays — that is the inner
loop. This schema is the **outer** loop and never re-prompts on
balance failures.

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)

Inputs:
- The failure-modes table in
  [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)
- Task 1 (provider call) and Task 2 (shape + coherence) are the
  consumers.

Outputs:
- `content-schema/schemas/retry-policy.schema.json`
- `content-schema/examples/retry-policy/canonical.retry-policy.json`
- A revised failure-modes table in
  [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)
  citing the schema.
- A schema-matrix row in
  [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Owned Paths:
- `content-schema/schemas/retry-policy.schema.json`
- `content-schema/examples/retry-policy/canonical.retry-policy.json`

Dependencies:
- phase-3.02-ai-generation.00-generation-io-schemas

Acceptance Criteria:
- Schema validates the canonical example with zero errors.
- `additionalProperties: false` on every object.
- Three failure classes pinned: `shape`, `coherence`, `balance`.
- Each entry carries `maxAttempts`, `onExhaust`, `backoff`.
- Failure-modes table in `ai-generation-pipeline.md` cites the
  schema.
- Schema-matrix row exists.

Verify:
- npm run validate

Estimated Time:
- 2 hours
