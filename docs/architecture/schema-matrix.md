# Schema Matrix

Canonical source files:

- Schemas: [`content-schema/schemas/`](../../content-schema/schemas/)
- Examples: [`content-schema/examples/`](../../content-schema/examples/)

## Global Rules

- Every record has `schemaVersion` and a stable namespaced `id`.
- Cross-record references use IDs, never file paths.
- Gameplay and presentation stay separate.
- Unknown deterministic gameplay fields should fail validation unless a
  schema explicitly leaves that area open.
- Migrations must preserve IDs and cross-pack references.

## Record Types

| Record | Gameplay Role | Presentation Role | Schema | Example |
|---|---|---|---|---|
| `Unit` | stats, cost, growth, abilities, upgrades | sprite, portrait, icon, animation, sound, map sprite | [unit](../../content-schema/schemas/unit.schema.json) | [ash-hound](../../content-schema/examples/packs/emberwild-faction/units/ash-hound.unit.json) |
| `Hero` | class, army, stats, skills, specialty | portrait, paper doll, map sprite, animation, sound | [hero](../../content-schema/schemas/hero.schema.json) | [kaelis](../../content-schema/examples/packs/emberwild-faction/heroes/kaelis.hero.json) |
| `Faction` | unit IDs, hero IDs, building IDs, alignment | town background, music, UI theme, banner | [faction](../../content-schema/schemas/faction.schema.json) | [emberwild](../../content-schema/examples/packs/emberwild-faction/faction.json) |
| `Building` | prerequisites, cost, unlocks, effects | icon, overlay, build animation, sound | [building](../../content-schema/schemas/building.schema.json) | [kennels](../../content-schema/examples/packs/emberwild-faction/buildings/kennels.building.json) |
| `Spell` | school, level, targeting, mastery, effects | icon, animation, VFX, sound | [spell](../../content-schema/schemas/spell.schema.json) | [ember-lance](../../content-schema/examples/records/spells/ember-lance.spell.json) |
| `Artifact` | slots, effects, combo, restrictions | icon, inventory art, paper-doll layer, VFX, sound | [artifact](../../content-schema/schemas/artifact.schema.json) | [torch-of-cinders](../../content-schema/examples/records/artifacts/torch-of-cinders.artifact.json) |
| `AdventureBuilding` | ownership, visit rules, economy, state machine | map sprite, state visuals, animation, VFX, sound | [adventure-building](../../content-schema/schemas/adventure-building.schema.json) | [crystal-mine](../../content-schema/examples/records/adventure-buildings/crystal-mine.adventure-building.json) |
| `MapObject` | category, interaction, rewards, placement | sprite, state visuals, animation, VFX, sound | [map-object](../../content-schema/schemas/map-object.schema.json) | [treasure-chest](../../content-schema/examples/records/map-objects/treasure-chest.map-object.json) |
| `NeutralStackTemplate` | spawn rules, rewards, attitude | map presentation bindings | [neutral-stack-template](../../content-schema/schemas/neutral-stack-template.schema.json) | [mine-guard](../../content-schema/examples/records/neutral-stack-templates/mine-guard-t2.neutral-stack-template.json) |
| `TownPresentation` | none or minimal gameplay | town layout, slots, overlays, state variants, sound | [town-presentation](../../content-schema/schemas/town-presentation.schema.json) | [emberwild-main](../../content-schema/examples/records/town-presentations/emberwild-main.town-presentation.json) |
| `AnimationSet` | no gameplay logic | event-to-sequence mapping | [animation](../../content-schema/schemas/animation.schema.json) | [ash-hound-anim](../../content-schema/examples/records/animations/ash-hound.animation.json) |
| `VfxSet` | no gameplay logic | spell or event visuals | [vfx](../../content-schema/schemas/vfx.schema.json) | [ember-lance-vfx](../../content-schema/examples/records/vfx/ember-lance.vfx.json) |
| `SoundSet` | no gameplay logic | event-to-sound mapping | [sound-set](../../content-schema/schemas/sound-set.schema.json) | [kaelis-sound](../../content-schema/examples/records/sounds/kaelis.sound-set.json) |
| `Manifest` | pack identity, dependencies, capabilities, trust flags, provides | none | [manifest](../../content-schema/schemas/manifest.schema.json) | [faction-pack](../../content-schema/examples/packs/emberwild-faction/manifest.json) |
| `AssetIndex` | asset ID ownership | maps asset IDs to concrete files | [asset-index](../../content-schema/schemas/asset-index.schema.json) | [asset-index-example](../../content-schema/examples/packs/emberwild-faction/assets/index.json) |
| `Localization` | none | locale string table for UI labels, status text, disabled reasons, and errors | [localization](../../content-schema/schemas/localization.schema.json) | embedded in screen data contracts |
| `World` | biome sets, terrain, generators, object pools | ambient presentation bindings | [world](../../content-schema/schemas/world.schema.json) | [emberwild-world](../../content-schema/examples/packs/emberwild-world/world.json) |
| `Ruleset` | formulas and constants | none | [ruleset](../../content-schema/schemas/ruleset.schema.json) | [baseline ruleset](../../content-schema/examples/records/rulesets/baseline.ruleset.json) |
| `Ability` | unit-intrinsic trigger and targeting, closed effect set | icon, VFX, sound hooks | [ability](../../content-schema/schemas/ability.schema.json) | [pack-hunt](../../content-schema/examples/packs/emberwild-faction/abilities/pack-hunt.ability.json) |
| `HeroClass` | primary-stat growth weights, secondary-skill offer weights | none | [hero-class](../../content-schema/schemas/hero-class.schema.json) | [cinder-knight](../../content-schema/examples/records/hero-classes/cinder-knight.hero-class.json) |
| `Skill` | secondary-skill level effects (basic / advanced / expert) | icon | [skill](../../content-schema/schemas/skill.schema.json) | [pathfinding-basic](../../content-schema/examples/packs/shared-skills/skills/pathfinding-basic.skill.json) |
| `Scenario` | map layout, starting forces, victory/loss conditions | map thumbnail | [scenario](../../content-schema/schemas/scenario.schema.json) | [emberwild-1v1](../../content-schema/examples/records/scenarios/emberwild-1v1.scenario.json) |
| `Effect` | closed discriminated union of gameplay effects (damage, heal, status, modify_stat, summon, ...) | none | [effect](../../content-schema/schemas/effect.schema.json) | embedded in spell/artifact/ability examples |
| `Targeting` | closed targeting kinds (single-unit, line, cone, mass, self) | none | [targeting](../../content-schema/schemas/targeting.schema.json) | embedded in spell/ability examples |
| `Formula` | closed AST over integer ops (`add`, `sub`, `mul`, `divFloor`, `ratio`, `min`, `max`, `clamp`, `neg`, `abs`) plus `var`/`const` | none | [formula](../../content-schema/schemas/formula.schema.json) | embedded in ruleset/effect examples |
| `GenerationRequest` | provider-neutral AI generation input (theme, tier bands, constraints) | none | [generation-request](../../content-schema/schemas/generation-request.schema.json) | [emberwild request](../../content-schema/examples/generation/emberwild.generation-request.json) |
| `GeneratedFaction` | provider-neutral AI generation output — a draft faction pack shape | none | [generated-faction](../../content-schema/schemas/generated-faction.schema.json) | [emberwild generated faction](../../content-schema/examples/generation/emberwild.generated-faction.json) |

