# Fog of War

Status: planned

Module: [Map System (M1)](../03-map-system.md)

Description:
Each player has independent fog state: `hidden` (never seen), `explored` (seen but not current), `visible` (in hero sight radius). On each hero move, recalculate visibility radius (default: 5 tiles). Explored tiles show static snapshot; hidden tiles show nothing.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- `MapStorage` (Task 3)
- Hero positions + sight radii (from game state)

Outputs:
- `src/engine/fog.ts`
- `updateFog(map: MapStorage, heroPositions: HeroFogInput[], playerId: number): void`
- `getVisibility(map: MapStorage, q: number, r: number, playerId: number): "visible" | "explored" | "hidden"`

Owned Paths:
- `src/engine/fog.ts`

Dependencies:
- mvp.03-map-system.03-layered-tile-storage

Acceptance Criteria:
- After hero moves to (5, 5), all tiles within radius 5 are marked `visible` for that player
- Tiles previously `visible` become `explored` after hero moves away
- Fog state is per-player (player 0 cannot see player 1's fog state)
- Works correctly at map edges (partial circles)

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
