# Per-Asset Integrity + Build Script

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
Add per-asset SHA-256 integrity verification to the pack-load
pipeline. The schema
[`content-schema/schemas/asset-index.schema.json`](../../../content-schema/schemas/asset-index.schema.json)
already requires a `sha256` field per asset entry; this task
implements the runtime verifier in `src/engine/pack-validator.ts`
(extending the completeness validator) and the author-facing build
script `scripts/build-asset-index.mjs` that walks `<pack>/assets/`
and rewrites `sha256`/`bytes` from the file on disk so authors do
not maintain hashes by hand.

Read First:
- [`docs/architecture/content-system-policy.md`](../../../docs/architecture/content-system-policy.md)
- [`docs/architecture/pack-error-codes.md`](../../../docs/architecture/pack-error-codes.md)

Inputs:
- `content-schema/schemas/asset-index.schema.json`
- `content-schema/examples/packs/emberwild-faction/assets/index.json`

Outputs:
- `scripts/build-asset-index.mjs` — walks `<pack>/assets/` and
  recomputes `sha256` + `bytes` per entry; supports `--check` to
  fail on drift.
- Extension of `src/engine/pack-validator.ts` to fetch each asset,
  compute SHA-256 via WebCrypto's `crypto.subtle.digest`, and emit
  `pack.error.asset.integrity` on mismatch.
- New `npm run generate:asset-index` script entry.

Owned Paths:
- `scripts/build-asset-index.mjs`

Owned Paths (shared):
- `package.json`
- `src/engine/pack-validator.ts`

Dependencies:
- mvp.02b-asset-pipeline.16-pack-error-code-catalog
- mvp.02b-asset-pipeline.11-content-system-policy-doc
- mvp.02b-asset-pipeline.06-pack-completeness-validator-all-required-assets-present

Acceptance Criteria:
- Running `npm run generate:asset-index` against the canonical
  emberwild pack rewrites `sha256` and `bytes` for every entry from
  the on-disk file (or a deterministic placeholder when the file is
  absent in this planning-first repo).
- Re-running with `--check` reports zero drift and exits 0.
- Tampering with one asset byte and re-running with `--check` exits
  non-zero with the affected pack listed.
- `validatePackAssets()` returns `pack.error.asset.integrity` for a
  pack whose declared `sha256` does not match the bytes on disk.
- Shared-path edits to `package.json` (one new script entry) and
  `src/engine/pack-validator.ts` are additive only — must not
  rewrite the primary contract owned by Task 06; primary owner of
  the validator file remains Task 06, this task only extends with
  hash verification.
- Schema reference: `content-schema/schemas/asset-index.schema.json`.

Verify:
- npm run generate:asset-index -- --check
- npm run validate

Estimated Time:
- 4 hours
