# Right Panel — Mini-Map with Compass Rose

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
The top section of the right panel shows a mini-map of the entire adventure map with a compass rose (N/S/E/W). The current visible area is shown as a rectangle overlay. Clicking the mini-map moves the camera.

Visual direction: top-right mini-map panel with compact directional labels.

Read First:
- `docs/architecture/wiki/screens/07-adventure-map/spec.md`
- `docs/architecture/wiki/screens/07-adventure-map/interactions.md`
- `docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`
- `docs/architecture/wiki/screens/07-adventure-map/architecture.md`
- `docs/architecture/wiki/screens/07-adventure-map/mockup.html`

Inputs:
- `MapStorage` (terrain colors), camera position/zoom, fog of war state
- Screen package `docs/architecture/wiki/screens/07-adventure-map/`

Outputs:
- `src/ui/components/MiniMap.tsx`
- Canvas element rendering a 1-pixel-per-tile version of the map
- Terrain colors: Grass=dark green, Dirt=brown, Snow=white, Water=blue, etc.
- Fog overlay: hidden tiles are black, explored tiles are 50% darkened
- Compass rose overlay (N top-right, S bottom, E right, W left labels)
- Camera viewport rectangle drawn as white/yellow outline
- Click on mini-map → center camera on that tile

Owned Paths:
- `src/ui/components/MiniMap.tsx`

Dependencies:
- phase-2.06-visual-fidelity.06-ornate-ui-frame-full-screen-medieval-border-chrome
- mvp.03-map-system.03-layered-tile-storage
- mvp.06-renderer.04-camera-pan-zoom-clamp-to-map-bounds

Acceptance Criteria:
- Mini-map updates in real time as heroes move
- Fog of war correctly darkens hidden tiles on mini-map
- Clicking mini-map correctly moves main camera
- Compass rose is always oriented correctly (N always up)
- Layout, bindings, and commands match `docs/architecture/wiki/screens/07-adventure-map/mockup.html`, `docs/architecture/wiki/screens/07-adventure-map/interactions.md`, and `docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
