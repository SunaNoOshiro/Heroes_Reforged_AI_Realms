# Layered Tile Storage

Status: planned

Module: [Map System (M1)](../03-map-system.md)

Description:
The map is stored as parallel `Uint16Array` layers, one per data type, indexed by `q * mapHeight + r`. This is cache-friendly and serializes trivially to binary.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Map dimensions (width × height)

Outputs:
- `src/engine/map-storage.ts`
- `MapStorage` class:
  ```typescript
  class MapStorage {
    readonly width: number
    readonly height: number
    terrain: Uint16Array      // terrain type id
    objects: Uint16Array      // object type id (mine, town, artifact, etc.) or 0
    units: Uint16Array        // unit stack id or 0 (tactical battlefield)
    fog: Uint8Array           // 2 bits per player (visible / explored)

    get(layer, q, r): number
    set(layer, q, r, value): void
    isInBounds(q, r): boolean
    clone(): MapStorage
  }
  ```

Owned Paths:
- `src/engine/map-storage.ts`

Dependencies:
- mvp.03-map-system.01-axial-hex-coordinate-utilities

Acceptance Criteria:
- `set` + `get` round-trips correctly
- `clone()` returns a deep copy (modifying clone does not affect original)
- Out-of-bounds `get` returns `0`, does not throw
- A 128×128 map takes < 200KB in memory

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
