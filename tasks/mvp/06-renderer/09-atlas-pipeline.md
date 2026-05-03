# Atlas generation pipeline (deterministic packer)

Status: planned

Module: [Renderer (M1/M2)](../06-renderer.md)

Description:
Implement the producer side of the sprite-atlas pipeline pinned in
[`docs/architecture/atlas-pipeline.md`](../../../docs/architecture/atlas-pipeline.md).
This task ships the build-time tool that turns per-frame PNGs
under `<pack>/sprites/<entityId>/` into packed
`<pack>/atlases/<entityId>.png` and `.atlas.json` files using a
pinned, deterministic invocation of `free-tex-packer-cli`.

The renderer's sprite-sheet loader (Task 6) is the consumer; this
task is the producer. AI-generated packs and hand-authored packs
share the same tool with the same flags, so atlas bytes are
byte-identical across machines for the same input set.

Read First:
- [`docs/architecture/atlas-pipeline.md`](../../../docs/architecture/atlas-pipeline.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)

Inputs:
- Hex tile atlas + sprite-sheet loader contract from Tasks 2 & 6.
- `atlas.schema.json` (owned by the schemas module under
  `content-schema/schemas/atlas.schema.json`).
- Example pack
  `content-schema/examples/packs/<example>/sprites/...`.

Outputs:
- `tools/atlas/pack.ts` — CLI invocation wrapper that:
  - sorts frames lexicographically by absolute pack-relative path,
  - invokes `free-tex-packer-cli` with the pinned `--seed` and
    flags taken from `<pack>/atlas-manifest.json`,
  - writes `<pack>/atlases/<entityId>.png` and
    `<pack>/atlases/<entityId>.atlas.json`.
- `tools/atlas/README.md` — invocation docs and pinned tool
  version reference.
- `npm run pack:build` script entry wired into `package.json`.
- `content-schema/schemas/atlas.schema.json` — author-side metadata
  schema.

Owned Paths:
- `tools/atlas/`
- `content-schema/schemas/atlas.schema.json`

Dependencies:
- mvp.06-renderer.02-hex-tile-atlas-plus-axialscreen-transform
- mvp.06-renderer.06-sprite-sheet-loader-plus-frame-animation

Acceptance Criteria:
- `npm run pack:build` packs the example pack fixture and
  produces byte-identical `.png` and `.atlas.json` outputs on two
  CI runners (verified by a CI fixture run that compares
  `sha256` of every output byte).
- Re-running `npm run pack:build` with the same inputs produces
  byte-identical outputs on the same machine.
- A change to a single source frame changes the output `.png` and
  `.atlas.json` content hashes.
- `atlas-manifest.json` files are validated against
  `atlas.schema.json` before packing; missing or unknown fields
  fail loud.
- AI-generated packs use the same tool; no separate "AI atlas"
  code path exists in the repo.
- The pack's `contentHash` includes every atlas page's bytes
  (verified by a unit test that compares the hash before and
  after a deliberate atlas mutation).

Verify:
- npm run validate
- npm test
- npm run pack:build

Estimated Time:
- 5 hours
