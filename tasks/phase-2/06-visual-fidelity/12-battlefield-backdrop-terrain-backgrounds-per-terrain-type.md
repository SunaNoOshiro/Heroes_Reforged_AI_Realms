# Battlefield Backdrop — Terrain Backgrounds Per Terrain Type

Status: planned

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
The tactical battle screen has a full background image that matches the terrain of the tile where the battle takes place. A battle on Grass terrain shows a green meadow background; a battle on Snow shows a tundra; a battle on Lava shows a volcanic plain.

Visual direction: terrain-specific battlefield backdrops with readable side vegetation and depth cues.

Read First:
- [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- Battle terrain type (from adventure map tile where battle was initiated)
- Per-terrain background sprite sheets

Outputs:
- `src/renderer/battle-backdrop.ts`
- `loadBattleBackdrop(terrain: TerrainType): Promise<BattleBackdrop>`
- `BattleBackdrop`: wide background image rendered behind the hex grid
- Background fills the full canvas; hex grid rendered on top at 60% opacity grid lines

Terrain backdrops to implement (priority):
1. Grass (default) — green meadow, scattered trees
2. Dirt — dusty plain, dead grass
3. Snow — white plain, bare trees, mountain silhouettes
4. Lava — volcanic rock, fire effects in background
5. Sand — desert, dunes
6. Swamp — dark murky ground, twisted trees

Owned Paths:
- `src/renderer/battle-backdrop.ts`

Dependencies:
- mvp.06-renderer.05-1115-tactical-battlefield-renderer

Acceptance Criteria:
- Correct backdrop loads for each terrain type
- Backdrop does not visually conflict with hex grid overlay
- At least 6 terrain-specific backdrops implemented
- Backdrop loads without blocking the game thread (async)

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
