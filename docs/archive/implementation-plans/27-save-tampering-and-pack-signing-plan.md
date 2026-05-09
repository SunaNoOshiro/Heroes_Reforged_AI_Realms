# Implementation Plan: 27 — Save File Tampering & Mod/Pack Signing

> Source audit: [docs/archive/readiness-audit/27-save-tampering-and-pack-signing.md](../readiness-audit/27-save-tampering-and-pack-signing.md)
> Audit AI-Readiness score at time of writing: **2 / 10** — target after this plan: **8 / 10**.
> The original audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic, and Risk item from Q540–Q565
> into concrete, executable work items grounded in existing artifacts:
> [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../../tasks/mvp/08-persistence/02-log-only-save-format.md),
> [`tasks/mvp/08-persistence/03-save-load-ui.md`](../../../tasks/mvp/08-persistence/03-save-load-ui.md),
> [`tasks/mvp/08-persistence/05-export-import-json.md`](../../../tasks/mvp/08-persistence/05-export-import-json.md),
> [`docs/architecture/determinism.md`](../../architecture/determinism.md),
> [`docs/architecture/pack-contract.md`](../../architecture/pack-contract.md),
> [`docs/architecture/command-schema.md`](../../architecture/command-schema.md),
> [`docs/architecture/schema-matrix.md`](../../architecture/schema-matrix.md),
> [`docs/architecture/diagrams/24-save-flow.md`](../../architecture/diagrams/24-save-flow.md),
> [`docs/architecture/diagrams/25-load-flow.md`](../../architecture/diagrams/25-load-flow.md),
> [`content-schema/schemas/manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json),
> [`content-schema/schemas/command.schema.json`](../../../content-schema/schemas/command.schema.json),
> [`content-schema/schemas/asset-index.schema.json`](../../../content-schema/schemas/asset-index.schema.json),
> [`docs/architecture/wiki/screens/55-save-load/`](../../architecture/wiki/screens/55-save-load/),
> and adjacent plans **08** (persistence baseline), **20** (save imports
> & pack-trust prompts — owns `save.schema.json`,
> `publisher-registry.schema.json`, `pack-revocation-list.schema.json`,
> trust-prompt UI, `pack-trust.md`), **24** (TLS / WebRTC auth — trust
> anchor for `keyId`), **25** (TURN credentials & signaling abuse —
> consumes the publisher-key list), **26** (replay tampering &
> deterministic simulation — owns `security-model.md`,
> commit-reveal handshake, `lockstep-envelope.schema.json`).

---

## 1. Overview

Audit 27 evaluated 26 questions across two themes — **save-file
tampering** (Q540–Q552) and **mod/pack signing** (Q553–Q565). **Of
those 26: three are ✔ Defined (Q546 by omission of YAML, Q547 by
construction, Q549 by omission of remote-fetch, Q552 by omission of
achievements), five are ⚠ Partial (Q540, Q543, Q545, Q553, Q565), and
the remaining eighteen are ❌ UNKNOWN.**

The repository today specifies the *primitives* for tamper-resistant
saves and signed packs — `xxh64` content hash, canonical JSON
serializer, `signature` block on the manifest with `scheme: "ed25519"`,
`contentHash`, `engineHash`, `stateHash`, `sandboxed: true`,
closed-enum `capabilities` — but says **nothing** about:

1. **Save schema artifact.** Save shape lives only in a TypeScript
   `SaveRecord` declaration; there is no `save.schema.json` to validate
   against. Plan 20 commits to authoring this; plan 27 commits to the
   tamper-relevant *fields* (array caps, per-command-argument bounds,
   integer-only numerics, version range, envelope discriminator).
2. **Save threat model.** The fail-loud gates in the load flow exist
   but no doc states "loader assumes hostile input." Plan 26 commits
   to authoring `security-model.md` for the multiplayer surface; plan
   27 owns the *single-player save & pack-install* sections of the
   same document.
3. **Parser hardening.** No `maxDepth`, `maxStringLength`,
   `maxArrayLength`, `maxObjectKeys`, `maxCompressedBytes`,
   `maxUncompressedBytes`, or `maxDecompressionRatio` is documented for
   either the save parser or the pack-archive parser.
4. **Pre-reducer command validation pass.** Today the reducer is the
   first thing that touches a command from a loaded save — a malformed
   command surfaces mid-replay rather than at a clean rejection point.
5. **Save-envelope authentication.** xxh64 detects accidental
   corruption; it is recomputable by any editor. No HMAC, no Ed25519,
   no per-installation key, no plan for the moment cloud sync /
   leaderboard / shared-replay enters scope.
6. **Save migration contract.** `saveVersion` is stamped, the gate
   exists, the screen exposes "Schema migration: none" — but no
   migrator is authored, no idempotency rule is written, no
   "version is integrity-protected" rule binds the migrator chain to
   the envelope MAC.
7. **Save vs. replay envelope distinction.** Same artifact, same code
   path; no `intent` discriminator, no separately-validated
   spectator/bug-report flow.
8. **Multiplayer load-resume protocol.** Plan 26 covers fresh-match
   handshake; *resuming a save into an MP session* is undefined — no
   rule that both peers must produce the same `stateHash` from the
   loaded log before the first resumed turn.
9. **Pack-signing canonical message.** The schema declares
   Ed25519 + `keyId` + `value` but never specifies what `value` covers
   (whole archive bytes? canonical-JSON of `{ id, version, contentHash,
   ... }`?). Without this, "verify a signature" is undefined.
10. **Pack-signing verification ordering.** `src/content-runtime/`
    owns "manifest loading, archive import, dependency resolution,
    signature checks, sandbox policy, pack registry assembly,
    canonical-json serialization + `contentHash` computation," but the
    *order* of these steps is unspecified. A safe order is `archive
    integrity → signature verify on canonical-message bytes → schema
    parse → asset extraction (only after sig-verify)`; an unsafe order
    lets a tampered manifest exercise schema-parser bugs or
    asset-extraction path-traversal (audit 20 Q368) before sig-verify
    fires.
11. **Mandatory/optional split.** `signature` is *optional for every
    pack type.* No rule says canonical first-party packs MUST be
    signed, third-party packs MAY be unsigned (with trust prompt), or
    ranked play MUST refuse unsigned packs.
12. **Per-asset binary hashing.** `contentHash` covers canonical-JSON
    of records, **not** binary asset bytes. An attacker who swaps a
    sound or sprite inside an extracted pack folder is undetected.
13. **Signature stripping defense.** `signature` is removable; no
    "expected-to-be-signed" pin, no TOFU on `keyId`, no "Modded" badge
    that warns when a previously-signed pack now presents unsigned.
14. **Signature binding.** Whether `signature.value` covers
    `id + version + contentHash` (preventing reuse) or only
    `contentHash` (allowing relabel attacks) is undocumented.
15. **Revocation list.** No CRL-equivalent schema, no signed update
    channel, no "before signature-verify, consult revocation list"
    step.
16. **Update / key-rotation / TOFU policy.** No
    `previousKeyId`, no `rotationProof`, no doc that says "an update
    of pack `X` must be signed by the same `keyId` that signed v1, or
    by a key signed by it."
17. **Downgrade protection.** `version` is a free-form string in
    `manifest.schema.json` — not SemVer-comparable. A pack downgrade
    attack (substituting a known-vulnerable older version) is
    undetectable.
18. **Dependency signature propagation.** `manifest.dependencies:
    string[]` is resolved by `src/content-runtime/`, but no doc says
    whether dependency manifests are individually signature-verified
    or whether an unsigned dependency taints the parent's trust tier.
19. **Reproducible-archive contract.** `contentHash` over records is
    reproducible (canonical serializer); `.hrmod` ZIP bytes are not
    pinned (compression level, file ordering, ZIP timestamps free).
    A third party that wants to re-verify a canonical pack's signature
    end-to-end cannot reproduce the signing input.

A naive autonomous implementer following the current task spec ships
a save/pack pipeline that catches accidental corruption and hash
mismatches but **(a)** treats every save as trustworthy past the
xxh64 gate, **(b)** treats every pack as trustworthy past the
schema gate, **(c)** has no defense against parse-DoS / decompression
bombs / array bombs, **(d)** has no rule that prevents a tampered
`saveVersion` from steering migrators into undefined behavior, and
**(e)** ships pack-signing as a *theatrical* feature — the schema
field exists but nothing verifies it. This plan formalizes:

1. **Save threat model & pack threat model** — authored as named
   sections of the canonical `docs/architecture/security-model.md`
   document (plan 26 owns the multiplayer half; plan 27 owns the
   save-file and pack-install halves).
2. **Save schema contributions** — plan 27 contributes the
   *tamper-relevant* fields to `content-schema/schemas/save.schema.json`
   (array caps with `maxItems`, per-command-argument bounds via
   `$ref` to `command.schema.json`, integer-only numerics on every
   numeric field, `saveVersion` range-checked, `intent`
   discriminator). Plan 20 owns the schema *file* and registers it in
   the schema matrix; plan 27 owns the rules.
3. **Parser-hardening guards** — `src/persistence/parser.ts` and
   `src/content-runtime/parser.ts` enforce `maxDepth`,
   `maxStringLength`, `maxArrayLength`, `maxObjectKeys`,
   `maxCompressedBytes`, `maxUncompressedBytes`,
   `maxDecompressionRatio` *before* `JSON.parse`. Limits are pinned in
   `docs/architecture/parser-hardening.md`.
4. **Pre-replay command validation pass** — `src/persistence/load.ts`
   walks the entire `commandLog` once before any reducer call, runs
   each entry against `command.schema.json`, resolves every
   `unitId`/`spellId`/`factionId`/`heroId`/`artifactId` against the
   active registry, surfaces the first invalid command with full
   context. The reducer is no longer the first validation surface.
5. **Save-envelope MAC seam** —
   `content-schema/schemas/save-envelope.schema.json` defines the
   *envelope* shape `{ saveVersion, intent, body, mac? }` where `mac`
   is HMAC-SHA-256 over the canonical-JSON of `body` using a
   per-installation `deviceKey`. MAC is *optional in M4* (xxh64 stays
   for accidental corruption) but the *schema seam* is in place so
   M5/cloud-sync can flip it to required without a breaking save
   migration.
6. **Save migration contract** —
   `docs/architecture/save-migration.md` defines: `migrate(SaveRecord_vN)
   → SaveRecord_vN+1` is pure, idempotent (`migrate(migrate(x))` at
   the target version equals `migrate(x)`), version-pinned (each
   migrator declares its source and target `saveVersion`), and
   integrity-bound (the `saveVersion` field is part of the canonical
   MAC input once MACs are enabled). A `tasks/mvp/08-persistence/06-save-migration-contract.md`
   task owns the contract and the registry directory layout
   (`src/persistence/migrations/v<N>-to-v<N+1>.ts`).
7. **Save-vs-replay envelope discriminator** — `intent: "save" |
   "replay" | "fixture"` on the envelope. Replays strip
   player-identifying metadata; fixtures must be signed by an
   `engine-fixture` key; saves remain device-local.
8. **Pack-signing canonical message + verification order** — the
   signed message is canonical-JSON of `{ id, version, contentHash,
   engineHash, dependencies, capabilities, sandboxed,
   assetDigests }` (closing Q557 and Q560 together). The verification
   order is **archive-integrity → signature-verify → schema-parse →
   asset-extract**. Both rules are authored in
   `docs/architecture/pack-signing.md` and tested by
   `npm run validate:pack-signing`.
9. **Pack mandatory/optional split** — `manifest.schema.json` adds
   an optional `signaturePolicy: "required" | "optional" | "forbidden"`
   field at the publisher-registry level; canonical first-party
   `keyId`s pin `signaturePolicy: "required"`, and any pack claiming
   one of those `keyId`s without a valid signature is rejected.
10. **Per-asset binary hashing** — `asset-index.schema.json` adds a
    required `hash` field per asset (xxh64 over the binary bytes).
    The signed canonical message includes the *digest of the asset
    index*, so swapping any binary asset invalidates the signature.
11. **Signature stripping protection / TOFU** — once a pack with
    `keyId = K` is installed, the local trust store records
    `(packId, keyId, signaturePolicy = "required")`. Any future
    install/update of the same `packId` without a valid signature
    against `K` (or against a key signed by `K`'s rotation chain) is
    rejected. `docs/architecture/pack-signing.md` owns the rule;
    Plan 20's trust-prompt UI surfaces it.
12. **Update / key-rotation policy** — manifest gains optional
    `previousKeyId` and `rotationProof` fields. An update from
    `keyId K1` to `keyId K2` is accepted only if `rotationProof`
    is a signature by `K1` over `{ packId, K2, validFrom }`.
13. **SemVer-comparable version + downgrade protection** —
    `manifest.schema.json` `version` constrains to
    `^\d+\.\d+\.\d+(-[a-z0-9.-]+)?$`. The runtime refuses to install
    a version older than the currently-installed version unless the
    user explicitly confirms a "downgrade" path (Plan 20's UI).
14. **Dependency signature propagation** — `pack-signing.md` rule:
    if a top-level pack is signed and `signaturePolicy = "required"`,
    every transitive dependency must also be signed; an unsigned or
    `sandboxed: true` dependency taints the parent and the loader
    treats the *whole graph* as `sandboxed: true`.
15. **Reproducible-archive contract** —
    `docs/architecture/reproducible-archive.md` pins `.hrmod` ZIP
    determinism (alphabetical entry order, zero ZIP timestamps,
    fixed compression level / no compression) and a CI test
    (`npm run validate:reproducible-archive`) re-builds canonical
    fixtures and re-hashes the ZIP bytes.
16. **MP-load-resume protocol** —
    `docs/architecture/match-handshake.md` (plan 26) gains a
    "resumed-from-save" mode: both peers compute their local
    `stateHash` from the loaded `commandLog` *before* the first
    resumed turn; mismatch refuses to start. Plan 27 owns the
    contributing rule.
17. **CI gates** rejecting (a) any save fixture missing the `intent`
    discriminator, (b) any pack manifest used in a CI fixture
    without `signature` set, (c) any code path under `src/persistence/`
    or `src/content-runtime/` that calls `JSON.parse` directly
    instead of the hardened parser, (d) any reducer code path that
    accesses `commandLog[i]` without first running through
    `validateCommandLog`, (e) any pack-signing change that doesn't
    re-pin canonical-message golden hashes.

This plan **only formalizes missing artifacts** — no gameplay rules
are invented. Where audits 20 / 24 / 25 / 26 already produced
plans, this plan **defers** to those artifacts (schema files,
publisher registry, signed-key trust anchors, security-model
doctrine, lockstep envelope) and adds only the save-file integrity,
parser-hardening, migration contract, save-vs-replay distinction,
pack-signing canonical message, verification ordering, per-asset
hashing, stripping defense, key rotation, SemVer/downgrade,
dependency propagation, and reproducible-archive surfaces unique
to single-player saves and pack installs.

**Overall readiness state:** 2 / 10 (per audit). Closing the items
below lifts this to 8 / 10, which is the threshold for letting
agents ship an M4 build whose saves and packs survive a determined
hand-edit and whose pack-trust model can credibly back third-party
modding (M5+) and any future cloud-sync / leaderboard surface
(post-M5). Reaching 10 / 10 would require server-side audit
ingestion (covered in plan 26 §5 Improvements) and a hardware-key
publisher signing pipeline; both are out of scope here.

---

## 2. Critical Fixes (Must Do First)

These six items form the *active risk surface* (parse-DoS via
hand-edited save, undefined verification order on packs, theatrical
pack-signing, version-tampered migrator chain, asset-swap escape,
downgrade attack) and must land before any pack-loading or
import-from-disk feature is shipped to users beyond a developer
build.

### Critical Fix 1 — Parser Hardening (Save & Pack Archive)

**Source:** Q544, Q546. Risks "Decompression / parse DoS",
"`commandLog.length === 10_000_000`".

**Problem:** Both [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../../tasks/mvp/08-persistence/02-log-only-save-format.md)
and [`docs/architecture/pack-contract.md`](../../architecture/pack-contract.md)
describe gzip + JSON parsing without any documented `maxDepth`,
`maxStringLength`, `maxArrayLength`, `maxObjectKeys`,
`maxCompressedBytes`, `maxUncompressedBytes`, or
`maxDecompressionRatio` cap. `commandLog`, `checkpoints`, and
`contentPackHashes` carry no `maxItems` constraint. The standard
browser `JSON.parse` accepts arbitrarily deep input until it
stack-overflows; gzip/deflate accept arbitrary expansion until
memory is exhausted.

**Impact:** A hand-crafted save with `commandLog.length ===
10_000_000` is parsed and replayed until it OOMs the tab — and on
mobile, until the OS kills the page mid-load. A 1KB gzip stream
can decompress to gigabytes (the classic "zip bomb" pattern) without
guard; a deeply nested `[[[[…]]]]` JSON value will overflow the
parser. Audit 20 Q367 already raised the same gap on the pack-import
path.

**Solution:** Author a single `parser-hardening.md` doctrine and
implement two thin wrappers (`src/persistence/parser.ts` for saves,
`src/content-runtime/parser.ts` for pack manifests/records) that
*cannot* be bypassed; both are the **only** allowed entry points
into `JSON.parse` under those folders. Add a CI lint that rejects
any direct `JSON.parse` import outside those modules.

**Files to Update:**
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../../tasks/mvp/08-persistence/02-log-only-save-format.md) — add **Parser Hardening** section pointing to the doctrine; extend `verifyCommands` with `npm run validate:parser-hardening`
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) — add **Parser Hardening** section; cross-link the doctrine
- [docs/architecture/diagrams/25-load-flow.md](../../architecture/diagrams/25-load-flow.md) — insert a new gate `Decompress` → `Within size/ratio caps?` → `Valid format?`
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md) — register `parser-hardening.md` in the doc index column

**New Files:**
- `docs/architecture/parser-hardening.md` — canonical doctrine. Pinned values:
  - `maxCompressedBytes = 4 MB` (saves), `16 MB` (pack archives)
  - `maxUncompressedBytes = 64 MB` (saves), `512 MB` (pack archives)
  - `maxDecompressionRatio = 200 : 1` (compressed vs uncompressed)
  - `maxDepth = 32` (JSON nesting)
  - `maxStringLength = 64 KB` (any single string literal)
  - `maxArrayLength = 100_000` (any single array, including `commandLog`)
  - `maxObjectKeys = 4096` (any single object)
  - `maxNumericMagnitude = 2^53 − 1` (reject any integer outside safe-integer range; this is the canonical determinism invariant)
- `src/persistence/parser.ts` — `parseSaveBytes(raw: Uint8Array, limits = SAVE_LIMITS) → { ok: true, value } | { ok: false, reason: 'OVER_COMPRESSED' | 'OVER_UNCOMPRESSED' | 'OVER_RATIO' | 'OVER_DEPTH' | 'OVER_STRING' | 'OVER_ARRAY' | 'OVER_OBJECT_KEYS' | 'NON_INTEGER_NUMERIC' | 'JSON_PARSE_ERROR' }`. Streaming decompressor that aborts the moment any cap is exceeded.
- `src/content-runtime/parser.ts` — same shape as above but with `PACK_LIMITS`; called for `manifest.json` and every record file inside the archive.
- `tools/lint/no-direct-json-parse.ts` — AST lint; rejects `JSON.parse` imports under `src/persistence/`, `src/content-runtime/`, `src/engine/`, `src/rules/` except the two parser modules.
- `tasks/mvp/08-persistence/07-parser-hardening.md` — owning task. `ownedPaths` covers `docs/architecture/parser-hardening.md`, `src/persistence/parser.ts`, `src/content-runtime/parser.ts`, `tools/lint/no-direct-json-parse.ts`.
- `content-schema/examples/save-malformed/` — fixtures: oversized array, deep nesting, non-integer numeric, oversized string, decompression-ratio bomb. Each one has an expected rejection reason.

**Implementation Steps:**
1. Author `docs/architecture/parser-hardening.md` with the full table of pinned limits and rationale.
2. Implement `src/persistence/parser.ts`. Use `DecompressionStream` for streaming gzip decode and a custom JSON tokenizer that tracks depth/array length/string length/object key count. Reject the moment any cap is exceeded — do **not** call `JSON.parse` until the tokenizer has accepted the entire payload.
3. Implement `src/content-runtime/parser.ts` with the larger pack limits. Re-uses the same tokenizer.
4. Implement `tools/lint/no-direct-json-parse.ts`. Wire into `npm run lint`.
5. Author the malformed-save fixtures and a golden test that asserts each is rejected with the expected reason and that the rejection happens *before* the reducer is reached.
6. Wire `npm run validate:parser-hardening` into `npm run validate`.
7. Update the load-flow diagram and the pack-contract doc to reference the new gate.
8. Update [tasks/mvp/08-persistence/02-log-only-save-format.md](../../../tasks/mvp/08-persistence/02-log-only-save-format.md) and [tasks/mvp/08-persistence/03-save-load-ui.md](../../../tasks/mvp/08-persistence/03-save-load-ui.md) to depend on task `07`.

**Dependencies:** None — this is the foundation other fixes build on (every other gate runs *after* parsing succeeds).

**Complexity:** **L**

---

### Critical Fix 2 — Pack Signing Canonical Message + Verification Ordering

**Source:** Q553, Q556, Q557, Q560. Risks "Pack signature is theatrical
today", "Order is undefined", "Whole-archive vs manifest-plus-asset-
digest unspecified".

**Problem:** [`content-schema/schemas/manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json)
defines `signature.scheme: "ed25519"` + `keyId` + `value`, but the
canonical message that produced `value` is undocumented. Two reasonable
schemes exist (whole-archive vs canonical-JSON-of-manifest+digests);
without a written choice, no verifier can be implemented. Separately,
[`docs/architecture/pack-contract.md`](../../architecture/pack-contract.md)
lists `src/content-runtime/`'s responsibilities ("manifest loading,
archive import, dependency resolution, signature checks, sandbox
policy, pack registry assembly, canonical-json serialization +
contentHash computation") *without ordering*, so a tampered manifest
can exercise schema-parser bugs or asset-extraction path-traversal
(audit 20 Q368) before signature verification ever fires.

