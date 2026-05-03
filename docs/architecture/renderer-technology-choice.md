# Renderer Technology Choice — WebGL2

**Decision:** Browser-based hex renderer using WebGL2.  
**Date:** 2026-04-24  
**Status:** Approved for MVP  

---

## Context

The renderer must:
1. Display a scrollable, zoomable hex map (up to 200×200 hexes)
2. Show unit stacks, towns, mines, and fog of war
3. Display 11×15 tactical battlefield during combat
4. Play frame-based animations tied to event log (deterministic playback)
5. Run in modern browsers (desktop + tablet)
6. **Not** call back into simulation (read-only snapshot consumption)

---

## Candidates Considered

| Tech | Pros | Cons | Verdict |
|------|------|------|---------|
| **WebGL2 (raw)** | Direct control, minimal deps, deterministic | Verbose boilerplate, no built-in UI widgets | ✅ **CHOSEN** |
| Three.js | High-level abstractions, mature | Hidden behavior, harder to debug determinism | ❌ Deferred |
| Babylon.js | Feature-rich, good docs | Overkill for 2D hex grid, large bundle | ❌ Deferred |
| Canvas 2D | Simple, no deps | Perf ceiling at large maps, no animation framework | ❌ Not suitable |
| WebGPU | Future-proof | Not yet stable, limited browser support | ❌ Phase 3 option |

---

## Decision Rationale

### 1. Deterministic Animation Replay
The renderer **consumes an event log** and plays back animations bit-identically on every playback. WebGL2 + explicit animation timeline (not game-loop-coupled) makes this straightforward.

- Raw WebGL2 → explicit per-frame state updates tied to timestamp (easy to audit)
- Three.js → internal animation loop, harder to guarantee bit-identical replay

### 2. Bundle Size
WebGL2 is ~0 KB (browser built-in). Three.js is ~200+ KB. For a game that ships entire packs as JSON, bundle size matters.

### 3. Debugging Determinism Failures
If two replays diverge, WebGL2 makes it easy to audit: "frame N shows X position, log says Y". Three.js abstractions hide the actual GPU commands.

### 4. No Blocking Dependency
Renderer does not depend on simulation code. Pure snapshot consumer. This enforces the boundary:
- `src/engine/` — pure, deterministic
- `src/renderer/` — read-only, never calls back

---

## Implementation Approach

### Layered Rendering

```
[Event Log] → [Animation Timeline] → [Frame Render]
                                       ├─ clear
                                       ├─ terrain layer
                                       ├─ fog of war layer
                                       ├─ object layer
                                       ├─ unit layer
                                       ├─ UI layer (decoupled)
                                       └─ present
```

### Hex Rendering

- **Tile atlas:** PNG sprite sheet (512×512) with 32×32 hex tiles
- **Transform:** Axial coordinates → screen pixels via matrix math
- **Depth:** Layer ordering via z-index (not Z-buffer, since this is 2D)

### Camera Control

- **Pan:** Clamp to map bounds, update view matrix
- **Zoom:** 0.5× to 3.0× (mobile pinch + scroll wheel)
- **Viewport:** see [`screen-scaling.md`](./screen-scaling.md) for the
  reconciliation between the 800×600 virtual stage, the 16:9 map
  sub-region, hi-DPI handling, and aspect-ratio policy.

### Performance Targets

- 60 FPS on map (no stutter during pan/zoom)
- 60 FPS during battle (animating 7 stacks × 5 frames per sprite)
- 0.1 ms per-frame GPU time (leave headroom for UI)

### Frame-Time Budget & Degradation

60 FPS is aspirational, not absolute. The renderer monitors a
sliding-window frame-time average and degrades along the tier table
below. A device that cannot sustain Green is still playable; it just
loses non-essential animations.

| Frame time | Tier | Action |
|---|---|---|
| ≤ 16.7 ms | Green | Full render path |
| 16.8–25 ms | Amber | Drop non-critical animations (idle bobs, particle FX) |
| 25–40 ms | Orange | Disable layered animations entirely; freeze camera tweens |
| > 40 ms sustained 1 s | Red | Fall back to Canvas 2D / static map render |

