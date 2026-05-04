# Pack Error-Code Catalog + Lint

Status: planned

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
Single canonical table of every `pack.error.*` code emitted by the
content runtime. Tasks that introduce a new code MUST add it to this
catalog in the same change. The catalog drives the localized error
table the mod manager renders, the telemetry buckets, and the
typed enum re-exported from `src/content-runtime/error-codes.ts`.
A small lint script confirms every `pack.error.*` token referenced
elsewhere in the repo exists in the catalog.

Read First:
- [`docs/architecture/content-system-policy.md`](../../../docs/architecture/content-system-policy.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)

Inputs:
- Audit-derived initial codes (manifest, dependency, override,
  asset, sandbox, balance, signature, canonical, locale)
- `content-schema/schemas/localization.schema.json`

Outputs:
- `docs/architecture/pack-error-codes.md` — the catalog table.
- `scripts/check-pack-error-codes.mjs` — lint that fails on a
  `pack.error.*` token referenced anywhere in the repo that is not
  in the catalog.
- `npm run validate:error-codes` script entry, wired into
  `npm run validate`.
- `src/content-runtime/error-codes.ts` re-exports the catalog as a
  typed enum (deferred until runtime work begins; the doc lands now).

Owned Paths:
- `docs/architecture/pack-error-codes.md`
- `scripts/check-pack-error-codes.mjs`

Owned Paths (shared):
- `package.json`

Dependencies:
- mvp.02b-asset-pipeline.11-content-system-policy-doc

Acceptance Criteria:
- The catalog includes the initial 15 codes covering manifest,
  dependency, override, asset, sandbox, balance, signature,
  canonical, and locale failures with severity and localization
  key per row.
- `npm run validate:error-codes` exits 0 with no unknown codes
  present in the repo, and exits 1 if a task or schema introduces a
  `pack.error.*` token that is not in the catalog.
- Schema reference: `content-schema/schemas/localization.schema.json`
  (the catalog mandates a localization-key column).
- Shared-path edits to `package.json` are additive only — one new
  `validate:error-codes` script entry; must not rewrite existing
  scripts; primary owner of `package.json` remains the workspace
  setup task.

Verify:
- npm run validate:error-codes
- npm run validate

Estimated Time:
- 3 hours
