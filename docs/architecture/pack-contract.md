# Pack Contract

This file is the canonical source of truth for pack layout, manifest
rules, archive rules, and trust metadata.

## Core Rule

One folder under `resources/packs/` equals one pack root with one
`manifest.json`.

Examples:

- `resources/packs/emberwild-faction/` — first-party reference faction
- `resources/packs/baseline-ruleset/` — reference balance constants
- `resources/packs/shared-library/` — shared spells, abilities,
  artifacts
- `resources/packs/necropolis-faction/` — second faction (phase-2)

Do not bundle multiple faction manifests into one mega-pack when
separate `faction-pack` folders express the same content more clearly.

## Manifest v1

Canonical file:

- [`content-schema/schemas/manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)

The schema is the single source of truth. This doc does not repeat the
required-field list. When you see disagreement, trust the schema and
update this doc.

Hash fields:

- `contentHash` — produced by the content-runtime at pack build time.
  Optional at author time; required at load time for multiplayer and
  trusted replay.
- `engineHash` — pinned to a specific engine build. Pre-M2 (no engine
  yet) this field is effectively unused; the loader accepts packs
  without it. Post-M2 it becomes required at load time for
  reproducible play.

The exact loader behaviour on a `contentHash`, `contentPackHashes`, or
`engineHash` mismatch is pinned in
[`version-policy.md`](./version-policy.md). This file does not repeat
the per-context rules; trust the matrix.

See [`determinism.md`](determinism.md).

## Canonical Example

See:

- [`content-schema/examples/packs/emberwild-faction/manifest.json`](../../content-schema/examples/packs/emberwild-faction/manifest.json)

That example stays in lockstep with the schema and with this file.
`scripts/check-repo-contracts.mjs` validates every example record in
every example pack against its schema.

## Trust Fields

- `signature` — optional object with `scheme`, `keyId`, and `value`.
- `sandboxed` — boolean trust flag enforced by runtime policy.

Use `sandboxed: true` for AI-generated or otherwise restricted content
that cannot participate in ranked or trusted flows.

## Capabilities

`capabilities` is a closed enum in the schema. New capability strings
require a schema change and a runtime policy update. That blocks a
sandboxed pack from claiming made-up permissions.

## Folder Layout

Canonical faction-pack shape:

```text
resources/packs/emberwild-faction/
  manifest.json
  faction.json
  units/
    ash-hound.unit.json
    cinder-scout.unit.json
  heroes/
    kaelis.hero.json
  hero-classes/
    cinder-knight.hero-class.json
  buildings/
    kennels.building.json
  abilities/
    pack-hunt.ability.json
  skills/
    pathfinding.skill.json
  animations/
    ash-hound.animation.json
  sounds/
    emberwild.sound-set.json
  assets/
    index.json
```

Rules:

- record files are one-per-record
- gameplay records use ids, not asset paths
- file extensions should communicate record type when practical
- `assets/index.json` owns path-to-asset-id mapping

## Archive Rule

`.hrmod` is a ZIP of exactly one canonical pack root.

The archive must contain:

- one `manifest.json`
- zero or more canonical record folders
- asset payloads and indexes that match the manifest and record ids

Do not add a separate manifest `files[]` inventory unless the schema
is explicitly revised to require it.

## Runtime Ownership

`src/content-runtime/` owns:

- manifest loading
- archive import
- dependency resolution
- signature checks
- sandbox policy
- pack registry assembly
- canonical-json serialization + `contentHash` computation

`src/engine/` consumes resolved ids and registries. It does not own
pack loading.

## Asset Fallback And Placeholders

Pack content can be incomplete (mid-development) or corrupt at
runtime (mid-game asset loss, decode failure). The matrix below pins
the rule per asset class. The animation contract
([`animation-contract.md` § Asset Fallback`](./animation-contract.md#asset-fallback))
references this table; do not duplicate the rules there.

| Asset class | Missing-at-load | Missing-at-runtime |
|---|---|---|
| Required creature anim (`idle`, `walking`, `attacking`, `hurt`, `dying`) | fail loud (pack does not load) | n/a — would have failed at load |
| Optional creature anim (`defending`, `casting`, `special`) | fall back to required substitute (`defending → idle`, `casting → idle`, `special → attacking`) | same |
| Sprite-sheet PNG | fail loud | render dev-mode magenta-checker placeholder when `config.dev.placeholderSprites === true`; in production, log warning and hold last decoded frame |
| Animation atlas page (multi-page) | fail loud if any declared page is missing | same |
| VFX phase (`cast`, `projectile`, `impact`) | fall back to no-op (silent skip) | same |
| Status icon | fall back to the generic `status:unknown` icon | same |
| Sound-set event | use the existing `fallbacks[]` wildcard rule on the sound set | same |
| Easing function | fall back to `linear` | same |

### Dev-mode placeholders

`config.dev.placeholderSprites` (boolean, default `false`) toggles
the magenta-checker placeholder for missing sprite-sheets. Production
builds default to `false` (fail loud); dev builds may set `true`.
Pinned in
[`wiki/screens/56-options/data-contracts.md`](./wiki/screens/56-options/data-contracts.md).

The two canonical placeholder assets ship under
[`resources/dev-assets/`](../../resources/dev-assets/):

- `placeholder-sprite.png` — 64×64 magenta + black checker
- `status-unknown.png` — 32×32 generic status icon

Both are loaded only when the renderer would otherwise have logged a
warning. They are never authored into a pack manifest.

### Multi-page atlas manifests

Animations that declare `spriteSheetAssetIds: [...]` (multi-page
atlases per
[`animation.schema.json`](../../content-schema/schemas/animation.schema.json))
must list **every** page in the pack's `assets/index.json`. The
content runtime fails loud if any declared page is unresolved at
load — the renderer cannot recover from a missing atlas page because
frame indices may reference any page.

## Atlas Generation

Packed atlases are produced at pack-publish time, not authored by
hand and not produced by the AI generation step. The producer
contract — pinned packer, deterministic invocation, byte-identical
output across machines — is owned by
[`docs/architecture/atlas-pipeline.md`](./atlas-pipeline.md).

Authoring summary:

- Authors and AI generators ship raw frames under
  `<pack>/sprites/<entityId>/<frame>.png` and an
  `<pack>/atlas-manifest.json` listing every entity to be packed.
  The manifest schema is
  [`content-schema/schemas/atlas.schema.json`](../../content-schema/schemas/atlas.schema.json).
- The publish step runs `npm run pack:build`, which writes
  `<pack>/atlases/<entityId>.png` and
  `<pack>/atlases/<entityId>.atlas.json` from the raw frames.
- Both the per-record canonical-JSON contents and every atlas page
  byte contribute to the pack's `contentHash`, so the hash detects
  any drift in either layer.
- AI-generated packs MUST go through the same publish step. The
  AI pipeline never writes to `<pack>/atlases/`.

The renderer-side metadata schema (TexturePacker-compatible) and
loader live in
[`tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md`](../../tasks/mvp/06-renderer/06-sprite-sheet-loader-plus-frame-animation.md).
