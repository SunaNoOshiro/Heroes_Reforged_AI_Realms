# Dev Hot-Reload — Watch Folder, Reload Without Restart

Status: planned

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
During development, when any file in a pack folder changes, automatically reload that asset without restarting the game or losing game state. This makes art iteration fast.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- Vite dev server HMR, `AssetLoader` (Task 5)

Outputs:
- `src/renderer/hot-reload.ts` (dev-only, tree-shaken in prod)
- Vite plugin: watch `resources/packs/**/*` → on change, evict cached asset → reload from disk
- Granular reload: changing `pikeman.png` only reloads Pikeman's texture (not the whole pack)
- UI: small toast notification "Reloaded: emberwild/ash-hound.png" in bottom-left corner (dev mode only)

Owned Paths:
- `src/renderer/hot-reload.ts`
- `resources/packs/**/*`

Dependencies:
- mvp.02b-asset-pipeline.05-async-asset-loader-with-caching

Acceptance Criteria:
- Replacing `ash-hound.png` on disk → renderer shows the new sprite within 1 second (no full reload)
- Game state (hero positions, resources, turn) is preserved across hot-reload
- Hot-reload is completely absent from production builds (`import.meta.hot` guard)

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
