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
- dependency resolution
- capability checks
- override precedence
- asset indirection
- content registry assembly
- archive import and pack trust policy

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
