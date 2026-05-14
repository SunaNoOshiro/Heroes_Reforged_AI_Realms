# Renderer Technology Choice — WebGL2

**Decision:** Browser-based hex renderer using WebGL2.
**Date:** 2026-04-24
**Status:** Approved for MVP

---

## Context

The renderer must:

1. Display a scrollable, zoomable hex map (up to 200×200 hexes).
2. Show unit stacks, towns, mines, and fog of war.
3. Display the 11×15 tactical battlefield during combat.
4. Play frame-based animations tied to the event log (deterministic
   playback).
5. Run in modern browsers (desktop + tablet).
6. **Never** call back into the simulation — read-only snapshot
   consumer.

---

## Candidates Considered

| Tech | Pros | Cons | Verdict |
|---|---|---|---|
| **WebGL2 (raw)** | Direct control, minimal deps, deterministic | Verbose boilerplate, no built-in UI widgets | ✅ **CHOSEN** |
| Three.js | High-level abstractions, mature | Hidden behavior, harder to debug determinism | ❌ Deferred |
| Babylon.js | Feature-rich, good docs | Overkill for 2D hex grid, large bundle | ❌ Deferred |
| Canvas 2D | Simple, no deps | Perf ceiling at large maps, no animation framework | ❌ Not suitable |
| WebGPU | Future-proof | Not yet stable, limited browser support | ❌ Phase 3 option |

---

## Decision Rationale

1. **Deterministic animation replay.** The renderer consumes the
   event log and plays back animations bit-identically every time.
   Raw WebGL2 + an explicit animation timeline (not coupled to the
   game loop) makes per-frame state updates auditable; Three.js's
   internal animation loop hides them.
2. **Bundle size.** WebGL2 is browser built-in (~0 KB). Three.js
   adds ~200 KB+, which matters for a game that ships entire packs
   as JSON.
3. **Debug visibility.** When two replays diverge, raw WebGL2 lets
   us read the actual GPU commands at frame N. Three.js
   abstractions hide them.
4. **No back-reference.** The renderer is a pure snapshot consumer.
   `src/engine/` stays deterministic; `src/renderer/` stays
   read-only.

---

## Implementation Approach

### Layered Rendering

