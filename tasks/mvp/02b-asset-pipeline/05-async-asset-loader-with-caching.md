# Async Asset Loader with Caching

Module: [Asset Pipeline & Content Pack Architecture (M0/M1)](../02b-asset-pipeline.md)

Description:
Load assets on demand, cache after first load, and handle failures gracefully. The loader is the single point where `fetch()` or `new Image()` is called for pack assets.

Read First:
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/asset-loading.md`](../../../docs/architecture/asset-loading.md)
- [`docs/architecture/asset-policy.md`](../../../docs/architecture/asset-policy.md)
- [`docs/architecture/worker-csp.md`](../../../docs/architecture/worker-csp.md)

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
- **Pre-flight pipeline ordering.** Every binary asset runs through
  `bytes → magic-byte check → cap pre-flight → SHA-256 verify →
  decoder` in the order pinned by
  [`docs/architecture/asset-loading.md` § 2](../../../docs/architecture/asset-loading.md#2-pre-flight-pipeline).
  Reordering any gate is a CI failure.
- **Per-asset hash check precedes decode.** The loader recomputes
  the SHA-256 of fetched bytes and compares against
  `assets/index.json[].sha256` before any decoder runs. Mismatch
  returns `Result.err("pack.error.asset.integrity", { assetId,
  expected, observed })`.
- **MIME magic-byte gate.** The loader compares the first bytes
  of every fetched asset against the per-kind magic table in
  [`asset-loading.md` § 4](../../../docs/architecture/asset-loading.md#4-magic-byte-table)
  (PNG `89 50 4E 47`, OGG `4F 67 67 53`, WebP `52 49 46 46 …
  57 45 42 50`, JSON `{` after BOM strip). Mismatch →
  `Result.err("pack.error.asset.mime-mismatch", { expected,
  observed })`. The `pack://` virtual fetcher synthesises
  `X-Content-Type-Options: nosniff` on every response.
- **Image dim pre-flight.** For PNG/WebP, the loader parses the
  PNG IHDR / WebP VP8X width and height before
  `createImageBitmap` and refuses on
  `maxImageWidth: 4096`, `maxImageHeight: 4096`,
  `maxImagePixels: 16_777_216` per
  [`asset-loading.md` § 1.1](../../../docs/architecture/asset-loading.md#1-cap-table).
  Refusal code: `pack.error.asset.dim-cap`.
- **Audio header pre-flight.** For OGG, the loader parses the
  Vorbis identification header for `sampleRate` and `channels`
  before `decodeAudioData`. Refuses on
  `maxAudioChannels: 2`, `maxAudioSampleRate: 48_000`.
  Duration is verified after decode-into-Worker; on
  `maxAudioDurationMs: 60_000` overage the buffer is freed and
  the call refuses with `pack.error.asset.audio-cap`.
- **Per-pack fetch concurrency + rate cap.** The loader runs a
  per-pack token bucket: at most `maxConcurrentFetches: 8`
  in-flight fetches and `maxFetchesPerSecondPerPack: 32`. Excess
  requests queue FIFO. A queue stalled > 5 s emits
  `pack.error.asset.fetch-rate`.
- **Per-pack memory budget.** The loader's cache attributes
  resident bytes to the owning `packId`; LRU within the pack
  fires before global pressure. Per-pack ceiling:
  `maxResidentBytesPerPack: 64 MB` (32 MB for sandboxed packs
  per [`sandbox-model.md` § 2](../../../docs/architecture/sandbox-model.md#2-capability-matrix)).
- **Off-main-thread decode.** Image decode runs in a Worker
  using `createImageBitmap` over a transferred `ArrayBuffer`;
  audio decode runs inside an `AudioWorklet`. Both adopt the
  Worker security profile in
  [`worker-csp.md`](../../../docs/architecture/worker-csp.md);
  Worker crashes follow the restart-with-last-known-good policy
  in that doc.
- **Closed-kind enforcement.** The loader refuses any asset
  whose declared `kind` is outside the closed enum on
  `asset-index.schema.json`; refusal code
  `pack.error.asset.kind-forbidden` per
  [`asset-policy.md` § 2](../../../docs/architecture/asset-policy.md#2-forbidden-kinds).
- **Security-test corpus.** The fixtures under
  [`tests/security/escape-vectors/`](../../../tests/security/escape-vectors/)
  run through the loader and assert `Result.err` with stable
  codes for every cap above.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
