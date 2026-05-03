# M2 Engine-Hash Backfill (Dormant)

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
One-shot migration that backfills the `engineHash` field on every
shipped pack manifest the first day the engine ships at M2.
`engineHash` is documented optional pre-M2 in
[`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
because no engine exists yet to hash. The moment a real engine
binary lands, every existing pack instantly fails the
`engineHash` row of the
[`docs/architecture/version-policy.md`](../../../docs/architecture/version-policy.md)
matrix in multiplayer and trusted-replay contexts (now non-empty
expectation vs. missing field). Without this task scheduled, the
backfill races the engine release and the engine-hash transition
lands ad-hoc, possibly skipping the matching `contentHash` recompute.

This task is **dormant** until the engine reaches M2. Author it now
so the procedure is reviewable before deadline pressure exists.

Source plan:
[`docs/implementation-plans/06-data-contracts-and-schema-plan.md`](../../../docs/implementation-plans/06-data-contracts-and-schema-plan.md)
(§ engineHash backfill at M2, T-FB).

Read First:
- [`docs/implementation-plans/06-data-contracts-and-schema-plan.md`](../../../docs/implementation-plans/06-data-contracts-and-schema-plan.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/version-policy.md`](../../../docs/architecture/version-policy.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- The engine M2 build that produces a stable `engineHash` digest
- Every `manifest.json` under `resources/packs/` and
  `content-schema/examples/packs/`

Outputs:
- Every shipped manifest carries a non-empty `engineHash` matching
  the M2 build's hash
- Every modified manifest's `contentHash` is recomputed because the
  manifest itself changed
- A short procedural note appended to
  [`docs/planning/implementation-log.md`](../../../docs/planning/implementation-log.md)
  recording the backfill

Owned Paths (shared):
- `resources/packs/**/manifest.json`
- `content-schema/examples/packs/**/manifest.json`
- `docs/planning/implementation-log.md`

Dependencies:
- module:mvp.01-engine-core

Acceptance Criteria:
- The shared edits to `resources/packs/`,
  `content-schema/examples/packs/`, and the implementation log are
  **additive**: this task fills in the existing optional `engineHash`
  field and recomputes `contentHash` only because the manifest itself
  changed; it does not rewrite manifest schemas, pack folder layout,
  or unrelated log entries. Each pack's primary contract remains
  owned by its authoring faction/world/scenario task; this task must
  not rewrite their gameplay records.
- `scripts/hash-pack.mjs --check` (the M2 hash tool, name TBD)
  reports zero missing or stale `engineHash` fields.
- Every shipped manifest has a non-empty `engineHash` matching the
  pattern in
  [`content-schema/schemas/manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json).
- Every modified manifest has a recomputed `contentHash` that matches
  its canonical-JSON content.
- `npm run validate:contracts` passes.
- The implementation log records the backfill date and the M2 build
  identifier.

Verify:
- npm run validate:contracts
- npm run validate:tasks
- npm run validate

Estimated Time:
- 4 hours
