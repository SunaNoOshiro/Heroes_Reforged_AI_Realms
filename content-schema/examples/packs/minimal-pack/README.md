# Minimal Pack

The smallest valid faction pack the engine will load. One faction,
one unit, one hero, one ability, one building. Nothing optional.

Purpose: a "Hello World" for AI agents and new contributors. If you
can load this pack in the engine, the manifest loader, schema
validator, and reference resolver are all working.

## Layout

```
minimal-pack/
├── manifest.json
├── faction.json
├── units/slate-footman.unit.json
├── heroes/slate-captain.hero.json
├── buildings/slate-barracks.building.json
├── abilities/slate-rally.ability.json
└── assets/index.json
```

## What it demonstrates

- A pack manifest with `dependencies: []` (no shared packs needed).
- A faction record referencing one unit, one hero, one building.
- A unit using only the canonical resource enum and a stat inside
  the tier-1 corridor.
- A hero with a `unit_bonus` specialty (simplest discriminated-union
  branch).
- A building with a `resource_bonus` effect.
- An ability referenced by the unit.
- An asset index with one placeholder per presentation reference.

## What it does not demonstrate

- Cross-pack dependency resolution — see [`emberwild-faction/`](../emberwild-faction/).
- Cross-record references outside the pack — all IDs are pack-local.
- Complex ability chains, status effects, or conditions.
- World/adventure content — see [`emberwild-world/`](../emberwild-world/).

If you are writing a pack loader or a new schema, run it against
this fixture first; only graduate to the full Emberwild pack once
minimal passes.
