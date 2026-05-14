# Content Platform

The project supports adding or changing content without changing
engine code. This file is the entry-point overview; per-area rules
live in the companion docs below.

> Companion docs:
> [`pack-contract.md`](./pack-contract.md) (single-pack layout,
> manifest, trust, sandbox enforcement, asset-fallback table) ·
> [`content-system-policy.md`](./content-system-policy.md)
> (cross-pack rules: namespace, dependency resolution, override
> precedence, asset integrity, locale merge, validation pipeline,
> canonical-pack registry) ·
> [`pack-resolver.md`](./pack-resolver.md) (resolver algorithm) ·
> [`pack-error-codes.md`](./pack-error-codes.md) (error catalog) ·
> [`schema-matrix.md`](./schema-matrix.md) (per-record schemas) ·
> [`sandbox-model.md`](./sandbox-model.md) (trust tiers + capability
> matrix).

## Hard Rules

1. Packs own content.
2. Records use stable IDs, not file paths.
3. Gameplay and presentation stay separate.
4. Schema evolution is additive-first.
5. Overrides are explicit and predictable.
6. Saves, replays, and multiplayer pin pack versions and content
   hashes.
7. Community content is data-only by default.

## What Must Be Pack-Driven

- factions, units, heroes, towns, buildings
- spells, artifacts, skills, specialties
- map objects, neutral stacks, adventure buildings
- worlds, scenarios, terrain, object pools
- portraits, icons, town screens, animations, VFX, sounds

## Pack Types

