# Hex Tile Atlas + Axial→Screen Transform

Status: planned

Module: [Renderer (M1/M2)](../06-renderer.md)

Description:
Load a tile atlas texture (PNG sprite sheet) and implement the pointy-top axial→screen coordinate transform. All tile rendering goes through this transform.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)

Inputs:
- Tile atlas PNG (stub/placeholder for MVP)
- `hex.ts` utilities (`03-map-system.md` Task 1)

Outputs:
- `src/renderer/tile-atlas.ts`
- `loadAtlas(gl: WebGL2RenderingContext, url: string): Promise<TileAtlas>`
- `TileAtlas.getUV(tileId: number): [u0, v0, u1, v1]` — texture coordinates for a tile
- `src/renderer/hex-transform.ts`
- `axialToPixel(q: number, r: number, hexSize: number): {x: number, y: number}` (world space)
- `pixelToAxial(x: number, y: number, hexSize: number): {q: number, r: number}` (for mouse picking)

Owned Paths:
- `src/renderer/tile-atlas.ts`
- `src/renderer/hex-transform.ts`

Dependencies:
- mvp.06-renderer.01-webgl2-context-setup-plus-resize-handler
- mvp.03-map-system.01-axial-hex-coordinate-utilities

Acceptance Criteria:
- Hex centers align correctly on a 10×10 test grid (visual inspection)
- `axialToPixel` → `pixelToAxial` round-trips within ±1 pixel
- Atlas UVs map correctly to visible tile sprites

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
