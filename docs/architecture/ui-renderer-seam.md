# UI ↔ Renderer Seam

**Status:** Approved for MVP
**Date:** 2026-05-02
**Source decisions:**
[`ui-technology-choice.md`](./ui-technology-choice.md),
[`renderer-technology-choice.md`](./renderer-technology-choice.md)

The DOM-side UI shell and the WebGL2 renderer share a viewport but no
mutable state. This doc pins the seam so that pointer events,
hit-tests, resizes, and z-ordering behave identically across screens.

---

## 1. DOM Layering

- The WebGL `<canvas>` is the **root layer**. It is created exactly
  once at app boot and never destroyed except on tab unload (see also
  [`screens/59-loading-screen/architecture.md`](./wiki/screens/59-loading-screen/architecture.md)
  and [diagram 28](./diagrams/28-loading-orchestration.md)).
- The DOM shell is mounted in an absolutely-positioned overlay
  container above the canvas, with `pointer-events: none` by default.
  Interactive UI elements re-enable `pointer-events: auto` per
  component.
- Modals, tooltips, popups, toasts, the synchronizing overlay, the
  loading screen, the debug overlay, and the fatal error boundary
  each render into a dedicated React portal at the z-layer pinned in
  [`ui-technology-choice.md` § Z-Stack Contract](./ui-technology-choice.md#z-stack-contract).
- Portals are children of the app root, not of individual screens.
  Closing a screen does not unmount its open modal/tooltip/popup
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
2. If that element is inside a DOM portal at any layer above the
   canvas (HUD, panel, modal, tooltip, popup, toast, debug,
   synchronizing, loading, fatal), the DOM handler runs and the
   canvas does **not** see the event.
3. If the topmost DOM element is the canvas (or a transparent overlay
   that explicitly forwards to the canvas), the renderer's hit-test
   runs.

DOM panels with `pointer-events: none` are transparent to the seam:
the browser falls through them to the canvas automatically.

### Tablet Touch

Touch events follow the same resolution order. `touch-action`
properties on each interactive layer are explicit:
- canvas: `touch-action: none` (renderer handles pinch + pan).
- HUD chrome: `touch-action: manipulation` (taps without browser zoom).
- modal/portal layers: default (`auto`) so scroll-within-modal works.

### Hit-Test API

The renderer exposes one synchronous query to the UI:

```ts
// renderer.pickAt: (cssX: number, cssY: number) => PickResult | null
type PickResult =
  | { kind: "tile"; q: number; r: number }
  | { kind: "hero"; id: HeroId }
  | { kind: "town"; id: TownId }
  | { kind: "object"; id: MapObjectId }
  | { kind: "unit"; id: UnitInstanceId }
  | { kind: "obstacle"; id: ObstacleId };
```

- Coordinates are CSS pixels (pre-DPR), measured from the canvas
  origin.
- `pickAt` is **read-only**. It must not allocate camera matrices,
  recompute frustum culling, or mutate any state. Pickers cache per
  frame.
- The UI never reads WebGL state directly. Buffer ownership stays
  with the renderer; the seam is the only crossing.

### Synthetic Events

When the canvas receives a pointer event, the seam adapter emits a
synthetic event into the Zustand store as a draft, e.g.
`state.ui.adventure.pointer = { kind: "hover", target }`. Components
that need the hovered map element subscribe through a selector — they
do not poll `pickAt` themselves.

Confirmed clicks dispatch a command via the command hook (see
[diagram 08](./diagrams/08-building-click.md) and
[diagram 26](./diagrams/26-pointer-event-routing.md)).

### Anti-Patterns

- ❌ Calling `pickAt` from inside a React render function. Call it in
  event handlers only.
- ❌ DOM tooltips for in-canvas objects that read positions from the
  WebGL viewport. Use the synthetic event channel instead.
- ❌ DOM elements that overlap the canvas with `pointer-events: auto`
  but no visible chrome. They create dead zones.
- ❌ Letting WebGL hit-tests fire on events that already resolved on
  a higher DOM layer. The seam is "first match wins" by z-order.

---

## 3. Hit-Test Contract

The single contract is `renderer.pickAt(cssX, cssY) → PickResult | null`.

- **Adventure map:** translates to axial hex `(q, r)`; resolves the
  topmost owning entity if any.
- **Tactical battle:** translates to battle hex; resolves obstacle,
  unit, or empty.
- **Town panorama:** translates to `BuildingHotspots` (canvas-driven
  hotspot layer), returns the building ID.

If the cursor falls outside the canvas viewport rectangle, `pickAt`
returns `null` even if the canvas element nominally owns the event.

The renderer task in
[`tasks/mvp/06-renderer/`](../../tasks/mvp/06-renderer/) is the owner
of this implementation.

---

## 4. Resize Protocol

A single `ResizeObserver` is attached to the canvas container element.
On every observation:

1. The seam computes the new CSS pixel size `(w, h)` and current DPR
   (`window.devicePixelRatio`).
2. The seam dispatches `renderer.resize(w, h, dpr)`. The renderer
   updates its backing store and viewport rect (rules in
   [`screen-scaling.md` § Hi-DPI](./screen-scaling.md#hi-dpi)).
3. The seam writes the new viewport rect to the store as
   `state.ui.viewport = { w, h, dpr, stageRect, mapRect }` so that
   layout-coupled DOM components can react with one Zustand
   notification.
4. DOM panels never query the canvas size directly; they read
   `state.ui.viewport`.

DPR changes (e.g. moving a window between displays) trigger the same
flow via a `matchMedia('(resolution)')` listener registered alongside
the ResizeObserver.

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