The closed enum `manifest.kind` (in
[`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json))
is the source of truth.

| Kind | Contents |
|---|---|
| `ruleset-pack` | formulas, constants, balance rules |
| `library-pack` | shared abilities, spells, artifacts, terrain, objects |
| `faction-pack` | town, units, heroes, buildings, faction presentation |
| `world-pack` | biomes, terrain sets, neutral pools, generator presets |
| `scenario-pack` | authored map, start state, objectives, pinned dependencies |
| `asset-pack` | files that back asset IDs |

One folder under `resources/packs/` equals one pack. Do not bundle
multiple faction manifests into one mega-pack when separate
`faction-pack` folders express the same content more clearly.

## Runtime Responsibilities

`src/content-runtime/` handles:

- manifest loading
- archive import and pack trust policy
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
- canonical-packs registry check
  ([`content-system-policy.md` § 9](./content-system-policy.md#9-canonical-pack-registry))

`src/content-schema/` handles:

- validation
- migration
- compatibility checks

The single canonical reference for cross-pack contracts is
[`content-system-policy.md`](./content-system-policy.md). Error
codes emitted by these systems live in
[`pack-error-codes.md`](./pack-error-codes.md).

## Extension Rules

Prefer:

- `type` or `kind` discriminated unions
- arrays of effects
- shallow named sub-objects (e.g. `presentation`, `economy`,
  `targeting`)
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

The migration cycle, schema-version bump procedure, and worked
example live in
[`schema-migration-policy.md`](./schema-migration-policy.md).
Enum-value lifecycle (deprecate, alias, remove) lives in
[`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md).
Default-value declarations and JSON Schema ↔ Zod parity rules live
in [`schema-defaults-policy.md`](./schema-defaults-policy.md). The
single matrix that decides refuse / migrate / degrade across
offline, multiplayer, and trusted-replay contexts lives in
[`version-policy.md`](./version-policy.md).

## Asset-Load Failure Policy

"Missing visuals fall back" is the principle; the chain order,
retry, and notification rules are pinned canonically in
[`edge-cases-policy.md` § 12](./edge-cases-policy.md#12-asset-load-failure-q215).
Summary:

- **Fallback chain order.** `locale variant → faction default →
  generic placeholder`. The generic placeholder is bundled with
  the app and is never absent.
- **Retry.** 1× retry with 500 ms backoff on first failure;
  subsequent failures within the session use the placeholder
  without further retry.
- **User notification.** Non-modal toast "Some visuals couldn't
  load" once per session, not per asset.
- **Gameplay-vs-presentation boundary.** Any field that affects
  deterministic state (frame timing, hitbox geometry, projectile
  speed) is **gameplay**, lives in the gameplay record, and is
  loaded pre-session. Streamed assets carry only pixels / audio
  waveforms.
- **AI-pipeline records.** The pre-ingest validation in
  [`ai-generation-pipeline.md`](./ai-generation-pipeline.md)
  remains the fail-loud gate for AI-generated *gameplay* records;
  runtime never accepts one bypassing that gate. Sandbox
  enforcement for AI-generated packs (matchmaker / lobby / replay
  / editor) is pinned in
  [`pack-contract.md` § Sandbox enforcement](./pack-contract.md#sandbox-enforcement);
  cache, GC, and disk-quota policy live in
  [`pack-lifecycle.md`](./pack-lifecycle.md); post-publication
  takedown lives in [`revocation.md`](./revocation.md).

## Tooling Expectations

Authoring tools should:

- show unresolved references
- show override source and precedence
- preserve unknown editor metadata when safe
- scaffold from canonical examples or editor-generated stubs
- export packs that can be re-imported without loss

## Fast Examples

- **New faction.** Add faction record, unit records, hero records,
  building records, and presentation IDs; no engine edits required.
- **New spell animation.** Add animation / VFX / sound records and
  reference them from the spell.
- **New map object.** Add object behavior record plus presentation
  IDs and asset mappings.

## See Also

- [`schema-matrix.md`](./schema-matrix.md) — record coverage
- [`pack-contract.md`](./pack-contract.md) — canonical manifest and
  folder rules
- [`../../content-schema/schemas`](../../content-schema/schemas) —
  canonical JSON contracts

---

## 🔍 Sync Check

- **UI: ✔** — No screen-package surface is owned by this doc; pack-trust UX is pinned in [`pack-trust.md`](./pack-trust.md) and [`wiki/screens/72-pack-trust-prompt`](./wiki/screens/72-pack-trust-prompt/), and the link target was already correct.
- **Schema: ✔** — Pack-type list matches the `kind` enum in [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json) (`ruleset-pack`, `library-pack`, `faction-pack`, `world-pack`, `scenario-pack`, `asset-pack`); cross-pack invariants delegated to [`content-system-policy.md`](./content-system-policy.md) and [`schema-matrix.md`](./schema-matrix.md) without duplication.
- **Tasks: ✔** — Doc is referenced as Read First by 16+ tasks in [`tasks/task-registry.json`](../../tasks/task-registry.json) (mvp content schemas, asset pipeline, mod system, schema-migration policy); no orphan tasks reference it without reciprocal mention. No `Status:` field present (compliant with task-status ledger doctrine).

## ⚠ Issues

- **Stale anchor `#12-asset-load-failure-q215`.** The link target [`edge-cases-policy.md` § 12](./edge-cases-policy.md#12-asset-load-failure-q215) does not match the actual heading `## 12. Asset-load failure` (auto-generated anchor `#12-asset-load-failure`). The `-q215` suffix appears to be a vestigial readiness-audit identifier. The same broken anchor is used in 4 sibling files ([`ai-generation-pipeline.md`](./ai-generation-pipeline.md):267, [`diagrams/19-locale-variants.md`](./diagrams/19-locale-variants.md):51, [`tasks/task-registry.json`](../../tasks/task-registry.json):8730, [`tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md`](../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md):61), so this audit preserved the existing anchor to keep the cross-doc set consistent. Per Hard Prohibition D (no edits to other files), a follow-up sweep should rename the anchor in all five sites in one PR. Suggested fix: replace `#12-asset-load-failure-q215` with `#12-asset-load-failure` everywhere, or restore an explicit `<a name="12-asset-load-failure-q215">` anchor inside `edge-cases-policy.md § 12` if the `q215` ID is load-bearing for an external readiness-audit cross-reference.
