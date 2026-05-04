# Asset Path Resolution

> Source plan:
> [`docs/implementation-plans/16-implementation-readiness-plan.md`](../implementation-plans/16-implementation-readiness-plan.md)
> (T13). Sister docs:
> [`pack-contract.md`](./pack-contract.md),
> [`pack-resolver.md`](./pack-resolver.md),
> [`atlas-pipeline.md`](./atlas-pipeline.md),
> [`hot-reload-flow.md`](./hot-reload-flow.md).

This file pins the difference between the **editor-time** and
**runtime** views of an asset reference. Conflating the two is a
recurring audit gap: gameplay records would silently embed a relative
path, or the runtime would call back into a string-based lookup, both
of which violate the rule that `gameplay records never embed raw
asset paths`.

---

## 1. Editor-time path lookups (string)

The editor browses the file system. It uses **strings**:

- A user picks a sprite in the asset browser; the editor reads the
  relative path (e.g. `assets/units/peasant.png`) from the OS file
  picker.
- The editor records the **logical asset ID** that the registry
  assigns to that file (e.g. `pack:emberwild/units/peasant`), not
  the path.
- The relative path is used **once**, at import time, to compute the
  asset's content hash and register the asset in the pack's
  `assets/index.json`.
- After registration, the path is **never** referenced from a
  gameplay record again. The record stores only the logical ID.

Editor-time path strings live in:

- The asset import dialog.
- The pack-creation wizard.
- The asset-index file (`assets/index.json`) — this is the only
  place where logical ID and relative path co-exist.

---

## 2. Runtime path resolution (registry)

The runtime never sees a relative path inside a gameplay record. It
sees a logical ID; resolution is mediated by the registry.

```
Gameplay record (logical ID)
   ↓
src/content-runtime/PackRegistry.resolveAsset(logicalId)
   ↓
{ url: <bundled URL or atlas slot>, hash: <sha256>, format: <png|webp|…> }
   ↓
src/renderer/AssetLoader.fetch(url, hash)
   ↓
GPU resource handle
```

Key invariants:

- `resolveAsset` is **synchronous** at runtime. The registry was
  populated during pack load (see
  [`hot-reload-flow.md`](./hot-reload-flow.md)) and pre-resolved
  every asset to a bundled URL or an atlas slot.
- The runtime never **reads from disk**. In dev it reads from the
  Vite-served URL space; in production it reads from atlas binaries
  baked by [`atlas-pipeline.md`](./atlas-pipeline.md).
- The runtime never **constructs paths by concatenation**. Helpers
  that take a logical ID and a "filename" template are forbidden;
  use `resolveAsset` instead.

---

## 3. Why this split exists

- Gameplay records are content. They migrate, they get translated,
  they get override-merged across packs. A relative path baked into
  a record means a record overriding another record carries the
  *original pack's* file layout assumption — which breaks the
  override.
- Runtime is performance-critical. A registry lookup is `O(1)`; a
  string-concat-and-fetch is at least `O(file-system-query)`.
- The atlas pipeline only knows about logical IDs. If a gameplay
  record stored a path, the atlas builder could not safely group
  small images into a single texture.
- Multiplayer determinism requires that the **content hash** be a
  function of logical IDs, not paths. Two players running the same
  pack from different mount points must compute the same hash.

---

## 4. Failure modes and policy

| Symptom | Owning surface | Error code | Severity |
|---|---|---|---|
| Logical ID not in registry | runtime | `ASSET_LOGICAL_ID_NOT_FOUND` | `error` (gameplay) / `warn` (presentation, falls back) |
| Asset-index entry's relative path missing on disk | dev / build | `PACK_ASSET_FILE_MISSING` | `fatal` (refuses load) |
| Atlas slot resolution fails | runtime | `ASSET_ATLAS_SLOT_MISSING` | `error` (uses placeholder texture) |
| Editor stored a relative path inside a gameplay record | content lint | `VALIDATION_RAW_ASSET_PATH_IN_RECORD` | `error` (refuses save) |

`VALIDATION_RAW_ASSET_PATH_IN_RECORD` is enforced by the schema
validators: gameplay record fields that reference assets are typed as
logical-ID strings (matching the registry-key pattern), not as
free-form paths. A record that fails this check refuses to save.

---

## 5. Examples

**Editor: importing a sprite**

```
input:  /Users/dev/work/pack-emberwild/assets/units/peasant.png
        (selected by user in OS file picker)
output: assets/index.json gains
        {
          "id": "pack:emberwild/units/peasant",
          "path": "assets/units/peasant.png",
          "hash": "sha256:…",
          "format": "png"
        }
        and the gameplay record references "pack:emberwild/units/peasant",
        not the path.
```

**Runtime: rendering the sprite**

```
record:  unit.peasant.png_id = "pack:emberwild/units/peasant"
↓ registry.resolveAsset("pack:emberwild/units/peasant")
=> { url: "/atlases/emberwild-units.bin#slot=0x12", hash: "sha256:…", format: "png" }
↓ AssetLoader.fetch(...)
=> WebGL texture handle
```

---

## 6. Verified by

- Schema field types: gameplay records reference assets through
  enums or string patterns that **only** match registry-key shapes,
  never relative paths. Enforced by
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  via per-suffix schema validation.
- The "no raw asset paths in gameplay records" rule is one of the
  protected rules in [`AGENTS.md`](../../AGENTS.md) and
  [`overview.md`](./overview.md).
- This file is grep-checked for placeholder markers by
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs).
