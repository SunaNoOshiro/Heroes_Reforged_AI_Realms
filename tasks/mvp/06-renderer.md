# Module: Renderer (M1/M2)

The WebGL2 hex renderer. Displays the adventure map and tactical battlefield. The renderer is strictly read-only — it never calls back into the sim, never mutates state, only consumes snapshots and the event log.

**Milestone**: M1 (map renderer) + M2 (battle renderer + animation)  
**Total Estimate**: ~30 hours  
**Exit Criteria**: Adventure map renders correctly; battle field shows combat with move/attack animations.

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
