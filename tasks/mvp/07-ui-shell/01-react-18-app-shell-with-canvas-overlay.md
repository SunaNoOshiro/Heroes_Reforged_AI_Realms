# React 18 App Shell with Canvas Overlay

Status: planned

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Set up the React application root. The canvas (WebGL2) fills the full viewport. React UI components are absolutely positioned over it as a transparent overlay layer. No React component writes to the canvas directly.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- [`docs/architecture/ui-technology-choice.md`](../../../docs/architecture/ui-technology-choice.md)
- [`docs/architecture/ui-renderer-seam.md`](../../../docs/architecture/ui-renderer-seam.md)
- [`docs/architecture/ui-component-resolver.md`](../../../docs/architecture/ui-component-resolver.md)
- [`docs/architecture/screen-scaling.md`](../../../docs/architecture/screen-scaling.md)
- [`docs/architecture/ui-frame-lag-contract.md`](../../../docs/architecture/ui-frame-lag-contract.md)
- `docs/architecture/wiki/screens/07-adventure-map/spec.md`
- `docs/architecture/wiki/screens/07-adventure-map/interactions.md`
- `docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`
- `docs/architecture/wiki/screens/07-adventure-map/architecture.md`
- `docs/architecture/wiki/screens/07-adventure-map/mockup.html`

Inputs:
- Renderer (`06-renderer.md`)
- React 18, Vite
- Screen package `docs/architecture/wiki/screens/07-adventure-map/`

Outputs:
- `src/ui/App.tsx`
- `<canvas>` element fills viewport, ref passed to renderer `initGL`
- UI overlay `<div>` absolutely positioned on top with `pointer-events: none` by default
- Interactive UI elements re-enable pointer events selectively

Owned Paths:
- `src/ui/App.tsx`

Dependencies:
- mvp.06-renderer.01-webgl2-context-setup-plus-resize-handler

Acceptance Criteria:
- Canvas and UI overlay do not conflict (no z-index issues)
- App renders without hydration errors
- Canvas ref is stable (not re-created on re-render)
- HMR works in dev (canvas does not flash on hot reload)
- Layout, bindings, and commands match `docs/architecture/wiki/screens/07-adventure-map/mockup.html`, `docs/architecture/wiki/screens/07-adventure-map/interactions.md`, and `docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
