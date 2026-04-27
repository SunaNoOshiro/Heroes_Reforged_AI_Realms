# Axial Hex Coordinate Utilities

Status: planned

Module: [Map System (M1)](../03-map-system.md)

Description:
Implement the hex grid math library. Use axial `(q, r)` for storage, cube `(x, y, z)` for distance/ring calculations. Pointy-top orientation throughout.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- None (pure math, no game-state dependencies)

Outputs:
- `src/engine/hex.ts`

Owned Paths:
- `src/engine/hex.ts`

Functions to implement:
```typescript
type HexCoord = { q: number; r: number }

axialToCube(h: HexCoord): CubeCoord
cubeToAxial(c: CubeCoord): HexCoord
hexDistance(a: HexCoord, b: HexCoord): number
hexNeighbors(h: HexCoord): HexCoord[]        // 6 neighbors
hexRing(center: HexCoord, radius: number): HexCoord[]
hexInRange(center: HexCoord, radius: number): HexCoord[]
axialToScreen(h: HexCoord, hexSize: number): {x: number, y: number}
screenToAxial(x: number, y: number, hexSize: number): HexCoord
hexLerp(a: HexCoord, b: HexCoord, t: number): HexCoord  // for line drawing
```

Dependencies:
- mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module

Acceptance Criteria:
- `hexDistance({q:0,r:0}, {q:3,r:-3})` returns `3`
- `hexNeighbors({q:0,r:0})` returns exactly 6 unique coordinates
- `axialToScreen` → `screenToAxial` round-trips correctly for hex center points
- All functions are pure (no mutations)

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
