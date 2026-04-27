# Async Asset Loader with Caching

Status: planned

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
Load assets on demand, cache after first load, and handle failures gracefully. The loader is the single point where `fetch()` or `new Image()` is called for pack assets.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- `AssetRegistry` (Task 4)

Outputs:
- `src/renderer/asset-loader.ts`
- `AssetLoader`:
```typescript
class AssetLoader {
  loadTexture(id: string): Promise<WebGLTexture>
  loadAudio(id: string): Promise<AudioBuffer>
  loadAnimation(id: string): Promise<AnimationDef>
  preloadPack(packId: string, onProgress: (pct: number) => void): Promise<void>
  evictPack(packId: string): void      // free GPU memory + audio buffers
  getTexture(id: string): WebGLTexture | null   // sync, returns null if not loaded
}
```

Owned Paths:
- `src/renderer/asset-loader.ts`

Preload strategy:
- On pack install: preload all portraits + icons (small, needed immediately)
- On battle start: preload all sprite sheets for units in the battle
- On town enter: preload town screen background + building overlays
- Everything else: lazy load on first access

Dependencies:
- mvp.02b-asset-pipeline.04-asset-registry-id-based-resolution-no-hardcoded-paths

Acceptance Criteria:
- Accessing an unloaded texture returns a placeholder (not a crash)
- Preloading a pack reports correct progress percentage
- `evictPack("emberwild-faction")` frees Emberwild textures from GPU memory (verify with browser memory profiler)
- Cache hit: same asset loaded twice → second call returns in < 1ms

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
