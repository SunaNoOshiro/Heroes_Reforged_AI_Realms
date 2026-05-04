// Pack registry contract.
//
// The registry is the single read surface for content records and
// resolved assets at runtime. Mounted by src/content-runtime/ during
// pack load (see docs/architecture/hot-reload-flow.md) and consumed by
// engine, renderer, AI, and editor through this interface.
//
// Gameplay records reference assets through logical IDs only, never
// through raw paths (see docs/architecture/asset-path-resolution.md).

export interface PackId {
  readonly id: string;
  readonly version: string;
  readonly contentHash: string;
  readonly engineHash?: string;
}

export interface ResolvedAsset {
  readonly id: string;
  readonly url: string;
  readonly hash: string;
  readonly format: "png" | "webp" | "jpeg" | "ogg" | "mp3" | "wasm" | "json" | "bin";
}

export interface PackRegistry {
  /** Returns true if the registry has fully loaded (all dependent packs resolved). */
  ready(): boolean;

  /** Returns the canonical pack list in mount order (lowest precedence first). */
  packs(): readonly PackId[];

  /** Looks up a content record by its stable ID; returns `undefined` if not present. */
  getRecord<T>(id: string): T | undefined;

  /** Resolves a logical asset ID to a runtime URL + hash. Synchronous after load. */
  resolveAsset(logicalId: string): ResolvedAsset | undefined;

  /** Returns every record ID currently registered for the given suffix (e.g. `.unit.json` → all unit IDs). */
  listIdsBySuffix(suffix: string): readonly string[];
}