**Impact:** Pack signing is theatrical: a manifest can present a
`signature` block that no code verifies, or a verifier (when
authored) can disagree with the producer about *what* was signed.
Wrong ordering enables path-traversal-via-archive (audit 20 Q368)
and parser-exploit-before-verify, both of which give an attacker
arbitrary write inside the pack-staging directory under the trust
of a "successful" install.

**Solution:** Author a single `pack-signing.md` doctrine that pins
both the canonical signed message and the verification order; add
a verifier task whose `verifyCommands` re-derives the canonical
message and checks an Ed25519 golden signature.

**Files to Update:**
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json) — add the required-when-signed `assetDigest` field (xxh64 over the canonical-JSON of `assets/index.json`); pin `signature.value` to `^[a-f0-9]{128}$` (Ed25519 signature is 64 bytes = 128 hex chars)
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) — add **Verification Ordering** section: `archive-integrity (ZIP CRC) → parser-hardening → manifest schema-parse → signature verify (canonical message bytes) → publisher-registry lookup → revocation-list check → asset extraction (only if all preceding gates pass)`. Cross-link the new doctrine.
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md) — register `pack-signing.md` in the doc-index column
- [docs/architecture/diagrams/25-load-flow.md](../../architecture/diagrams/25-load-flow.md) — extend with `Pack signature verify?` gate (the load-flow already covers the save side; this fix adds the pack side)

