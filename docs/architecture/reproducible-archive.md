# Reproducible `.hrmod` Archive Contract

Pin byte-stable `.hrmod` ZIPs so a third-party auditor can rebuild a
canonical pack from source and confirm it byte-matches the published
artifact. The canonical-JSON serializer already makes `contentHash`
reproducible; this contract extends that property to the ZIP bytes
themselves.

This contract is **separate** from
[`pack-signing.md`](./pack-signing.md). Pack signing operates on the
canonical-JSON of the manifest plus an `assetDigest`, not on ZIP
bytes (see [`pack-signing.md` § 1](./pack-signing.md#1-canonical-signed-message)).
The reproducible-archive contract supports a different verification
flow: re-derive the published artifact end-to-end.

Companion docs:

- [`pack-contract.md`](./pack-contract.md) — pack layout and the
  `.hrmod` archive rule.
- [`pack-signing.md`](./pack-signing.md) — what is signed (manifest +
  asset digest), **not** whole-archive bytes.
- [`atlas-pipeline.md`](./atlas-pipeline.md) — analogous determinism
  contract for binary art.
- [`build-attestation.md`](./build-attestation.md) — analogous
  determinism contract for the engine bundle.

---

## 1. ZIP determinism rules

Every published canonical pack is produced by
`tools/scripts/build-pack.ts` with these properties pinned:

| Property | Value |
| --- | --- |
| Entry order | lexicographic ascending by full path inside the archive |
| Entry timestamps | all set to the ZIP epoch `1980-01-01T00:00:00Z` |
| Compression method | DEFLATE level 6 (default), no `store` mixing |
| Extra-fields blocks | empty (no UTF-8 path extra, no Unix-extended-timestamp extra) |
| External attributes | `0o644` for files, `0o755` for directories |
| Central-directory order | identical to entry order |
| Encoding | UTF-8 (mandatory in modern ZIP; we never write the deprecated CP-437 fallback) |

A `.hrmod` produced under these rules is byte-stable across any
machine that runs the canonical build script with the same input
tree. Any drift in entry order, timestamps, compression level, or
extra fields produces a different `archiveHash` (SHA-256 over the
full ZIP bytes) and the audit fails.

---

## 2. `signedBuild.json` artifact

Every canonical pack release ships a sibling `signedBuild.json` that
records the expected build output:

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

`signedBuild.json` is **not** a pack record. It lives next to the
`.hrmod` in the publish output, never inside it — putting it inside
the archive would change the archive bytes (chicken-and-egg).

### Third-party verification

1. Clone the canonical pack source (or build it from
   [`resources/packs/<id>/`](../../resources/packs/)).
2. Run the canonical builder at the pinned `builderToolVersion`.
3. Confirm the produced `.hrmod` SHA-256 equals
   `signedBuild.json:archiveHash`.
4. Confirm the produced manifest's canonical signed message bytes
   equal `signedBuild.json:signedCanonicalMessage`.
5. Confirm the Ed25519 verify of `signedBuild.json:signature` under
   `signedBuild.json:keyId` passes against the canonical message
   bytes.

A failure at any step indicates either (a) the published artifact
was not built by the canonical builder, or (b) the canonical builder
is no longer deterministic. Both are CI-blocking conditions.

---

## 3. CI gate

`npm run validate:reproducible-archive` (owned by the
reproducible-archive task) re-builds every canonical pack fixture
under `resources/packs/` and confirms:

- Each produced `.hrmod` SHA-256 matches the `archiveHash` recorded
  in the corresponding `signedBuild.json`.
- Each produced manifest's canonical signed message matches the
  recorded `signedCanonicalMessage`.
- The Ed25519 verify against the recorded `keyId` and `signature`
  passes.

Any failure refuses the merge.

---

## 4. What this contract does not pin

- **Inner record bytes.** Per-record canonical-JSON is owned by the
  canonical serializer (engine module, used by every record-emitting
  surface). This contract assumes that property is already in place
  and adds determinism only at the ZIP packing layer.
- **Atlas pixel bytes.** Atlas determinism is owned by
  [`atlas-pipeline.md`](./atlas-pipeline.md). This contract pulls
  atlas outputs as opaque bytes; whether two machines produce the
  same atlas bytes is the atlas pipeline's contract.
- **Signing.** The Ed25519 signature is produced by the publisher's
  signing key. `signedBuild.json` records it but cannot recompute it
  without the private key. Third parties verify the signature; they
  do not re-sign.

---

## 5. Cross-references

The companion-docs block above links the four sibling architecture
docs. Anchored deep-links and the owning-task pointer:

- [`pack-contract.md` § Archive Rule](./pack-contract.md#archive-rule) —
  `.hrmod` format.
- [`pack-signing.md` § 1 Canonical signed message](./pack-signing.md#1-canonical-signed-message) —
  what is signed (NOT the archive bytes).
- Owning task:
  [`tasks/mvp/02-content-schemas/45-reproducible-archive.md`](../../tasks/mvp/02-content-schemas/45-reproducible-archive.md).

---

## 🔍 Sync Check

- **UI: ✔** — Doc carries no UI surface. The verification flow is a
  CLI / CI concern; `signedBuild.json` is published metadata, not a
  runtime state slice, so there is no screen package or
  `data-inventory.md` row to sync against.
- **Schema: ⚠** — `manifest.signature.value` (128 hex chars) and the
  canonical-message shape match
  [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
  and [`pack-signing.md` § 1](./pack-signing.md#1-canonical-signed-message).
  The `signedBuild.json` shape itself is documented inline only;
  there is no `signed-build.schema.json` in `content-schema/schemas/`
  yet, and no row in
  [`schema-matrix.md`](./schema-matrix.md). Pre-implementation state
  for the planned owning task — see `## ⚠ Issues`.
- **Tasks: ✔** — Owning task
  [`tasks/mvp/02-content-schemas/45-reproducible-archive.md`](../../tasks/mvp/02-content-schemas/45-reproducible-archive.md)
  (`mvp.02-content-schemas.45-reproducible-archive`, status
  `planned`) lists this doc under Read First and as the first Owned
  Path; depends on
  `mvp.02-content-schemas.44-pack-signing-verifier`. The matching
  `task-registry.json` row exists at lines 7757-7798. Inbound
  back-links from `pack-contract.md` § Reproducible Archive and
  `pack-signing.md` § 1 / Companion Docs both resolve.

## ⚠ Issues

- **`signedBuild.json` schema and CI script are not yet on disk.**
  This doc references `tools/scripts/build-pack.ts`,
  `tools/lint/reproducible-archive.ts`,
  `scripts/check-reproducible-archive.mjs`, and
  `npm run validate:reproducible-archive`; none exist yet, and there
  is no `signed-build.schema.json` in `content-schema/schemas/`.
  Expected pre-implementation state — all four artifacts are listed
  under the planned task's Outputs / Owned Paths
  ([`tasks/mvp/02-content-schemas/45-reproducible-archive.md`](../../tasks/mvp/02-content-schemas/45-reproducible-archive.md)),
  and the dependency
  `mvp.02-content-schemas.44-pack-signing-verifier` is also still
  planned. No action until that task starts. Per
  [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md) and the
  CLAUDE.md root contract, the task implementer should also add a
  matching row to
  [`schema-matrix.md`](./schema-matrix.md) when shipping the schema.
- **`reproducible-archive.md` is missing from
  [`INDEX.md`](./INDEX.md).** The architecture index does not list
  this doc, even though `pack-contract.md` § Reproducible Archive
  and `pack-signing.md` § 1 both back-point to it. Non-blocking, but
  the row should be added by whoever next edits `INDEX.md` (parallel
  to the same gap flagged in
  [`pack-signing.md`](./pack-signing.md)). Skill did not edit the
  index (Hard Prohibition D).
