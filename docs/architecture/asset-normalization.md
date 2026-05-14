# Asset Normalization (AI generation pipeline, Stage 5.6)

Companion docs:

- [`ai-generation-pipeline.md`](./ai-generation-pipeline.md) — Stage
  5.5 (image moderation) → **5.6 (this stage)** → 6 (pack
  materialize).
- [`animation-contract.md`](./animation-contract.md) — frame-event
  semantics for `frames.required`.
- [`atlas-pipeline.md`](./atlas-pipeline.md) — deterministic packer
  consuming Stage-5.6 output.
- [`pack-contract.md` § Atlas Generation](./pack-contract.md#atlas-generation)
  — atlas-binding rule: the AI pipeline never writes
  `<pack>/atlases/`.

Schema:
[`asset-normalization-spec.schema.json`](../../content-schema/schemas/asset-normalization-spec.schema.json).
Canonical example:
[`canonical.asset-normalization-spec.json`](../../content-schema/examples/asset-normalization-spec/canonical.asset-normalization-spec.json).
Registered as `AssetNormalizationSpec` in
[`schema-matrix.md`](./schema-matrix.md).

This file is the contract for the four normalization rules the
AI-generation pipeline applies between **Stage 5.5 — image
moderation** and **Stage 6 — pack materialize**. Without this stage,
image-gen output would arrive at whatever resolution and palette the
provider returned, breaking renderer assumptions about sprite size,
per-faction palette consistency, and the byte-identical atlas
packer. Each rule is a deterministic transformation: moderated raw
image in → normalized image out, or a typed report and pipeline
failure.

## 1. Dimension contract

Each asset role declares an exact target `width` × `height`. AI
output that does not match is downscaled or padded deterministically
to the target.

| Role | `width` × `height` | Use |
|---|---|---|
| `creature-sprite` | 96 × 96 | per-frame body sprite for a unit |
| `hero-portrait` | 256 × 256 | single-frame portrait for a hero |
| `building` | 192 × 192 | per-frame town building sprite |
| `ability-icon` | 64 × 64 | single-frame ability icon |

Values are pinned in the schema and canonical example (linked
above); any change belongs there first.

## 2. Palette contract

Each role declares `palette.source` and `palette.maxColors` (1–256).

- `faction` — read the active faction's metadata; quantize to a
  per-faction palette of at most `maxColors` entries.
- `shared` — use the shared-library palette.
- `uncolored` — skip quantization (monochrome icons).

Quantization is deterministic given the same input bytes and palette
source, so atlases stay byte-identical across machines per
[`atlas-pipeline.md`](./atlas-pipeline.md).

## 3. Frame-count contract

Each role declares:

- `frames.required` — events that must be present after
  normalization. Allowed values: `idle`, `attack`, `death`, `hurt`,
  `walking`, `casting`, `defending`, `special`.
- `frames.fallback` — event used to fill any missing optional event,
  or `none` for "render no animation". Allowed values: `idle`,
  `attack`, `death`, `hurt`, `walking`, `none`.

Frame events line up with the renderer's animation contract in
[`animation-contract.md`](./animation-contract.md); a naming drift
between the schema's noun forms (`attack`, `death`) and that doc's
verb forms (`attacking`, `dying`) is tracked under Issues.

## 4. Atlas binding

After dimension, palette, and frame-count normalization, frames are
written to:

- `<pack>/sprites/<entityId>/<frame>.png` — one PNG per frame.
- `<pack>/atlas-manifest.json` — entity list consumed by the packer.

The pack-publish step (`npm run pack:build`) is the **only**
producer of `<pack>/atlases/<entityId>.png`; the AI pipeline never
writes to `<pack>/atlases/`. AI-generated and hand-authored packs
share the same packer, the same flags, and the same lexicographic
input ordering, so atlas bytes are byte-identical across machines
for the same input set. See
[`pack-contract.md` § Atlas Generation](./pack-contract.md#atlas-generation).

## Why this is a separate stage

- Renderer can assume uniform sprite dimensions per role.
- Per-faction palettes stay consistent regardless of AI output
  drift.
- Atlas packing receives uniform inputs and produces byte-identical
  output.
- A future image-gen vendor swap does not propagate visual artifacts
  past the normalization boundary.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surface; this stage runs server-side / in the
  generation pipeline. Player-facing AI provenance is owned by
  screen 74 per [`ai-generation-pipeline.md` § Pack
  materialize](./ai-generation-pipeline.md), which is unaffected.
- **Schema: ✔** — Enums (`role` × 4, `palette.source` × 3,
  `frames.required` × 8, `frames.fallback` × 6) and required keys
  (`schemaVersion`, `roles[].role`, `width`, `height`, `frames`)
  match
  [`asset-normalization-spec.schema.json`](../../content-schema/schemas/asset-normalization-spec.schema.json)
  and the canonical example. Schema-matrix row for
  `AssetNormalizationSpec` references this doc.
- **Tasks: ✔** — Owning task
  [`phase-3.02-ai-generation.05b-asset-normalization`](../../tasks/phase-3/02-ai-generation/05b-asset-normalization.md)
  lists this doc and the schema in `Owned Paths`; the upstream
  Stage-6 bullet "Normalize before bind" in `ai-generation-pipeline.md`
  references this file. Task status is `planned` per
  [`tasks/task-status.json`](../../tasks/task-status.json).

## ⚠ Issues

- **Frame-event name drift between this schema and `animation-contract.md`.**
  This doc and
  [`asset-normalization-spec.schema.json`](../../content-schema/schemas/asset-normalization-spec.schema.json)
  enumerate body-track frame events as `attack`, `death`, `hurt`,
  `idle`, `walking`, `casting`, `defending`, `special` (noun forms),
  matching `frameEvent` in
  [`enums.snapshot.json`](../../content-schema/enums.snapshot.json).
  [`animation-contract.md` § 4 Conflict Resolution](./animation-contract.md#4-conflict-resolution)
  body-channel priority table and § 8 Asset Fallback list the same
  states as `attacking`, `dying`, `hurt`, `idle`, `walking`,
  `casting`, `defending`, `special` (verb forms — `attacking`,
  `dying` differ). Per
  [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md) the
  schema's snapshot is the canonical contract, so the renderer-side
  doc is the side that needs to either (a) align verb forms to
  `attack` / `death`, or (b) document an explicit alias mapping in
  [`enums.removed.json`](../../content-schema/enums.removed.json) /
  the lifecycle policy. Owning task:
  [`mvp.06-renderer.07-event-log-animation-timeline`](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md)
  jointly with the AI-pipeline owner. Skill preserved the schema's
  noun forms here (anti-cheat rule D — never silently rewrite a
  claim that points to a structural invariant).
