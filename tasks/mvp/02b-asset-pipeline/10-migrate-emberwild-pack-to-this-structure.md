# Migrate Emberwild Pack to Canonical Structure

Status: planned

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
Restructure the reference Emberwild content authored under the
examples tree into the canonical `resources/packs/emberwild-faction/`
layout described in
[`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md).
This validates that the pack-contract architecture actually works
before any new faction is authored.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- Emberwild records from `04-faction-emberwild.md`
- Canonical pack structure (Tasks 1–6)

Outputs:
- `resources/packs/emberwild-faction/` — fully structured Emberwild
  pack (manifest, faction.json, units/, heroes/, buildings/,
  abilities/, animations/, sounds/, assets/)
- `resources/packs/shared-library/` — cross-faction abilities, spells,
  artifacts, terrain definitions
- `resources/packs/baseline-ruleset/` — ruleset constants and formulas
- Content loader loads from `resources/packs/` at runtime
- `.hrmod` export works for all three packs via the archive builder

Owned Paths:
- `resources/packs/emberwild-faction/`
- `resources/packs/shared-library/`
- `resources/packs/baseline-ruleset/`
- `resources/packs/`

Dependencies:
- mvp.02b-asset-pipeline.01-manifest-format-plus-pack-registry
- mvp.02b-asset-pipeline.02-animation-definition-json-format
- mvp.02b-asset-pipeline.03-sound-manifest-format
- mvp.02b-asset-pipeline.04-asset-registry-id-based-resolution-no-hardcoded-paths
- mvp.02b-asset-pipeline.05-async-asset-loader-with-caching
- mvp.02b-asset-pipeline.06-pack-completeness-validator-all-required-assets-present

Acceptance Criteria:
- `validatePackAssets("emberwild-faction")` passes with 0 errors
- Emberwild pack loads and renders identically to the pre-migration
  examples-based load path
- No code in `src/renderer/` or `src/ui/` references Emberwild asset
  paths directly — all lookups go through the asset registry
- CI passes after migration, including the `check-repo-contracts`
  validator on every example record

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
