# Sylvan + Stormspire Reference Packs

Status: planned

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
Author two official reference faction packs that cover distinct
archetypes beyond Emberwild and Necropolis: a resilient nature faction
and a fragile high-magic faction. The goal is schema-surface coverage,
not perfect balance on the first pass.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Inputs:
- Shared packs from Task 5a
- Baseline corridor in `research/deep-research-report.md`
- Existing Emberwild and Necropolis packs as structural templates

Outputs:
- `resources/packs/sylvan-faction/`
- `resources/packs/stormspire-faction/`
- each pack includes `manifest.json`, `faction.json`, `units/`,
  `buildings/`, and `heroes/`

Owned Paths:
- `resources/packs/sylvan-faction/`
- `resources/packs/stormspire-faction/`
- `resources/packs/sylvan-faction/manifest.json`
- `resources/packs/sylvan-faction/faction.json`
- `resources/packs/sylvan-faction/units/`
- `resources/packs/stormspire-faction/manifest.json`
- `resources/packs/stormspire-faction/faction.json`
- `resources/packs/stormspire-faction/units/`

Dependencies:
- phase-2.05-mod-system.05a-baseline-ruleset-and-shared-library-packs
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
- phase-2.03-second-faction.01-necropolis-units-json-7-units-plus-upgrades
- phase-2.03-second-faction.02-necropolis-building-tree-json
- phase-2.03-second-faction.03-necropolis-hero-roster-json

Acceptance Criteria:
- Each faction has 7 unit tiers with upgrade relationships
- Each faction has at least 3 heroes and a complete building tree
- Both packs validate and resolve references without engine special
  cases
- Pack-local content uses shared-library IDs only through declared
  dependencies

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
