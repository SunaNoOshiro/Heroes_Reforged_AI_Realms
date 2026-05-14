# Atlas Pipeline

Canonical contract for how raw per-frame PNGs become packed atlas
pages at pack-publish time. The renderer consumes the published
`<entityId>.png` + `<entityId>.atlas.json` artefacts; this file
pins the **producer** side.

> Companion docs:
> [`pack-contract.md` § Atlas Generation](./pack-contract.md#atlas-generation),
> [`ai-generation-pipeline.md`](./ai-generation-pipeline.md),
> [`renderer-technology-choice.md` § Per-Animation Budget](./renderer-technology-choice.md#per-animation-budget),
> [`performance.md` § 4](./performance.md#4-memory-budget),
> [`testing-conventions.md` § 8](./testing-conventions.md#8-script-and-test-file-extensions).
> Producer schema:
> [`content-schema/schemas/atlas.schema.json`](../../content-schema/schemas/atlas.schema.json).

## 1. Decision

Pin **`free-tex-packer-cli`** (Apache-2.0, scriptable, deterministic
given fixed input ordering) as the canonical atlas packer. All
first-party and AI-generated packs run through the same tool with
the same flags so output bytes are reproducible across machines.

## 2. Input Layout

Packs ship one image per frame, organised by entity, plus a single
manifest:

```
<pack>/sprites/<entityId>/<frame>.png
<pack>/atlas-manifest.json
```

- `atlas-manifest.json` is validated against
  [`atlas.schema.json`](../../content-schema/schemas/atlas.schema.json).
  Required keys: `schemaVersion`, `packId`, `packerOptions`,
  `entities`.
- `packerOptions` pins `seed`, `maxPageSize`, `padding` (and
  optional `trim`, `powerOfTwo`) for every entity in the pack.
- Each entry in `entities[]` carries `entityId` + `frameSourcesGlob`
  (conventionally `sprites/<entityId>/*.png`) and an optional
  `overrides` block that may shadow any `packerOptions` field for
  that entity only.
- `packerOptions.maxPageSize` MUST NOT exceed the renderer's
  per-animation cap (4096 × 4096 px) from
  [`renderer-technology-choice.md` § Per-Animation Budget](./renderer-technology-choice.md#per-animation-budget);
  the schema enforces the upper bound.

## 3. Output Layout

The publish step writes one PNG + one TexturePacker-compatible JSON
per entity:

```
<pack>/atlases/<entityId>.png
<pack>/atlases/<entityId>.atlas.json
```

- The `.atlas.json` shape is the same one the renderer's sprite-sheet
  loader already consumes — see
  [`tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md`](../../tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md).
- Both files are content-addressed and contribute to the pack's
  `contentHash` (see § 4).

## 4. Determinism Contract

- **Lexicographic ordering.** Input frames are sorted by absolute
  pack-relative path before invocation.
- **Pinned seed.** The packer is invoked with the `packerOptions.seed`
  from the manifest, neutralising any random heuristic inside the
  tool.
- **Pinned flags.** Every flag the packer accepts is sourced from
  `packerOptions` (and per-entity `overrides`) and is identical
  across machines.
- **Byte equality.** Resulting `.png` and `.atlas.json` outputs MUST
  be byte-identical across machines for the same input set. A CI
  fixture packs `content-schema/examples/packs/<example>/` on two
  runners and asserts `sha256` equality on every output byte.
- **`contentHash` includes atlas bytes.** The pack-publish step
  recomputes `contentHash` over the canonical-JSON serialisation of
  all records **plus** the SHA-256 of every atlas page, so atlas
  drift is hash-detectable downstream.
- **Packer non-determinism.** Any non-determinism discovered later
  in `free-tex-packer-cli` is treated as a packer-version bug: pin
  the version (`package.json` + lockfile) and add a regression
  fixture.

## 5. Publish Step Ordering

`npm run pack:build` runs the following steps per pack, in order.
The pack-load flow that downstream consumers see is
[`diagrams/25-load-flow.md`](./diagrams/25-load-flow.md); it reads
the `contentHash` produced here without knowing how it was built.

1. Validate every per-record schema under `content-schema/`.
2. Validate `atlas-manifest.json` against
   [`atlas.schema.json`](../../content-schema/schemas/atlas.schema.json).
3. For each entity in `entities[]`:
   - Resolve `frameSourcesGlob`, sort matches lexicographically.
   - Invoke `free-tex-packer-cli` with the merged
     `packerOptions` + per-entity `overrides`.
   - Write `<pack>/atlases/<entityId>.png` and
     `<pack>/atlases/<entityId>.atlas.json`.
4. Recompute `contentHash` over canonical-JSON of all records plus
   SHA-256 of every atlas page byte.
5. Emit the manifest with the new `contentHash`.

Pack consumers (loaders, save-load, multiplayer) read `contentHash`
from `manifest.json` exactly as today.

## 6. AI Pipeline Integration

The [AI generation pipeline](./ai-generation-pipeline.md) emits
**per-frame** PNGs into the same `<pack>/sprites/<entityId>/`
layout. It never writes to `<pack>/atlases/` and never runs a
private packer. AI-generated packs always go through the same
publish step (`npm run pack:build`), with the same tool, the same
flags, and the same lexicographic ordering as first-party packs.

This is what keeps deterministic UV sampling stable across pack
origins: the renderer cannot tell where the frames came from — only
how they were packed — and the packer is identical for both.

## 7. Owned By

- [`tasks/mvp/06-renderer/09-atlas-pipeline.md`](../../tasks/mvp/06-renderer/09-atlas-pipeline.md)
  — implementation task. Owns `scripts/atlas/`, the pinned
  `free-tex-packer-cli` invocation, the `npm run pack:build` wiring,
  and the byte-equal CI fixture. The CLI lives at
  `scripts/atlas/pack.mjs` until the Vite/TS bootstrap lands; the
  `.mjs` → `.ts` port is governed by
  [`testing-conventions.md` § 8](./testing-conventions.md#8-script-and-test-file-extensions).
- [`content-schema/schemas/atlas.schema.json`](../../content-schema/schemas/atlas.schema.json)
  — `AtlasManifest` schema for `atlas-manifest.json`. Owned-path of
  the same task above.

---

## 🔍 Sync Check

- **UI: ✔** — Doc carries no UI surface claims; producer-only
  contract.
- **Schema: ⚠** — [`atlas.schema.json`](../../content-schema/schemas/atlas.schema.json)
  enums, required keys (`schemaVersion`, `packId`, `packerOptions`,
  `entities`), the `maxPageSize` 4096-px upper bound, and the
  `frameSourcesGlob` convention all match this doc. However,
  `AtlasManifest` has **no row** in
  [`schema-matrix.md`](./schema-matrix.md) — already surfaced by
  that doc's own audit trailer. Detail in `## ⚠ Issues`.
- **Tasks: ✔** — [`tasks/mvp/06-renderer/09-atlas-pipeline.md`](../../tasks/mvp/06-renderer/09-atlas-pipeline.md)
  (the producer) and
  [`tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md`](../../tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md)
  (the consumer) both reference this doc in their Read First /
  Description, and `task-registry.json` carries both. Reciprocal
  citations in [`pack-contract.md` § Atlas Generation](./pack-contract.md#atlas-generation),
  [`ai-generation-pipeline.md`](./ai-generation-pipeline.md), and
  [`renderer-technology-choice.md`](./renderer-technology-choice.md)
  all resolve.

## ⚠ Issues

- **`AtlasManifest` missing from `schema-matrix.md`.**
  [`atlas.schema.json`](../../content-schema/schemas/atlas.schema.json)
  defines a first-class record (`$id: heroes-reforged/atlas.schema.json`,
  `title: AtlasManifest`) but has no row in
  [`schema-matrix.md`](./schema-matrix.md) under "Record Types" —
  the schema-matrix audit already flags it alongside
  `command`, `condition`, `worker-message`, etc. Per the CLAUDE.md
  root contract ("schemas are registered in `schema-matrix.md`"),
  the owner of `atlas.schema.json` —
  [`tasks/mvp/06-renderer/09-atlas-pipeline.md`](../../tasks/mvp/06-renderer/09-atlas-pipeline.md)
  — should add the row. Suggested values: Record =
  `AtlasManifest`; Gameplay Role = `none — author-side pack
  metadata`; Presentation Role = `producer-side input to
  `npm run pack:build`; lists every entity to be packed, with
  pinned `packerOptions` (seed, maxPageSize, padding, optional
  trim/powerOfTwo). Pinned by
  [`atlas-pipeline.md`](./atlas-pipeline.md)`; Schema link =
  [atlas](../../content-schema/schemas/atlas.schema.json);
  Example = (none yet — task 09 will add one alongside
  `content-schema/examples/packs/<example>/`). Skill did not add
  the row itself (Hard Prohibition D — never edit cross-checked
  structural registries silently).
- **Per-entity `.atlas.json` output has no canonical schema.**
  § 3 describes the renderer-consumed `<entityId>.atlas.json` as
  "TexturePacker-compatible (same shape the [sprite-sheet loader]
  already consumes)". No JSON Schema for that on-disk shape exists
  in [`content-schema/schemas/`](../../content-schema/schemas/),
  and
  [`tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md`](../../tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md)
  describes the metadata only as "JSON format from TexturePacker or
  similar". The producer side is fully pinned, but the consumer
  side runs on an external de-facto format. Not CI-blocking today
  (the output is regenerated from the producer-validated manifest,
  so it cannot drift relative to the canonical input set), but a
  follow-up `atlas-frame-metadata.schema.json` would close the
  trust-boundary gap per
  [`trust-boundaries.md`](./trust-boundaries.md): pack archives
  (and especially AI-generated ones) ship the rendered atlas-side
  JSON inside the `.hrmod`, and that file becomes adversarial
  input the moment the publish step is skipped. Owner: same task
  (`mvp.06-renderer.09-atlas-pipeline`). Skill did not author the
  schema (Hard Prohibition B — never invent features).
