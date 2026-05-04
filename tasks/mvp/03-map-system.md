# Module: Map System (M1)

The hex coordinate system, tile storage, pathfinding, and fog of war that underpin both the adventure map and the tactical battle field. Get this right once — it's used everywhere.

**Milestone**: M1 — Strategic Vertical  
**Total Estimate**: ~36 hours  
**Exit Criteria**: A* finds correct paths on irregular terrain; fog of war masks tiles correctly per player.

---

## Self-Contained Brief

- **Purpose**: Hex coordinates, tile storage, A* pathfinding, fog
  of war, random-map generator runner.
- **Public surface**: lives inside [`src/engine/`](../../src/engine/);
  exposed to AI/renderer through engine snapshots — no separate
  cross-module type contract beyond the engine seam in
  [`src/contracts/`](../../src/contracts/).
- **Side effects**: row "src/engine/" in
  [`docs/architecture/side-effect-matrix.md`](../../docs/architecture/side-effect-matrix.md)
  (pure pathfinder; cache invariants in
  [`docs/architecture/determinism.md`](../../docs/architecture/determinism.md)).
- **NFR**: NFR-CAP-01 (200×200 hex hard cap),
  NFR-PERF-01 (frame-time impact of pathfinding)
  in [`docs/architecture/non-functional-requirements.md`](../../docs/architecture/non-functional-requirements.md).
- **Exit criteria**: see header.

---

## Task Files

- [01-axial-hex-coordinate-utilities.md](03-map-system/01-axial-hex-coordinate-utilities.md)
  🤖 Task 1: Axial hex coordinate utilities (~3h)
- [02-tile-type-registry.md](03-map-system/02-tile-type-registry.md)
  🧠 Task 2: Tile type registry (~2h)
- [03-layered-tile-storage.md](03-map-system/03-layered-tile-storage.md)
  🤖 Task 3: Layered tile storage (~3h)
- [04-a-pathfinder-with-terrain-cost-plus-zoc.md](03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md)
  🧠⚠️ Task 4: A* pathfinder with terrain cost + ZoC (~6h)
- [05-fog-of-war.md](03-map-system/05-fog-of-war.md)
  🧠 Task 5: Fog of War (~4h)
- [06-map-serializer-deserializer.md](03-map-system/06-map-serializer-deserializer.md)
  🤖 Task 6: Map serializer / deserializer (~2h)
- [07-unit-test-suite-for-pathfinder-edge-cases.md](03-map-system/07-unit-test-suite-for-pathfinder-edge-cases.md)
  🤖 Task 7: Unit test suite for pathfinder edge cases (~2h)
- [08-random-map-generator-template-format.md](03-map-system/08-random-map-generator-template-format.md)
  🧠 Task 8: Random map generator template format (~4h)
- [09-random-map-generator-deterministic-runner.md](03-map-system/09-random-map-generator-deterministic-runner.md)
  🧠⚠️ Task 9: Random map generator deterministic runner (~5h)
- [10-underground-layer-support.md](03-map-system/10-underground-layer-support.md)
  🧠 Task 10: Underground layer support (~5h)
