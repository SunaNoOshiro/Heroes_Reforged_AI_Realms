# Save Schema Runtime Validator

Module: [Persistence (M1)](../08-persistence.md)

Description:
Author the runtime validator that consumes
[`save.schema.json`](../../../content-schema/schemas/save.schema.json)
and binds the version-bound rules from
[`pack-trust.md` § Save Version Bounds](../../../docs/architecture/pack-trust.md#3-save-version-bounds).
Returns a discriminated `Compatibility` record so the import flow
distinguishes `ok | skew | tamper | unsupported`.

Read First:
- [`content-schema/schemas/save.schema.json`](../../../content-schema/schemas/save.schema.json)
- [`docs/architecture/pack-trust.md`](../../../docs/architecture/pack-trust.md)
- [`docs/architecture/diagrams/25-load-flow.md`](../../../docs/architecture/diagrams/25-load-flow.md)
- [`docs/architecture/wiki/screens/70-save-import/data-contracts.md`](../../../docs/architecture/wiki/screens/70-save-import/data-contracts.md)

Inputs:
- Schema artifact from
  [`tasks/mvp/02-content-schemas/28-save-schema.md`](../02-content-schemas/28-save-schema.md)
- State serializer + xxh64 hash for `stateHash` recomputation

Outputs:
- `src/persistence/validate-save.ts` exporting
  `validateSave(blob: Uint8Array, runtime: { minSaveVersion, maxSaveVersion, engineHash, packs }): Compatibility`

Owned Paths:
- `src/persistence/validate-save.ts`

Dependencies:
- mvp.02-content-schemas.28-save-schema
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- Round-trips the canonical example through Zod without loss.
- Rejects `saveVersion > runtimeMaxSaveVersion` with
  `compatibility.status = "unsupported"`, `reason = "too-new"`.
- Rejects `saveVersion < runtimeMinSaveVersion` AND no migration
  with `compatibility.status = "unsupported"`, `reason = "no-migration"`.
- Returns `compatibility.status = "skew"` with the per-pack
  mismatched array on `packHashes` divergence for any
  `required: true` entry.
- Returns `compatibility.status = "tamper"` (terminal) when the
  recomputed `stateHash` differs from the file's.
- Aborts before decompression on the size cap and on the ratio cap
  per [`pack-trust.md` § Resource Limits](../../../docs/architecture/pack-trust.md#1-resource-limits).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