**New Files:**
- `docs/architecture/pack-signing.md` — canonical doctrine. Sections:
  - **Canonical signed message.** The `signature.value` field is an
    Ed25519 signature over canonical-JSON of:
    ```json
    {
      "id": "...",
      "version": "...",
      "contentHash": "...",
      "engineHash": "...",
      "dependencies": ["..."],
      "capabilities": [...],
      "sandboxed": false,
      "assetDigest": "...",
      "previousKeyId": null
    }
    ```
    Field order is lexicographic (matches the canonical serializer);
    `null` is preserved for `previousKeyId` to keep the field set
    fixed across rotation events.
  - **Verification ordering.** Pinned six-step pipeline (above).
  - **What goes wrong if you reorder.** Worked example: tampered
    manifest with a path-traversal asset entry triggers extraction
    bugs *before* signature verify if the order is reversed.
  - **Whole-archive vs manifest-plus-digests.** Choice: manifest +
    `assetDigest` of canonical-JSON-of-`assets/index.json` (which in
    turn carries per-asset hashes — see Critical Fix 5). This
    decouples ZIP-byte determinism (which is hard) from
    signature-verifiability (which is easy when the canonical
    message is the manifest itself). Whole-archive signing is
    explicitly *not* used; reproducible-archive determinism (plan
    27 Improvement) is a *separate* property used for third-party
    re-build verification.
  - **Cross-references.** Plan 26 § "Pack-signature enforcement in
    multiplayer" (mandatory in ranked play); Plan 20 § "Trust prompt
    UI" (renders the verification result).
- `src/content-runtime/signature-verifier.ts` — pure function
  `verifyPackSignature(manifest, publisherRegistry, revocationList) →
  { ok: true, trustTier: 'canonical' | 'thirdParty' | 'sandboxed' } |
  { ok: false, reason: 'NO_SIGNATURE' | 'UNKNOWN_KEY_ID' |
  'REVOKED_KEY' | 'BAD_SIGNATURE' | 'CANONICAL_MESSAGE_MISMATCH' |
  'ASSET_DIGEST_MISMATCH' }`. Uses
  `globalThis.crypto.subtle.verify('Ed25519', …)`; *no*
  `node:crypto` import in the deterministic engine path.
- `tasks/mvp/02-content-schemas/<next-id>-pack-signing-verifier.md` —
  owning task. `ownedPaths` covers `src/content-runtime/signature-verifier.ts`, `docs/architecture/pack-signing.md`, the manifest-schema additions, and the canonical-message golden tests.
- `content-schema/examples/pack-signing/` — fixtures: signed-canonical,
  signed-third-party, unsigned-sandboxed, tampered-manifest (post-sign),
  tampered-asset-index, revoked-key, unknown-key-id, swapped-key-id-without-rotation-proof.
- `tools/scripts/canonical-pack-message.ts` — CLI that takes a manifest
  path, prints the canonical-JSON of the signed message, and (with
  `--sign <keyfile>`) emits the corresponding `signature.value`.
  Used by canonical-pack producers and the CI golden-test rebuilder.

**Implementation Steps:**
1. Author `docs/architecture/pack-signing.md`.
2. Update `manifest.schema.json` with the `assetDigest` field and the
   tightened `signature.value` pattern. Run plan 06's schema-additive-evolution
   gate (`npm run validate:schema-evolution`) — this is a *new optional*
   field, additive.
3. Implement `tools/scripts/canonical-pack-message.ts`. Use the same
   canonical-JSON serializer as the engine (sorted keys, no whitespace,
   integer literals).
4. Implement `src/content-runtime/signature-verifier.ts`. The verifier
   *only* consumes the canonical-message bytes; it never re-derives them
   from a tampered manifest. Constant-time signature comparison.
5. Author the eight pack-signing fixtures.
6. Add `npm run validate:pack-signing` golden tests:
   - signed-canonical → `ok: true, trustTier: 'canonical'`
   - signed-third-party (registered publisher) → `ok: true, trustTier: 'thirdParty'`
   - unsigned-sandboxed → `ok: true, trustTier: 'sandboxed'`
   - tampered-manifest → `ok: false, reason: 'BAD_SIGNATURE'`
   - tampered-asset-index → `ok: false, reason: 'ASSET_DIGEST_MISMATCH'`
   - revoked-key → `ok: false, reason: 'REVOKED_KEY'`
   - unknown-key-id → `ok: false, reason: 'UNKNOWN_KEY_ID'`
   - swapped-key-id (no rotation proof) → `ok: false, reason: 'UNKNOWN_KEY_ID'`
7. Wire the verifier into the pack-load pipeline in the canonical
   six-step order. Update `docs/architecture/diagrams/25-load-flow.md`.
8. Cross-link from plan 20's pack-trust-prompt UI: the prompt's tier
   badge consumes `verifyPackSignature`'s `trustTier`.

**Dependencies:** Critical Fix 1 (parser-hardening must run before
schema-parse, which runs before signature-verify); plan 20
(`publisher-registry.schema.json`, `pack-revocation-list.schema.json`).

**Complexity:** **L**

---

### Critical Fix 3 — `save.schema.json` Tamper-Relevant Fields & Pre-Replay Validation Pass

**Source:** Q542, Q543, Q544, Q545, Q547. Risks "No save schema
exists", "No pre-reducer validator pass", "Reducer is the first
thing that touches commands".

**Problem:** Plan 20 commits to authoring
`content-schema/schemas/save.schema.json` for the *import surface*.
Plan 27 owns the *tamper-relevant fields* of that same schema:
array maxima, per-command numeric bounds via `$ref` to
`command.schema.json`, integer-only numerics on every numeric
field, `saveVersion` range, `intent` discriminator, envelope
shape (Critical Fix 4). Separately,
[`docs/architecture/diagrams/25-load-flow.md`](../../architecture/diagrams/25-load-flow.md)
gates on format/version/hash but **not** on per-command
validation: today the reducer is the first thing to touch commands
from a loaded log, so a malformed argument surfaces mid-replay
rather than at a clean rejection point with full context.

**Impact:** Without per-command bounds, a hand-crafted command can
push values that the reducer is not designed to handle (e.g.,
`damage = -2^31`, `unitId = "../../../etc/passwd"`); the reducer
either throws mid-replay (poor UX, partial state mutation if any
non-pure path exists) or silently behaves unexpectedly. Without an
ID-resolution sweep, an unknown `unitId`/`spellId`/`factionId` shows
up only when that command is *reached* in replay, which can be
turn 200 of a 300-turn match — so the user sees a half-loaded match
that aborts mid-day.

**Solution:** Plan 27's contributions to `save.schema.json` (tamper
fields) plus a `validateCommandLog` function that runs *before* the
reducer touches any command. The pre-replay pass walks the entire
log, runs each entry against `command.schema.json`, resolves every
content ID against the active pack registry, and (if MAC is enabled
in M5+) verifies the envelope MAC.

**Files to Update:**
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../../tasks/mvp/08-persistence/02-log-only-save-format.md) — register the tamper-relevant rules contribution to `save.schema.json`; add **Pre-Replay Validation Pass** section
- [tasks/mvp/08-persistence/05-export-import-json.md](../../../tasks/mvp/08-persistence/05-export-import-json.md) — note that import goes through `validateCommandLog` before any reducer call
- [docs/architecture/diagrams/25-load-flow.md](../../architecture/diagrams/25-load-flow.md) — add `Pre-replay command validation` gate between `Restore initial state` and `Replay`
- [content-schema/schemas/save.schema.json](../../../content-schema/schemas/save.schema.json) — *if it doesn't exist yet* this fix authors it jointly with plan 20; otherwise it adds the tamper rules. Required additions:
  - `commandLog`: `{ "type": "array", "maxItems": 100000, "items": { "$ref": "command.schema.json" } }`
  - `checkpoints`: `{ "type": "array", "maxItems": 1024 }`
  - `contentPackHashes`: `{ "type": "array", "maxItems": 256, "items": { "type": "object", "required": ["id", "contentHash"] } }`
  - `saveVersion`: `{ "type": "integer", "minimum": 1, "maximum": 9999 }` (range-checked so `999_999` is rejected before migrators run)
  - all numerics declared `"type": "integer"` (no `number`); `multipleOf: 1` redundancy on every integer field
  - `intent` discriminator (Critical Fix 4)

