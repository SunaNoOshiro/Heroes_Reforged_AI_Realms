# Animation/VFX/Sound/TownPresentation Schemas

Status: planned

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Define shared presentation schemas used by gameplay records. These
schemas make hero animations, spell animations, building animations,
town overlays, and sound/VFX bindings first-class content.

Read First:
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- Spell schema (Task 3) and artifact schema (Task 4) for VFX/sound
  attachment points
- Building schema (Task 5) and hero schema (Task 7) for animation and
  town-presentation attachment points
- Pack contract docs for asset-ID ownership and manifest boundaries

Outputs:
- `src/content-schema/animation.ts`
- `src/content-schema/vfx.ts`
- `src/content-schema/sounds.ts`
- `src/content-schema/town-presentation.ts`
- `src/content-schema/easing.ts`
- `content-schema/schemas/animation.schema.json`
- `content-schema/schemas/vfx.schema.json`
- `content-schema/schemas/sound-set.schema.json`
- `content-schema/schemas/town-presentation.schema.json`
- `content-schema/schemas/easing.schema.json`
- canonical examples under `content-schema/examples/records/animations/`,
  `content-schema/examples/records/vfx/`,
  `content-schema/examples/records/sounds/`, and
  `content-schema/examples/records/town-presentations/`

Owned Paths:
- `src/content-schema/animation.ts`
- `src/content-schema/vfx.ts`
- `src/content-schema/sounds.ts`
- `src/content-schema/town-presentation.ts`
- `src/content-schema/easing.ts`
- `content-schema/schemas/animation.schema.json`
- `content-schema/schemas/vfx.schema.json`
- `content-schema/schemas/sound-set.schema.json`
- `content-schema/schemas/town-presentation.schema.json`
- `content-schema/schemas/easing.schema.json`
- `content-schema/examples/records/animations/`
- `content-schema/examples/records/vfx/`
- `content-schema/examples/records/sounds/`
- `content-schema/examples/records/town-presentations/`

Dependencies:
- mvp.02-content-schemas.03-spell-schema
- mvp.02-content-schemas.04-artifact-schema
- mvp.02-content-schemas.05-building-schema
- mvp.02-content-schemas.07-hero-schema

Acceptance Criteria:
- Presentation records never embed gameplay logic or mutable state
- Gameplay records reference these presentation records by stable IDs
  only
- Town presentation schema is closed and can express layout slots,
  overlays, and state variants without leaking asset paths into
  gameplay records
- Canonical animation, VFX, sound, and town-presentation examples
  validate cleanly

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
