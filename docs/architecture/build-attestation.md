# Build Attestation (Plan 26 — Improvement)

> Source plan:
> [`docs/implementation-plans/26-replay-tampering-and-simulation-cheating-plan.md`](../implementation-plans/26-replay-tampering-and-simulation-cheating-plan.md)
> § System Improvements / Data Contracts / Pack signature mandate +
> engine-build attestation.

Canonical doctrine for the engine-bundle attestation that runs at
the multiplayer handshake. Closes the engine-binary swap window
that
[`determinism.md`](./determinism.md)'s `engineHash` field
acknowledges but does not prove without a signed authority.

Owning task:
[`tasks/phase-3/01-multiplayer/15-pack-signature-and-build-attestation-policy.md`](../../tasks/phase-3/01-multiplayer/15-pack-signature-and-build-attestation-policy.md).

Companion docs:
[`security-model.md`](./security-model.md),
[`match-handshake.md`](./match-handshake.md),
[`pack-contract.md`](./pack-contract.md).

---

## 1. Why attestation?

`engineHash` is computed locally over the engine's
determinism-relevant identity. A peer running a doctored engine can
compute and present **the canonical `engineHash`** while their actual
runtime differs — for example, by patching the AI search to use
hidden information, or by biasing edge-case RNG draws that are
unlikely to fire in the per-turn-hash sample window.

Attestation adds an **external authority**: the canonical engine
bundle is built by CI from a tagged commit, and the build output
emits an `ed25519` signature over `(engineHash, bundleSha256,
buildCommitSha)`. Both peers exchange `bundleSha256` at the
handshake; ranked play rejects any bundle outside the canonical
allow-list.

---

## 2. Canonical bundle production

The canonical engine bundle is built by the GitHub Actions workflow
that ships with [`tasks/phase-3/01-multiplayer/15-pack-signature-and-build-attestation-policy.md`](../../tasks/phase-3/01-multiplayer/15-pack-signature-and-build-attestation-policy.md).
Pinned identity:

```text
engineHash      = xxh64( canonical-bytes( deterministic engine surface ) )
bundleSha256    = SHA-256( built bundle bytes )
buildCommitSha  = git rev-parse HEAD at build time
attestation.sig = ed25519.sign( signingKey,
                                "build-attestation-v1" || engineHash ||
                                bundleSha256 || buildCommitSha )
```

The signing key is held by maintainers, **not** committed to the
repo. The public key list is distributed to peers via the
signaling-side configuration:

```
services/signaling/config/build-attestation.allow.json
```

shipped alongside Plan 25's signaling configuration surface. The
example file lives at
`services/signaling/config/build-attestation.allow.example.json` and
is the placeholder schema for operators.

---

## 3. Allow-list shape

```jsonc
{
  "schemaVersion": 1,
  "trustAnchors": [
    {
      "keyId": "hr-engine-2026-q1",
      "scheme": "ed25519",
      "publicKey": "<32 hex bytes>"
    }
  ],
  "bundles": [
    {
      "bundleSha256": "<64 hex chars>",
      "engineHash":   "<16 hex chars>",
      "buildCommitSha":"<40 hex chars>",
      "signature":    "<128 hex chars>",
      "signedBy":     "hr-engine-2026-q1",
      "validFrom":    "2026-01-01T00:00:00Z",
      "validUntil":   "2026-12-31T23:59:59Z"
    }
  ]
}
```

The allow-list is loaded by both peers from the signaling-server
configuration (it is fetched, not implicit). Peers that cannot
fetch the list (offline lobby) treat ranked play as unavailable
and surface "Ranked play unavailable: bundle attestation not
available" per
[`docs/architecture/wiki/screens/77-multiplayer-game/`](./wiki/screens/77-multiplayer-game/).

---

## 4. Handshake enforcement

The match handshake REVEAL phase (per
[`match-handshake.md`](./match-handshake.md)) carries
`bundleSha256` and `engineHash`. After both REVEALs are exchanged:

| Mode | Behavior |
| --- | --- |
| **Ranked** (`signaturePolicy = "required-ranked"`) | Peer's `bundleSha256` must be in the allow-list. Mismatch → `BUILD_ATTESTATION_MISMATCH` ABORT. |
| **Friendly** (`signaturePolicy = "required-friendly"` or `"optional"`) | Peer's `bundleSha256` checked against the allow-list. Mismatch → warn-only banner in the UI ("Opponent is running a non-canonical engine bundle"). Match proceeds. |

The check is symmetric: each peer evaluates the *other* peer's
bundle. The peer that detects a forbidden bundle emits the ABORT;
the peer running the bundle MUST also see the ABORT and tear down
the channel.

---

## 5. Friendly-mode warning copy

Pinned in
[`docs/architecture/wiki/screens/77-multiplayer-game/spec.md`](./wiki/screens/77-multiplayer-game/spec.md)
under `BuildAttestationBanner`:

> Opponent is running a non-canonical engine bundle. Match outcome
> may be affected by behavior that diverges from the official
> build. This match is friendly — no ranked / ladder consequence.

Localization key: `multiplayer.buildAttestation.friendlyWarning`.

---

## 6. CI gate

`npm run validate:build-attestation` runs
`scripts/check-build-attestation.mjs` (added by task 15):

1. Read
   `services/signaling/config/build-attestation.allow.example.json`.
2. Schema-validate against the shape in § 3.
3. For every entry, verify `signature` against the listed
   `signedBy` trust anchor's `publicKey`.
4. Reject any entry with `validFrom > validUntil` or
   `validUntil < now()`.
5. Reject any commit that adds a trust anchor whose `publicKey`
   matches any other repo file (defends against accidentally
   committing a real signing key).

Wired into `npm run validate`.

---

## 7. Rotation policy

Trust anchors rotate at most once per quarter. Rotation:

1. Generate a new ed25519 keypair locally (out of CI).
2. Add the new public key to the allow-list with
   `validFrom = next-deploy-window`.
3. Sign the next CI bundle with the new key.
4. Retire the old key by setting its `validUntil` ≤ next-deploy.
5. Old bundles signed by the old key remain valid until their
   own `validUntil` expires (so existing matches in flight do not
   break mid-handshake).

Rotation is governed by
[`docs/operations/rollback-playbook.md`](../operations/rollback-playbook.md)
incident-response RACI.

---

## 8. Out of scope

- **Engine bundle confidentiality.** The bundle is shipped to every
  peer's browser; there is no secret in it. Attestation proves
  identity, not secrecy.
- **Runtime introspection of running engine.** Attestation is a
  load-time check. A peer who patches the engine at runtime after
  the handshake cannot be detected by attestation alone — that
  surface relies on per-turn state-hash divergence and the
  visibility precondition.
