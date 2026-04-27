# Pack Completeness Validator — All Required Assets Present

Status: planned

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
Before a pack is published or used in gameplay, verify that all required assets are present. A faction pack with missing unit animations should be refused at load time with a specific error.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- Loaded pack file tree, unit/hero/building definitions

Outputs:
- `src/engine/pack-validator.ts`
- `validatePackAssets(pack: LoadedPack): ValidationReport`
- `ValidationReport`: `{ errors: MissingAsset[], warnings: MissingAsset[] }`

Owned Paths:
- `src/engine/pack-validator.ts`

Required asset checklist per unit:
- [ ] `sprites/{unitId}.png` — sprite sheet
- [ ] `portraits/unit-{unitId}.png` — portrait
- [ ] `icons/unit-{unitId}-icon.png` — icon
- [ ] `animations/{unitId}-idle.anim.json`
- [ ] `animations/{unitId}-walk.anim.json`
- [ ] `animations/{unitId}-attack.anim.json`
- [ ] `animations/{unitId}-hit.anim.json`
- [ ] `animations/{unitId}-death.anim.json`
- [ ] `sounds/sounds.json` references `unit.{unitId}.attack` and `unit.{unitId}.death`

Required per faction:
- [ ] `assets/town/town-screen-bg.png`
- [ ] `assets/battle/battlefield-grass.png` (minimum one backdrop)
- [ ] `assets/ui/faction-color.json`

Errors (block loading): missing sprite sheet, missing portrait
Warnings (allow loading with placeholder): missing icon, missing animation sequence

Dependencies:
- mvp.02b-asset-pipeline.01-manifest-format-plus-pack-registry
- mvp.02b-asset-pipeline.02-animation-definition-json-format
- mvp.02b-asset-pipeline.03-sound-manifest-format
- mvp.02b-asset-pipeline.04-asset-registry-id-based-resolution-no-hardcoded-paths
- mvp.02b-asset-pipeline.05-async-asset-loader-with-caching

Acceptance Criteria:
- Emberwild pack passes with 0 errors and 0 warnings (fully complete)
- Pack missing `ember-archer.png` → error: "Missing required sprite: sprites/ember-archer.png"
- Pack missing an icon → warning (not error) — placeholder renders instead
- Validator runs in < 500 ms for a full 14-record faction pack

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
