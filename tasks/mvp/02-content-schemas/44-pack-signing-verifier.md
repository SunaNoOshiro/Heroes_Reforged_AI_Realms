# Pack-Signing Verifier — Canonical Message + Six-Step Pipeline

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Author the `pack-signing.md` doctrine and implement the verifier
that consumes it. The verifier is a pure function over a parsed
manifest plus the publisher registry, revocation list, and trust
store; it returns either a trust tier or a closed rejection
reason. This task closes Plan 27 § Critical Fix 2 and registers
the canonical-message tool both signers and verifiers consume.

Read First:
- [`docs/architecture/pack-signing.md`](../../../docs/architecture/pack-signing.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/crypto-rules.md`](../../../docs/architecture/crypto-rules.md)
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
- [`content-schema/schemas/manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json)
- [`content-schema/schemas/publisher-registry.schema.json`](../../../content-schema/schemas/publisher-registry.schema.json)
- [`content-schema/schemas/pack-revocation-list.schema.json`](../../../content-schema/schemas/pack-revocation-list.schema.json)
- [`content-schema/schemas/trust-store.schema.json`](../../../content-schema/schemas/trust-store.schema.json)

Inputs:
- Parsed `manifest.json` from a pack archive.
- Publisher registry (known-good keys).
- Pack revocation list (revoked content hashes / keys).
- Trust store (per-installation TOFU bindings).

Outputs:
- `docs/architecture/pack-signing.md` (already authored at
  task-creation time; this task owns its evolution).
- `src/content-runtime/signature-verifier.ts` — pure function
  `verifyPackSignature(manifest, publisherRegistry, revocationList, trustStore) → { ok, trustTier | reason }`.
- `tools/scripts/canonical-pack-message.ts` — CLI that prints the
  canonical-JSON of the signed message and (with `--sign <keyfile>`)
  emits the corresponding `signature.value`. Used by both signers
  and the CI golden-test rebuilder.
- `content-schema/examples/pack-signing/` — fixture set covering
  every branch of the verifier:
  `signed-canonical`, `signed-third-party`, `unsigned-sandboxed`,
  `tampered-manifest`, `tampered-asset-index`, `revoked-key`,
  `unknown-key-id`, `swapped-key-id-without-rotation-proof`,
  `signature-stripped-after-tofu`, `valid-rotation-K1-to-K2`,
  `rotation-proof-invalid`, `downgrade-without-confirm`,
  `dep-unsigned-taints-parent`, `dep-revoked-rejects-parent`.
- `scripts/check-pack-signing.mjs` — golden test runner; asserts
  every fixture maps to the expected outcome.

Owned Paths:
- `docs/architecture/pack-signing.md`
- `src/content-runtime/signature-verifier.ts`
- `tools/scripts/canonical-pack-message.ts`
- `content-schema/examples/pack-signing/`
- `scripts/check-pack-signing.mjs`

Owned Paths (shared):
- `content-schema/schemas/manifest.schema.json` — Plan 27
  contributes the `assetDigest`, `previousKeyId`, `rotationProof`,
  `signaturePolicy` fields and the tightened `signature.value`
  pattern. Contributions are additive only — pre-existing
  required-field semantics must not be rewriting (no rewrite, no relax) or relaxed. The
  schema *file* is owned by
  [`tasks/mvp/02-content-schemas/38-manifest-ai-provenance-and-capabilities-default.md`](./38-manifest-ai-provenance-and-capabilities-default.md);
  primary owner of the manifest schema is task 38.

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas
- mvp.02-content-schemas.29-publisher-registry-schema
- mvp.02-content-schemas.30-pack-revocation-list-schema
- mvp.02-content-schemas.31-trust-store-schema

Acceptance Criteria:
- The verifier consumes the canonical-message bytes produced by
  `tools/scripts/canonical-pack-message.ts`; it never re-derives
  them from a tampered manifest.
- Comparison uses `globalThis.crypto.subtle.verify('Ed25519', …)`;
  no `node:crypto` import in the deterministic engine path.
- The six-step pipeline (archive-integrity → parser-hardening →
  schema-parse → signature-verify → publisher-registry lookup →
  asset extraction) is wired into the pack-load surface in
  `src/content-runtime/`.
- Every fixture in `content-schema/examples/pack-signing/` produces
  the expected `{ ok, trustTier | reason }` outcome under
  `npm run validate:pack-signing`; the gate is wired into
  `npm run validate`.
- The TOFU branch consults
  [`trust-store.schema.json`](../../../content-schema/schemas/trust-store.schema.json)
  and rejects `SIGNATURE_STRIPPED` when a previously-signed pack
  presents unsigned.
- The rotation branch verifies `rotationProof` against
  `previousKeyId` and updates the trust-store's `rotationHistory`
  ring buffer.
- Dependency Trust Propagation (Plan 27 Improvement) reduces a
  signed parent's tier to the minimum of its own tier and every
  transitive dependency's tier.
- The verifier does **not** distinguish "wrong key" from "no such
  key" at the wire / UI surface; both collapse to
  `INVALID_SIGNATURE` per
  [`crypto-rules.md`](../../../docs/architecture/crypto-rules.md).
- The shared-ownership additions to `manifest.schema.json` are
  strictly additive; pre-existing required-field semantics must not
  be subject to any rewrite or relaxation. Primary owner of the
  manifest schema is
  [`tasks/mvp/02-content-schemas/38-manifest-ai-provenance-and-capabilities-default.md`](./38-manifest-ai-provenance-and-capabilities-default.md).

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
