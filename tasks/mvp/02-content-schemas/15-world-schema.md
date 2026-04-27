# World Schema

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Wire the world-pack contract into runtime validation. A world defines
biome sets, procedural generator presets, and ambient presentation
bindings. Faction, scenario, and renderer code consume world IDs and
registry lookups, not raw terrain or art paths.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)

Inputs:
- `content-schema/schemas/world.schema.json`
- `content-schema/examples/packs/emberwild-world/world.json`
- Presentation schema outputs from Task 9

Outputs:
- `src/content-schema/world.ts` exporting `WorldSchema` and `World`
- Validation fixture for the Emberwild world example

Owned Paths:
- `src/content-schema/world.ts`

Dependencies:
- mvp.02-content-schemas.09-animation-vfx-sound-townpresentation-schemas

Acceptance Criteria:
- `content-schema/examples/packs/emberwild-world/world.json` validates
  against `content-schema/schemas/world.schema.json`
- Missing `biomeIds`, `generatorPresetIds`, or `presentation.loadingArtId`
  is rejected with a JSON path
- Runtime types expose world IDs and presentation asset IDs without
  resolving file paths directly

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
