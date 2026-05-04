// Asset loader contract.
//
// Owned by src/renderer/. Consumes `ResolvedAsset` records produced by
// `PackRegistry.resolveAsset` and returns runtime resource handles
// (textures, audio buffers, GPU programs).
//
// This contract is the second half of the no-raw-paths rule pinned by
// docs/architecture/asset-path-resolution.md: the renderer never sees
// a path, only a resolved URL + content hash.

import type { ResolvedAsset } from "./pack-registry.js";

export interface TextureHandle {
  readonly kind: "texture";
  readonly atlasSlotId?: string;
  readonly width: number;
  readonly height: number;
}

export interface AudioHandle {
  readonly kind: "audio";
  readonly durationMs: number;
}

export type AssetHandle = TextureHandle | AudioHandle;

export interface AssetLoader {
  /** Pre-warms a set of assets; resolves once the underlying GPU/audio resources are ready. */
  preload(assets: readonly ResolvedAsset[]): Promise<void>;

  /** Returns the cached handle for a previously-preloaded asset, or `undefined` if not warmed. */
  get(asset: ResolvedAsset): AssetHandle | undefined;

  /** Releases handles whose `id` is not in `keepIds`. Called on screen transitions. */
  evictExcept(keepIds: ReadonlySet<string>): void;
}
