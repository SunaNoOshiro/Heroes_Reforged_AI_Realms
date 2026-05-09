# Reproducible `.hrmod` Archive Contract

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Pin `.hrmod` ZIP determinism and ship the CI gate that re-builds
canonical fixtures and re-hashes the ZIP bytes against a recorded
`archiveHash`. Closes Improvement: Reproducible-Archive
Contract.

Read First:
- [`docs/architecture/reproducible-archive.md`](../../../docs/architecture/reproducible-archive.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/pack-signing.md`](../../../docs/architecture/pack-signing.md)
- [`docs/architecture/atlas-pipeline.md`](../../../docs/architecture/atlas-pipeline.md)

Inputs:
- Canonical pack source under `resources/packs/<id>/`.
- Per-pack `signedBuild.json` published alongside the `.hrmod`
  archive.

Outputs:
- `tools/scripts/build-pack.ts` — canonical pack-build script with
  the determinism rules pinned (entry order, timestamps,
  compression level, extra fields, external attributes).
- `tools/lint/reproducible-archive.ts` — re-builds a fixture pack
  from source, asserts the resulting ZIP bytes SHA-256 equals the
  pinned `archiveHash`.
- `signedBuild.json` schema and per-canonical-pack release artifact.
- `scripts/check-reproducible-archive.mjs` — wraps the lint as a
  CI gate.

Owned Paths:
- `docs/architecture/reproducible-archive.md`
- `tools/scripts/build-pack.ts`
- `tools/lint/reproducible-archive.ts`
- `scripts/check-reproducible-archive.mjs`

Dependencies:
- mvp.02-content-schemas.44-pack-signing-verifier

Acceptance Criteria:
- The build script emits byte-stable `.hrmod` archives across
  invocations on the same input tree (verified by hashing the
  output twice and asserting equal bytes).
- Lexicographic entry order, ZIP-epoch timestamps, DEFLATE level 6,
  empty extra fields, and the pinned external attributes are
  verified by parsing the produced ZIP byte-for-byte.
- Each canonical pack ships a `signedBuild.json` declaring
  `{ packId, version, archiveHash, signedCanonicalMessage,
  signature, keyId, builtAt, builderToolVersion }`.
- The CI gate `npm run validate:reproducible-archive` re-builds
  every canonical pack fixture under `resources/packs/`; the
  produced SHA-256 must match the recorded `archiveHash`.
- The gate is wired into `npm run validate`.
- Whole-archive signing is **not** introduced; the canonical
  signed message remains manifest + `assetDigest` per
  [`pack-signing.md` § 1](../../../docs/architecture/pack-signing.md).

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
