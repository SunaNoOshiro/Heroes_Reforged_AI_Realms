# Pack Signing — Canonical Message, Verification Order, Trust Propagation

> Crypto primitives in use here (Ed25519 pack signature; xxh64
> manifest digest over canonical-JSON) are catalogued in
> [`crypto-primitives.md`](./crypto-primitives.md).

Canonical doctrine for the Ed25519 signature carried by every signed
content pack. Closes the gap that
[`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
leaves open: the schema declares `signature.scheme = "ed25519"`,
`keyId`, and `value`, but does not specify **what canonical bytes
are signed** or **when in the pack-load pipeline the signature is
verified**. Both gaps are closed here.

Companion docs:

- [`pack-contract.md`](./pack-contract.md) — pack layout, capabilities,
  signature policy.
- [`pack-trust.md`](./pack-trust.md) — UI trust prompt + trust-anchor
  precedence.
- [`crypto-rules.md`](./crypto-rules.md) — constant-time comparison
  rule referenced from every signature check.
- [`security-model.md`](./security-model.md) — pack threat model that
  this doctrine implements.
- [`reproducible-archive.md`](./reproducible-archive.md) —
  third-party re-verification of `.hrmod` ZIP determinism (a
  separate property from the signed canonical message).
- [`parser-hardening.md`](./parser-hardening.md) — runs before
  signature verify in the load pipeline.
- [`runtime-requirements.md`](./runtime-requirements.md) — Web Crypto
  floor consumed by the verifier.

---

## 1. Canonical signed message

`manifest.signature.value` is a 64-byte (128-hex-char lower-case)
Ed25519 signature over the canonical-JSON serialization of:

```json
{
  "id": "<pack id>",
  "version": "<semver>",
  "contentHash": "<xxh64 hex of the canonical-JSON pack record tree>",
  "engineHash": "<xxh64 hex of the engine bundle>",
  "dependencies": ["..."],
  "capabilities": ["..."],
  "sandboxed": false,
  "assetDigest": "<xxh64 hex of canonical-JSON of assets/index.json>",
  "previousKeyId": null
}
```

Rules:

- **Field order.** Lexicographic by key. The canonical-JSON
  serializer used everywhere else in the engine (sorted keys, no
  whitespace, integer-only numerics) is the same serializer used
  here.
- **`null` is preserved.** `previousKeyId` carries `null` when no
  rotation event has occurred so the signed field set is constant
  across rotation states. Removing the field on the
  unsigned-rotation side would change the canonical bytes and
  invalidate the signature.
- **`assetDigest`** is xxh64 of the canonical-JSON of
  `assets/index.json`. Because the asset index already carries a
  per-file SHA-256 (per
  [`asset-index.schema.json`](../../content-schema/schemas/asset-index.schema.json)),
  the asset digest transitively binds every binary asset to the
  signature. A swapped sprite changes its row's `sha256`, which
  changes the canonical-JSON of `assets/index.json`, which changes
  `assetDigest`, which invalidates the Ed25519 signature.
- **Dependencies are listed by `{ id, version }`** — the same shape
  declared in `manifest.schema.json`. Re-ordering the declared
  dependencies list re-orders the signed message and invalidates
  the signature.

This decouples **ZIP byte determinism** (hard) from **signature
verifiability** (easy). Whole-archive signing is explicitly NOT
used; [`reproducible-archive.md`](./reproducible-archive.md) is a
separate property used by third-party auditors who want to rebuild
and re-verify a canonical pack end-to-end.

The CLI that produces the canonical-message bytes for signing and
golden tests is `tools/scripts/canonical-pack-message.ts` (owned by
the pack-signing-verifier task). Two pieces of code MUST NOT
re-derive the canonical message independently — both signer and
verifier consume the same module.

---

## 2. Verification order

The pack loader runs **six** gates in this order. Each gate either
passes its output forward or refuses the load with a closed
reason. Reordering breaks the threat model — see § 3.

```text
1. archive-integrity         (ZIP CRC over each entry)
2. parser-hardening          (size / ratio / depth / array caps —
                              see parser-hardening.md)
3. manifest schema-parse     (manifest.schema.json validation)
4. signature verify          (Ed25519 over canonical message bytes,
                              constant-time per crypto-rules.md;
                              consults publisher registry + revocation
                              list + trust store; rotation branch
                              when previousKeyId is non-null)
5. publisher-registry lookup (assigns trust tier:
                              canonical | community-signed | sandboxed)
6. asset extraction          (each asset's SHA-256 verified before
                              the bytes are exposed to the renderer
                              or audio engine; rejects on mismatch)
```

`src/content-runtime/` owns this pipeline, per
[`pack-contract.md` § Runtime Ownership](./pack-contract.md). The
verifier itself (`src/content-runtime/signature-verifier.ts`) is a
pure function:

```ts
verifyPackSignature(
  manifest: Manifest,
  publisherRegistry: PublisherRegistry,
  revocationList: PackRevocationList,
  trustStore: TrustStore,
):
  | { ok: true, trustTier: "canonical" | "community-signed" | "sandboxed" }
  | { ok: false, reason:
        | "NO_SIGNATURE"
        | "UNKNOWN_KEY_ID"
        | "REVOKED_KEY"
        | "BAD_SIGNATURE"
        | "CANONICAL_MESSAGE_MISMATCH"
        | "ASSET_DIGEST_MISMATCH"
        | "SIGNATURE_STRIPPED"
        | "ROTATION_PROOF_INVALID"
        | "DOWNGRADE_REFUSED" };
```

The verifier uses `globalThis.crypto.subtle.verify('Ed25519', …)`.
`node:crypto` is forbidden in the deterministic engine path —
[`runtime-requirements.md`](./runtime-requirements.md) pins the Web
Crypto floor. Constant-time comparison is mandatory per
[`crypto-rules.md`](./crypto-rules.md) § 1; the verifier MUST NOT
short-circuit on the first byte difference.

Internal `reason` codes are decoded only in dev logs. At the wire
and UI surfaces every failure collapses to `INVALID_SIGNATURE` per
[`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json)
and [`crypto-rules.md`](./crypto-rules.md).