## Fast Dependency View

- `Unit`, `Hero`, `Spell`, `Artifact`, `Building`, `AdventureBuilding`,
  `MapObject`, and `TownPresentation` all depend on presentation IDs.
- `Faction` depends on unit, hero, and building IDs.
- `World` depends on map-object, terrain, and generator-related IDs.
- `Manifest`, `AssetIndex`, and `Localization` make packs loadable,
  swappable, and localizable without changing gameplay records.
- `Spell`, `Artifact`, and `Ability` all embed `Effect` records and
  `Targeting` records — these schemas are shared, not duplicated per
  record type.
- Numeric values inside `Effect` and `Ruleset` are expressed as
  `Formula` AST nodes, never as strings. Evaluation is done by the
  fixed-point evaluator (see
  [`tasks/mvp/02-content-schemas/12-formula-dsl.md`](../../tasks/mvp/02-content-schemas/12-formula-dsl.md)).
- `GenerationRequest` and `GeneratedFaction` are the only surface
  crossing the AI-provider boundary — see
  [`tasks/phase-3/02-ai-generation/00-generation-io-schemas.md`](../../tasks/phase-3/02-ai-generation/00-generation-io-schemas.md).

## Example Policy

- If a record kind can stand on its own, it should have at least one
  canonical example under `content-schema/examples/records/`.
- Embedded-only contracts such as `Targeting`, `Effect`, and `Formula`
  intentionally demonstrate usage through parent records instead of
  standalone files.
