# Ashlord + Deepway Reference Packs

Status: planned

Module: [Pack Runtime / Mod System (M4)](../05-mod-system.md)

Description:
Author two more official reference factions that stress different pack
shapes: summon/reinforce-heavy infernal content and a late-tier-heavy
warlock faction. Together with Task 5b, this completes the first-party
reference roster.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)

Inputs:
- Shared packs from Task 5a
- Reference-faction authoring patterns from Task 5b
- Baseline corridor in `research/deep-research-report.md`

Outputs:
- `resources/packs/ashlord-faction/`
- `resources/packs/deepway-faction/`
- each pack includes `manifest.json`, `faction.json`, `units/`,
  `buildings/`, and `heroes/`

Owned Paths:
- `resources/packs/ashlord-faction/`
- `resources/packs/deepway-faction/`
- `resources/packs/ashlord-faction/manifest.json`
- `resources/packs/ashlord-faction/faction.json`
- `resources/packs/ashlord-faction/units/`
- `resources/packs/deepway-faction/manifest.json`
- `resources/packs/deepway-faction/faction.json`
- `resources/packs/deepway-faction/units/`

Dependencies:
- phase-2.05-mod-system.05a-baseline-ruleset-and-shared-library-packs
- phase-2.05-mod-system.05b-sylvan-and-stormspire-reference-packs
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

Acceptance Criteria:
- Each faction demonstrates at least one mechanic not already covered by
  Emberwild, Necropolis, Sylvan, or Stormspire
- Cross-pack references are explicit through manifests rather than
  hidden assumptions
- Both packs validate and pass cross-reference checks
- No gameplay record embeds raw asset paths

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