---

## 3. What goes wrong if you reorder

- **Schema-parse before signature-verify on a tampered manifest.**
  A hostile actor crafts a manifest whose schema-valid but
  path-traversal-laden `assets/index.json` exercises a parser bug
  or directory-escape during asset extraction. Mitigation: the
  signature-verify gate (step 4) runs before any asset extraction
  (step 6); a tampered manifest fails signature verify and the
  archive is unmounted before its contents are exposed.
- **Signature-verify before parser-hardening.** A 1 GB
  uncompressed manifest exhausts memory before the verifier ever
  runs. Mitigation: parser-hardening (step 2) refuses oversized
  input before the verifier ever sees it.
- **Asset-extraction before signature-verify.** Path-traversal in
  asset paths (`../../etc/passwd`) is a known attack surface.
  Mitigation: asset extraction (step 6) is the **last** step. Even
  if `assets/index.json` declares a hostile path, the signature
  gate has already accepted only a manifest whose `assetDigest`
  matches the canonical-JSON of the asset index — and the asset
  index's `path` schema rejects absolute schemes, leading slashes,
  and parent-directory escapes by `pattern` constraint.

---

## 4. Trust tiers

The verifier returns one of three trust tiers from the closed
`trustTier` enum (canonical seam:
[`sandbox-model.md` § 1](./sandbox-model.md#1-trust-tiers) and
[`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)).
The effective tier is the **minimum** of the pack's own tier and
every transitive dependency's tier (see § 9).

| Tier | When |
| --- | --- |
| `canonical` | Signature valid AND `keyId` listed in [`canonical-packs.json`](../../resources/canonical-packs.json). Allowed in ranked play. |
| `community-signed` | Signature valid AND `keyId` listed in [`publisher-registry`](../../content-schema/schemas/publisher-registry.schema.json). Allowed in friendly play with a UI trust prompt; refused in ranked. |
| `sandboxed` | No signature, OR `signature.value` did not verify, OR a transitive dep is sandboxed/unsigned. Loaded with `sandboxed: true` enforced everywhere per [`pack-contract.md` § Sandbox enforcement](./pack-contract.md). |

A pack that fails `BAD_SIGNATURE`, `CANONICAL_MESSAGE_MISMATCH`,
`ASSET_DIGEST_MISMATCH`, `SIGNATURE_STRIPPED`, `REVOKED_KEY`, or
`ROTATION_PROOF_INVALID` is **refused entirely**, not downgraded to
sandboxed. Downgrading on a verifier failure would let the trust
prompt render "this pack is untrusted, install anyway?" on a pack
whose own author's signature was tampered with — a confusing UX
that smuggles attacker-chosen content past the user.

---

## 5. Mandatory / optional split

`manifest.schema.json` declares `signature` as an *optional* object.
The mandatory / optional split is enforced **at load time**, not at
schema time, so unsigned community packs remain schema-valid and
loadable from the editor, while canonical and ranked surfaces
refuse them:

| Surface | Required for | Refused on |
| --- | --- | --- |
| Editor / single-player | nothing | revoked key, malformed signature |
| Friendly multiplayer | nothing | revoked key, malformed signature |
| Ranked multiplayer | a valid signature on every loaded pack and every transitive dep | unsigned pack, sandboxed pack, trust-tier `community-signed` if the competitive surface excludes community-signed packs |

The match-handshake `signaturePolicy` enum (`optional` /
`required-friendly` / `required-ranked`) consumes this split — see
[`match-handshake.md`](./match-handshake.md) and
[`pack-contract.md` § Signature Policy](./pack-contract.md).

---

## 6. Trust-on-First-Use (TOFU) + stripping defense

Once a pack with `(packId, keyId = K)` has been installed, the local
[`trust-store`](../../content-schema/schemas/trust-store.schema.json)
records the `(packId, keyId, signaturePolicy = "required")`
binding. Subsequent installs of the same `packId` MUST present a
valid signature against `K` (or a key reachable via a valid
rotation chain — § 7). Specifically:

- An update of `packId` whose manifest **omits** `signature` is
  rejected with `SIGNATURE_STRIPPED`.
- An update whose `signature.keyId ≠ K` and which lacks a valid
  `rotationProof` is rejected with `UNKNOWN_KEY_ID`.

The trust store is per-installation and never synced. Bootstrap
(reset / wipe / new device) lets the user re-install any pack
without TOFU enforcement; once re-installed, the binding is
re-recorded.

---

## 7. Key rotation policy

A publisher rotates from `K1` to `K2` by issuing a manifest update
with:

- `keyId = K2` (the new key)
- `previousKeyId = K1` (the prior key)
- `rotationProof = Ed25519(K1, canonicalJson({ packId, newKeyId: K2, validFrom }))`
- `signature.value = Ed25519(K2, canonicalSignedMessage)` (current signed message)

The verifier accepts the update iff:

1. `signature.value` verifies against `K2` over the canonical
   signed message, AND
2. `rotationProof` verifies against `K1` over the rotation payload,
   AND
3. The trust store contains `(packId, K1)` from a prior install
   (or `K1` is itself reachable via a previously recorded rotation
   chain).

After successful verification, the trust store updates to
`(packId, K2)` and appends the rotation event to the
`rotationHistory` ring buffer per
[`trust-store.schema.json`](../../content-schema/schemas/trust-store.schema.json).

A rotation update where `signature.value` is valid but
`rotationProof` is missing or invalid is rejected with
`ROTATION_PROOF_INVALID`. A rotation update where
`previousKeyId = K0` but the trust store does not contain
`(packId, K0)` is rejected with `UNKNOWN_KEY_ID` — the chain must
be anchored to a previously trusted key.

---

## 8. Downgrade refuse

The pack loader compares the incoming `version` to the
trust-store-pinned `version` using SemVer. If `incoming <
installed`, the loader surfaces `DOWNGRADE_REFUSED` to the
trust-prompt UI. The user can explicitly confirm a downgrade; on
confirmation, the trust store records the downgrade in its audit
log and the install proceeds.

`manifest.schema.json` constrains `version` to a SemVer-comparable
pattern (`^\d+\.\d+\.\d+(-[a-z0-9.-]+)?$`), so the comparator is
unambiguous. Free-form versions (`"v1"`, `"latest"`, `"1.0"`) are
schema-rejected before the comparator runs.

---

## 9. Dependency trust propagation

A pack's effective trust tier is the minimum of its own tier and
every transitive dependency's tier:

```ts
effectiveTier = min(
  selfTier,
  ...transitiveDeps.map(d => verifyPackSignature(d).trustTier),
);
```

- A signed canonical parent with one unsigned dependency loads as
  `sandboxed`.
- A signed canonical parent with one revoked dependency is refused
  entirely (revocation is a stronger signal than sandbox).
- A signed canonical parent with one sandboxed dependency loads as
  `sandboxed`.
- A signed canonical parent whose dependencies are all signed
  canonical loads as `canonical`.

The pack-trust-prompt UI enumerates each transitive dependency's
trust tier and renders a "this pack depends on N unsigned / M
sandboxed packs" disclosure so the user can consent or refuse on a
per-graph basis.

---

## 10. Test fixtures and CI gate

The pack-signing CI gate (`npm run validate:pack-signing`) runs
golden tests against `content-schema/examples/pack-signing/` (owned
by the pack-signing-verifier task). The fixture set covers, at
minimum:

| Fixture | Expected outcome |
| --- | --- |
| `signed-canonical` | `ok: true, trustTier: "canonical"` |
| `signed-third-party` | `ok: true, trustTier: "community-signed"` |
| `unsigned-sandboxed` | `ok: true, trustTier: "sandboxed"` |
| `tampered-manifest` | `ok: false, reason: "BAD_SIGNATURE"` |
| `tampered-asset-index` | `ok: false, reason: "ASSET_DIGEST_MISMATCH"` |
| `revoked-key` | `ok: false, reason: "REVOKED_KEY"` |
| `unknown-key-id` | `ok: false, reason: "UNKNOWN_KEY_ID"` |
| `swapped-key-id-without-rotation-proof` | `ok: false, reason: "UNKNOWN_KEY_ID"` |
| `signature-stripped-after-tofu` | `ok: false, reason: "SIGNATURE_STRIPPED"` |
| `valid-rotation-K1-to-K2` | `ok: true, trustTier: <prior>` |
| `rotation-proof-invalid` | `ok: false, reason: "ROTATION_PROOF_INVALID"` |
| `downgrade-without-confirm` | `ok: false, reason: "DOWNGRADE_REFUSED"` |
| `dep-unsigned-taints-parent` | `ok: true, trustTier: "sandboxed"` |
| `dep-revoked-rejects-parent` | `ok: false, reason: "REVOKED_KEY"` |

Adding a new branch to the verifier requires adding a corresponding
fixture; the gate refuses `ok` outcomes that the fixture does not
declare.

The fixture name `signed-third-party` is preserved verbatim because
the owning task
[`tasks/mvp/02-content-schemas/44-pack-signing-verifier.md`](../../tasks/mvp/02-content-schemas/44-pack-signing-verifier.md)
enumerates it under acceptance criteria; the *outcome column* is the
load-bearing assertion and uses the canonical `community-signed`
tier name.

---

## 11. Cross-references

- [`pack-contract.md` § Trust Fields](./pack-contract.md) —
  schema-level declarations.
- [`pack-trust.md`](./pack-trust.md) — UI trust prompt copy.
- [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json)
  — closed wire/UI vocabulary; verifier's `reason` codes collapse
  to `INVALID_SIGNATURE` at the wire boundary per `crypto-rules.md`.
- [`build-attestation.md`](./build-attestation.md) — engine bundle
  attestation, a parallel construction over the engine binary.
- Owning task:
  [`tasks/mvp/02-content-schemas/44-pack-signing-verifier.md`](../../tasks/mvp/02-content-schemas/44-pack-signing-verifier.md).

---

## 🔍 Sync Check

- **UI: ✔** — Doc carries no UI surface of its own; the trust-tier
  output is consumed by screen 72 per
  [`pack-trust.md`](./pack-trust.md), and the
  `INVALID_SIGNATURE` / `SIGNATURE_DISABLED` wire codes match
  [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json).
- **Schema: ⚠** — Manifest fields (`signature`, `assetDigest`,
  `previousKeyId`, `rotationProof`, `signaturePolicy`) and the
  closed `trustTier` enum (`canonical | community-signed |
  sandboxed`) match
  [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json);
  `Manifest`, `PublisherRegistry`, `PackRevocationList`,
  `TrustStore`, and `SignatureError` rows all present in
  [`schema-matrix.md`](./schema-matrix.md). Rewrote four `thirdParty`
  → `community-signed` references inline (§ 4 trust-tier table,
  § 5 ranked refusal table, § 10 outcome column) to align with the
  schema. The `trust-store.schema.json` shape does not yet carry
  the `keyId`, `signaturePolicy`, or `rotationHistory` fields this
  doc references in §§ 6–7 — see `## ⚠ Issues`.
- **Tasks: ✔** — Owning task
  [`tasks/mvp/02-content-schemas/44-pack-signing-verifier.md`](../../tasks/mvp/02-content-schemas/44-pack-signing-verifier.md)
  exists at `mvp.02-content-schemas.44-pack-signing-verifier`,
  references this doc under Read First, and lists the matching
  fixture set under Outputs; `task-registry.json` row matches.

## ⚠ Issues

- **Trust-store schema does not yet carry the TOFU /
  rotation-history fields this doc binds to.** §§ 6–7 reference
  trust-store entries shaped as `(packId, keyId,
  signaturePolicy = "required")` plus a `rotationHistory` ring
  buffer, but
  [`trust-store.schema.json`](../../content-schema/schemas/trust-store.schema.json)
  currently only stores `(packId, contentHash, decision, scope,
  saveId, decidedAt)`. The pack-signing-verifier task
  [`tasks/mvp/02-content-schemas/44-pack-signing-verifier.md`](../../tasks/mvp/02-content-schemas/44-pack-signing-verifier.md)
  acceptance criteria (TOFU branch + rotation branch updates the
  ring buffer) requires the additive extension. Per
  [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md) (additive-first),
  the schema must grow optional `keyId`, `signaturePolicy`, and
  `rotationHistory[]` properties before the verifier can ship.
  Suggested values: `keyId: string` (re-use the
  `publisher-registry` keyId pattern), `signaturePolicy: "required"`
  (single-value enum at TOFU pin time), `rotationHistory: { from:
  string, to: string, validFrom: integer }[]`. Skill did not edit
  the schema (Hard Prohibition D).
- **`security-model.md` still uses the stale `thirdParty` tier
  name.**
  [`security-model.md`](./security-model.md) line 254 lists the
  trust-tier enum as `(canonical | thirdParty | sandboxed)`. The
  canonical schema and `sandbox-model.md` both use
  `community-signed`. Per the same enum-lifecycle rule the file
  needs an in-place update to `community-signed`, but the fix
  belongs to that doc's owner — out of scope here (Hard
  Prohibition D).
- **`pack-signing.md` is missing from `INDEX.md`.** The
  architecture index does not list this doc, even though every
  upstream owner (`pack-contract.md`, `crypto-rules.md`,
  `sandbox-model.md`, `manifest.schema.json`) back-points to it.
  Non-blocking, but the row should be added by whoever next edits
  [`INDEX.md`](./INDEX.md). Skill did not edit the index (Hard
  Prohibition D).
- **Fixture directory `content-schema/examples/pack-signing/` does
  not yet exist.** § 10 documents a 14-fixture set wired to
  `npm run validate:pack-signing`, but the directory is absent on
  disk — expected pre-implementation state for the planned task
  `mvp.02-content-schemas.44-pack-signing-verifier`. No action
  needed until that task starts.
- **Fixture name `signed-third-party` retains the stale tier
  spelling.** The fixture name is the load-bearing identifier in
  the owning task's acceptance criteria and in
  `task-registry.json`; renaming would cascade. The outcome column
  was rewritten to `community-signed`; the directory name is left
  as a tracked drift for the verifier task to rename when it lands
  (suggested: `signed-community-signed`). Skill did not rename the
  fixture (Hard Prohibition D + the directory does not yet exist).
