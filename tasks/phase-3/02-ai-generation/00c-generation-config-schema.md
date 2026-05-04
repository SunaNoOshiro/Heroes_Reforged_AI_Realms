# Generation Config Schema (orchestrator + prompt-template + ruleset pin)

Status: planned

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
Author the canonical
[`content-schema/schemas/generation-config.schema.json`](../../../content-schema/schemas/generation-config.schema.json)
that captures the orchestrator semver, prompt-template hash, and
ruleset hash a materialized AI-generated pack was produced with.
Pre-this-task, reproducibility depended on `GenerationRequest.seed`
plus `GeneratedFaction.notes.providerId`/`promptHash`/`modelHint` —
none of which captured the orchestrator/prompt-template/ruleset
triple. Two regenerations from the same prompt+seed can diverge if
the orchestrator was upgraded between runs and nothing in the pack
reveals which version produced it. This schema is the authoritative
version pin; the materializer (Stage 6) writes it into
`manifest.generation`.

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)
- [`content-schema/schemas/manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json)

Inputs:
- Stage 6 of the pipeline (pack materialize) is the only producer.

Outputs:
- `content-schema/schemas/generation-config.schema.json`
- `content-schema/examples/generation-config/canonical.generation-config.json`
- A new optional `generation` block on
  [`content-schema/schemas/manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json)
  whose shape is `GenerationConfig`.
- A schema-matrix row in
  [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Owned Paths:
- `content-schema/schemas/generation-config.schema.json`
- `content-schema/examples/generation-config/canonical.generation-config.json`

Owned Paths (shared):
- `content-schema/schemas/manifest.schema.json`

Dependencies:
- phase-3.02-ai-generation.00-generation-io-schemas

Acceptance Criteria:
- Schema validates the canonical example with zero errors.
- `additionalProperties: false`.
- `orchestratorVersion` matches a semver pattern.
- `promptTemplateHash` and `rulesetHash` are sha256 hex digests
  (64 lowercase hex chars).
- The manifest claim is purely additive: this task must not
  rewrite existing manifest fields and does not change
  `manifest.schema.json`'s primary owner. The
  primary contract for `manifest.schema.json` lives elsewhere; the
  optional `manifest.generation` block is the only addition here.
- Schema-matrix row exists.

Verify:
- npm run validate

Estimated Time:
- 2 hours
