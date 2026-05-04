# Content-System Policy Doc

Status: done

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
Author the single canonical cross-pack policy document that pack
contract, asset pipeline, mod system, and determinism docs link into.
The doc consolidates pack identity, dependency resolution, override
precedence, asset integrity, per-record versioning, localization
bundling, the validation pipeline, error codes, and the canonical-pack
registry. Without this anchor, fixes for the eight other content-system
audit gaps scatter across nine files.

Read First:
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Inputs:
- The nine audit gaps in `docs/readiness-audit/13-content-system.md`
- Existing references in `pack-contract.md`, `content-platform.md`,
  `schema-matrix.md`

Outputs:
- `docs/architecture/content-system-policy.md`
- Updates to `docs/architecture/pack-contract.md`,
  `docs/architecture/content-platform.md`,
  `docs/architecture/schema-matrix.md`, and `AGENTS.md` to cross-link
  the new doc.

Owned Paths:
- `docs/architecture/content-system-policy.md`

Owned Paths (shared):
- `docs/architecture/pack-contract.md`
- `docs/architecture/content-platform.md`
- `docs/architecture/schema-matrix.md`
- `AGENTS.md`

Dependencies:
- None

Acceptance Criteria:
- `content-system-policy.md` covers the nine canonical sections (pack
  identity, dependency resolution, override precedence, asset
  integrity, per-record versioning, localization, validation pipeline,
  error codes, canonical-pack registry).
- Every other affected doc cross-links into the policy doc instead of
  restating the rule.
- `npm run validate:links` passes against the new file.
- Shared-path edits to `pack-contract.md`, `content-platform.md`,
  `schema-matrix.md`, and `AGENTS.md` are additive only — must not
  rewrite the primary prose owned by their respective architecture
  tasks; this task owns only the new policy doc.

Verify:
- npm run validate:links
- npm run validate

Estimated Time:
- 2 hours
