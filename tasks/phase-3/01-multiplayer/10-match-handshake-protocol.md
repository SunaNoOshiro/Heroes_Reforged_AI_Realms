# Match Handshake Protocol — Commit-Reveal Seed and Match Key

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Implement the three-phase commit-reveal handshake that runs as the
first DataChannel exchange of every M5 multiplayer match. Both
peers contribute equal entropy to the seed; both peers freeze and
exchange `(contentHash, engineHash, packManifestDigest,
bundleSha256, signaturePolicy)`; both peers derive `matchId` and
`matchKey` deterministically from the revealed nonces. Plan 26 §
Critical Fix 2.

Read First:
- [`docs/architecture/match-handshake.md`](../../../docs/architecture/match-handshake.md)
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)
- [`docs/architecture/build-attestation.md`](../../../docs/architecture/build-attestation.md)
- [`content-schema/schemas/match-handshake.schema.json`](../../../content-schema/schemas/match-handshake.schema.json)

Inputs:
- WebRTC DataChannel from
  [Task 02](./02-webrtc-peer-connection-plus-datachannel-setup.md).
- Pack manifest + content hash + engine hash + build attestation
  surface.
- Build-attestation allow-list at
  `services/signaling/config/build-attestation.allow.example.json`
  (placeholder; production keys provisioned separately).

Outputs:
- `content-schema/schemas/match-handshake.schema.json` — discriminated
  union of `COMMIT | REVEAL | ACCEPT | ABORT`.
- `content-schema/examples/match-handshake/*.json` — canonical
  example for every phase + several abort reasons.
- `src/net/lockstep/handshake.ts` — `runHandshake(channel,
  localContext) → { ok, seed, matchId, matchKey, matchEpoch } |
  { ok: false, reason }`.
- `src/content-runtime/manifest-digest.ts` — pinned canonical-JSON
  xxh64 over `manifest.json`.
- Schema-shape validation of every example fixture is provided by
  the existing repo-contracts gate (`npm run validate:contracts`)
  via the `.match-handshake.json` suffix mapping in
  `scripts/check-repo-contracts.mjs`. The owning task adds
  per-implementation golden tests under `src/net/lockstep/__tests__/`
  for the derivation rules (`seed`, `matchId`, `matchKey`) and
  for every abort-reason path.

Owned Paths:
- `content-schema/schemas/match-handshake.schema.json`
- `content-schema/examples/match-handshake/`
- `src/net/lockstep/handshake.ts`
- `src/content-runtime/manifest-digest.ts`
- `docs/architecture/match-handshake.md`

Dependencies:
- phase-3.01-multiplayer.02-webrtc-peer-connection-plus-datachannel-setup
- phase-3.01-multiplayer.13-security-model-and-doctrine
- phase-3.01-multiplayer.15-pack-signature-and-build-attestation-policy

Acceptance Criteria:
- Both peers running the same `(contentHash, engineHash,
  packManifestDigest, bundleSha256, signaturePolicy)` derive the
  same `seed`, `matchId`, and `matchKey` regardless of which side
  acted as host.
- Lexicographic `peerId` order on the nonce concatenation
  guarantees byte-stable seed / matchId / matchKey.
- A REVEAL whose `xxh64(reveal-fields)` does not equal the
  previously sent `commit` triggers `ABORT { reason: COMMIT_MISMATCH }`.
- Disagreement on any of the pinned values triggers the matching
  abort reason from the schema enum.
- `signaturePolicy = "required-ranked"` with a missing
  `packSignature` triggers `PACK_SIGNATURE_REQUIRED`.
- `bundleSha256` outside the allow-list while ranked triggers
  `BUILD_ATTESTATION_MISMATCH`; friendly mode warns only.
- Any phase exceeding `HANDSHAKE_PHASE_TIMEOUT_MS = 10_000`
  triggers `HANDSHAKE_TIMEOUT`.
- `runHandshake` is the only entry point that produces
  `matchKey`; the value is a non-extractable `CryptoKey` and is
  never logged or re-emitted on the wire.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
