# Atlas Pipeline

This file is the canonical source of truth for how raw sprite
frames become packed atlases at pack-publish time. The renderer
consumes the published atlas pages and metadata; the pipeline
below is the producer side.

## Decision

Pin **`free-tex-packer-cli`** (Apache-2.0, scriptable, deterministic
given fixed input ordering) as the canonical atlas packer. All
first-party packs and AI-generated packs run through the same tool
with the same flags so output bytes are reproducible across
machines.

## Input Layout

Packs ship raw frames, one image per frame, organized by entity:

```
<pack>/sprites/<entityId>/<frame>.png
<pack>/atlas-manifest.json
```

`atlas-manifest.json` lists every entity to be packed, plus any
per-entity overrides (max-page size, padding, trim policy). The
schema for this file is
[`content-schema/schemas/atlas.schema.json`](../../content-schema/schemas/atlas.schema.json).

## Output Layout

The publish step writes:

```
<pack>/atlases/<entityId>.png
<pack>/atlases/<entityId>.atlas.json
```

The `.atlas.json` file is TexturePacker-compatible (same shape the
renderer's
[`tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md`](../../tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md)
already consumes). Both files are content-addressed and contribute
to the pack's `contentHash`.

## Determinism Contract

- Input file ordering is sorted **lexicographically by absolute
  pack-relative path** before packing.
- The packer is invoked with a pinned `--seed` value so any
  internal heuristic that depends on randomness is removed.
- Packer flags are pinned per-pack in `atlas-manifest.json` and
  identical across machines.
- The resulting `.png` and `.atlas.json` are **byte-identical**
  across machines for the same input set. This is verified by a
  CI fixture that packs `content-schema/examples/packs/<example>/`
  on two CI runners and asserts `sha256` equality on every output
  byte.
- Any non-determinism in `free-tex-packer-cli` discovered later is
  treated as a packer-version bug: pin the version (`package.json`
  + lockfile) and add a regression fixture.

## AI Content Pipeline Integration

The
[AI generation pipeline](./ai-generation-pipeline.md) emits
**per-frame** PNGs into the same `<pack>/sprites/<entityId>/`
layout. The AI step **never** produces atlases directly. Atlases
are always produced by the publish step using the same tool, the
same flags, and the same lexicographic ordering as first-party
packs.

This rule is what keeps deterministic UV sampling stable across
AI-generated and hand-authored packs: the renderer cannot tell
where the frames came from, only how they were packed, and the
packer is identical for both.

## Publish Step Ordering

The pack-publish flow (consumed by
[`docs/architecture/diagrams/25-load-flow.md`](./diagrams/25-load-flow.md))
runs the following ordered steps:

1. Validate per-record schemas under `content-schema/`.
2. Validate `atlas-manifest.json` against
   [`atlas.schema.json`](../../content-schema/schemas/atlas.schema.json).
3. Run `npm run pack:build` for each pack:
   - sort frames lexicographically,
   - invoke `free-tex-packer-cli` with the pinned seed and flags,
   - write `<pack>/atlases/<entityId>.png` and
     `<pack>/atlases/<entityId>.atlas.json`.
4. Recompute the pack's `contentHash` over the canonical-JSON
   serialization of all records **plus** the SHA-256 of every
   atlas page byte (so atlas drift is hash-detectable).
5. Emit the manifest with the new `contentHash`.

Pack consumers (loaders, save-load, multiplayer) read the
`contentHash` from `manifest.json` exactly as today; they do not
need to know how it was produced.

## Owned By

- [`tasks/mvp/06-renderer/09-atlas-pipeline.md`](../../tasks/mvp/06-renderer/09-atlas-pipeline.md)
  — implementation task. Owns `scripts/atlas/`, the pinned
  `free-tex-packer-cli` invocation, and the byte-equal CI fixture.
  The CLI lives at `scripts/atlas/pack.mjs` until the Vite/TS
  bootstrap lands; see
  [`testing-conventions.md` § 8](./testing-conventions.md).
- [`content-schema/schemas/atlas.schema.json`](../../content-schema/schemas/atlas.schema.json)
  — metadata schema for `atlas-manifest.json`.

## Related Files

- [`docs/architecture/pack-contract.md`](./pack-contract.md) —
  Atlas generation section.
- [`docs/architecture/ai-generation-pipeline.md`](./ai-generation-pipeline.md)
  — AI step emits per-frame PNGs only; atlases are produced here.
- [`docs/architecture/renderer-technology-choice.md`](./renderer-technology-choice.md)
  — atlas page-size cap and per-animation budget on the consumer
  side.
- [`docs/architecture/performance.md`](./performance.md) —
  texture-memory ceiling that bounds total atlas bytes per pack.
