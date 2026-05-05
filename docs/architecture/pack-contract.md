# Pack Contract

This file is the canonical source of truth for pack layout, manifest
rules, archive rules, and trust metadata.

Cross-pack rules — namespace pattern, dependency resolution, override
precedence, asset integrity, locale merge order, error codes, and the
canonical-packs registry — live in
[`content-system-policy.md`](./content-system-policy.md). The pack
resolver algorithm itself is pinned in
[`pack-resolver.md`](./pack-resolver.md).

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
  Comparisons MUST use the constant-time-compare rule pinned in
  [`crypto-rules.md`](./crypto-rules.md) § 1; failures collapse to
  the closed `signatureErrorCode` enum on
  [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json)
  (`INVALID_SIGNATURE` for any failure mode, `SIGNATURE_DISABLED`
  for the explicit "feature off" state). The wire / UI-facing
  surface MUST NOT distinguish "wrong key" from "no such key" —
  both collapse to `INVALID_SIGNATURE`.
- `sandboxed` — boolean trust flag enforced by runtime policy.
- `sandboxedReason` — optional string identifying why the pack is
  sandboxed (`ai-generated`, `user-edited`, `unsigned`). Consumed
  by the sandbox-enforcement layer below to render the reason and
  by the lifecycle layer (see
  [`pack-lifecycle.md`](./pack-lifecycle.md)) to scope GC.