**New Files:**
- `src/persistence/validate-command-log.ts` — pure function
  `validateCommandLog(log: unknown, registry: PackRegistry,
  expectedTurnRange: [number, number]) → { ok: true, log:
  Command[] } | { ok: false, index: number, reason:
  'SCHEMA_INVALID' | 'UNKNOWN_UNIT' | 'UNKNOWN_SPELL' |
  'UNKNOWN_FACTION' | 'UNKNOWN_HERO' | 'UNKNOWN_ARTIFACT' |
  'TURN_OUT_OF_RANGE' | 'NEGATIVE_NUMERIC' | 'NON_INTEGER_NUMERIC',
  context: { command: unknown } }`. Walks every entry; on first
  failure surfaces full context.
- `tasks/mvp/08-persistence/08-pre-replay-command-validation.md` —
  owning task. `ownedPaths` covers `src/persistence/validate-command-log.ts`,
  the load-flow diagram updates, the save-schema additions.

**Implementation Steps:**
1. Author the tamper-relevant additions to `save.schema.json` (or
   contribute the full schema jointly with plan 20 if not yet
   authored). Pin `additionalProperties: false` on the envelope.
2. Implement `validateCommandLog`. The function depends only on the
   schema validator (Ajv or equivalent) and the active pack registry.
   It is *pure-deterministic*: same inputs always produce the same
   `ok`/`reason`/`index`.
3. Hook `validateCommandLog` into the load pipeline immediately after
   pack-hash gate succeeds and before the reducer is invoked. On
   failure, surface the failing index and the failing command kind to
   the Save/Load screen UI.
4. Author golden tests:
   - `commandLog.length > 100_000` → schema rejects before `validateCommandLog`
   - unknown `unitId` at index 42 → `{ ok: false, index: 42, reason: 'UNKNOWN_UNIT' }`
   - non-integer numeric (`"damage": 1.5`) at index 17 → `{ ok: false, index: 17, reason: 'NON_INTEGER_NUMERIC' }`
   - `saveVersion: 999` with no migrator → format gate rejects with `MIGRATION_UNAVAILABLE` *before* `validateCommandLog`
5. Update [55-save-load](../../architecture/wiki/screens/55-save-load/data-contracts.md) to include the new rejection reasons in the failure-mode table.
6. Add `npm run validate:command-log` golden tests; wire into `npm run validate`.

**Dependencies:** Critical Fix 1 (`save.schema.json` validation only
runs after parser-hardening succeeds); plan 20 (the schema *file*
ownership).

**Complexity:** **M**

---

### Critical Fix 4 — Save Envelope, Save-vs-Replay Discriminator & Migration Contract

**Source:** Q540, Q548, Q550. Risks "xxh64 only", "Migration tampering",
"Same artifact, same code path".

**Problem:** Three distinct gaps converge on a single envelope
artifact: **(a)** `SaveRecord` carries no `mac` or `signature` field;
xxh64 detects accidental corruption only. **(b)** `saveVersion` is
stamped but no migrator is authored, no idempotency rule is written,
and the `saveVersion` field is not bound to any integrity input — so
once migrators exist, a tampered version can steer the chain. **(c)**
Save and replay are the same artifact — there is no `intent`
discriminator and no separately-validated replay code path; future
spectator/bug-report flows have no envelope distinction to build on.

**Impact:** **(a)** Any future trusted path (cloud sync, leaderboard,
shared replay, ranked) is blocked because xxh64 cannot stand in for a
keyed integrity primitive. **(b)** The *first* migrator to ship is
the one most likely to be exploited because the version-pinning
contract isn't in place yet. **(c)** A spectator/bug-report shared
replay would carry the original player's IndexedDB-key metadata and
be indistinguishable from a save, exposing privacy fields the
player didn't intend to share.

**Solution:** Author a single `save-envelope.schema.json` with three
fields that close all three gaps: `intent`, `saveVersion`, and
optional `mac`. Add a `save-migration.md` doctrine that pins
idempotency, version-pinning, and the rule that `saveVersion` is
canonical-JSON input to `mac` (so a tampered version invalidates the
MAC once MACs are turned on).

**Files to Update:**
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../../tasks/mvp/08-persistence/02-log-only-save-format.md) — replace the bare `SaveRecord` shape with `{ envelope: SaveEnvelope, body: SaveBody }`; reference the envelope schema and migration doctrine
- [tasks/mvp/08-persistence/03-save-load-ui.md](../../../tasks/mvp/08-persistence/03-save-load-ui.md) — surface the `intent` value in the slot list ("Save" vs "Replay" badge)
- [tasks/mvp/08-persistence/05-export-import-json.md](../../../tasks/mvp/08-persistence/05-export-import-json.md) — note that exported JSON includes the envelope; imported JSON must validate it
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md](../../architecture/wiki/screens/55-save-load/data-contracts.md) — register the envelope shape and the `intent` badge
- [docs/architecture/wiki/screens/55-save-load/spec.md](../../architecture/wiki/screens/55-save-load/spec.md) — add `IntentBadge` component
- [docs/architecture/diagrams/24-save-flow.md](../../architecture/diagrams/24-save-flow.md) — show the envelope wrapping
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md) — register `save-envelope.schema.json` and `save-migration.md`

**New Files:**
- `content-schema/schemas/save-envelope.schema.json` — strict
  `additionalProperties: false`. Required fields:
  - `envelopeVersion`: integer, currently `1`
  - `intent`: string enum `["save", "replay", "fixture"]`
  - `saveVersion`: integer 1–9999 (range-checked here independently of `save.schema.json`)
  - `engineHash`: hex string, fixed length
  - `contentPackHashes`: array (capped per Critical Fix 3)
  - `body`: opaque object (validated against `save.schema.json`)
  - `mac`: optional, 64-char hex (HMAC-SHA-256, present only when `intent === "save"` and the user has enabled cloud-sync / device-binding)
  - `signature`: optional, 128-char hex (Ed25519, present only when `intent === "fixture"` and the fixture is canonical)
- `content-schema/examples/save-envelope/` — fixtures: save-no-mac, save-with-mac, replay-stripped, fixture-signed, tampered-version-mac-mismatch.
- `docs/architecture/save-migration.md` — canonical doctrine:
  - **Migrator shape.** `migrate(SaveRecord_vN) → SaveRecord_vN+1` is pure (no I/O), idempotent at the target version (`migrate_N→N+1(migrate_N→N+1(x))` is undefined; migrators never re-apply themselves), version-pinned (each migrator declares its source via `migrate_N→N+1.from = N` and `.to = N+1`).
  - **Migration chain rule.** Loader walks `from = saveVersion → to = currentVersion` exactly once; never *down* (downgrades refuse), never skip (chain is strictly ascending).
  - **Integrity binding.** `saveVersion` is part of the canonical-JSON input to the optional MAC (see Critical Fix 4). A tampered `saveVersion` with MAC enabled invalidates the MAC; without MAC, it falls into the "no migrator available" → reject branch (the only unsigned defense available in M4).
  - **Support window.** Each release supports the previous N major saveVersions; older saves prompt the user to upgrade in a previous release first. Pinned `N = 5` for M4–M5.
  - **Authoring rule.** A migrator must include a golden test that round-trips three real saves of `vN` and asserts each migrated save validates against `save.schema.json` v`N+1`.
  - **Replay-intent skip.** `intent === "replay"` saves are migrated *without* MAC re-derivation (replays are unsigned by design); `intent === "fixture"` saves require fresh signature by an `engine-fixture` key after migration.
  - **Privacy strip on replay export.** Converting `intent: "save"` to `intent: "replay"` strips `name`, `slotId`, `createdAt` (replaced with `replayCreatedAt`), `savedAt`, and any user-supplied annotations. The migration doctrine declares the strip set; plan 20's import surface enforces it on the import side.
- `src/persistence/migrations/index.ts` — registry mapping `from → migrator`. Empty in M4 (no migrators yet); the registry *file* exists so future authors have a documented home.
- `src/persistence/migrate.ts` — `migrate(envelope, registry, targetVersion) → { ok: true, envelope } | { ok: false, reason: 'NO_MIGRATOR' | 'DOWNGRADE_REFUSED' | 'CHAIN_GAP' | 'POST_MIGRATION_VALIDATION_FAILED' }`.
- `tasks/mvp/08-persistence/06-save-migration-contract.md` — owning task. `ownedPaths` covers `docs/architecture/save-migration.md`, `src/persistence/migrations/`, `src/persistence/migrate.ts`, the envelope schema additions.
- `tasks/mvp/08-persistence/09-save-envelope-and-intent.md` — owning task for the schema + UI badge.

**Implementation Steps:**
1. Author `content-schema/schemas/save-envelope.schema.json`. Pin
   `additionalProperties: false`; pin `mac`/`signature` patterns.
2. Author `docs/architecture/save-migration.md`.
3. Implement `src/persistence/migrate.ts`. The function refuses
   downgrades (`from > to`), refuses chain gaps (no migrator from
   `from = N` to `from = N+1`), and re-validates the post-migration
   envelope against the *target* `save.schema.json` version.
4. Author the five envelope fixtures.
5. Add `npm run validate:save-envelope` golden tests:
   - save-no-mac → loads
   - save-with-mac, valid → loads; tampered `saveVersion` → `MAC_MISMATCH`
   - replay-stripped → loads; player-identifying fields absent
   - fixture-signed, valid → loads; tampered body → `BAD_SIGNATURE`
6. Add `IntentBadge` to the [55-save-load](../../architecture/wiki/screens/55-save-load/) spec — single-color "Save" badge for `intent: save`, secondary-color "Replay" badge for `intent: replay`, accent "Fixture" badge for `intent: fixture` (developer-only).
7. Update [tasks/mvp/08-persistence/02-log-only-save-format.md](../../../tasks/mvp/08-persistence/02-log-only-save-format.md) to depend on tasks `06` and `09`.
8. Cross-link plan 26 § "Pack-signature enforcement in multiplayer":
   the multiplayer handshake (plan 26) negotiates `matchKey`
   independently of the save MAC; if a save is *resumed* into MP, the
   resume protocol (Improvement below) requires both peers to compute
   their own `stateHash` from the loaded log — the save's MAC is *not*
   accepted as authentication between peers.

**Dependencies:** Critical Fix 1 (parser-hardening), Critical Fix 3
(`save.schema.json` shape), plan 20 (the schema-file ownership).

**Complexity:** **L**

---

### Critical Fix 5 — Per-Asset Binary Hashing

**Source:** Q558. Risks "Asset swap escapes detection", "contentHash
covers JSON only".

