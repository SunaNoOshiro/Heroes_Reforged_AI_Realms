# Content Platform

The project should support adding or changing content without changing
engine code.

## Hard Rules

1. Packs own content.
2. Records use stable IDs, not file paths.
3. Gameplay and presentation stay separate.
4. New schema evolution should be additive-first.
5. Overrides must be explicit and predictable.
6. Saves, replays, and multiplayer pin versions and content hashes.
7. Community content is data-only by default.

## What Must Be Pack-Driven

- factions, units, heroes, towns, buildings
- spells, artifacts, skills, specialties
- map objects, neutral stacks, adventure buildings
- worlds, scenarios, terrain, object pools
- portraits, icons, town screens, animations, VFX, sounds

## Pack Types

- `ruleset-pack`
  Formulas, constants, balance rules.
- `library-pack`
  Shared abilities, spells, artifacts, terrain, objects.
- `faction-pack`
  Town, units, heroes, buildings, faction presentation.
- `world-pack`
  Biomes, terrain sets, neutral pools, generator presets.
- `scenario-pack`
  Authored map, start state, objectives, pinned dependencies.
- `asset-pack`
  Files that back asset IDs.

One folder under `resources/packs/` equals one pack. Do not bundle
multiple faction manifests into one mega-pack when separate
`faction-pack` folders express the same content more clearly.

## Runtime Responsibilities

`src/content-runtime/` should handle:

- manifest loading
- dependency resolution (algorithm:
  [`pack-resolver.md`](./pack-resolver.md))
- capability checks
- override precedence
  ([`content-system-policy.md` § 3](./content-system-policy.md#3-override-precedence);
  trust-floor rule pinned in
  [`sandbox-model.md` § 3](./sandbox-model.md#3-override-precedence-trust-rule))
- asset indirection
- per-asset integrity verification
  ([`content-system-policy.md` § 4](./content-system-policy.md#4-asset-integrity))
- content registry assembly
- archive import and pack trust policy
- canonical-packs registry check
  ([`content-system-policy.md` § 9](./content-system-policy.md#9-canonical-pack-registry))

The single canonical reference for cross-pack contracts is
[`content-system-policy.md`](./content-system-policy.md). Error codes
emitted by these systems live in
[`pack-error-codes.md`](./pack-error-codes.md).

`src/content-schema/` should handle:

- validation
- migration
- compatibility checks

## Extension Rules

Prefer:

- `type` or `kind` unions
- arrays of effects
- shallow named sub-objects such as `presentation`, `economy`, or
  `targeting`
- ID references between records

Avoid:

- raw asset paths in gameplay records
- hidden fallback behavior
- meaning-changing reuse of old fields
- deep inheritance trees

## Update Safety

To stay easy to extend:

- treat IDs as public API
- add aliases or migrations when renaming
- keep deprecated fields readable for one migration cycle
- make conflicts visible in tooling
- allow missing visuals to fall back
- reject missing gameplay requirements loudly

## Asset-Load Failure Policy

"Missing visuals fall back" is the principle; the chain order,
retry, and notification rules are pinned canonically in
[`edge-cases-policy.md` § 12](./edge-cases-policy.md#12-asset-load-failure-q215).
Summary:

- **Fallback chain order:** `locale variant → faction default →
  generic placeholder`. The generic placeholder is bundled with the
  app and is never absent.
- **Retry:** 1× retry with 500 ms backoff on first failure;
  subsequent failures within the session use the placeholder
  without further retry.
- **User notification:** non-modal toast "Some visuals couldn't
  load" once per session, not per asset.
- **Gameplay-vs-presentation boundary:** any field that affects
  deterministic state (frame timing, hitbox geometry, projectile
  speed) is **gameplay**, lives in the gameplay record, and is
  loaded pre-session. Streamed assets carry only pixels / audio
  waveforms.
- **AI-pipeline records:** the pre-ingest validation in
  [`ai-generation-pipeline.md`](./ai-generation-pipeline.md)
  remains the fail-loud gate for AI-generated *gameplay* records;
  runtime never accepts one bypassing that gate. Sandbox enforcement
  for AI-generated packs (matchmaker / lobby / replay / editor) is
  pinned in
  [`pack-contract.md` § Sandbox enforcement`](./pack-contract.md#sandbox-enforcement);
  cache, GC, and disk-quota policy live in
  [`pack-lifecycle.md`](./pack-lifecycle.md); post-publication
  takedown lives in [`revocation.md`](./revocation.md).

The migration cycle, schema-version bump procedure, and worked example
live in
[`schema-migration-policy.md`](./schema-migration-policy.md).
Enum-value lifecycle (deprecate, alias, remove) lives in
[`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md). Default-value
declarations and JSON Schema ↔ Zod parity rules live in
[`schema-defaults-policy.md`](./schema-defaults-policy.md). The single
matrix that decides refuse / migrate / degrade across offline,
multiplayer, and trusted-replay contexts lives in
[`version-policy.md`](./version-policy.md).

## Tooling Expectations

Authoring tools should:

- show unresolved references
- show override source and precedence
- preserve unknown editor metadata when safe
- scaffold from canonical examples or editor-generated stubs
- export packs that can be re-imported without loss

## Fast Examples

- New faction:
  add faction record, unit records, hero records, building records, and
  presentation IDs; no engine edits required.
- New spell animation:
  add animation/VFX/sound records and reference them from the spell.
- New map object:
  add object behavior record plus presentation IDs and asset mappings.

See [schema-matrix.md](schema-matrix.md) for record coverage,
[pack-contract.md](pack-contract.md) for canonical manifest and folder
rules, and [../../content-schema/schemas](../../content-schema/schemas)
for the canonical JSON contracts.