```text
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

- **Tile atlas:** PNG sprite sheet (512 × 512) with 32 × 32 hex
  tiles.
- **Transform:** axial coordinates → screen pixels via matrix math.
- **Depth:** layer ordering via z-index (not Z-buffer; this is 2D).

### Camera Control

- **Pan:** clamp to map bounds, update view matrix.
- **Zoom:** 0.5× to 3.0× (mobile pinch + scroll wheel).
- **Viewport:** see [`screen-scaling.md`](./screen-scaling.md) for
  the reconciliation between the 800 × 600 virtual stage, the 16:9
  map sub-region, hi-DPI handling, and aspect-ratio policy.

### Performance Targets

The numeric per-tier FPS targets, the per-system CPU budget,
allocation budgets, memory ceilings, and entity ceilings live in
[`performance.md`](./performance.md). The renderer task tree
references that doc rather than inline numbers; this section keeps
only the rendering-specific rationale.

- 0.1 ms per-frame GPU time (leaves headroom for UI;
  rendering-side rationale).
- 60 FPS on the Reference tier and 30 FPS on the Minimum-spec tier
  (per [`performance.md` § 1](./performance.md#1-hardware-tiers)).

### Per-Animation Budget

The global frame target is upheld by per-animation caps enforced
at schema-validation time by
[`scripts/validate-animation-budgets.mjs`](../../scripts/validate-animation-budgets.mjs)
(wired into `npm run validate`). Pack records that exceed any cap
fail validation, not visual integration.

| Class | Cap |
|---|---|
| sprite frames per sequence | ≤ 32 |
| concurrent VFX particles per phase | ≤ 200 |
| concurrent VFX phases per battle | ≤ 16 |
| atlas page size | ≤ 4096 × 4096 px |
| sprite draw calls per stack per frame | ≤ 4 |
| sprite draw calls per battle frame total | ≤ 200 |

Animation-side degradation policy when budgets are exceeded at
runtime is pinned in
[`animation-contract.md` § Degradation](./animation-contract.md#7-degradation).

### Frame-Time Budget & Degradation

60 FPS is aspirational, not absolute. The renderer monitors a
sliding-window frame-time average and degrades along the tier
table below. A device that cannot sustain Green is still playable;
it just loses non-essential animations.

| Frame time | Tier | Action |
|---|---|---|
| ≤ 16.7 ms | Green | Full render path |
| 16.8–25 ms | Amber | Drop non-critical animations (idle bobs, particle FX) |
| 25–40 ms | Orange | Disable layered animations entirely; freeze camera tweens |
| > 40 ms sustained 1 s | Red | Fall back to Canvas 2D / static map render |

Measurement rules:

- **Tier entry** uses a 60-frame rolling average; a device must
  spend ~1 s in a tier before formally entering it.
- **Tier escalation** is allowed on a single bad frame for `Red`
  only (40 ms+ for one frame is enough to start preparing the
  Canvas 2D fallback, since users feel it immediately).
- **Tier exit** also requires a 60-frame rolling average back below
  the upper bound of the lower tier; this avoids oscillation.

Telemetry:

- Tier transitions report to a debug overlay (toggleable via
  hotkey). They are **not** written to disk by default; telemetry
  uploads are opt-in.
- The currently-active tier is exposed to renderer test fixtures so
  worst-case-scenario benchmarks can assert the expected tier on
  reference hardware.

---

## Constraints & Anti-Patterns

### DO

- ✅ Use WebGL2 context-loss recovery (tablet suspend / resume).
- ✅ Batch hex renders (frustum culling by viewport).
- ✅ Memoize tile positions (no recalculation per frame).
- ✅ Decouple presentation from simulation step rate.

### DON'T

- ❌ Call `Math.random()` in the renderer (determinism).
- ❌ Mutate game state from the renderer (read-only rule).
- ❌ Use `requestAnimationFrame` for game-logic timing — use an
  explicit `dt`.
- ❌ Hardcode asset paths — use pack manifests + asset index.
- ❌ Let an animation timeline call back into deterministic rules;
  the engine has already scheduled the result. See
  [`animation-contract.md` § DAMAGE_FRAME Ownership](./animation-contract.md#2-damage_frame-ownership).

---

## Fonts (WebGL)

Map labels (hex coordinates, unit names, hover labels), in-canvas
HUD glyphs (resource counters anchored to the camera), and debug
overlay text rendered inside the viewport use **SDF font atlases**,
not DOM text overlays.

- One atlas per script: `fonts.latin.sdf.png`,
  `fonts.cyrillic.sdf.png`, `fonts.cjk.sdf.png`. Locale packs
  declare which atlas they require through the asset manifest.
- Atlases are generated by `scripts/build-sdf-atlas.mjs`
  (build-time tool; not yet authored — owned by the asset-pipeline
  task in
  [`tasks/mvp/02b-asset-pipeline/`](../../tasks/mvp/02b-asset-pipeline/)).
- Filter mode: `gl.LINEAR` with mipmaps; see
  [`screen-scaling.md` § Filter Modes](./screen-scaling.md#5-filter-modes).
- DOM-side fonts are pinned in
  [`ui-technology-choice.md` § Fonts](./ui-technology-choice.md#fonts).

### Anti-Patterns

- ❌ Bake DOM text into a `<canvas2d>` texture and upload as a
  tile. Use SDF atlases.
- ❌ Overlay DOM text on the WebGL viewport for camera-coupled
  labels. DOM text cannot follow camera transforms without
  per-frame layout thrash.
- ❌ Ship one atlas with mixed scripts. Locale-aware swapping is
  cheaper.

---

## Future Extensibility

### WebGPU Migration (Phase 3)

WebGL2 → WebGPU is a non-breaking change:

- Swap the GPU backend (same CPU-side animation timeline).
- Recompile shaders to WGSL.
- Performance improvements (modern graphics APIs).

### Additional Renderers

Canvas 2D fallback for older browsers: ship both code paths, same
animation logic.

---

## Related Files

- [`tasks/mvp/06-renderer.md`](../../tasks/mvp/06-renderer.md) —
  task breakdown
- `src/renderer/` — implementation directory
- `src/ui/` — UI shell (separate from renderer, no WebGL)
- [`docs/architecture/performance.md`](./performance.md) —
  canonical performance budgets (CPU, GC, memory, entities, AI
  compute)
- [`docs/architecture/atlas-pipeline.md`](./atlas-pipeline.md) —
  atlas-generation pipeline that feeds the sprite-sheet loader
- [`docs/architecture/ui-technology-choice.md`](./ui-technology-choice.md)
  — DOM-side framework + state binding
- [`docs/architecture/ui-renderer-seam.md`](./ui-renderer-seam.md)
  — DOM ↔ canvas seam
- [`docs/architecture/screen-scaling.md`](./screen-scaling.md) —
  virtual stage, hi-DPI, aspect
- [`docs/architecture/ui-frame-lag-contract.md`](./ui-frame-lag-contract.md)
  — UI lag bounds
- [`docs/architecture/ui-input-modalities.md`](./ui-input-modalities.md)
  — touch / mouse / keyboard / gamepad bridging on top of the
  renderer surface
- [`docs/architecture/animation-contract.md`](./animation-contract.md)
  — two-clock model, DAMAGE_FRAME ownership, conflict resolution,
  mid-anim destruction, degradation policy
- [`content-schema/schemas/renderer-event.schema.json`](../../content-schema/schemas/renderer-event.schema.json)
  — closed discriminated union of every event the renderer emits
  across the renderer ↔ UI seam (selection, camera, animation
  lifecycle, damage numbers, tile reveal, context loss / restore)
- [`docs/architecture/determinism.md`](./determinism.md) — why
  replay must be bit-identical

---

## 🔍 Sync Check

- **UI: ✔** — Frame-time tier transitions surface to the dev debug overlay (`wiki/screens/66-debug-overlay/`) and the per-animation perf overlay (`wiki/screens/67-animation-debug-overlay/`); SDF-font and DOM-font split lines up with [`ui-technology-choice.md` § Fonts](./ui-technology-choice.md#fonts) and the `Fonts (WebGL)` block in this doc cited reciprocally from there.
- **Schema: ✔** — `renderer-event.schema.json` closed union (selection, camera, animation lifecycle, damage numbers, tile reveal, effect, context loss/restore) is the renderer's outbound seam contract; row present in [`schema-matrix.md`](./schema-matrix.md) (`RendererEvent`). No other schema is owned by this doc; the per-animation budget table is enforced by [`scripts/validate-animation-budgets.mjs`](../../scripts/validate-animation-budgets.mjs).
- **Tasks: ⚠** — [`tasks/mvp/06-renderer.md`](../../tasks/mvp/06-renderer.md) and the eight child tasks under [`tasks/mvp/06-renderer/`](../../tasks/mvp/06-renderer/) implement every rule in this doc, but none of them list this doc in their *Read First* block, and no task currently owns the unwritten `scripts/build-sdf-atlas.mjs`. See Issues.

## ⚠ Issues

- **No task owns `scripts/build-sdf-atlas.mjs`.** Fonts (WebGL) declares the SDF-atlas builder as "not yet authored — owned by the asset-pipeline task in [`tasks/mvp/02b-asset-pipeline/`](../../tasks/mvp/02b-asset-pipeline/)", but a scan of the eighteen `02b-asset-pipeline` tasks shows none with `scripts/build-sdf-atlas.mjs` under *Owned Paths* or any of the SDF-atlas naming (`fonts.<script>.sdf.png`) under *Acceptance Criteria*. Per `.agents/rules/tasks.md` (every described logic must have a task) and the CLAUDE.md "stable IDs are public API" contract (the `fonts.<script>.sdf.png` family is a public asset-id family), the asset-pipeline directory needs a task that owns the builder. Suggested fix: a new task `tasks/mvp/02b-asset-pipeline/19-sdf-font-atlas-builder.md` with `Owned Paths: scripts/build-sdf-atlas.mjs`, `Read First: docs/architecture/renderer-technology-choice.md` (the Fonts section) + [`screen-scaling.md` § Filter Modes](./screen-scaling.md#5-filter-modes), and acceptance criteria tied to the three named atlases (`fonts.latin.sdf.png`, `fonts.cyrillic.sdf.png`, `fonts.cjk.sdf.png`) plus deterministic byte-identical output across machines (parity with the `free-tex-packer-cli` rule in [`atlas-pipeline.md`](./atlas-pipeline.md)). Skill did not author the task (anti-cheat rule D — never edit cross-checked files).
- **Renderer task tree does not cite this doc in *Read First*.** A grep of `tasks/mvp/06-renderer/` shows zero matches for `renderer-technology-choice.md`. The eight tasks read [`ui-renderer-seam.md`](./ui-renderer-seam.md), [`screen-scaling.md`](./screen-scaling.md), and [`overview.md`](./overview.md), but never the technology-decision doc that pins WebGL2, the per-animation budgets, the frame-time degradation tiers, the SDF-font policy, and the determinism contract for the renderer. Per `.agents/rules/tasks.md` (*Read First* surface — "the arch docs the implementer must read"), this is the canonical surface for every renderer task. Suggested fix: add a *Read First* entry for `docs/architecture/renderer-technology-choice.md` (relative path `../../../docs/architecture/renderer-technology-choice.md` from each task file) to [`tasks/mvp/06-renderer.md`](../../tasks/mvp/06-renderer.md) (module file) and at minimum [`tasks/mvp/06-renderer/01-webgl2-context-setup-plus-resize-handler.md`](../../tasks/mvp/06-renderer/01-webgl2-context-setup-plus-resize-handler.md), [`05-1115-tactical-battlefield-renderer.md`](../../tasks/mvp/06-renderer/05-1115-tactical-battlefield-renderer.md), [`07-event-log-animation-timeline.md`](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md), and [`08-presentation-loop-decoupled-from-sim.md`](../../tasks/mvp/06-renderer/08-presentation-loop-decoupled-from-sim.md). Skill did not edit the task files (anti-cheat rule D).
- **Two cross-doc anchors were repaired in place.** The original cited `[animation-contract.md § DAMAGE_FRAME Ownership](./animation-contract.md#damage_frame-ownership)` and `[animation-contract.md § Degradation](./animation-contract.md#degradation)`. The actual headings are `## 2. DAMAGE_FRAME Ownership` and `## 7. Degradation`, whose GitHub-rendered anchors are `#2-damage_frame-ownership` and `#7-degradation`. The rewrite uses the correct anchors so the links resolve. No meaning change; logged here for transparency since the audit's link-health repair is allowed under skill § 9 / Hard Prohibition C ("Add new links freely; remove only when the link is genuinely broken or duplicated") but the orchestrator captures the diff via git.
