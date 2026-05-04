# Asset Normalization (AI generation pipeline, Stage 5.6)

How AI-generated images are normalized before pack materialize.

This file is the contract for the four normalization rules an
AI-generation pipeline must apply between **Stage 5.5 — Image
moderation** (see
[`ai-generation-pipeline.md`](./ai-generation-pipeline.md)) and
**Stage 6 — Pack materialize**. Without this stage, real image-gen
output would land at whatever resolution and palette the provider
returned, and the renderer would silently fail or produce visually
broken factions.

The four rules are deterministic stage transformations: each takes a
moderated raw image and produces a normalized image (or fails the
pipeline with a typed report).

## 1. Dimension Contract

Each asset role declares a target width and height. AI output must
match exactly; non-matching output is downscaled or padded
deterministically to the target. Roles and target dimensions are
pinned in
[`content-schema/schemas/asset-normalization-spec.schema.json`](../../content-schema/schemas/asset-normalization-spec.schema.json)
with the canonical values in
[`content-schema/examples/asset-normalization-spec/canonical.asset-normalization-spec.json`](../../content-schema/examples/asset-normalization-spec/canonical.asset-normalization-spec.json).

Roles:

- `creature-sprite` — per-frame body sprite for a unit.
- `hero-portrait` — single-frame portrait for a hero.
- `building` — per-frame town building sprite.
- `ability-icon` — single-frame ability icon.

## 2. Palette Contract

Each role declares a palette source. `faction` reads the active
faction metadata and quantizes the AI image to a per-faction palette
of at most `maxColors` entries. `shared` uses the shared-library
palette. `uncolored` skips quantization (used for monochrome icons).

Palette quantization is deterministic given the same input bytes and
palette source, so atlases stay byte-identical across machines per
the rule in
[`atlas-pipeline.md`](./atlas-pipeline.md).

## 3. Frame-Count Contract

Each role declares a list of `required` frame events
(`idle`, `attack`, `death`, `hurt`, `walking`, ...). After
normalization, every required event must have a frame; missing
events are filled with the role's `fallback` event (or `none` if no
fallback applies).

Required frames are aligned with the renderer's animation event
contract in
[`animation-contract.md`](./animation-contract.md).

## 4. Atlas Binding

After dimension/palette/frame-count normalization, frames are written
under `<pack>/sprites/<entityId>/<frame>.png` and the entity is
listed in `<pack>/atlas-manifest.json`. The pack-publish step
(`npm run pack:build`) is the only step allowed to produce
`<pack>/atlases/<entityId>.png` — see
[`pack-contract.md` § Atlas Generation`](./pack-contract.md#atlas-generation).

AI-generated and hand-authored packs share the same packer, the same
flags, and the same lexicographic input ordering, so atlas bytes are
byte-identical across machines for the same input set.

## Why This Matters

Pinning normalization as a separate, deterministic stage means:

- the renderer can assume uniform sprite dimensions per role
- per-faction palettes stay consistent regardless of AI output drift
- atlas packing has uniform inputs and produces byte-identical output
- a future image-gen vendor swap does not propagate visual artifacts
  past the normalization boundary
