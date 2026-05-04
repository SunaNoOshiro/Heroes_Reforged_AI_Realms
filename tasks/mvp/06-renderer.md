# Module: Renderer (M1/M2)

The WebGL2 hex renderer. Displays the adventure map and tactical battlefield. The renderer is strictly read-only — it never calls back into the sim, never mutates state, only consumes snapshots and the event log.

**Milestone**: M1 (map renderer) + M2 (battle renderer + animation)  
**Total Estimate**: ~30 hours  
**Exit Criteria**: Adventure map renders correctly; battle field shows combat with move/attack animations.

---

## Self-Contained Brief

- **Purpose**: Read-only WebGL2 hex renderer for adventure map and
  tactical battlefield; emits presentation events across the
  renderer ↔ UI seam.
- **Public surface**: [`src/contracts/renderer-event.ts`](../../src/contracts/renderer-event.ts)
  (regenerated from [`renderer-event.schema.json`](../../content-schema/schemas/renderer-event.schema.json));
  consumes [`src/contracts/asset-loader.ts`](../../src/contracts/asset-loader.ts)
  for resolved assets.
- **Side effects**: row "src/renderer/" in
  [`docs/architecture/side-effect-matrix.md`](../../docs/architecture/side-effect-matrix.md)
  (impure: WebGL calls, rAF; never mutates engine state).
- **NFR**: NFR-PERF-01 / NFR-PERF-02 / NFR-PERF-03,
  NFR-MEM-01 / NFR-MEM-02 / NFR-MEM-03, NFR-CAP-05 in
  [`docs/architecture/non-functional-requirements.md`](../../docs/architecture/non-functional-requirements.md).
- **Exit criteria**: see header.

---

## Task Files

- [01-webgl2-context-setup-plus-resize-handler.md](06-renderer/01-webgl2-context-setup-plus-resize-handler.md)
  🤖 Task 1: WebGL2 context setup + resize handler (~2h)
- [02-hex-tile-atlas-plus-axialscreen-transform.md](06-renderer/02-hex-tile-atlas-plus-axialscreen-transform.md)
  🤖 Task 2: Hex tile atlas + axial→screen transform (~4h)
- [03-map-renderer-terrain-objects-units-layers.md](06-renderer/03-map-renderer-terrain-objects-units-layers.md)
  🧠 Task 3: Map renderer — terrain, objects, units layers (~6h)
- [04-camera-pan-zoom-clamp-to-map-bounds.md](06-renderer/04-camera-pan-zoom-clamp-to-map-bounds.md)
  🧠 Task 4: Camera — pan, zoom, clamp to map bounds (~3h)
- [05-1115-tactical-battlefield-renderer.md](06-renderer/05-1115-tactical-battlefield-renderer.md)
  🧠 Task 5: 11×15 tactical battlefield renderer (~4h)
- [06-sprite-sheet-loader-plus-frame-animation.md](06-renderer/06-sprite-sheet-loader-plus-frame-animation.md)
  🤖 Task 6: Sprite sheet loader + frame animation (~4h)
- [07-event-log-animation-timeline.md](06-renderer/07-event-log-animation-timeline.md)
  🤖 Task 7: Event log → animation timeline (~4h)
- [08-presentation-loop-decoupled-from-sim.md](06-renderer/08-presentation-loop-decoupled-from-sim.md)
  ⚠️ Task 8: Presentation loop decoupled from sim (~3h)
