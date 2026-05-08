# Balance Constraints Schema (single source of truth for caps)

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
Author the canonical
[`content-schema/schemas/balance-constraints.schema.json`](../../../content-schema/schemas/balance-constraints.schema.json)
that owns the numeric caps (HP, ATK, DEF, abilities-per-unit) and
tier corridors used across the AI generation pipeline. Hard caps
used to live only in moderation-task prose; that meant a
non-orchestrator producer of `GeneratedFaction` (community editor,
hand-edited pack) could write caps-violating content that round-tripped
through shape validation. This schema makes the caps shape-validatable
at every entry point — orchestrator, pack loader, editor import — and
becomes the single source of truth that the moderation task and the
optimizer task both consume rather than re-defining.

Tier corridors mirror the values already pinned in
[`content-schema/balance/corridor.json`](../../../content-schema/balance/corridor.json)
(consumed by `npm run validate:balance`). The two files stay in
lockstep; this schema makes those values reachable from the AI
generation entry points.

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)
- [`research/deep-research-report.md`](../../../research/deep-research-report.md)

Inputs:
- Hard-cap values from
  [`tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md`](./06-content-moderation-plus-hard-caps.md)
  (HP ≤ 500, ATK ≤ 50, abilities per unit ≤ 5)
- Tier corridors from
  [`research/deep-research-report.md`](../../../research/deep-research-report.md)
  § 1

Outputs:
- `content-schema/schemas/balance-constraints.schema.json`
- `content-schema/examples/balance-constraints/canonical.balance-constraints.json`
- A schema-matrix row in
  [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Owned Paths:
- `content-schema/schemas/balance-constraints.schema.json`
- `content-schema/examples/balance-constraints/canonical.balance-constraints.json`

Dependencies:
- phase-3.02-ai-generation.00-generation-io-schemas

Acceptance Criteria:
- Schema validates the canonical example with zero errors.
- `additionalProperties: false` on every object.
- The canonical example carries every hard cap currently named in
  [`tasks/phase-3/02-ai-generation/06-content-moderation-plus-hard-caps.md`](./06-content-moderation-plus-hard-caps.md).
- Schema-matrix row exists.

Verify:
- npm run validate

Estimated Time:
- 2 hours
