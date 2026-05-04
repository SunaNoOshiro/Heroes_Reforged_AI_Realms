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
| `Manifest` | pack identity, dependencies, capabilities, trust flags, provides, overrides, changelog | none | [manifest](../../content-schema/schemas/manifest.schema.json) | [faction-pack](../../content-schema/examples/packs/emberwild-faction/manifest.json) |
| `AssetIndex` | asset ID ownership + per-asset integrity (`sha256`) + closed `pathScheme` (`pack-relative`) + extension allowlist (png/webp/ogg/mp3/json) per [`ugc-safety.md` § External URL Ban](./ugc-safety.md#1-external-url-ban) | maps asset IDs to concrete files | [asset-index](../../content-schema/schemas/asset-index.schema.json) | [asset-index-example](../../content-schema/examples/packs/emberwild-faction/assets/index.json) |
| `CanonicalPacks` | static registry of first-party packs pinned to an engine build (id, version, signing key, content hash) | none | [canonical-packs](../../content-schema/schemas/canonical-packs.schema.json) | [resources/canonical-packs.json](../../resources/canonical-packs.json) |
| `Localization` | none | locale string table for UI labels, status text, disabled reasons, and errors. Per-pack layout: `<pack>/locales/<locale>.localization.json`, merged by resolution order — see [`content-system-policy.md` § 6](./content-system-policy.md#6-localization-bundling) | [localization](../../content-schema/schemas/localization.schema.json) | [emberwild en](../../content-schema/examples/packs/emberwild-faction/locales/en.localization.json) |
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
| `BalanceConstraints` | numeric caps and tier corridors enforced at every AI-generation entry point (orchestrator, pack loader, editor import) | none | [balance-constraints](../../content-schema/schemas/balance-constraints.schema.json) | [canonical](../../content-schema/examples/balance-constraints/canonical.balance-constraints.json) |
| `GenerationConfig` | orchestrator semver + prompt-template hash + ruleset hash baked into materialized AI-generated packs under `manifest.generation` | none | [generation-config](../../content-schema/schemas/generation-config.schema.json) | [canonical](../../content-schema/examples/generation-config/canonical.generation-config.json) |
| `RetryPolicy` | per-failure-class retry policy (shape / coherence / balance) for the AI-generation pipeline outer loop | none | [retry-policy](../../content-schema/schemas/retry-policy.schema.json) | [canonical](../../content-schema/examples/retry-policy/canonical.retry-policy.json) |
| `ProviderFailure` | closed four-class taxonomy of provider transport-layer failures (transport / auth / quota / content-policy) so the Generation UI renders distinct recovery actions | none | [provider-failure](../../content-schema/schemas/provider-failure.schema.json) | [transport](../../content-schema/examples/provider-failure/transport.provider-failure.json), [auth](../../content-schema/examples/provider-failure/auth.provider-failure.json), [quota](../../content-schema/examples/provider-failure/quota.provider-failure.json), [content-policy](../../content-schema/examples/provider-failure/content-policy.provider-failure.json) |
| `ImageModerationReport` | result of `ModerationProvider.moderateImage(asset)` — three independent verdicts (NSFW / IP-likeness / style conformance) | none | [image-moderation-report](../../content-schema/schemas/image-moderation-report.schema.json) | [pass](../../content-schema/examples/image-moderation-report/pass.image-moderation-report.json), [fail-nsfw](../../content-schema/examples/image-moderation-report/fail-nsfw.image-moderation-report.json) |
| `AssetNormalizationSpec` | per-asset-role dimension/palette/frame-count constraints applied between Stage 5.5 (image moderation) and Stage 6 (pack materialize) | none | [asset-normalization-spec](../../content-schema/schemas/asset-normalization-spec.schema.json) | [canonical](../../content-schema/examples/asset-normalization-spec/canonical.asset-normalization-spec.json) |
| `ProviderResponseCacheEntry` | on-disk record for the launcher-owned provider-response cache keyed by `(promptHash, seed, providerId, modelHint)` | none | [provider-response-cache-entry](../../content-schema/schemas/provider-response-cache-entry.schema.json) | [canonical](../../content-schema/examples/provider-response-cache-entry/canonical.provider-response-cache-entry.json) |
| `RevocationEntry` | one row of the maintainer-signed revocation list (per-pack `contentHash`, `reasonCode`, `revokedAt`, `signature`) | none | [revocation-entry](../../content-schema/schemas/revocation-entry.schema.json) | embedded in `revocation-registry` |
| `RevocationRegistry` | maintainer-signed list of revoked packs consumed at pack load to refuse canonical-context use | none | [revocation-registry](../../content-schema/schemas/revocation-registry.schema.json) | [canonical](../../content-schema/examples/revocation-registry/canonical.revocation-registry.json) |
| `Save` | exportable save record consumed by save-import flow per [`pack-trust.md` § Save Version Bounds](./pack-trust.md#3-save-version-bounds); pinned `saveVersion`, `engineHash`, `packHashes`, `stateHash` | none | [save](../../content-schema/schemas/save.schema.json) | [canonical](../../content-schema/examples/save/canonical.save.json) |
| `PublisherRegistry` | client-local known-publisher signing-key list backing the `tier=signed-known` ribbon on screen 72 per [`pack-trust.md` § Trust Anchors](./pack-trust.md#4-trust-anchors) | none | [publisher-registry](../../content-schema/schemas/publisher-registry.schema.json) | [canonical](../../content-schema/examples/publisher-registry/canonical.publisher-registry.json) |
| `PackRevocationList` | client-local user-decision revocation surface; gates `GRANT_PACK_TRUST` per [`pack-trust.md` § Trust Anchors](./pack-trust.md#4-trust-anchors) | none | [pack-revocation-list](../../content-schema/schemas/pack-revocation-list.schema.json) | [canonical](../../content-schema/examples/pack-revocation-list/canonical.pack-revocation-list.json) |
| `TrustStore` | per-installation persisted record of user pack-trust decisions keyed on `(packId, contentHash)`; bypassed by safe mode | none | [trust-store](../../content-schema/schemas/trust-store.schema.json) | [canonical](../../content-schema/examples/trust-store/canonical.trust-store.json) |
| `GameState` | top-level deterministic engine state; closed shape, normalized collections, canonical-JSON serialized | none | [game-state](../../content-schema/schemas/game-state.schema.json) | [game-state example](../../content-schema/examples/game-state.example.json) |
| `UIComponentRegistry` | none — UI presentation only | maps `data-component` IDs from screen mockups and `### Component Tree` entries to runtime constructors; resolved per [`ui-component-resolver.md`](./ui-component-resolver.md) | [ui-component-registry](../../content-schema/schemas/ui-component-registry.schema.json) | [ui-component-registry example](../../content-schema/examples/ui-component-registry.example.json) |
| `ErrorState` | none — UI presentation only | canonical UI error record consumed by toasts, recoverable-error panels, and telemetry sinks; pinned in [`ui-state-contract.md` § Error State](./ui-state-contract.md#error-state) | [error-state](../../content-schema/schemas/error-state.schema.json) | [recoverable-load](../../content-schema/examples/records/error-state/recoverable-load.error-state.json), [invalid-target](../../content-schema/examples/records/error-state/invalid-target.error-state.json), [save-failed](../../content-schema/examples/records/error-state/save-failed.error-state.json) |
| `ModalEntry` | none — UI presentation only | one frame on `state.ui.modalStack`; carries caller route, focus restoration, severity, and params per [`ui-routing.md` § Modal Stack](./ui-routing.md#modal-stack) | [modal-entry](../../content-schema/schemas/modal-entry.schema.json) | [system-menu](../../content-schema/examples/records/modal-entry/system-menu.modal-entry.json), [quit-confirmation](../../content-schema/examples/records/modal-entry/quit-confirmation.modal-entry.json), [recruitment](../../content-schema/examples/records/modal-entry/recruitment.modal-entry.json) |
| `HotkeyRegistry` | none — UI presentation only | global registry of keyboard bindings, scopes, and rebindability per [`ui-hotkeys.md`](./ui-hotkeys.md) | [hotkey](../../content-schema/schemas/hotkey.schema.json) | [global-default](../../content-schema/examples/records/hotkey/global-default.hotkey.json) |
| `ValidationError` | none — validator output only | canonical, transport-friendly error record produced by every validator (CI repo-contract checker, runtime Zod adapter, engine pre-dispatch validator, AI feedback loop). Pinned in [`validation-error.schema.json`](../../content-schema/schemas/validation-error.schema.json). | [validation-error](../../content-schema/schemas/validation-error.schema.json) | [missing-required](../../content-schema/examples/records/validation-error/missing-required.error.json), [unknown-enum](../../content-schema/examples/records/validation-error/unknown-enum.error.json) |
| `AiProfile` | optional per-faction or per-hero AI personality (Want-weight overrides) | none | [ai-profile](../../content-schema/schemas/ai-profile.schema.json) | [default](../../content-schema/examples/records/ai-profiles/default.ai-profile.json) |
| `Event` | none — read-only deterministic-engine output. Closed discriminated union of every event kind emitted by command handlers; consumed by animation timeline / sound system per [`event-system.md`](./event-system.md) | none — events carry no presentation fields; consumers translate kind+payload into clips and audio cues | [event](../../content-schema/schemas/event.schema.json) | [event-log](../../content-schema/examples/events/event-log.example.json) |
| `GoldenFixture` | one row of the golden-state regression suite; pins `(scenarioId, seed, commandLog) → expectedStateHash` so an unintended mechanics change fails CI with a canonical-JSON diff | none | [golden-fixture](../../content-schema/schemas/golden-fixture.schema.json) | [canonical](../../content-schema/examples/golden-fixture/canonical.golden-fixture.json) |
| `TournamentResult` | output of the shared AI tournament harness; integer-only metrics struct so two consecutive runs serialize byte-stably through canonical JSON | none | [tournament-result](../../content-schema/schemas/tournament-result.schema.json) | [canonical](../../content-schema/examples/tournament-result/canonical.tournament-result.json) |
| `RendererEvent` | none — emitted by `src/renderer/` across the renderer ↔ UI seam (selection, camera focus, animation lifecycle, damage numbers, fog reveal, context loss / restore) per [`ui-renderer-seam.md`](./ui-renderer-seam.md) | none — closed discriminated union; payloads are positions/IDs only, no asset paths | [renderer-event](../../content-schema/schemas/renderer-event.schema.json) | [selection-changed](../../content-schema/examples/renderer-events/selection-changed.renderer-event.json), [camera-focused](../../content-schema/examples/renderer-events/camera-focused.renderer-event.json), [damage-number](../../content-schema/examples/renderer-events/damage-number.renderer-event.json) |
| `ValidationReport` | none — output of the AI-generation pipeline `validate` stage per [`ai-generation-pipeline.md`](./ai-generation-pipeline.md) | none — closed shape; `findings[]` carry severities consistent with [`error-taxonomy.md`](./error-taxonomy.md) | [validation-report](../../content-schema/schemas/validation-report.schema.json) | [pass](../../content-schema/examples/reports/pass.validation-report.json), [fail](../../content-schema/examples/reports/fail.validation-report.json) |
| `CoherenceReport` | none — output of the AI-generation pipeline `coherence` stage per [`ai-generation-pipeline.md`](./ai-generation-pipeline.md) | none — closed shape; cross-record consistency findings | [coherence-report](../../content-schema/schemas/coherence-report.schema.json) | [pass](../../content-schema/examples/reports/pass.coherence-report.json) |
| `BalanceReport` | none — output of the AI-generation pipeline `balance` stage per [`ai-generation-pipeline.md`](./ai-generation-pipeline.md) | none — closed shape; balance-corridor compliance findings, `metrics{}` for power scores | [balance-report](../../content-schema/schemas/balance-report.schema.json) | [pass](../../content-schema/examples/reports/pass.balance-report.json) |
| `ChatMessage` | none — presentation-only; never enters saves, replays, or the canonical state hash | lobby chat envelope carried over the dedicated `chat` DataChannel; receive-side validation contract per [`chat-safety.md` § 3](./chat-safety.md#3-envelope-schema) | [chat-message](../../content-schema/schemas/chat-message.schema.json) | [canonical](../../content-schema/examples/chat-message/canonical.chat-message.json) |
| `ReportBundle` | none — local-only artefact | evidence bundle produced by `REPORT_PEER` (peer-behavior) or the AI-UGC report intake; saved as a single file in MVP per [`chat-safety.md` § 8](./chat-safety.md#8-report) | [report-bundle](../../content-schema/schemas/report-bundle.schema.json) | [peer-behavior](../../content-schema/examples/report-bundle/canonical-peer-behavior.report-bundle.json), [ai-ugc](../../content-schema/examples/report-bundle/canonical-ai-ugc.report-bundle.json) |
| `ContentReport` | none — local-only artefact | content-target report (pack / scenario / hero / unit / AI-faction); persisted to `state.privacy.outboundReports[]` and dequeued by the future moderation backend (Plan 30). Distinct from `ReportBundle`, which targets player behavior. See [`ugc-safety.md`](./ugc-safety.md) and screen 75. | [content-report](../../content-schema/schemas/content-report.schema.json) | [canonical](../../content-schema/examples/content-report/canonical.content-report.json) |
| `PrivacyOptions` | none — UI / persistence only | per-installation privacy preferences (display-name mode, analytics opt-in, mature-content gate, salt fingerprint). Surfaced via screen 56 (Privacy pane); persisted in IndexedDB `hr-profile.privacy` per [`persistence.md`](./persistence.md); wiped by `WIPE_LOCAL_DATA scope=profile\|all`. | [privacy-options](../../content-schema/schemas/privacy-options.schema.json) | [canonical](../../content-schema/examples/privacy-options/canonical.privacy-options.json) |

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
