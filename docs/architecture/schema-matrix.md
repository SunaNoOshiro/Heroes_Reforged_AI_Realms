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
| `AnimationSet` | no gameplay logic | event-to-sequence mapping; supports multi-track (`body` / `status` / `fx`) and multi-event (`events[]`) timelines, plus uniform-grid OR explicit per-frame metadata for multi-page atlases. See [`animation-contract.md`](./animation-contract.md). | [animation](../../content-schema/schemas/animation.schema.json) | [ash-hound](../../content-schema/examples/records/animations/ash-hound.animation.json), [dual-strike](../../content-schema/examples/records/animations/dual-strike.animation.json), [burning-status](../../content-schema/examples/records/animations/burning-status.animation.json), [multi-page-attack](../../content-schema/examples/records/animations/multi-page-attack.animation.json) |
| `VfxSet` | no gameplay logic | spell or event visuals; closed phase set (`cast` / `projectile` / `impact`); missing phases fall back to no-op silently | [vfx](../../content-schema/schemas/vfx.schema.json) | [ember-lance-vfx](../../content-schema/examples/records/vfx/ember-lance.vfx.json) |
| `Easing` | no gameplay logic — pure deterministic interpolation curve | shared by animation / vfx / town-presentation wherever a value is interpolated over time | [easing](../../content-schema/schemas/easing.schema.json) | embedded in animation / vfx / town-presentation examples |
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
| `MapTrigger` | scenario-scoped trigger: closed `when` condition + closed effect list | none | [map-trigger](../../content-schema/schemas/map-trigger.schema.json) | [day30-reinforcements](../../content-schema/examples/records/map-triggers/day30-reinforcements.map-trigger.json) |
| `ThemedWeek` | weekly random-event content (effects applied at WEEK_START) | localized description | [themed-week](../../content-schema/schemas/themed-week.schema.json) | [`content-schema/examples/records/themed-weeks/`](../../content-schema/examples/records/themed-weeks/) |
| `Effect` | closed discriminated union of gameplay effects (damage, heal, status, modify_stat, summon, ...) | none | [effect](../../content-schema/schemas/effect.schema.json) | embedded in spell/artifact/ability examples |
| `Targeting` | closed targeting kinds (single-unit, line, cone, mass, self) | none | [targeting](../../content-schema/schemas/targeting.schema.json) | embedded in spell/ability examples |
| `Formula` | closed AST over integer ops (`add`, `sub`, `mul`, `divFloor`, `ratio`, `min`, `max`, `clamp`, `neg`, `abs`) plus `var`/`const` | none | [formula](../../content-schema/schemas/formula.schema.json) | embedded in ruleset/effect examples |
| `GenerationRequest` | provider-neutral AI generation input (theme, tier bands, constraints) | none | [generation-request](../../content-schema/schemas/generation-request.schema.json) | [emberwild request](../../content-schema/examples/generation/emberwild.generation-request.json) |
| `GeneratedFaction` | provider-neutral AI generation output — a draft faction pack shape | none | [generated-faction](../../content-schema/schemas/generated-faction.schema.json) | [emberwild generated faction](../../content-schema/examples/generation/emberwild.generated-faction.json) |
| `GameState` | top-level deterministic engine state; closed shape, normalized collections, canonical-JSON serialized | none | [game-state](../../content-schema/schemas/game-state.schema.json) | [game-state example](../../content-schema/examples/game-state.example.json) |
| `UIComponentRegistry` | none — UI presentation only | maps `data-component` IDs from screen mockups and `### Component Tree` entries to runtime constructors; resolved per [`ui-component-resolver.md`](./ui-component-resolver.md) | [ui-component-registry](../../content-schema/schemas/ui-component-registry.schema.json) | [ui-component-registry example](../../content-schema/examples/ui-component-registry.example.json) |
| `ErrorState` | none — UI presentation only | canonical UI error record consumed by toasts, recoverable-error panels, and telemetry sinks; pinned in [`ui-state-contract.md` § Error State](./ui-state-contract.md#error-state) | [error-state](../../content-schema/schemas/error-state.schema.json) | [recoverable-load](../../content-schema/examples/records/error-state/recoverable-load.error-state.json), [invalid-target](../../content-schema/examples/records/error-state/invalid-target.error-state.json), [save-failed](../../content-schema/examples/records/error-state/save-failed.error-state.json) |
| `ModalEntry` | none — UI presentation only | one frame on `state.ui.modalStack`; carries caller route, focus restoration, severity, and params per [`ui-routing.md` § Modal Stack](./ui-routing.md#modal-stack) | [modal-entry](../../content-schema/schemas/modal-entry.schema.json) | [system-menu](../../content-schema/examples/records/modal-entry/system-menu.modal-entry.json), [quit-confirmation](../../content-schema/examples/records/modal-entry/quit-confirmation.modal-entry.json), [recruitment](../../content-schema/examples/records/modal-entry/recruitment.modal-entry.json) |
| `HotkeyRegistry` | none — UI presentation only | global registry of keyboard bindings, scopes, and rebindability per [`ui-hotkeys.md`](./ui-hotkeys.md) | [hotkey](../../content-schema/schemas/hotkey.schema.json) | [global-default](../../content-schema/examples/records/hotkey/global-default.hotkey.json) |
| `ValidationError` | none — validator output only | canonical, transport-friendly error record produced by every validator (CI repo-contract checker, runtime Zod adapter, engine pre-dispatch validator, AI feedback loop). Pinned in [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json). | [validation-error](../../content-schema/schemas/validation-error.schema.json) | [missing-required](../../content-schema/examples/records/validation-error/missing-required.error.json), [unknown-enum](../../content-schema/examples/records/validation-error/unknown-enum.error.json) |
| `AiProfile` | optional per-faction or per-hero AI personality (Want-weight overrides) | none | [ai-profile](../../content-schema/schemas/ai-profile.schema.json) | [default](../../content-schema/examples/records/ai-profiles/default.ai-profile.json) |
| `Event` | none — read-only deterministic-engine output. Closed discriminated union of every event kind emitted by command handlers; consumed by animation timeline / sound system per [`event-system.md`](./event-system.md) | none — events carry no presentation fields; consumers translate kind+payload into clips and audio cues | [event](../../content-schema/schemas/event.schema.json) | [event-log](../../content-schema/examples/events/event-log.example.json) |

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
- `command.schema.json` requires a `metadata` block with a
  pattern-checked `nonce` on every command kind. The dispatcher rejects
  duplicate nonces; see
  [`command-schema.md` § Deduplication](./command-schema.md#deduplication).
- `event.schema.json` is the read-only flip-side of `command.schema.json`:
  command handlers return `events: Event[]` alongside the next state.
  Each event has a closed `kind` discriminator and a `payload` object
  with `additionalProperties: false`. Per-kind payload, emitter, and
  consumer mapping live in [`event-schema.md`](./event-schema.md);
  the runtime contract lives in [`event-system.md`](./event-system.md).
- `game-state.schema.json` is the closed top-level state shape consumed
  by the reducer; see
  [`state-shape.md`](./state-shape.md).

## Example Policy

- If a record kind can stand on its own, it should have at least one
  canonical example under `content-schema/examples/records/`.
- Embedded-only contracts such as `Targeting`, `Effect`, and `Formula`
  intentionally demonstrate usage through parent records instead of
  standalone files.

## Migrations

Schema evolution rules — when to bump `schemaVersion`, the canonical
filename and required exports for a migration entry, the deprecation
window, and the worked example — live in
[`schema-migration-policy.md`](./schema-migration-policy.md). Migration
entries themselves live under
[`src/content-schema/migrations/`](../../src/content-schema/migrations/).
Enum-value lifecycle (additive → deprecated → aliased → removed) lives
in [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md). Default
declarations and JSON Schema ↔ Zod parity rules live in
[`schema-defaults-policy.md`](./schema-defaults-policy.md). Loader
behaviour on a mismatch (refuse / migrate / degrade across offline,
multiplayer, trusted-replay contexts) lives in
[`version-policy.md`](./version-policy.md).
