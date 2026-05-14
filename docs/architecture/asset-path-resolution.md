# Asset Path Resolution

> Sister docs:
> [`pack-contract.md`](./pack-contract.md),
> [`pack-resolver.md`](./pack-resolver.md),
> [`atlas-pipeline.md`](./atlas-pipeline.md),
> [`asset-loading.md`](./asset-loading.md),
> [`hot-reload-flow.md`](./hot-reload-flow.md).

Pins the editor-time vs runtime split for asset references. Conflating
the two is a recurring audit gap: gameplay records would silently embed
a relative path, or the runtime would fall back into a string-based
lookup — both violate the root rule that *gameplay records never embed
raw asset paths*
([CLAUDE.md hard constraints](../../CLAUDE.md#hard-constraints-ci-enforced)).

---

## 1. Editor-time: strings (one-shot)

The pack editor browses the file system, so it works with **path
strings** — but only at import time, and only inside three surfaces:

- the asset import dialog (OS file picker),
- the pack-creation wizard,
- the pack's `assets/index.json` — the **only** place where a logical
  ID and a relative path co-exist after import.

Import flow:

1. User picks a file in the OS file picker
   (e.g. `assets/units/peasant.png`).
2. The editor computes the asset's SHA-256 and registers it in the
   pack's `assets/index.json` against a registry-assigned **logical
   ID** (e.g. `pack:emberwild/units/peasant`).
3. The relative path is recorded **only** on that index row.
   Gameplay records reference the logical ID; the path never appears
   on a record again.

---

## 2. Runtime: registry-mediated (synchronous)

The runtime never sees a relative path inside a gameplay record. It
resolves a logical ID through the registry, which was pre-populated
during pack load (see
[`hot-reload-flow.md`](./hot-reload-flow.md)).

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

Contract surface:
[`src/contracts/pack-registry.ts`](../../src/contracts/pack-registry.ts)
(`resolveAsset`, `ResolvedAsset`) and
[`src/contracts/asset-loader.ts`](../../src/contracts/asset-loader.ts).

Invariants:

- **Synchronous.** `resolveAsset` is `O(1)` after load; no I/O, no
  promise. Async work (decode, GPU upload) lives behind `AssetLoader`.
- **No disk reads from the runtime.** Dev reads through the
  Vite-served URL space; production reads atlas binaries baked by
  [`atlas-pipeline.md`](./atlas-pipeline.md).
- **No path concatenation.** Helpers that take a logical ID plus a
  filename template are forbidden; consumers call `resolveAsset`
  instead.

---

## 3. Why the split exists

- **Override safety.** Gameplay records are pack content; they get
  override-merged across packs. A baked-in relative path leaks the
  *original* pack's file layout into the override target — breaking
  the override edge defined by
  [`pack-resolver.md` § 4](./pack-resolver.md#4-override-evaluation).
- **Runtime cost.** Registry lookup is `O(1)`; a path-concat-and-fetch
  is at least `O(file-system-query)`.
- **Atlas pipeline awareness.** The publish-time atlas packer in
  [`atlas-pipeline.md`](./atlas-pipeline.md) groups frames by
  logical ID. A path-based record breaks safe atlas grouping.
- **Multiplayer determinism.** The pack `contentHash` is a function
  of logical IDs (and atlas page bytes), not paths. Two clients
  mounting the same pack from different filesystem prefixes must
  converge on the same hash per
  [`determinism.md`](./determinism.md).

---

## 4. Failure modes

| Symptom | Owning surface | Error code | Severity |
|---|---|---|---|
| Logical ID not in registry | runtime | `ASSET_LOGICAL_ID_NOT_FOUND` | `error` (gameplay) / `warn` (presentation, falls back) |
| Asset-index entry's relative path missing on disk | dev / build | `PACK_ASSET_FILE_MISSING` | `fatal` (refuses load) |
| Atlas slot resolution fails | runtime | `ASSET_ATLAS_SLOT_MISSING` | `error` (uses placeholder texture) |
| Editor stored a relative path inside a gameplay record | content lint | `VALIDATION_RAW_ASSET_PATH_IN_RECORD` | `error` (refuses save) |

`VALIDATION_RAW_ASSET_PATH_IN_RECORD` is enforced at schema time:
gameplay-record asset fields are typed against the registry-key
pattern (logical-ID shape), not a free-form path. A record that fails
the pattern refuses to save. Presentation fallbacks for runtime
failures follow
[`pack-contract.md` § Asset Fallback And Placeholders](./pack-contract.md#asset-fallback-and-placeholders).

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
        and the gameplay record references
        "pack:emberwild/units/peasant", not the path.
```

**Runtime: rendering the sprite**

```
record:  unit.peasant.spriteId = "pack:emberwild/units/peasant"
↓ PackRegistry.resolveAsset("pack:emberwild/units/peasant")
=> { url: "/atlases/emberwild-units.bin#slot=0x12",
     hash: "sha256:…", format: "png" }
↓ AssetLoader.fetch(...)
=> WebGL texture handle
```

---

## 6. Verified by

- **Schema field types.** Gameplay-record asset fields use enums or
  string patterns that match registry-key shapes only, never raw
  paths. Suffix-driven schema validation runs in
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs).
- **Root contract.** "Gameplay records never embed raw asset paths"
  is a CI-enforced hard constraint in
  [`AGENTS.md`](../../AGENTS.md) / [`CLAUDE.md`](../../CLAUDE.md);
  [`overview.md`](./overview.md) re-states the rule under "What The
  Engine Should Know".
- **Placeholder-marker drift.** This file is scanned for bare
  `TBD/TODO/FIXME/???` markers by
  [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  (`collectTbdMarkerViolations`).

---

## 🔍 Sync Check

- **UI: ✔** — No end-user UI surface is claimed by this file; runtime
  behavior is mediated through
  [`src/contracts/pack-registry.ts`](../../src/contracts/pack-registry.ts)
  and consumed by the renderer.
- **Schema: ⚠** — `assets/index.json` row shape (`id`, `path`,
  `hash`, `format`) matches
  [`asset-index.schema.json`](../../content-schema/schemas/asset-index.schema.json)
  conceptually, and `ResolvedAsset.format` matches the closed enum in
  [`src/contracts/pack-registry.ts`](../../src/contracts/pack-registry.ts);
  however the four `UPPER_SNAKE` error codes in § 4 are not registered
  in the canonical catalog. See `## ⚠ Issues`.
- **Tasks: ✔** — Owning task
  [`tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md`](../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md)
  implements `AssetRegistry`; sibling tasks
  [`01-manifest-format-plus-pack-registry.md`](../../tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md),
  [`05-async-asset-loader-with-caching.md`](../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md),
  and
  [`07-dev-hot-reload-watch-folder-reload-without-restart.md`](../../tasks/mvp/02b-asset-pipeline/07-dev-hot-reload-watch-folder-reload-without-restart.md)
  cover the registry / loader / hot-reload surfaces this doc pins.

## ⚠ Issues

- **Error codes diverge from the canonical catalog.** § 4 lists
  `ASSET_LOGICAL_ID_NOT_FOUND`, `PACK_ASSET_FILE_MISSING`,
  `ASSET_ATLAS_SLOT_MISSING`, and
  `VALIDATION_RAW_ASSET_PATH_IN_RECORD`. None of these strings appear
  in [`pack-error-codes.md`](./pack-error-codes.md), which is the
  single canonical pack-load failure catalog and uses the dotted form
  `pack.error.<area>.<reason>`. The closest existing codes are
  `pack.error.asset.missing` (for the asset-index-row-missing case)
  and `pack.error.asset.external-url` (for absolute-scheme rejection
  at the asset-index layer); the registry-not-found and
  atlas-slot-not-found scenarios have no registered code. Per
  [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md) the
  catalog is canonical, so the shorthand was preserved verbatim
  here (Hard Prohibition A) and the alias work should land alongside
  [`tasks/mvp/02b-asset-pipeline/16-pack-error-code-catalog.md`](../../tasks/mvp/02b-asset-pipeline/16-pack-error-code-catalog.md).
  Suggested: extend `pack-error-codes.md` with
  `pack.error.asset.logical-id-not-found`,
  `pack.error.asset.atlas-slot-missing`, and
  `pack.error.record.raw-asset-path`; map `PACK_ASSET_FILE_MISSING`
  onto the existing `pack.error.asset.missing` row as an alias.
  Same drift shape as the one flagged in
  [`hot-reload-flow.md`](./hot-reload-flow.md) `## ⚠ Issues`.
- **Reciprocal `Read First` gap on owning task.**
  [`tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md`](../../tasks/mvp/02b-asset-pipeline/04-asset-registry-id-based-resolution-no-hardcoded-paths.md)
  lists `content-platform.md`, `sandbox-model.md`, and
  `asset-loading.md` under `Read First` but **not**
  `asset-path-resolution.md`, even though this doc is the canonical
  editor-vs-runtime split contract the task implements. Per
  [`.agents/rules/tasks.md`](../../.agents/rules/tasks.md) the task
  `.md` is the implementer's entry point. Skill did not edit the
  task file (Hard Prohibition D). Suggested fix: add
  `docs/architecture/asset-path-resolution.md` to that task's
  `Read First`.
