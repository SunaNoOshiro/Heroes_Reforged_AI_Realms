# Pack Contract

This file is the canonical source of truth for pack layout, manifest
rules, archive rules, and trust metadata.

## Core Rule

One folder under `resources/packs/` equals one pack root with one
`manifest.json`.

Examples:

- `resources/packs/emberwild-faction/` — first-party reference faction
- `resources/packs/baseline-ruleset/` — reference balance constants
- `resources/packs/shared-library/` — shared spells, abilities,
  artifacts
- `resources/packs/necropolis-faction/` — second faction (phase-2)

Do not bundle multiple faction manifests into one mega-pack when
separate `faction-pack` folders express the same content more clearly.

## Manifest v1

Canonical file:

- [`content-schema/schemas/manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)

The schema is the single source of truth. This doc does not repeat the
required-field list. When you see disagreement, trust the schema and
update this doc.

Hash fields:

- `contentHash` — produced by the content-runtime at pack build time.
  Optional at author time; required at load time for multiplayer and
  trusted replay.
- `engineHash` — pinned to a specific engine build. Pre-M2 (no engine
  yet) this field is effectively unused; the loader accepts packs
  without it. Post-M2 it becomes required at load time for
  reproducible play.

See [`determinism.md`](determinism.md).

## Canonical Example

See:

- [`content-schema/examples/packs/emberwild-faction/manifest.json`](../../content-schema/examples/packs/emberwild-faction/manifest.json)

That example stays in lockstep with the schema and with this file.
`scripts/check-repo-contracts.mjs` validates every example record in
every example pack against its schema.

## Trust Fields

- `signature` — optional object with `scheme`, `keyId`, and `value`.
- `sandboxed` — boolean trust flag enforced by runtime policy.

Use `sandboxed: true` for AI-generated or otherwise restricted content
that cannot participate in ranked or trusted flows.

## Capabilities

`capabilities` is a closed enum in the schema. New capability strings
require a schema change and a runtime policy update. That blocks a
sandboxed pack from claiming made-up permissions.

## Folder Layout

Canonical faction-pack shape:

```text
resources/packs/emberwild-faction/
  manifest.json
  faction.json
  units/
    ash-hound.unit.json
    cinder-scout.unit.json
  heroes/
    kaelis.hero.json
  hero-classes/
    cinder-knight.hero-class.json
  buildings/
    kennels.building.json
  abilities/
    pack-hunt.ability.json
  skills/
    pathfinding.skill.json
  animations/
    ash-hound.animation.json
  sounds/
    emberwild.sound-set.json
  assets/
    index.json
```

Rules:

- record files are one-per-record
- gameplay records use ids, not asset paths
- file extensions should communicate record type when practical
- `assets/index.json` owns path-to-asset-id mapping

## Archive Rule

`.hrmod` is a ZIP of exactly one canonical pack root.

The archive must contain:

- one `manifest.json`
- zero or more canonical record folders
- asset payloads and indexes that match the manifest and record ids

Do not add a separate manifest `files[]` inventory unless the schema
is explicitly revised to require it.

## Runtime Ownership

`src/content-runtime/` owns:

- manifest loading
- archive import
- dependency resolution
- signature checks
- sandbox policy
- pack registry assembly
- canonical-json serialization + `contentHash` computation

`src/engine/` consumes resolved ids and registries. It does not own
pack loading.