- `contentRating` — optional, author-asserted, advisory only.
  Surfaced under "Author-declared content" by screen 72 per
  [`pack-trust.md` § Content Rating](./pack-trust.md#8-content-rating).
  Not consumed by gameplay or matchmaking gates in v1.

Use `sandboxed: true` for AI-generated or otherwise restricted content
that cannot participate in ranked or trusted flows.

### Signature Policy (Plan 26 — Multiplayer Mandate)

Multiplayer matches enforce a closed `signaturePolicy` enum on the
match handshake REVEAL phase per
[`match-handshake.md`](./match-handshake.md):

| Mode | Value | Behavior |
| --- | --- | --- |
| Friendly default | `optional` | Pack signature accepted but not required. |
| Friendly with attestation | `required-friendly` | Pack signature required; mismatched build-attestation surfaces a UI warning (per [`build-attestation.md`](./build-attestation.md)) but match proceeds. |
| Closed-beta / ranked | `required-ranked` | Pack signature required; `sandboxed: true` packs rejected at handshake; mismatched build-attestation rejected with `BUILD_ATTESTATION_MISMATCH` ABORT. |

The `packManifestDigest` (canonical-JSON xxh64 over `manifest.json`)
is exchanged at handshake **and re-validated at every turn-end**;
a mid-match digest drift triggers `MID_MATCH_PACK_SWAP` desync
abort. Owning task:
[`tasks/phase-3/01-multiplayer/15-pack-signature-and-build-attestation-policy.md`](../../tasks/phase-3/01-multiplayer/15-pack-signature-and-build-attestation-policy.md).
Information-secrecy limits inherent to symmetric input-only lockstep
that the signature policy does **not** close are pinned in
[`security-model.md`](./security-model.md).

### Trust UX

The user-facing trust prompt, capability disclosure, signature-tier
ribbon, and per-transitive-pack consent flow live in
[`pack-trust.md`](./pack-trust.md) and screen package
[`72-pack-trust-prompt`](./wiki/screens/72-pack-trust-prompt/).

### Trust Anchors

Three companion schemas back the trust pipeline:

- [`publisher-registry.schema.json`](../../content-schema/schemas/publisher-registry.schema.json)
  — known-publisher key list driving `tier=signed-known`.
- [`pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json)
  — client-local user-decision revocation surface (orthogonal to
  the maintainer-signed [`revocation-registry`](./revocation.md)).
- [`trust-store.schema.json`](../../content-schema/schemas/trust-store.schema.json)
  — persisted user trust decisions keyed on `(packId, contentHash)`.

Lookup precedence is pinned in
[`pack-trust.md` § Trust Anchors](./pack-trust.md#4-trust-anchors).

## Sandbox enforcement

`sandboxed: true` is enforced — not just labeled — by the four
consumers below. Without these rules, the moment a multiplayer
matchmaker ships, sandboxed packs could enter ranked matches and
ranked integrity would collapse on day one. Each consumer must use
the shared `isSandboxAllowed(context, manifest)` predicate as the
gate.

| Consumer | Required behavior | Default | Override mechanism |
|---|---|---|---|
| Ranked matchmaker | Refuse any session containing a `sandboxed: true` pack. | refuse | none — ranked is canonical only. |
| Shared lobby | Allow only if every player has explicitly opted into sandbox content for the lobby. | refuse | per-lobby opt-in toggle, surfaced in the lobby UI. |
| Replay validator | Refuse for canonical replay (multiplayer / trusted leaderboard); allow for sandbox replay. | refuse for canonical | replay surface flags revoked-or-sandboxed packs (see [Revocation](#revocation)). |
| Editor | Allow with a visible `SANDBOX` badge and `sandboxedReason`. | allow | none — author can clear the flag only by re-publishing through a non-sandbox pipeline. |

The owning contract is
[`tasks/phase-2/05-mod-system/10-sandbox-enforcement-contract.md`](../../tasks/phase-2/05-mod-system/10-sandbox-enforcement-contract.md).
Cache, GC, and disk-quota policy for sandboxed packs live in
[`pack-lifecycle.md`](./pack-lifecycle.md).

## Revocation

Pre-publication moderation is defined (text moderation, hard caps,
sandbox flag). After distribution, a pack found to violate IP or
safety must still be removable from clients. The contract is in
[`revocation.md`](./revocation.md); three components:

1. A maintainer-signed
   [`revocation-registry.schema.json`](../../content-schema/schemas/revocation-registry.schema.json)
   listing revoked `contentHash`es with reason codes and
   monotonic `version`.
2. A client-side check at pack load: if `manifest.contentHash`
   matches a registry entry, the pack is rejected from canonical
   contexts (ranked matchmaker, signed marketplace listing).
3. A replay-fallback rule: replays referencing a revoked pack
   remain playable in a "revoked content present" mode so old
   replays do not silently break.

## Capabilities

`capabilities` is a closed enum in the schema. New capability strings
require a schema change and a runtime policy update. That blocks a
sandboxed pack from claiming made-up permissions.

### Capability Enforcement

The schema declares `capabilities` with `default: ["scripts.none"]`.
A pack that omits the field is treated as `["scripts.none"]`
(default-deny). The loader MUST apply byte-level sniffs whenever
`scripts.none` is declared (or default), per
[`ugc-safety.md` § Capability Enforcement](./ugc-safety.md#6-capability-enforcement):
no `js/mjs/cjs/ts/wasm/html/htm/svg` extensions, no
prototype-pollution keys, no `formulas.ast` nodes outside the Effect
Registry's pure-evaluator set.

## Asset Path Scheme

`assets/index.json` declares `pathScheme: "pack-relative"` and every
`path` is constrained to a closed extension allowlist (`png`, `webp`,
`ogg`, `mp3`, `json`). Absolute schemes (`http`, `https`, `file`,
`data`, `blob`), leading slashes, and parent-directory escapes are
rejected at schema time. Rationale: closes the IP-exfiltration surface
flagged in audit 21 (Q390). Cross-link:
[`ugc-safety.md` § External URL Ban](./ugc-safety.md#1-external-url-ban),
[`asset-index.schema.json`](../../content-schema/schemas/asset-index.schema.json).

## Override Precedence

When a pack declares `dependencies[]` and `overrides[]`, resolution
follows declaration order — **last declared wins** on a collision.
Sandboxed packs MAY NEVER shadow a non-sandboxed canonical pack on a
stable ID; attempting to do so is a load-time error
(`override.sandboxed-shadow-canonical`). Same-tier collisions (two
non-sandboxed packs claiming the same ID) require an explicit
`overrides[]` entry on the downstream pack; without it the load
fails with `override.unauthorized-shadow`.

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
  locales/
    en.localization.json
```

Rules:

- record files are one-per-record
- gameplay records use ids, not asset paths
- file extensions should communicate record type when practical
- `assets/index.json` owns path-to-asset-id mapping plus a `sha256` per
  binary asset; integrity rule in
  [`content-system-policy.md` § 4](./content-system-policy.md#4-asset-integrity)
- `locales/<locale>.localization.json` carries the per-pack
  localization bundle; merge order in
  [`content-system-policy.md` § 6](./content-system-policy.md#6-localization-bundling)

## Resource Limits

`.hrmod` packs and imported saves are subject to size, decompression
ratio, and entry caps enforced **before** schema parsing so a hostile
file cannot exhaust memory inside the validator. The full table —
including the ZIP path-traversal sanitizer rule — is pinned in
[`pack-trust.md` § Resource Limits](./pack-trust.md#1-resource-limits).
Pack loaders and the trust UI MUST consult the same constants table.

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
- dependency resolution (algorithm in
  [`pack-resolver.md`](./pack-resolver.md))
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
