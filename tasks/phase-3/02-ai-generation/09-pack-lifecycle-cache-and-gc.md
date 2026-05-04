# Pack Lifecycle (cache + disk quota + GC + ownership)

Status: planned

Module: [AI Content Generation (M6)](../02-ai-generation.md)

Description:
Author the canonical
[`docs/architecture/pack-lifecycle.md`](../../../docs/architecture/pack-lifecycle.md)
that pins four lifecycle policies for AI-generated and sandboxed
packs: provider-response cache (keyed by `(promptHash, seed,
providerId, modelHint)`), disk-quota policy (per-user soft and hard
caps for sandboxed packs), GC rule (on launch + on explicit "Manage
AI content" action), and lifecycle ownership (launcher owns the
cache and GC; generator UI owns the force-regenerate override). The
matching cache-entry schema
[`content-schema/schemas/provider-response-cache-entry.schema.json`](../../../content-schema/schemas/provider-response-cache-entry.schema.json)
lets the lifecycle layer validate its own on-disk records.

Pre-this-task, pack identity collisions were caught at Stage 6
(byte-identical packs are rejected) but everything else in the
lifecycle was undefined: no cache, no quota, no GC rule, no
ownership. Disk usage grew monotonically and provider cost was paid
on every regenerate. This task pins the contract; the launcher and
generator-UI implementations remain future work.

GC distinguishes AI-generated packs from user-edited packs by
reading `manifest.sandboxedReason` (set to `"ai-generated"` by Stage
6 — see Task 6).

Read First:
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)

Inputs:
- Pack-shape produced by Task 6 (`sandboxed: true`,
  `sandboxedReason`, `manifest.generation`).
- Generator UI from Task 7 (carries the "Force regenerate" override
  and the "Manage AI content" surface).

Outputs:
- `docs/architecture/pack-lifecycle.md`
- `content-schema/schemas/provider-response-cache-entry.schema.json`
- `content-schema/examples/provider-response-cache-entry/canonical.provider-response-cache-entry.json`
- A "Lifecycle" subsection in
  [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md).
- A single-line cross-reference in
  [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
  under "Sandbox enforcement".
- A schema-matrix row in
  [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Owned Paths:
- `docs/architecture/pack-lifecycle.md`
- `content-schema/schemas/provider-response-cache-entry.schema.json`
- `content-schema/examples/provider-response-cache-entry/canonical.provider-response-cache-entry.json`

Dependencies:
- phase-3.02-ai-generation.05-asset-generation-stub-imagegen-api
- phase-3.02-ai-generation.06-content-moderation-plus-hard-caps
- phase-3.02-ai-generation.07-generation-ui-prompt-preview-download

Acceptance Criteria:
- Schema validates the canonical example with zero errors.
- `additionalProperties: false` on every named object.
- The doc lists four numbered policies (cache, disk-quota, GC,
  ownership) with concrete defaults (30-day TTL, 2 GB soft / 5 GB
  hard quota, LRU-by-last-loaded eviction).
- Cache key carries
  `(promptHash, seed, providerId, modelHint)` exactly.
- Pipeline doc carries the lifecycle subsection.
- pack-contract.md references the lifecycle doc under sandbox
  enforcement.
- Schema-matrix row exists.

Verify:
- npm run validate

Estimated Time:
- 4 hours
