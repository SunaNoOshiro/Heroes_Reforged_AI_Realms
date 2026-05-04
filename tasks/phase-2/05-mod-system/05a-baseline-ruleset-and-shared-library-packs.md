# Baseline Ruleset + Shared Library Packs

Status: planned

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
Promote the skeleton shared library packs that already exist in
[`content-schema/examples/packs/`](../../../content-schema/examples/packs/)
to authoritative runtime packs under `resources/packs/`, and author
the baseline ruleset pack alongside them. This task is about stable
shared foundations, not faction volume — skeletons for
`shared-skills` and `shared-abilities` are already in fixtures; copy
and expand them.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Inputs:
- Canonical ruleset at
  [`content-schema/examples/records/rulesets/baseline.ruleset.json`](../../../content-schema/examples/records/rulesets/baseline.ruleset.json)
- Skeleton library packs at
  [`content-schema/examples/packs/shared-skills/`](../../../content-schema/examples/packs/shared-skills/)
  and [`content-schema/examples/packs/shared-abilities/`](../../../content-schema/examples/packs/shared-abilities/)
- Baseline numeric corridor in [`research/deep-research-report.md`](../../../research/deep-research-report.md)
- Pack loading, signature, and sandbox rules from Tasks 1–4

Outputs:
- `resources/packs/baseline-ruleset/manifest.json`
- verify `resources/packs/baseline-ruleset/ruleset.json` from
  `mvp.04-faction-emberwild.04-baseline-ruleset` is present and
  byte-identical to the canonical example
- `resources/packs/shared-skills/manifest.json` + one skill per
  secondary-skill tree (28 skills × 3 mastery levels by end of
  phase-2)
- `resources/packs/shared-abilities/manifest.json` + the creature
  abilities referenced by the six first-party factions
- `resources/packs/shared-spells/manifest.json` + the spells listed
  in `tasks/phase-2/01-spells-artifacts/`
- `resources/packs/shared-artifacts/manifest.json`

Owned Paths:
- `resources/packs/baseline-ruleset/manifest.json`
- `resources/packs/shared-skills/manifest.json`
- `resources/packs/shared-abilities/manifest.json`
- `resources/packs/shared-spells/manifest.json`
- `resources/packs/shared-artifacts/manifest.json`

Dependencies:
- phase-2.05-mod-system.01-zip-pack-loader-jszip-plus-manifest-parser
- phase-2.05-mod-system.02-ed25519-signature-verification
- phase-2.05-mod-system.03-sandbox-mode-for-ai-generated-packs
- phase-2.05-mod-system.04-mod-manager-ui-install-enable-disable
- mvp.02-content-schemas.01-unit-schema
- mvp.02-content-schemas.02-faction-schema
- mvp.02-content-schemas.03-spell-schema
- mvp.02-content-schemas.04-artifact-schema
- mvp.02-content-schemas.05-building-schema
- mvp.02-content-schemas.06-ruleset-schema
- mvp.02-content-schemas.07-hero-schema
- mvp.02-content-schemas.08-adventure-building-plus-map-object-schemas
- mvp.02-content-schemas.09-animation-vfx-sound-townpresentation-schemas
- mvp.02-content-schemas.10-zod-validators-for-all-schemas
- mvp.02-content-schemas.11-schema-version-field-plus-migration-stub
- mvp.02-content-schemas.12-formula-dsl
- mvp.02-content-schemas.13-effect-registry
- mvp.04-faction-emberwild.04-baseline-ruleset

Acceptance Criteria:
- Baseline ruleset pack loads as a standalone pack with no faction data
- Shared library packs contain only cross-faction reusable records
- Every `shared:*` id referenced by a first-party faction resolves
  through one of these library packs
- All packs validate with zero schema or cross-reference errors
- No first-party faction-specific IDs leak into any shared-library pack
- Every shared-library pack manifest declares its dependencies in the
  `{ id, version }` object form pinned in
  [`pack-resolver.md`](../../../docs/architecture/pack-resolver.md)
  (no plain-string `dependencies[]`).
- Pack `id` values follow the namespace pattern in
  [`content-system-policy.md` § 1](../../../docs/architecture/content-system-policy.md#1-pack-identity).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
