# Canonical Pack Fixtures

This folder contains end-to-end example packs.

These fixtures show how manifests, records, asset indexes, and
cross-record references fit together at the pack boundary. Use them when
you need to understand:

- manifest layout
- pack-local IDs and references
- cross-file composition
- asset indirection through `assets/index.json`

## Current Fixtures

- `minimal-pack/`
  The smallest valid faction pack (one faction, one unit, one hero,
  one building, one ability, zero dependencies). Start here when
  writing a new loader or schema. See
  [`minimal-pack/README.md`](./minimal-pack/README.md).
- `emberwild-faction/`
  Reference faction pack. Small but broad enough to exercise units,
  heroes, buildings, abilities, and assets together. Depends on
  `shared-skills/` and `shared-abilities/`.
- `emberwild-world/`
  Reference world pack. Shows world-level content and map-facing record
  composition.
- `shared-skills/`
  Reference `library-pack`. Provides common hero secondary skills
  (`pathfinding_basic`, `leadership_basic`, `defense_basic`,
  `wisdom_basic`) that any first-party or AI-generated faction may
  reference by stable ID. Skill IDs use the canonical
  `shared:skill:<snake_slug>_basic` style documented in
  [`research/deep-research-report.md`](../../../research/deep-research-report.md);
  `wisdom_basic` is the compatibility seed for the later
  school-specific Wisdom roster. Authored so that cross-pack references
  resolve through a real manifest instead of an implicit naming
  convention.
- `shared-abilities/`
  Reference `library-pack`. Provides common creature abilities
  (`hardy`, `flying`, `regeneration`, `large_creature`, `undead`) so
  AI-generated unit rosters can reach for a shared vocabulary before
  inventing pack-local abilities. Same shape as `shared-skills/`.

## Pack Dependency Model

Faction packs declare shared packs in `manifest.dependencies`:

```jsonc
"dependencies": ["shared_skills", "shared_abilities"]
```

The loader resolves `shared:skill:*` and `shared:ability:*` IDs
through the dependency graph. Unresolved IDs fail loudly at load
time; the engine never falls back to a default. AI generation output
is expected to reference these shared IDs whenever a common
ability/skill fits — only invent pack-local IDs when no shared entry
matches.

If a new feature changes how packs are laid out, update these fixtures
in the same commit as the schema or architecture doc.
