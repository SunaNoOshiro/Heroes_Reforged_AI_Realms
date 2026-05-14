# UI ↔ Renderer Seam

**Status:** Approved for MVP
**Date:** 2026-05-02
**Source decisions:**
[`ui-technology-choice.md`](./ui-technology-choice.md),
[`renderer-technology-choice.md`](./renderer-technology-choice.md)

The DOM-side UI shell and the WebGL2 renderer share a viewport but no
mutable state. This doc pins the seam so pointer events, hit-tests,
resizes, and z-ordering behave identically across screens.

---

## 1. DOM Layering

- The WebGL `<canvas>` is the **root layer**. Created exactly once at
  app boot, never destroyed except on tab unload (see
  [`screens/59-loading-screen/architecture.md` § Canvas Lifecycle](./wiki/screens/59-loading-screen/architecture.md#canvas-lifecycle-and-warmup-orchestration)
  and [diagram 28](./diagrams/28-loading-orchestration.md)).
- The DOM shell mounts in an absolutely-positioned overlay container
  above the canvas, with `pointer-events: none` by default.
  Interactive UI elements re-enable `pointer-events: auto` per
  component.
- Modals, tooltips, popups, toasts, the synchronizing overlay, the
  loading screen, the debug overlay, and the fatal error boundary
  each render into a dedicated React portal at the z-layer pinned in
  [`ui-technology-choice.md` § Z-Stack Contract](./ui-technology-choice.md#z-stack-contract).
  Portals attach to the app root, not to individual screens, so
  closing a screen never unmounts its open modal / tooltip / popup
  portals.

```text
<html>
  <body>
    <div id="app-root" style="position:relative">
      <canvas id="gl"      style="z-index:0;   position:absolute; inset:0">  <!-- renderer -->
      <div    id="hud"     style="z-index:100;  pointer-events:none">         <!-- HUD layer -->
      <div    id="panels"  style="z-index:200;  pointer-events:auto">         <!-- side panels -->
      <div    id="modals"  style="z-index:1000">                              <!-- modal portal -->
      <div    id="tips"    style="z-index:2000">                              <!-- tooltip portal -->
      <div    id="popups"  style="z-index:2500">                              <!-- popup portal -->
      <div    id="toasts"  style="z-index:3000">                              <!-- toast portal -->
      <div    id="debug"   style="z-index:9000">                              <!-- DEV only -->
      <div    id="syncing" style="z-index:9500">
      <div    id="loading" style="z-index:9700">
      <div    id="fatal"   style="z-index:10000">
    </div>
  </body>
</html>
```

---

## 2. Input Routing

### Resolution Order

1. The browser delivers a pointer event to the **topmost DOM element**
   under the cursor (standard hit-testing).
2. If that element sits in any DOM layer above the canvas (HUD,
   panel, modal, tooltip, popup, toast, debug, synchronizing,
   loading, fatal), the DOM handler runs and the canvas does **not**
   see the event.
3. If the topmost DOM element is the canvas (or a transparent overlay
   that explicitly forwards to the canvas), the renderer's hit-test
   runs.

DOM panels with `pointer-events: none` are transparent to the seam:
the browser falls through them to the canvas automatically. The seam
is **first-match-wins by z-order** — a renderer hit-test must never
fire on an event already resolved by a higher DOM layer.

### Tablet Touch

Touch events follow the same resolution order. `touch-action`
properties on each interactive layer are explicit:

- canvas: `touch-action: none` (renderer handles pinch + pan).
- HUD chrome: `touch-action: manipulation` (taps without browser zoom).
- modal / portal layers: default (`auto`) so scroll-within-modal works.

### Hit-Test API

The renderer exposes one synchronous query to the UI:

```ts
renderer.pickAt(cssX: number, cssY: number): PickResult | null;

type PickResult =
  | { kind: "tile";     q: number; r: number }
  | { kind: "hero";     id: HeroId }
  | { kind: "town";     id: TownId }
  | { kind: "object";   id: MapObjectId }
  | { kind: "unit";     id: UnitInstanceId }
  | { kind: "obstacle"; id: ObstacleId };
```

- Coordinates are CSS pixels (pre-DPR), measured from the canvas
  origin.
- `pickAt` is **read-only**: no camera-matrix allocation, no
  frustum-culling recompute, no state mutation. Pickers cache per
  frame.
- The UI never reads WebGL state directly. Buffer ownership stays
  with the renderer; the seam is the only crossing.

### Synthetic Events

When the canvas receives a pointer event, the seam adapter writes a
synthetic event into the Zustand store as a draft, e.g.
`state.ui.adventure.pointer = { kind: "hover", target }`. Components
that need the hovered map element subscribe through a selector — they
do not poll `pickAt` themselves. Drafts under `state.ui.*` are
session-only, non-replayed, and non-hashed per
[`ui-frame-lag-contract.md` § 2 Optimistic UI](./ui-frame-lag-contract.md#2-optimistic-ui).

Confirmed clicks dispatch a command via the command hook (see
[diagram 26 — Pointer Event Routing](./diagrams/26-pointer-event-routing.md)
and
[diagram 08 — Building Click](./diagrams/08-building-click.md)).

### Anti-Patterns

- ❌ Calling `pickAt` from inside a React render function. Call it in
  event handlers only.
- ❌ DOM tooltips for in-canvas objects that read positions from the
  WebGL viewport. Use the synthetic event channel instead.
- ❌ DOM elements that overlap the canvas with `pointer-events: auto`
  but no visible chrome. They create dead zones.
- ❌ Letting WebGL hit-tests fire on events already resolved on a
  higher DOM layer.

---

## 3. Hit-Test Contract

The single contract is
`renderer.pickAt(cssX, cssY) → PickResult | null`.

| Surface | Translation | Resolves to |
|---|---|---|
| Adventure map | axial hex `(q, r)` | topmost owning entity (hero / town / object / unit), or the hex itself |
| Tactical battle | battle hex | obstacle, unit, or empty hex |
| Town panorama | `BuildingHotspots` canvas hotspot layer | building ID |

If the cursor falls outside the canvas viewport rectangle, `pickAt`
returns `null` even if the canvas element nominally owns the event.

The renderer task tree in
[`tasks/mvp/06-renderer/`](../../tasks/mvp/06-renderer/) owns this
implementation.

---

## 4. Resize Protocol

A single `ResizeObserver` is attached to the canvas container element.
On every observation:

1. The seam computes the new CSS pixel size `(w, h)` and current DPR
   (`window.devicePixelRatio`).
2. The seam dispatches `renderer.resize(w, h, dpr)`. The renderer
   updates its backing store and viewport rect
   ([`screen-scaling.md` § 4 Hi-DPI](./screen-scaling.md#4-hi-dpi)).
3. The seam writes the new viewport rect to the store as
   `state.ui.viewport = { w, h, dpr, stageRect, mapRect }` so
   layout-coupled DOM components react with one Zustand notification.
4. DOM panels never query the canvas size directly; they read
   `state.ui.viewport`.

DPR changes (e.g. moving a window between displays) trigger the same
flow via a `matchMedia('(resolution)')` listener registered alongside
the `ResizeObserver`.

---

## 5. Z-Index Rules

The full table is in
[`ui-technology-choice.md` § Z-Stack Contract](./ui-technology-choice.md#z-stack-contract).
Seam-specific rules:

- The canvas is `z-index: 0`. Nothing in `src/renderer/` may set
  z-index outside the canvas.
- Renderer-internal layering (terrain, fog, objects, units, in-canvas
  UI) uses paint order, not CSS z-index — see
  [`renderer-technology-choice.md` § Implementation Approach](./renderer-technology-choice.md#implementation-approach).
- DOM layers never reach into the renderer's paint order. If a panel
  must dim the canvas (e.g. modal open), it draws a translucent DOM
  rectangle at its own layer; it does not toggle a renderer flag.

---

## Related Files

- [`ui-technology-choice.md`](./ui-technology-choice.md)
- [`renderer-technology-choice.md`](./renderer-technology-choice.md)
- [`screen-scaling.md`](./screen-scaling.md)
- [`ui-frame-lag-contract.md`](./ui-frame-lag-contract.md)
- [`state-flow.md`](./state-flow.md)
- [diagram 26 — Pointer Event Routing](./diagrams/26-pointer-event-routing.md)
- [diagram 08 — Building Click → Action Flow](./diagrams/08-building-click.md)
- [`tasks/mvp/06-renderer/01-webgl2-context-setup-plus-resize-handler.md`](../../tasks/mvp/06-renderer/01-webgl2-context-setup-plus-resize-handler.md)
- [`tasks/mvp/07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md`](../../tasks/mvp/07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md)

---

## 🔍 Sync Check

- **UI: ✔** — DOM-layer ordering, the eleven portal roots, and the synthetic-pointer flow line up with [`ui-technology-choice.md` § Z-Stack Contract](./ui-technology-choice.md#z-stack-contract), [diagram 26 — Pointer Event Routing](./diagrams/26-pointer-event-routing.md), and the `BuildingHotspots` component in [`wiki/screens/24-town-screen/spec.md`](./wiki/screens/24-town-screen/spec.md). Canvas-lifecycle claim matches [`screens/59-loading-screen/architecture.md` § Canvas Lifecycle](./wiki/screens/59-loading-screen/architecture.md#canvas-lifecycle-and-warmup-orchestration) + [diagram 28](./diagrams/28-loading-orchestration.md).
- **Schema: ✔** — `PickResult`, `renderer.pickAt`, `renderer.resize`, and the synthetic-pointer draft are runtime-only surfaces. `state.ui.viewport` and `state.ui.<screen>.pointer` are non-persisted drafts per [`ui-frame-lag-contract.md` § 2](./ui-frame-lag-contract.md#2-optimistic-ui), so no [`data-inventory.md`](./data-inventory.md) row is owed and no schema file is owned by this doc.
- **Tasks: ✔** — [`tasks/mvp/06-renderer/01-webgl2-context-setup-plus-resize-handler.md`](../../tasks/mvp/06-renderer/01-webgl2-context-setup-plus-resize-handler.md) and [`tasks/mvp/07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md`](../../tasks/mvp/07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md) both cite this doc in *Read First*; nine additional renderer / UI tasks reference it (`06-renderer/02-08`, `07-ui-shell/16,19`). The doc is registered in [`tasks/task-registry.json`](../../tasks/task-registry.json); no orphan tasks reference it without reciprocal mention.

## ⚠ Issues

- **Broken anchor `screen-scaling.md#hi-dpi` repaired in place.** The original linked the Hi-DPI rule at `./screen-scaling.md#hi-dpi`, but the actual heading in [`screen-scaling.md`](./screen-scaling.md) is `## 4. Hi-DPI` (GitHub-rendered anchor `#4-hi-dpi`); the numbered-anchor convention is what [`renderer-technology-choice.md`](./renderer-technology-choice.md) and others use reciprocally. Repointed under Hard Prohibition C ("remove only when the link is genuinely broken or duplicated"). No meaning change; flagged here for transparency since the orchestrator captures the diff via git.
- **Deep anchors added for two pre-existing file-only links.** The original linked [`screens/59-loading-screen/architecture.md`](./wiki/screens/59-loading-screen/architecture.md) and `ui-frame-lag-contract.md` at file level only. The rewrite added the existing `#canvas-lifecycle-and-warmup-orchestration` and `#2-optimistic-ui` anchors so the reference points at the exact rule rather than the whole file. Add-only operation per Hard Prohibition C; no claim changed.