**Problem:** [`docs/architecture/pack-contract.md`](../../architecture/pack-contract.md)
documents `contentHash` as the canonical-JSON aggregate digest of all
records, *not* a per-asset list. The contract explicitly forbids a
`manifest.files[]` inventory ("Do not add a separate manifest `files[]`
inventory unless the schema is explicitly revised to require it"),
which means there is no per-asset hash *anywhere* — and binary assets
(sounds, sprites, fonts, video) are never hashed at all.
[`content-schema/schemas/asset-index.schema.json`](../../../content-schema/schemas/asset-index.schema.json)
owns path-to-id mapping but no hash field.

**Impact:** An attacker who unzips a signed canonical pack, swaps a
sprite or sound for a doctored version, and re-zips the result has
produced a pack whose `contentHash` (computed over JSON records) is
unchanged and whose Ed25519 signature is therefore still valid. The
runtime mounts the swapped asset under the trust of the canonical
publisher. This is also the path by which a hostile in-tree contributor
could ship a binary-only payload (steganographic data exfiltration,
deceptive UI overlays) past code review.

**Solution:** Add a required `hash` field to `asset-index.schema.json`
(xxh64 over the binary bytes), include the *digest of the canonical-JSON
of the asset index* in the signed canonical message (Critical Fix 2),
and gate asset extraction on per-asset hash verification.

**Files to Update:**
- [content-schema/schemas/asset-index.schema.json](../../../content-schema/schemas/asset-index.schema.json) — add a required `hash` field per asset entry: `{ "type": "string", "pattern": "^[a-f0-9]{16}$" }` (xxh64 = 8 bytes = 16 hex chars). Backwards compat handled by plan 20's pack-import migration: existing canonical packs are re-released with hashes; third-party packs without the field are rejected on first M5 install.
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json) — add the `assetDigest` field (already covered in Critical Fix 2's manifest update; plan 27 confirms the field is xxh64 over canonical-JSON of `assets/index.json` *including the new per-asset `hash` fields*).
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) — replace the "Do not add a separate manifest `files[]` inventory" block with: "Per-asset hashes live in `assets/index.json`, not in `manifest.files[]`. The aggregate digest of the asset index is included in the signed canonical message; binary assets cannot be swapped without invalidating the signature."
- [tasks/mvp/02-content-schemas/](../../../tasks/mvp/02-content-schemas/) — find the owning task for `asset-index.schema.json` and add the `hash` field requirement to its acceptance criteria

**New Files:**
- `src/content-runtime/asset-verifier.ts` — pure function
  `verifyAsset(path: string, expectedHash: string, bytes: Uint8Array)
  → { ok: true } | { ok: false, reason: 'HASH_MISMATCH', actualHash:
  string }`. Uses the same xxh64 implementation as the canonical
  serializer (deterministic).
- `tasks/mvp/02-content-schemas/<next-id>-per-asset-hashing.md` —
  owning task. `ownedPaths` covers the asset-index schema additions,
  the asset-verifier module, the pack-contract doc updates.
- `content-schema/examples/asset-tamper/` — fixtures:
  hash-matching-asset, swapped-asset (different bytes, same path),
  truncated-asset.

**Implementation Steps:**
1. Add the `hash` field to `asset-index.schema.json`. Run `npm run validate:schema-evolution` — this is technically additive on the schema but *required* on the data, so plan 20's pack-import surface must reject pre-M5 third-party packs that lack the field; canonical packs are re-released with hashes.
2. Implement `src/content-runtime/asset-verifier.ts`.
3. Wire the verifier into the asset-extraction step (the *last* step of
   Critical Fix 2's six-step pipeline). Each binary asset's `hash` is
   verified before it is exposed to the renderer or audio engine.
4. Add three asset-tamper fixtures and golden tests:
   - hash-matching-asset → ok
   - swapped-asset (different bytes, same path) → `HASH_MISMATCH`
   - truncated-asset → `HASH_MISMATCH`
5. Update plan 26's `assetDigest` field meaning in
   `docs/architecture/match-handshake.md` to clarify that the digest
   includes per-asset binary hashes (so peers running mismatched
   binary assets desync at handshake time, not at first use).

**Dependencies:** Critical Fix 2 (canonical message must include
`assetDigest`).

**Complexity:** **M**

---

### Critical Fix 6 — SemVer-Comparable `version` + Downgrade Protection + TOFU Stripping Defense

**Source:** Q559, Q562, Q563. Risks "Pack downgrade", "Signature
stripping", "Update / key rotation undefined".

**Problem:** [`content-schema/schemas/manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json)
declares `version` as `{ "type": "string", "minLength": 1 }` —
free-form, not SemVer-comparable. No "refuse downgrade" rule exists.
Separately, `signature` is `optional` for every pack type; there is
no "expected-to-be-signed" pin once a pack is installed, so a peer
with a tampered local manifest can simply remove the signature field
and present the pack as legitimately unsigned. And there is no
`previousKeyId`/`rotationProof` pair on the manifest, so an update of
pack `X` from publisher `K1` to publisher `K2` is silently accepted.

**Impact:** Three convergent attacks: **(a) downgrade**: substituting
`v0.9.0` (known-vulnerable; missing the security fix that landed in
`v1.0.0`) over an installed `v1.0.0`; **(b) stripping**: removing
`signature` from a previously-signed pack to evade trust-tier checks
in plan 20's UI; **(c) impersonation**: re-signing pack `X` with a
different `keyId` and presenting it as a legitimate update from the
original publisher.

**Solution:** Three coordinated changes to the manifest schema and
the pack-install pipeline: (1) SemVer pattern on `version`, (2) TOFU
trust store keyed by `(packId, keyId)`, (3) `previousKeyId` +
`rotationProof` fields with a documented rotation rule.

**Files to Update:**
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json):
  - replace `version: { type: "string", minLength: 1 }` with `version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+(-[a-z0-9.-]+)?$" }`
  - add optional `previousKeyId: { type: ["string", "null"] }`
  - add optional `rotationProof: { type: ["string", "null"], pattern: "^[a-f0-9]{128}$" }` (Ed25519 signature by `previousKeyId` over canonical-JSON of `{ packId, newKeyId, validFrom }`)
  - register both in the canonical signed message (Critical Fix 2) so they cannot be altered post-sign
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) — add **Versioning** section: SemVer is mandatory; downgrade refuses by default; the user can override via plan 20's downgrade-prompt UI. Add **Trust-on-First-Use** section: once a pack with `keyId = K` is installed, the local trust store records `(packId, K, signaturePolicy = "required")`. Any future install of the same `packId` without a valid signature against `K` (or against a key signed by `K`'s rotation chain) is rejected.
- [docs/architecture/pack-signing.md](../../architecture/pack-signing.md) (created in Critical Fix 2) — add **Key Rotation** section: a publisher rotates from `K1` to `K2` by issuing a manifest update with `previousKeyId = K1`, `rotationProof = Ed25519(K1, canonical-JSON({ packId, newKeyId: K2, validFrom })))`. The verifier accepts the update if (a) the signature on the manifest is valid under `K2`, (b) `rotationProof` is valid under `K1`, (c) the trust store contains `(packId, K1)` from a prior install. After successful rotation, the trust store updates to `(packId, K2)`.
- Plan 20's [pack-trust-prompt screen](../../architecture/wiki/screens/) — note that the prompt distinguishes "first install (TOFU)" from "update against pinned key" from "rotation event" with different copy.

**New Files:**
- `content-schema/schemas/pack-trust-store.schema.json` — local-only
  schema (per-installation, never shipped in any pack) describing
  the IndexedDB-backed trust store: `{ packId, keyId, installedAt,
  rotationHistory: [{ fromKeyId, toKeyId, rotationProof, at }] }`.
- `src/content-runtime/trust-store.ts` — pure functions `read(packId)`,
  `record(packId, keyId, rotation?)`, `verifyAgainstStore(packId,
  manifest)`. The store is per-installation (never synced); plan 20
  owns the UI flow that lets the user re-bootstrap the store.
- `tasks/mvp/02-content-schemas/<next-id>-tofu-and-key-rotation.md` —
  owning task. `ownedPaths` covers `pack-trust-store.schema.json`,
  `src/content-runtime/trust-store.ts`, the manifest-schema additions
  (`version`, `previousKeyId`, `rotationProof`), the pack-contract
  doc updates.

**Implementation Steps:**
1. Update `manifest.schema.json` with the SemVer pattern and the two
   optional rotation fields. Run `npm run validate:schema-evolution`;
   this is additive on optional fields and tightening on `version`
   — the tightening requires re-releasing canonical packs with
   conforming versions before merge (plan 17 owns the engine-hash
   bump if needed).
2. Author `pack-trust-store.schema.json` and
   `src/content-runtime/trust-store.ts`.
3. Implement the rotation rule in
   `src/content-runtime/signature-verifier.ts` (extend Critical Fix 2's
   verifier with a `rotation` branch).
4. Implement the downgrade-refuse rule in
   `src/content-runtime/install.ts`: compare incoming `version` to
   trust-store-pinned `version` using SemVer; if `incoming < installed`,
   surface `DOWNGRADE_REFUSED` to plan 20's UI; if the user explicitly
   confirms, proceed with the downgrade *and* record the downgrade in
   the trust-store's audit log.
5. Author golden tests:
   - `version: "1.0"` → schema rejects (not SemVer)
   - install `v1.0.0`, then install `v0.9.0` without confirmation → `DOWNGRADE_REFUSED`
   - install signed-by-`K1`, then update signed-by-`K2` without
     `rotationProof` → reject
   - install signed-by-`K1`, then update signed-by-`K2` with valid
     `rotationProof` → accept; trust store updates to `K2`
   - install signed, then update unsigned → `SIGNATURE_STRIPPED`
6. Update [55-save-load](../../architecture/wiki/screens/55-save-load/) data-contracts to reflect the new rejection reasons (saves carry `contentPackHashes` whose pack version is checked against the trust store at load time).

**Dependencies:** Critical Fix 2 (signature verifier extended for
rotation), plan 20 (downgrade-prompt UI, TOFU prompt copy).

**Complexity:** **L**

---

## 3. System Improvements

Grouped by system. These are non-critical-path improvements that
close the remaining ⚠ Partial / ❌ items beyond the six Critical
Fixes.

### UI / Screens

#### Issue: Save-load slot list surfaces tamper / migration / trust state

**Source:** Q548 (migration), Q550 (intent), Q559 (stripping), Q563 (downgrade).

**Problem:** [`docs/architecture/wiki/screens/55-save-load/spec.md`](../../architecture/wiki/screens/55-save-load/spec.md)
describes a slot list with name, schema version, content-hash status —
but no UI surface for the new tamper/migration/trust signals introduced
by Critical Fixes 4 and 6 (`intent` badge, "needs migration" badge,
"pack downgrade" warning, "expected-to-be-signed pack now unsigned"
warning).

