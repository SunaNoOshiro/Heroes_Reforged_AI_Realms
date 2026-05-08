# Tile Type Registry

Module: [Map System (M1)](../03-map-system.md)

Description:
Define the terrain type system. Each tile type has a movement cost, passability flag, and visual identifier. This data lives in JSON (ruleset) — the registry just parses and indexes it.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Baseline terrain set: Grass, Dirt, Sand, Snow, Swamp, Lava, Water,
  Rock, Wasteland, Subterranean (canonical list lives in the ruleset
  pack, not hard-coded)
- Ruleset schema (Task 6 of `02-content-schemas.md`)

Outputs:
- `src/rules/terrain.ts`
- `TileType` interface: `{ id: string, moveCost: number, passable: boolean, swimOnly: boolean }`
- `TerrainRegistry` class: `{ get(id: string): TileType, getAll(): TileType[] }`

Movement costs (from the baseline ruleset JSON, overridable per
pack; the numbers below are the defaults shipped with
`baseline.ruleset.json`):
- Grass: 100, Dirt: 125, Sand: 150, Snow: 150, Swamp: 175, Lava: 150, Road: 75, Water: impassable (adventure), Rock: impassable

Owned Paths:
- `src/rules/terrain.ts`

Dependencies:
- mvp.03-map-system.01-axial-hex-coordinate-utilities
- mvp.02-content-schemas.06-ruleset-schema

Acceptance Criteria:
- `TerrainRegistry.get("grass").moveCost === 100`
- Water tiles are not passable by land units
- Costs match the values declared in the active ruleset pack (default `baseline.ruleset.json`)

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
