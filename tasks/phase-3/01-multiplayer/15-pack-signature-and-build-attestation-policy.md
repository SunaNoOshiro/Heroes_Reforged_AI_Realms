# Pack Signature Mandate and Engine-Build Attestation

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Make pack signatures **required** for ranked-style multiplayer
matches and add an engine-bundle attestation field to the match
handshake. Hosts the canonical doctrine
([`build-attestation.md`](../../../docs/architecture/build-attestation.md)),
the signaling-side allow-list example, and the CI gate that keeps
the allow-list well-formed. System Improvements / Data
Contracts.

Read First:
- [`docs/architecture/build-attestation.md`](../../../docs/architecture/build-attestation.md)
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
- [`docs/architecture/match-handshake.md`](../../../docs/architecture/match-handshake.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`content-schema/schemas/manifest.schema.json`](../../../content-schema/schemas/manifest.schema.json)
- [`content-schema/schemas/match-handshake.schema.json`](../../../content-schema/schemas/match-handshake.schema.json)

Inputs:
- the signing-key trust list (signaling-side configuration).
- Pack contract `signature` field (currently optional).
- Match handshake REVEAL phase fields.

Outputs:
- `docs/architecture/build-attestation.md` — canonical doctrine.
- `services/signaling/config/build-attestation.allow.example.json`
  — placeholder allow-list shape for operators.
- `pack-contract.md` extension: `signaturePolicy` field with
  enum `optional | required-friendly | required-ranked`; default
  `optional`.
- `manifest.schema.json` extension: pin `signature.scheme` to
  `ed25519`; pin `signature.keyId` format.
- `scripts/check-build-attestation.mjs` — CI gate that
  schema-validates the allow-list, verifies entry signatures
  against listed trust anchors, and refuses any commit that
  appears to embed a real signing key.
- `npm run validate:build-attestation` script wired into
  `npm run validate`.

Owned Paths:
- `docs/architecture/build-attestation.md`
- `services/signaling/config/build-attestation.allow.example.json`
- `scripts/check-build-attestation.mjs`

Dependencies:
- phase-3.01-multiplayer.13-security-model-and-doctrine

Acceptance Criteria:
- `signaturePolicy` defaults to `optional` for friendly play.
- Ranked play sets `signaturePolicy = required-ranked`; the
  match handshake rejects unsigned packs and `sandboxed: true`
  packs at the REVEAL phase per
  [`match-handshake.md`](../../../docs/architecture/match-handshake.md)
  § 5.
- A `bundleSha256` outside the canonical allow-list while ranked
  triggers `BUILD_ATTESTATION_MISMATCH` ABORT.
- Friendly mode warns only; the screen-77 `BuildAttestationBanner`
  renders the warning copy from
  [`build-attestation.md`](../../../docs/architecture/build-attestation.md)
  § 5.
- `scripts/check-build-attestation.mjs` schema-validates
  `services/signaling/config/build-attestation.allow.example.json`
  and verifies that every `bundles[].signature` matches the
  listed `trustAnchors[].publicKey` for `signedBy`.
- The CI gate refuses any commit that adds a `trustAnchors[]`
  entry whose `publicKey` matches any other repo file (defends
  against accidentally committing a real signing key).

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
