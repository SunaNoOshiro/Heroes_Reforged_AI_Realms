# Hex Grid Overlay — Semi-Transparent Highlight System

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
The tactical battle field uses colored hex overlays to communicate game state:
- All hexes: subtle green grid lines (matching the baseline overland grid styling)
- Reachable hexes for active unit: brighter green fill
- Attack target hexes: red fill
- Selected unit hex: yellow outline
- Hovered hex: white outline

Visual direction: the green hex grid is clearly visible and reads as the tactical board.

Read First:
- [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- `BattleState`, active stack, reachable hexes, hovered hex

Outputs:
- `src/renderer/hex-overlay.ts`
- `renderHexOverlay(gl, overlayData: HexOverlayData, camera: Camera): void`
- `HexOverlayData`: `{ reachable: HexCoord[], attackable: HexCoord[], selected: HexCoord, hovered: HexCoord }`
- Grid lines: 15% opacity green, always visible
- Reachable fill: 30% opacity bright green
- Attackable fill: 30% opacity red
- Selected outline: 80% opacity yellow, 2px stroke
- Hover outline: 60% opacity white, 1px stroke

Owned Paths:
- `src/renderer/hex-overlay.ts`

Dependencies:
- mvp.06-renderer.05-1115-tactical-battlefield-renderer
- phase-2.06-visual-fidelity.02-pseudo-isometric-depth-sorting-objects-overlap-correctly

Acceptance Criteria:
- Grid lines visible across entire 11×15 battlefield
- Selecting a unit highlights its reachable hexes within 1 frame
- Attack hexes (range of selected unit) shown in red
- Hover outline tracks mouse position smoothly
- Overlays are drawn above unit sprites but below stack badges

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
