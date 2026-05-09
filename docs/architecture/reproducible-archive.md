# Reproducible `.hrmod` Archive Contract

Canonical doctrine for byte-stable `.hrmod` ZIP archives. The
canonical-JSON contract makes `contentHash` reproducible by any
party that runs the same serializer; this document extends that
property to the `.hrmod` ZIP bytes themselves so a third-party
auditor can rebuild a canonical pack from source and confirm it
byte-matches the published artifact.

This contract is **separate** from
[`pack-signing.md`](./pack-signing.md): pack signing operates on
the canonical-JSON of the manifest plus an `assetDigest`, not on
ZIP bytes. The reproducible-archive contract supports a different
verification flow — re-derive the published artifact end-to-end.

Companion docs:
- [`pack-contract.md`](./pack-contract.md) — pack layout.
- [`pack-signing.md`](./pack-signing.md) — what is signed (manifest +
  asset digest, NOT whole archive).
- [`atlas-pipeline.md`](./atlas-pipeline.md) — deterministic atlas
  packer; analogous determinism contract for binary art.
- [`build-attestation.md`](./build-attestation.md) — engine bundle
  attestation; analogous contract for the engine binary.

---

## 1. ZIP determinism rules

Every published canonical pack is produced by a canonical
build script (`tools/scripts/build-pack.ts`) that pins:

| Property | Value |
| --- | --- |
| Entry order | lexicographic ascending by full path inside the archive |
| Entry timestamps | all set to the ZIP epoch `1980-01-01T00:00:00Z` |
| Compression method | DEFLATE level 6 (default), no `store` mixing |
| Extra-fields blocks | empty (no UTF-8 path extra, no Unix-extended-timestamp extra) |
| External attributes | `0o644` for files, `0o755` for directories |
| Central-directory order | identical to entry order |
| Encoding | UTF-8 (mandatory in modern ZIP; we never write the deprecated CP-437 fallback) |

A `.hrmod` produced by following the rules above is byte-stable
across any machine that runs the canonical build script with the
same input tree. Any drift in entry order, timestamps, compression
level, or extra fields produces a different `archiveHash` (SHA-256
over the full ZIP bytes) and the audit fails.

---

## 2. `signedBuild.json` artifact

Every canonical pack release ships a sibling
`signedBuild.json` that records the expected build output:

```json
{
  "schemaVersion": 1,
  "packId": "core_baseline",
  "version": "1.0.0",
  "archiveHash": "<sha256 of the .hrmod bytes>",
  "signedCanonicalMessage": "<canonical-JSON of the pack-signing.md § 1 message>",
  "signature": "<128 hex chars; matches manifest.signature.value>",
  "keyId": "<matches manifest.signature.keyId>",
  "builtAt": 1700000000,
  "builderToolVersion": "1.0.0"
}
```

Third-party verification:

1. Clone the canonical pack source (or build it from
   [`resources/packs/<id>/`](../../resources/packs/)).
2. Run the canonical builder at the pinned `builderToolVersion`.
3. Confirm the produced `.hrmod` SHA-256 equals
   `signedBuild.json:archiveHash`.
4. Confirm the produced manifest's canonical signed message bytes
   equal `signedBuild.json:signedCanonicalMessage`.
5. Confirm the Ed25519 verify of `signedBuild.json:signature`
   under `signedBuild.json:keyId` passes against the canonical
   message bytes.

A failure at any step indicates either (a) the published artifact
was not built by the canonical builder, or (b) the canonical
builder is no longer deterministic — both are CI-blocking
conditions.

`signedBuild.json` is **not** a pack record. It lives next to the
`.hrmod` in the publish output, never inside it. Putting it inside
the archive would change the archive bytes (chicken-and-egg).

---

## 3. CI gate

`npm run validate:reproducible-archive` (owned by the
reproducible-archive task) re-builds every canonical pack fixture
under `resources/packs/` and confirms:

- Each produced `.hrmod` SHA-256 matches the `archiveHash` recorded
  in the corresponding `signedBuild.json`.
- Each produced manifest's canonical signed message matches the
  `signedCanonicalMessage` recorded.
- The Ed25519 verify against the recorded `keyId` and `signature`
  passes.

If any of those fail, the gate refuses to merge.

---

## 4. What this contract does not pin

- **Inner record bytes.** Per-record canonical-JSON is owned by the
  canonical serializer (engine module, used by every record-emitting
  surface). The reproducible-archive contract assumes that property
  is already in place; it adds determinism only at the ZIP packing
  layer.
- **Atlas pixel bytes.** Atlas determinism is owned by
  [`atlas-pipeline.md`](./atlas-pipeline.md). The reproducible-archive
  contract pulls atlas outputs as opaque bytes; whether two machines
  produce the same atlas bytes is the atlas pipeline's contract.
- **Signing.** The Ed25519 signature is produced by the publisher's
  signing key — `signedBuild.json` records it but cannot recompute
  it without the private key. Third parties verify the signature;
  they do not re-sign.

---

## 5. Cross-references

- [`pack-contract.md` § Archive Rule](./pack-contract.md) — `.hrmod`
  format.
- [`pack-signing.md` § 1 Canonical signed message](./pack-signing.md) —
  what is signed (NOT the archive bytes).
- [`atlas-pipeline.md`](./atlas-pipeline.md) — analogous determinism
  for binary art.
- [`build-attestation.md`](./build-attestation.md) — analogous
  determinism for the engine bundle.
- Owning task:
  [`tasks/mvp/02-content-schemas/45-reproducible-archive.md`](../../tasks/mvp/02-content-schemas/45-reproducible-archive.md).