**Solution:** Extend the existing screen package; do **not** create a
new package.

**Files to Update:**
- [docs/architecture/wiki/screens/55-save-load/spec.md](../../architecture/wiki/screens/55-save-load/spec.md) — add components: `IntentBadge`, `MigrationBadge` (shows `vN → vM` if migration available; "Unsupported" if not), `PackTrustWarning` (renders `signature_stripped`, `pack_downgraded`, `pack_revoked` states from the trust-store check)
- [docs/architecture/wiki/screens/55-save-load/data-contracts.md](../../architecture/wiki/screens/55-save-load/data-contracts.md) — add the per-slot status object: `{ intent, saveVersion, migrationAvailable, packTrustWarnings: string[] }`
- [docs/architecture/wiki/screens/55-save-load/interactions.md](../../architecture/wiki/screens/55-save-load/interactions.md) — per-control: "Load slot with `MigrationBadge: vN → vM`" → confirms migration intent before proceeding; "Load slot with `PackTrustWarning: signature_stripped`" → refuses load, surfaces the trust-store mismatch
- [docs/architecture/wiki/screens/55-save-load/architecture.md](../../architecture/wiki/screens/55-save-load/architecture.md) — update the data-flow diagram to show consumption from `src/persistence/migrate.ts`, `src/content-runtime/trust-store.ts`

**New Files:** None. Re-runs `npm run generate:wiki`.

**Implementation Steps:**
1. Update the four screen-package files.
2. Re-run `npm run generate:wiki`.
3. Update [tasks/mvp/08-persistence/03-save-load-ui.md](../../../tasks/mvp/08-persistence/03-save-load-ui.md) to depend on tasks `06`, `07`, `08`, `09`, the new TOFU task, and plan 20's pack-trust-prompt task.

**Dependencies:** Critical Fixes 4, 6.

**Complexity:** **S**

---

### Data Contracts & Schemas

#### Issue: Multiplayer load-resume protocol

**Source:** Q551. Risk "MP load-resume mismatch undefined".

**Problem:** Plan 26 covers fresh-match handshake but not "load a save
into a multiplayer session." The single-player gate enforces
`stateHash` and per-pack `contentHash` equality with the saved values;
the per-turn `exchangeHashes()` enforces equality between peers
*during* a live match — but no rule says "before resuming a saved
match, both peers must produce the same `stateHash` from the loaded
log." Mismatch handling is undefined.

**Solution:** Extend plan 26's `match-handshake.md` with a
"resumed-from-save" mode. Plan 27 owns the contributing rule;
plan 26 owns the schema artifact (`match-handshake.schema.json`)
and re-publishes its schema-matrix row.

**Files to Update:**
- [docs/architecture/match-handshake.md](../../architecture/match-handshake.md) (created by plan 26) — add **Resumed-from-Save Mode** section: both peers exchange their loaded-from-disk `stateHash` as part of `REVEAL`; mismatch produces `ABORT { reason: "RESUME_STATE_HASH_MISMATCH" }`. Both peers must also share an identical `contentPackHashes` set (a tampered save that adds a pack reference is caught here).
- [content-schema/schemas/match-handshake.schema.json](../../../content-schema/schemas/match-handshake.schema.json) (created by plan 26) — add `resumedFromSave: { saveId: string, loadedStateHash: hex16 } | null` to the `REVEAL` phase; add `RESUME_STATE_HASH_MISMATCH`, `RESUME_PACK_HASHES_MISMATCH` to the `ABORT.reason` enum
- [tasks/phase-3/01-multiplayer/10-match-handshake-protocol.md](../../../tasks/phase-3/01-multiplayer/10-match-handshake-protocol.md) (owned by plan 26) — add an **Acceptance Criterion** for resumed-from-save mode

**New Files:**
- `tasks/phase-3/01-multiplayer/15-resumed-from-save.md` — owning task. Cross-references plan 26's task `10` and plan 27's Critical Fixes 3 and 4.
- `content-schema/examples/match-handshake/resumed-from-save-*.json` — fixtures: matching-state-hash, mismatching-state-hash, mismatching-pack-hashes.

**Implementation Steps:**
1. Author the `match-handshake.md` resume section (or contribute a PR
   into plan 26's owning task).
2. Extend `match-handshake.schema.json` with the resume fields and abort reasons.
3. Author the three resume fixtures.
4. Add `npm run validate:resume-handshake` golden tests.
5. Update plan 07's reconnection-log task with a cross-link: reconnect
   replays in the *same* match use the existing flow; *new* matches
   resumed from disk go through the resume handshake.

**Dependencies:** Plan 26 (match-handshake artifact).

**Complexity:** **M**

---

#### Issue: Reproducible-archive contract for `.hrmod`

**Source:** Q565. Risk "Third party cannot re-verify a canonical pack".

**Problem:** The canonical-JSON serializer makes `contentHash` over
records reproducible by any party that runs the same serializer. The
`.hrmod` ZIP bytes themselves are *not* reproducible — compression
level, file ordering, and ZIP-entry timestamps are unspecified. A
third party that wants to re-build a canonical pack from source and
re-verify the signature end-to-end cannot reproduce the signing input.

**Solution:** Pin `.hrmod` ZIP determinism: alphabetical entry order,
zero ZIP timestamps, fixed compression level, no extra fields. Add a
CI test that re-builds canonical fixtures and re-hashes the ZIP bytes
against a pinned `archiveHash`. Note: Critical Fix 2's signed
canonical message is *manifest + assetDigest*, not whole-archive
bytes — so the reproducible-archive contract is for **third-party
re-verification**, not signature input. Both contracts compose: a
third party rebuilds the archive deterministically, extracts the
manifest, recomputes the canonical signed message, and verifies the
signature.

**Files to Update:**
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) — add **Reproducible Archive** section
- [tools/scripts/build-pack.ts](../../../tools/scripts/) (or wherever the canonical pack-build script lives — author if absent) — pin the deterministic ZIP options

**New Files:**
- `docs/architecture/reproducible-archive.md` — canonical doctrine.
  Pinned values:
  - **Entry order**: lexicographic ascending by full path.
  - **Timestamps**: all ZIP entry timestamps fixed to `1980-01-01T00:00:00Z` (the ZIP epoch).
  - **Compression**: `deflate` at level 6 (default), no `store` mixing.
  - **Extra fields**: empty.
  - **External attributes**: `0o644` for files, `0o755` for directories.
  - **Verification**: the build script and the verifier both compute `archiveHash = sha256(zipBytes)`; a `signedBuild.json` artifact (per-pack release) records the expected `archiveHash`.
- `tools/lint/reproducible-archive.ts` — re-builds a fixture pack from source, asserts the resulting ZIP bytes match the pinned `archiveHash`.
- `tasks/mvp/02-content-schemas/<next-id>-reproducible-archive.md` — owning task.

**Implementation Steps:**
1. Author `docs/architecture/reproducible-archive.md`.
2. Pin the ZIP-build options in the canonical pack-build script.
3. Add a `signedBuild.json` artifact format declaring `{ packId, version, archiveHash, signedCanonicalMessage, signature, keyId, builtAt, builderToolVersion }`.
4. Implement `tools/lint/reproducible-archive.ts`. Wire into `npm run validate:reproducible-archive` and `npm run validate`.
5. Re-build all canonical packs; record their `archiveHash` values in `signedBuild.json` files committed to `resources/` (or wherever canonical packs live when they ship).

