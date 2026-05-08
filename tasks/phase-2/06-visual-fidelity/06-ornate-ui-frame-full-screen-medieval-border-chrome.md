# Ornate UI Frame — Full-Screen Medieval Border Chrome

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
The classic overland-strategy UI is framed by a thick ornate medieval border — brown/gold decorative trim that surrounds the game canvas, the right panel, and the bottom bar. This is the single most recognizable visual element that anchors the "overland strategy" identity. It is a purely cosmetic image layer rendered above everything else.

Visual direction: thick decorative red/gold frame, corner ornaments, and panel dividers based on original project art briefs.

Read First:
- `docs/architecture/wiki/screens/07-adventure-map/spec.md`
- `docs/architecture/wiki/screens/07-adventure-map/interactions.md`
- `docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`
- `docs/architecture/wiki/screens/07-adventure-map/architecture.md`
- `docs/architecture/wiki/screens/07-adventure-map/mockup.html`

Inputs:
- UI frame sprite sheet (top bar, bottom bar, left edge, right edge, 4 corners, panel dividers)
- Screen package `docs/architecture/wiki/screens/07-adventure-map/`

Outputs:
- `src/ui/components/GameFrame.tsx`
- Fixed-position React component rendered as the outermost layer
- Frame is a 9-slice sprite: corners + edges scale independently of window size
- Panel dividers separate: game canvas | right panel | bottom bar
- Frame does NOT receive mouse events (pointer-events: none)

Frame regions (baseline layout):
```
┌─────────────────────────────────┬──────────┐
│                                 │          │
│         Game Canvas             │  Right   │
│         (hex map / battle)      │  Panel   │
│                                 │  ~180px  │
├─────────────────────────────────┴──────────┤
│           Bottom Bar (~80px)               │
└────────────────────────────────────────────┘
```

Owned Paths:
- `src/ui/components/GameFrame.tsx`

Dependencies:
- mvp.07-ui-shell.01-react-18-app-shell-with-canvas-overlay

Acceptance Criteria:
- Frame renders at any window size without stretching corner ornaments
- Panel boundaries match the baseline layout diagram above
- Frame is visually rich — not a flat color border
- Frame does not obscure the game canvas area
- Layout, bindings, and commands match `docs/architecture/wiki/screens/07-adventure-map/mockup.html`, `docs/architecture/wiki/screens/07-adventure-map/interactions.md`, and `docs/architecture/wiki/screens/07-adventure-map/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