Measurement rules:

- **Tier entry** uses a 60-frame rolling average. A device must spend
  ~1 s in a tier before formally entering it.
- **Tier escalation** is allowed on a single bad frame for `Red` only
  (40 ms+ for one frame is enough to start preparing the Canvas 2D
  fallback, since users feel that immediately).
- **Tier exit** also requires a 60-frame rolling average back below
  the upper bound of the lower tier; this avoids oscillation.

Telemetry:

- Tier transitions are reported to a debug overlay (toggleable via
  hotkey). They are **not** written to disk by default — telemetry
  uploads are opt-in.
- The currently-active tier is exposed to the renderer test fixtures
  so worst-case-scenario benchmarks can assert the expected tier on
  reference hardware.

Cross-link: [`docs/readiness-audit/09-performance.md`](../readiness-audit/09-performance.md)
keeps the broader perf-audit narrative; this section is the
machine-actionable tier table.

---

## Constraints & Anti-Patterns

### DO:
- ✅ Use WebGL2 context loss recovery (tablet suspend/resume)
- ✅ Batch hex renders (frustum culling by viewport)
- ✅ Memoize tile positions (no recalculation per frame)
- ✅ Decouple presentation from simulation step rate

### DON'T:
- ❌ Call `Math.random()` in renderer (determinism)
- ❌ Mutate game state from renderer (read-only rule)
- ❌ Use `requestAnimationFrame` for game-logic timing (use explicit `dt`)
- ❌ Hardcode asset paths (use pack manifests + asset index)

---

## Fonts (WebGL)

Map labels (hex coordinates, unit names, hover labels), in-canvas HUD
glyphs (resource counters anchored to the camera), and debug overlay
text rendered inside the viewport use **SDF font atlases**, not DOM
text overlays.

- One atlas per script: `fonts.latin.sdf.png`, `fonts.cyrillic.sdf.png`,
  `fonts.cjk.sdf.png`. Locale packs declare which atlas they require
  through the asset manifest.
- Atlases are generated by `scripts/build-sdf-atlas.mjs` (build-time
  tool; not yet authored — owned by the asset-pipeline task in
  [`tasks/mvp/02b-asset-pipeline/`](../../tasks/mvp/02b-asset-pipeline/)).
- Filter mode: `gl.LINEAR` with mipmaps; see
  [`screen-scaling.md` § Filter Modes](./screen-scaling.md#5-filter-modes).
- DOM-side fonts are pinned in
  [`ui-technology-choice.md` § Fonts](./ui-technology-choice.md#fonts).

### Anti-Patterns

- ❌ Bake DOM text into a `<canvas2d>` texture and upload as a tile.
  Use SDF atlases.
- ❌ Overlay DOM text on the WebGL viewport for camera-coupled labels.
  DOM text cannot follow camera transforms without per-frame layout
  thrash.
- ❌ Ship one atlas with mixed scripts. Locale-aware swapping is
  cheaper.

---

## Future Extensibility

### WebGPU Migration (Phase 3)
WebGL2 → WebGPU is a non-breaking change:
- Swap the GPU backend (same CPU-side animation timeline)
- Recompile shaders to WGSL
- Performance improvements (modern graphics APIs)

### Additional Renderers
Canvas 2D fallback for older browsers: ship both codepaths, same animation logic.

---

## Related Files

- `tasks/mvp/06-renderer.md` — task breakdown
- `src/renderer/` — implementation directory
- `src/ui/` — UI shell (separate from renderer, no WebGL)
- [`docs/architecture/ui-technology-choice.md`](./ui-technology-choice.md) — DOM-side framework + state binding
- [`docs/architecture/ui-renderer-seam.md`](./ui-renderer-seam.md) — DOM ↔ canvas seam
- [`docs/architecture/screen-scaling.md`](./screen-scaling.md) — virtual stage, hi-DPI, aspect
- [`docs/architecture/ui-frame-lag-contract.md`](./ui-frame-lag-contract.md) — UI lag bounds
- `docs/architecture/determinism.md` — why replay must be bit-identical