**Dependencies:** Critical Fix 2 (the signed canonical message is
the *input* to `signedBuild.json`'s `signedCanonicalMessage`).

**Complexity:** **M**

---

#### Issue: Dependency signature propagation rule

**Source:** Q564. Risk "Unsigned dependency injection".

**Problem:** [`content-schema/schemas/manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json)
defines `dependencies: string[]`. No doc states whether dependency
manifests are individually signature-verified, whether a top-level
pack can vouch for an unsigned dependency, or whether a sandboxed
dependency taints its parent.

**Solution:** Pin the rule in `pack-signing.md` (Critical Fix 2):
**a top-level pack's effective trust tier is the *minimum* of its
own tier and every transitive dependency's tier.** An unsigned
dependency taints a signed parent to `sandboxed`; a sandboxed
dependency taints to sandboxed; a revoked dependency refuses load.

**Files to Update:**
- [docs/architecture/pack-signing.md](../../architecture/pack-signing.md) (Critical Fix 2) — add **Dependency Trust Propagation** section
- [content-schema/schemas/manifest.schema.json](../../../content-schema/schemas/manifest.schema.json) — clarify in the field description that `dependencies` are recursively trust-evaluated
- Plan 20's pack-trust-prompt UI — render the "this pack depends on N unsigned packs" disclosure

**New Files:** None. Extends Critical Fix 2's task and plan 20's UI.

**Implementation Steps:**
1. Add the rule to `pack-signing.md`.
2. Extend `src/content-runtime/signature-verifier.ts` to compute the
   transitive trust tier: `effectiveTier = min(selfTier, …deps.map(d => verifyPackSignature(d).trustTier))`.
3. Add golden tests:
   - signed parent + signed dep → `canonical`
   - signed parent + sandboxed dep → `sandboxed`
   - signed parent + unsigned dep → `sandboxed`
   - signed parent + revoked dep → reject
4. Cross-link plan 20's pack-trust-prompt UI: the prompt enumerates
   each transitive dep's trust tier and lets the user consent or
   refuse on a per-graph basis.

**Dependencies:** Critical Fix 2.

**Complexity:** **S**

---

#### Issue: Save threat model & pack threat model in `security-model.md`

**Source:** Q541. Risk "Threat model implicit, not written down".

**Problem:** Plan 26 commits to authoring `docs/architecture/security-model.md`
for the multiplayer surface. The audit's Q541 explicitly notes that
no doc states the save-loader and pack-loader threat model. Plan 27
owns the *single-player save* and *pack-install* sections of the
shared document.

**Solution:** Contribute three named sections to plan 26's
`security-model.md` (do not create a competing doc).

**Files to Update:**
- [docs/architecture/security-model.md](../../architecture/security-model.md) (created by plan 26) — add three new sections:

  - **Save threat model.** "The save loader assumes hostile input.
    Determinism + replay-state-hash is the integrity backstop;
    `xxh64` is *not* a signature. Defenses (in load order):
    parser-hardening (Critical Fix 1) → `save.schema.json` validation
    (Critical Fix 3) → pack-hash gate → pre-replay command-log
    validation (Critical Fix 3) → reducer replay → state-hash check.
    A tampered save that survives all gates either matches the
    expected `stateHash` (in which case it is functionally equivalent
    to a legitimate save by the determinism contract) or fails the
    final hash gate. Cloud-sync / leaderboard / shared-replay paths
    require the optional save-envelope MAC (Critical Fix 4) before
    they ship."

  - **Pack threat model.** "The pack loader assumes hostile input
    even from the local filesystem. Defenses (in load order):
    archive-integrity (ZIP CRC) → parser-hardening → manifest
    schema-parse → signature verify (Critical Fix 2) →
    publisher-registry lookup → revocation-list check → trust-store
    consultation (Critical Fix 6) → asset extraction with per-asset
    hash verification (Critical Fix 5). Failure at any gate refuses
    load with a specific reason. The trust tier of the loaded pack
    is the minimum of its own tier and every transitive dependency's
    tier (Improvement: Dependency Trust Propagation)."

  - **What this codebase does *not* protect.** Cross-referenced from
    plan 26's "Inherent limits" section: "(a) any save loaded into a
    *single-player* session can be tampered without consequence —
    the single-player threat model is `the player can edit their own
    save and the only victim is themselves`. (b) Cloud-sync /
    leaderboard / shared-replay paths require the save-envelope MAC
    (and, for shared replays, an Ed25519 signature by the *engine
    fixture key*) — until they ship, *no* save format claim is made
    against an attacker who controls a third-party server. (c)
    Pack-signing without per-installation hardware key support means
    a publisher whose private key is stolen can be impersonated until
    the next revocation-list update reaches each user (Critical Fix
    6 Improvement: signed-update channel)."

**New Files:** None. Authored against plan 26's owning task.

**Implementation Steps:**
1. Contribute the three sections to `security-model.md` (PR into plan 26's owning task).
2. Cross-link from [`CLAUDE.md`](../../../CLAUDE.md) "Read first" alongside plan 26's existing entry.

**Dependencies:** Plan 26 (the doc must exist).

**Complexity:** **S**

---

### Architecture

#### Issue: Save-envelope MAC seam (cloud-sync / shared-replay readiness)

**Source:** Q540, Q552. Risk "xxh64 only", "Achievement system would not be ready".

**Problem:** Critical Fix 4 introduces an **optional** `mac` field on
the save envelope. M4 ships with `mac` absent (single-player
sandbox-only); M5+ enables `mac` for cloud-sync and shared-replay
trust paths. The audit notes (Q552) that no achievement / leaderboard
system exists today, so there is no credit a tampered save could
claim — but the *seam* must exist now so M5+ doesn't require a
breaking save-format change.

**Solution:** Document the M4 vs M5 toggle in `save-migration.md`
and `security-model.md`; pin the `mac` derivation in
`docs/architecture/save-envelope-mac.md`.

**Files to Update:**
- [docs/architecture/save-migration.md](../../architecture/save-migration.md) (Critical Fix 4) — add **MAC Phase-In Plan** section: M4 disables `mac`; M5 enables MAC for envelopes with `intent === "save"` if the user has opted into cloud sync; the `saveVersion` field is canonical-JSON input to the MAC, so a tampered version invalidates the MAC.

**New Files:**
- `docs/architecture/save-envelope-mac.md` — canonical doctrine. Pinned values:
  - **Algorithm**: HMAC-SHA-256 (a 32-byte output is plenty for accidental-corruption-resistance + adversarial-tamper-detection on local saves).
  - **Key derivation**: `deviceKey = HKDF-SHA-256(salt = "hr-save-mac-v1", ikm = userInstallationSeed, length = 32)` where `userInstallationSeed` is generated once on first-run via `crypto.getRandomValues(32)` and stored in IndexedDB under a non-exportable scope.
  - **MAC input**: canonical-JSON of `{ envelopeVersion, intent, saveVersion, engineHash, contentPackHashes, body }` (the `mac` field itself is excluded from the canonical-JSON when computing).
  - **Verification**: constant-time comparison; on mismatch, refuse load with `MAC_MISMATCH`. A user can re-derive `deviceKey` only on the original installation; cloud sync re-keys to a per-account key in M5+.
  - **Cross-installation transfer**: a save MAC'd on installation A cannot load on installation B unless cloud sync has re-keyed the envelope. M4 disables this entire path; M5 introduces an opt-in re-key step in plan 20's import surface.
- `tasks/mvp/08-persistence/<next-id>-save-envelope-mac-phase-in.md` —
  owning task. Status: M5 (deferred from MVP). `ownedPaths` covers
  `docs/architecture/save-envelope-mac.md`,
  `src/persistence/mac.ts`, the relevant trust-store entries.

**Implementation Steps:**
1. Author `docs/architecture/save-envelope-mac.md`. M4-status documentation; no code yet.
2. Wire the M5 task into the phase-3 dependency graph as a downstream of cloud-sync (when that's added).

**Dependencies:** Critical Fix 4 (envelope schema seam).

**Complexity:** **S** (M4 doc-only; M5 is the implementation work, owned by the deferred task).

---

### Tasks

The following are the tasks created or modified by this plan,
collected for easy registry regeneration.

**New tasks (M4):**
- `tasks/mvp/08-persistence/06-save-migration-contract.md` (Critical Fix 4)
- `tasks/mvp/08-persistence/07-parser-hardening.md` (Critical Fix 1)
- `tasks/mvp/08-persistence/08-pre-replay-command-validation.md` (Critical Fix 3)
- `tasks/mvp/08-persistence/09-save-envelope-and-intent.md` (Critical Fix 4)
- `tasks/mvp/02-content-schemas/<next-id>-pack-signing-verifier.md` (Critical Fix 2)
- `tasks/mvp/02-content-schemas/<next-id>-per-asset-hashing.md` (Critical Fix 5)
- `tasks/mvp/02-content-schemas/<next-id>-tofu-and-key-rotation.md` (Critical Fix 6)
- `tasks/mvp/02-content-schemas/<next-id>-reproducible-archive.md` (Improvement)

**New tasks (M5+):**
- `tasks/phase-3/01-multiplayer/15-resumed-from-save.md` (Improvement, requires plan 26)
- `tasks/mvp/08-persistence/<next-id>-save-envelope-mac-phase-in.md` (Improvement, deferred to M5)

**Modified tasks:**
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../../tasks/mvp/08-persistence/02-log-only-save-format.md) — depends on tasks `06`, `07`, `09`
- [tasks/mvp/08-persistence/03-save-load-ui.md](../../../tasks/mvp/08-persistence/03-save-load-ui.md) — depends on tasks `06`, `07`, `08`, `09`, plus plan 20's pack-trust-prompt task and the new TOFU task
- [tasks/mvp/08-persistence/05-export-import-json.md](../../../tasks/mvp/08-persistence/05-export-import-json.md) — extends to validate envelopes on import
- [tasks/phase-3/01-multiplayer/10-match-handshake-protocol.md](../../../tasks/phase-3/01-multiplayer/10-match-handshake-protocol.md) (owned by plan 26) — adds resume mode
- The owning task for `asset-index.schema.json` under [tasks/mvp/02-content-schemas/](../../../tasks/mvp/02-content-schemas/) — adds the `hash` field (Critical Fix 5)

After all task additions and edits, run:

```
npm run generate:task-registry
npm run generate:task-system-report
npm run validate:tasks
npm run validate
```

---

## 4. Suggested Task Breakdown

Authoring order so that no task ever depends on a still-unauthored
artifact.

- [ ] **Critical Fix 1 — Parser Hardening**
  - [ ] Author `docs/architecture/parser-hardening.md` with the pinned-limits table
  - [ ] Implement `src/persistence/parser.ts` (streaming gzip + tokenizer + caps)
  - [ ] Implement `src/content-runtime/parser.ts` (same with pack limits)
  - [ ] Implement `tools/lint/no-direct-json-parse.ts`
  - [ ] Author 5 malformed-save fixtures
  - [ ] Wire `npm run validate:parser-hardening` into `npm run validate`
  - [ ] Update load-flow diagram + pack-contract doc
  - [ ] Update existing persistence tasks to depend on the new parser-hardening task

- [ ] **Critical Fix 2 — Pack Signing Canonical Message + Verification Order**
  - [ ] Author `docs/architecture/pack-signing.md`
  - [ ] Update `manifest.schema.json` with `assetDigest` + tightened `signature.value` pattern
  - [ ] Implement `tools/scripts/canonical-pack-message.ts`
  - [ ] Implement `src/content-runtime/signature-verifier.ts`
  - [ ] Author 8 pack-signing fixtures
  - [ ] Wire `npm run validate:pack-signing`
  - [ ] Wire verifier into the six-step load pipeline
  - [ ] Cross-link plan 20's pack-trust-prompt UI

- [ ] **Critical Fix 3 — `save.schema.json` Tamper Rules + Pre-Replay Validation**
  - [ ] Contribute tamper-relevant fields to plan 20's `save.schema.json`
  - [ ] Implement `src/persistence/validate-command-log.ts`
  - [ ] Hook into load pipeline pre-reducer
  - [ ] Author 4 golden tests
  - [ ] Update Save/Load screen data-contracts
  - [ ] Wire `npm run validate:command-log`

- [ ] **Critical Fix 4 — Save Envelope, Intent Discriminator, Migration Contract**
  - [ ] Author `content-schema/schemas/save-envelope.schema.json`
  - [ ] Author `docs/architecture/save-migration.md`
  - [ ] Implement `src/persistence/migrations/index.ts` (registry, empty)
  - [ ] Implement `src/persistence/migrate.ts`
  - [ ] Author 5 envelope fixtures
  - [ ] Wire `npm run validate:save-envelope`
  - [ ] Add `IntentBadge` + `MigrationBadge` to Save/Load screen
  - [ ] Cross-link plan 26's match-handshake.md

- [ ] **Critical Fix 5 — Per-Asset Binary Hashing**
  - [ ] Add `hash` field to `asset-index.schema.json`
  - [ ] Update `pack-contract.md` to remove `files[]` prohibition language
  - [ ] Implement `src/content-runtime/asset-verifier.ts`
  - [ ] Wire into asset-extraction step
  - [ ] Author 3 asset-tamper fixtures
  - [ ] Update plan 26's `assetDigest` clarification in `match-handshake.md`

- [ ] **Critical Fix 6 — SemVer + TOFU + Key Rotation**
  - [ ] Update `manifest.schema.json` (`version` SemVer pattern + rotation fields)
  - [ ] Author `pack-trust-store.schema.json`
  - [ ] Implement `src/content-runtime/trust-store.ts`
  - [ ] Extend signature-verifier with rotation branch
  - [ ] Implement `src/content-runtime/install.ts` (downgrade refuse + TOFU check)
  - [ ] Author 5 golden tests
  - [ ] Update Save/Load + plan 20's pack-trust-prompt UI

- [ ] **Improvement — Save-Load Slot UI Tamper/Migration/Trust Surfaces** (depends on Fixes 4 & 6)
  - [ ] Update `55-save-load/spec.md`, `data-contracts.md`, `interactions.md`, `architecture.md`
  - [ ] Re-run `npm run generate:wiki`

- [ ] **Improvement — MP Load-Resume Protocol** (depends on plan 26)
  - [ ] Contribute resume mode to plan 26's `match-handshake.md`
  - [ ] Extend `match-handshake.schema.json` with resume fields + abort reasons
  - [ ] Author 3 resume fixtures
  - [ ] Wire `npm run validate:resume-handshake`

- [ ] **Improvement — Reproducible-Archive Contract** (depends on Critical Fix 2)
  - [ ] Author `docs/architecture/reproducible-archive.md`
  - [ ] Pin ZIP-build options in `tools/scripts/build-pack.ts`
  - [ ] Define `signedBuild.json` artifact format
  - [ ] Implement `tools/lint/reproducible-archive.ts`
  - [ ] Wire `npm run validate:reproducible-archive`

- [ ] **Improvement — Dependency Signature Propagation** (depends on Critical Fix 2)
  - [ ] Add Dependency Trust Propagation section to `pack-signing.md`
  - [ ] Extend signature-verifier with transitive trust computation
  - [ ] Author 4 dependency-tamper golden tests
  - [ ] Cross-link plan 20's pack-trust-prompt UI

- [ ] **Improvement — Save & Pack Threat Model in `security-model.md`** (depends on plan 26)
  - [ ] Contribute three named sections to plan 26's `security-model.md`
  - [ ] Cross-link from `CLAUDE.md`

- [ ] **Improvement — Save-Envelope MAC Phase-In** (M5; deferred)
  - [ ] Author `docs/architecture/save-envelope-mac.md` (M4 doc-only)
  - [ ] M5: implement `src/persistence/mac.ts`, opt-in cloud-sync re-key flow

- [ ] **Final integration**
  - [ ] `npm run generate:task-registry`
  - [ ] `npm run generate:task-system-report`
  - [ ] `npm run validate:tasks`
  - [ ] `npm run validate`

---

## 5. Execution Order

The order respects every "X must exist before Y" constraint:

1. **Critical Fix 1 — Parser Hardening.** Foundation. Every other gate
   runs *after* parsing succeeds; without caps in place, every other
   fix is bypassable via parse-DoS.
2. **Critical Fix 2 — Pack Signing Canonical Message + Verification
   Order.** Establishes the *what* and *when* for every pack-signing
   downstream. Required before per-asset hashing (Fix 5), TOFU (Fix
   6), and dependency propagation (Improvement) can be specified.
3. **Critical Fix 3 — `save.schema.json` Tamper Rules + Pre-Replay
   Validation.** Establishes the save-side equivalent: per-command
   bounds and ID resolution before reducer replay.
4. **Critical Fix 4 — Save Envelope, Intent Discriminator, Migration
   Contract.** Builds on Fix 3's schema; introduces the `intent`
   discriminator that Save/Load UI needs (Improvement) and the
   `mac` seam that M5 needs.
5. **Critical Fix 5 — Per-Asset Binary Hashing.** Builds on Fix 2's
   `assetDigest`. Closes the binary-asset escape hatch.
6. **Critical Fix 6 — SemVer + TOFU + Key Rotation.** Builds on Fix 2's
   verifier. Closes signature stripping, downgrade, and rotation
   gaps in one coherent change.
7. **Improvement — Save-Load Slot UI Surfaces.** Depends on Fixes 4 & 6.
8. **Improvement — MP Load-Resume Protocol.** Depends on plan 26's
   handshake artifact landing first; can start in parallel with
   step 7 once plan 26's task `10` is `in-progress`.
9. **Improvement — Reproducible-Archive Contract.** Depends on Fix 2.
10. **Improvement — Dependency Signature Propagation.** Depends on Fix 2.
11. **Improvement — Save & Pack Threat Model in `security-model.md`.**
    Depends on plan 26's doc landing first.
12. **Improvement — Save-Envelope MAC Phase-In.** M4 doc-only;
    full implementation deferred to M5 cloud-sync feature.

**Validation gate** after each step: `npm run validate:tasks &&
npm run validate`. Final integration regenerates the task registry
and the task-system report.

---

## 6. Risks if Not Implemented

- **Save parse-DoS.** Without parser-hardening (Fix 1), a hand-crafted
  save can OOM the tab on every load attempt — including the very
  first attempt to load a freshly-imported save, before the user has
  any chance to delete it. On mobile, the OS kills the page and the
  user blames the app rather than the save. **Severity: high; user-
  visible reliability hit on day one.**

- **Theatrical pack signing.** Without Fixes 2, 5, 6 (canonical
  message, per-asset hashing, TOFU), the `signature` field in
  `manifest.schema.json` is a UI-only signal that no code verifies.
  An attacker can present any signature, any `keyId`, with any
  `signatureScheme`; the trust-prompt UI in plan 20 rendering "this
  pack is signed by Acme" would be a *lie* until verification is
  wired. **Severity: critical for any third-party-modding launch;
  reputational risk if shipped this way.**

- **Mid-replay desync from tampered save.** Without pre-replay command
  validation (Fix 3), a malformed argument surfaces mid-replay rather
  than at a clean rejection point. Partial state is mutated; the user
  sees a half-loaded match abort at turn 200 of 300; bug reports are
  uncategorizable. **Severity: medium; mostly UX rather than security.**

- **Migration tampering.** Without Fix 4's migration contract, the
  *first* migrator to ship is the one most likely to be exploited
  (re-application, downgrade, version-tampering). Once a chain
  exists, retro-fitting an idempotency rule requires re-validating
  every saved game in the wild. **Severity: medium-high; debt
  compounds with every additional migrator.**

- **Asset swap escape.** Without per-asset hashing (Fix 5), an
  attacker who unzips a signed canonical pack, swaps a sprite or
  sound, and re-zips bypasses the signature check. The runtime
  mounts the swapped asset under canonical trust. **Severity: high
  for any modding ecosystem; medium for first-party shipping (asset
  swaps usually need filesystem write to the install dir, which is
  a higher bar than save-edit).**

- **Pack downgrade + signature stripping.** Without Fix 6, a
  known-vulnerable older version can be substituted for a current
  one, and a previously-signed pack can be downgraded to "unsigned"
  status to evade trust-tier checks. Combined with audit 20 Q379's
  missing "Modded" badge, the user has no surface signal that
  anything has changed. **Severity: high in any cross-version-update
  scenario.**

- **MP load-resume undefined.** Without the resume-handshake
  Improvement, attempting to resume a saved match into multiplayer
  produces undefined behavior — either an immediate first-turn
  desync (best case) or a partially-applied state divergence that
  the bisect tool then chases as if it were a tamper. **Severity:
  medium; only blocks shipping the "resume MP saves" feature, which
  is M5+ anyway.**

- **No third-party re-verification.** Without the reproducible-
  archive contract, no third-party auditor can re-build a canonical
  pack from source and re-verify the chain end-to-end. This blocks
  any future "open canonical packs to community audit" stance.
  **Severity: low for M4–M5; high for any ranked-play / open-mod
  ecosystem.**

- **No save threat model on the page.** Without contributing the
  three sections to `security-model.md`, an autonomous AI implementer
  reading `determinism.md` will assume that the determinism contract
  is sufficient as a security model. It is not — it is the *backstop*
  for outcome integrity, not the *design* for adversarial input
  handling. **Severity: medium; this is what causes other-system
  authors to take shortcuts (e.g., "the reducer will catch it" → no
  pre-replay validation pass; "xxh64 is good enough" → no MAC seam).**

**Out-of-scope risks** (carried into other plans):

- Server-side audit ingestion of saves and replays for anomaly
  detection — covered by plan 26 §5 Improvements, plan 22 (privacy /
  retention).
- Cloud sync / leaderboards / shared replays — Plan 27's Critical
  Fix 4 introduces the *seam*; the *implementation* is deferred to
  M5+ behind plan 22 (privacy) and plan 31 (trust boundaries /
  logging / monitoring).
- Hardware-key publisher signing — out of scope for both M4 and M5;
  software keys are sufficient until a community of paid third-party
  publishers materializes.

---

## 7. AI Implementation Readiness

**Score before this plan: 2 / 10**
**Score after closing all Critical Fixes + non-deferred Improvements: 8 / 10**

**Why 8 and not 10:**
- Two improvements (Save-Envelope MAC Phase-In implementation; full
  cross-installation re-keying flow) are deferred to M5 behind cloud
  sync. Until M5 ships, *no save-format claim is made against an
  attacker who controls a third-party server* — this is by design
  but caps the readiness at "M4-complete, M5-seam-in-place".
- Hardware-key publisher signing is out of scope; software-key
  Ed25519 is the ceiling for M4–M5.
- Server-side audit ingestion (plans 22, 26, 31) is not part of this
  plan; saves are believed-deterministic but not externally-attested.

**Why not lower than 8:**
- Every Critical Fix is reducible to (a) one schema or doc artifact,
  (b) one pure-deterministic verifier function, (c) one CI gate, and
  (d) golden-test fixtures with explicit expected reasons. An
  autonomous agent can ship each Fix independently behind its own
  `verifyCommands` block.
- The only schema files this plan creates that don't already have a
  named owner are `save-envelope.schema.json` and
  `pack-trust-store.schema.json`; both are explicitly registered in
  the schema-matrix and owned by named tasks. Plan 20 owns the
  schema files this plan only *contributes to*
  (`save.schema.json`, `publisher-registry.schema.json`,
  `pack-revocation-list.schema.json`).
- Every pinned constant (parser limits, MAC algorithm, KDF salt,
  ZIP timestamps, signature length, SemVer pattern) is declared
  with rationale in this plan, so an agent does not have to invent
  a value.
- Every golden test in this plan is paired with an explicit expected
  rejection reason (`OVER_RATIO`, `BAD_SIGNATURE`,
  `UNKNOWN_UNIT`, `DOWNGRADE_REFUSED`, `MAC_MISMATCH`, …), so test
  authoring is mechanical.

**Closing this plan completes the transition from**:

> "Saves and packs survive accidental corruption."

**to:**

> "Saves and packs survive a determined hand-edit, an asset swap, a
> downgrade attack, a stripping attack, a parse-DoS, and a tampered
> migration chain — and the trust model can credibly back third-party
> modding (M5+) and (with the M5 MAC implementation) any future
> cloud-sync, leaderboard, or shared-replay surface."
