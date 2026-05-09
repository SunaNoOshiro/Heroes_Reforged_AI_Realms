# Pack Signing — Canonical Message, Verification Order, Trust Propagation

>
> Crypto primitives in use here (Ed25519 pack signature; xxh64
> manifest digest over canonical-JSON) are catalogued in
> [`crypto-primitives.md`](./crypto-primitives.md).

Canonical doctrine for the Ed25519 signature carried by every signed
content pack. This document fills the gap that
[`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
leaves open: the schema declares
`signature.scheme = "ed25519"`, `keyId`, and `value`, but does not
specify **what canonical bytes are signed** or **when in the pack-load
pipeline the signature is verified**. Both gaps are closed here.

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
  across rotation states. Removing the field on the unsigned-rotation
  side would change the canonical bytes and invalidate the signature.
- **`assetDigest`** is xxh64 of the canonical-JSON of
  `assets/index.json`. Because the asset index already carries a
  per-file SHA-256 (per
  [`asset-index.schema.json`](../../content-schema/schemas/asset-index.schema.json)),
  the asset digest transitively binds every binary asset to the
  signature. A swapped sprite changes its row's `sha256`, which
  changes the canonical-JSON of `assets/index.json`, which changes
  `assetDigest`, which invalidates the Ed25519 signature.
- **Dependencies are listed by ID + version range** — the same
  shape declared in `manifest.schema.json`. Re-ordering the
  declared dependencies list re-orders the signed message and
  invalidates the signature.

This decouples **ZIP byte determinism** (hard) from **signature
verifiability** (easy). Whole-archive signing is explicitly NOT used;
[`reproducible-archive.md`](./reproducible-archive.md) is a separate
property used by third-party auditors who want to rebuild and
re-verify a canonical pack end-to-end.

The CLI that produces the canonical-message bytes for signing /
golden tests is `tools/scripts/canonical-pack-message.ts` (owned by
the pack-signing-verifier task). Two pieces of code MUST NOT
re-derive the canonical message independently — both signer and
verifier consume the same module.

---

## 2. Verification order

The pack loader runs **six** gates in the order below. Each gate
either passes its output forward or refuses the load with a closed
reason. Reordering breaks the threat model — see section 3.

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
                              canonical | thirdParty | sandboxed)
6. asset extraction          (each asset's SHA-256 verified before
                              the bytes are exposed to the renderer
                              or audio engine; rejects on mismatch)
```

`src/content-runtime/` is the module that owns this pipeline, per
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
  | { ok: true, trustTier: "canonical" | "thirdParty" | "sandboxed" }
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
runtime-requirements.md pins the Web Crypto floor. Constant-time
comparison is mandatory per
[`crypto-rules.md`](./crypto-rules.md) § 1; the verifier MUST NOT
short-circuit on the first byte difference.

---

## 3. What goes wrong if you reorder

- **Run schema-parse before signature-verify on a tampered
  manifest.** A hostile actor crafts a manifest whose schema-valid
  but path-traversal-laden `assets/index.json` exercises a parser
  bug or directory-escape during asset extraction. Mitigation: the
  signature-verify gate (step 4) runs before any asset extraction
  (step 6); a tampered manifest fails signature verify and the
  archive is unmounted before its contents are exposed.
- **Run signature-verify before parser-hardening.** A 1 GB
  uncompressed manifest exhausts memory before the verifier ever
  runs. Mitigation: parser-hardening (step 2) refuses oversized
  input before the verifier ever sees it.
- **Run asset-extraction before signature-verify.** Path-traversal
  in asset paths (`../../etc/passwd`) is a known attack surface;
   raised it. Mitigation: asset extraction (step 6)
  is the **last** step. Even if `assets/index.json` declares a
  hostile path, the signature gate has already accepted only a
  manifest whose `assetDigest` matches the canonical-JSON of the
  asset index — and the asset index's `path` schema rejects
  absolute schemes / leading slashes / parent-directory escapes
  by `pattern` constraint.

---

## 4. Trust tiers

The verifier returns one of three trust tiers. The trust tier is
the **minimum** of the pack's own tier and every transitive
dependency's tier (Dependency Trust Propagation, section 7).

| Tier | When |
| --- | --- |
| `canonical` | Signature valid AND `keyId` listed in [`canonical-packs.json`](../../resources/canonical-packs.json). Allowed in ranked play. |
| `thirdParty` | Signature valid AND `keyId` listed in [`publisher-registry`](../../content-schema/schemas/publisher-registry.schema.json). Allowed in friendly play with a UI trust prompt; refused in ranked. |
| `sandboxed` | No signature, OR `signature.value` did not verify, OR a transitive dep is sandboxed/unsigned. Loaded with `sandboxed: true` enforced everywhere per [`pack-contract.md` § Sandbox enforcement](./pack-contract.md). |

A pack that fails `BAD_SIGNATURE`, `CANONICAL_MESSAGE_MISMATCH`,
`ASSET_DIGEST_MISMATCH`, `SIGNATURE_STRIPPED`, `REVOKED_KEY`, or
`ROTATION_PROOF_INVALID` is **refused entirely**, not downgraded to
sandboxed; downgrading on a verifier failure would let the trust
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
| Ranked multiplayer | a valid signature on every loaded pack and every transitive dep | unsigned pack, sandboxed pack, trust-tier `thirdParty` if competitive surface excludes third-party |

The match-handshake `signaturePolicy` enum (`optional` /
`required-friendly` / `required-ranked`) consumes this split — see
[`match-handshake.md`](./match-handshake.md) and
[`pack-contract.md` § Signature Policy](./pack-contract.md).

---

## 6. Trust-on-First-Use (TOFU) + Stripping defense

Once a pack with `(packId, keyId = K)` has been installed, the local
[`trust-store`](../../content-schema/schemas/trust-store.schema.json)
records the `(packId, keyId, signaturePolicy = "required")`
binding. Subsequent installs of the same `packId` MUST present a
valid signature against `K` (or a key reachable via a valid
rotation chain — section 7). Specifically:

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

1. `signature.value` verifies against `K2` over the canonical signed
   message, AND
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

The pack loader compares the incoming `version` to the trust-store-
pinned `version` using SemVer. If `incoming < installed`, the
loader surfaces `DOWNGRADE_REFUSED` to the trust-prompt UI. The
user can explicitly confirm a downgrade; on confirmation, the
trust store records the downgrade in its audit log and the install
proceeds.

`manifest.schema.json` constrains `version` to a SemVer-comparable
pattern (`^\d+\.\d+\.\d+(-[a-z0-9.-]+)?$`), so the comparator is
unambiguous. Free-form versions (`"v1"`, `"latest"`, `"1.0"`) are
schema-rejected —.

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
sandboxed packs" disclosure so the user can consent or refuse
on a per-graph basis.

---

## 10. Test fixtures and CI gate

The pack-signing CI gate (`npm run validate:pack-signing`) runs
golden tests against `content-schema/examples/pack-signing/` (owned
by the pack-signing-verifier task). The fixture set covers, at
minimum:

| Fixture | Expected outcome |
| --- | --- |
| `signed-canonical` | `ok: true, trustTier: "canonical"` |
| `signed-third-party` | `ok: true, trustTier: "thirdParty"` |
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

---

## 11. Cross-references

- [`pack-contract.md` § Trust Fields](./pack-contract.md) — schema-level
  declarations.
- [`pack-trust.md`](./pack-trust.md) — UI trust prompt copy.
- [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json) —
  closed wire/UI vocabulary; verifier's `reason` codes collapse to
  `INVALID_SIGNATURE` at the wire boundary per `crypto-rules.md`.
- [`build-attestation.md`](./build-attestation.md) — engine bundle
  attestation, a parallel construction over the engine binary.
- Owning task:
  [`tasks/mvp/02-content-schemas/44-pack-signing-verifier.md`](../../tasks/mvp/02-content-schemas/44-pack-signing-verifier.md).
