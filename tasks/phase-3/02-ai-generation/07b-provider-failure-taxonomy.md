# Provider Failure Taxonomy (transport / auth / quota / content-policy)

Status: planned

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
Author the canonical
[`content-schema/schemas/provider-failure.schema.json`](../../../content-schema/schemas/provider-failure.schema.json)
that pins a closed four-class taxonomy of provider transport-layer
failures. The Generation UI today (Task 7) specifies recovery only
for *balance* results; transport, auth, quota, and content-policy
failures have no documented UX. Each requires a different user
action (retry-now, retry-after-cooldown, sign-in-again,
change-prompt), and naming them as a closed shape lets the UI render
distinct affordances and lets telemetry distinguish a transient
network blip from a systemic rate-limit issue.

This taxonomy is **independent** of the shape/coherence/balance
retry classes from
[`02b-retry-policy.md`](./02b-retry-policy.md) — both can fire on
the same generation.

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)

Inputs:
- The four failure modes a provider adapter can surface above the
  network/auth boundary.

Outputs:
- `content-schema/schemas/provider-failure.schema.json`
- `content-schema/examples/provider-failure/transport.provider-failure.json`
- `content-schema/examples/provider-failure/auth.provider-failure.json`
- `content-schema/examples/provider-failure/quota.provider-failure.json`
- `content-schema/examples/provider-failure/content-policy.provider-failure.json`
- A "Provider failure taxonomy" section in
  [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md).
- A schema-matrix row in
  [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Owned Paths:
- `content-schema/schemas/provider-failure.schema.json`
- `content-schema/examples/provider-failure/transport.provider-failure.json`
- `content-schema/examples/provider-failure/auth.provider-failure.json`
- `content-schema/examples/provider-failure/quota.provider-failure.json`
- `content-schema/examples/provider-failure/content-policy.provider-failure.json`

Dependencies:
- phase-3.02-ai-generation.00-generation-io-schemas

Acceptance Criteria:
- Schema validates each canonical example with zero errors.
- `additionalProperties: false` on every branch.
- Closed `oneOf` over four `kind` constants:
  `transport`, `auth`, `quota`, `content-policy`.
- `ai-integration.md` carries the new taxonomy section.
- Schema-matrix row exists.

Verify:
- npm run validate

Estimated Time:
- 3 hours
