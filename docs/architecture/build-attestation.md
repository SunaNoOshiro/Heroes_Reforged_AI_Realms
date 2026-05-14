# Build Attestation

> § System Improvements / Data Contracts / Pack signature mandate +
> engine-build attestation.

Canonical doctrine for the engine-bundle attestation that runs at the
multiplayer handshake. Closes the engine-binary swap window that
[`determinism.md`](./determinism.md)'s `engineHash` field acknowledges
but does not prove without a signed authority.

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
present **the canonical `engineHash`** while their actual runtime
differs — for example, by patching the AI search to consult hidden
information, or by biasing edge-case RNG draws that are unlikely to
fire inside the per-turn-hash sample window.

Attestation adds an **external authority**: the canonical engine
bundle is built by CI from a tagged commit, and the build emits an
`ed25519` signature over `(engineHash, bundleSha256, buildCommitSha)`.
Both peers exchange `bundleSha256` at the handshake; ranked play
rejects any bundle outside the canonical allow-list.

---

## 2. Canonical bundle production

The canonical engine bundle is built by the GitHub Actions workflow
shipped with task
[`15-pack-signature-and-build-attestation-policy.md`](../../tasks/phase-3/01-multiplayer/15-pack-signature-and-build-attestation-policy.md).
Pinned identity:

```text
engineHash      = xxh64( canonical-bytes( deterministic engine surface ) )
bundleSha256    = SHA-256( built bundle bytes )
buildCommitSha  = git rev-parse HEAD at build time
attestation.sig = ed25519.sign( signingKey,
                                "build-attestation-v1" || engineHash ||
                                bundleSha256 || buildCommitSha )
```

The signing key is held by maintainers; **never** committed to the
repo. The public key list reaches peers through two
signaling-side files:

- `services/signaling/config/build-attestation.allow.json` —
  operator-deployed allow-list (not in the repo).
- `services/signaling/config/build-attestation.allow.example.json` —
  checked-in placeholder operators copy from. The CI gate in § 6
  validates this example file only.

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

Field constraints (also enforced by § 6):

- `schemaVersion` — must be `1`.
- `trustAnchors[].keyId` — `^[A-Za-z0-9_-]{8,64}$`.
- `trustAnchors[].scheme` — must be `"ed25519"`.
- `trustAnchors[].publicKey` — 64 hex chars (placeholder file: all-zero).
- `bundles[].signedBy` — must reference a declared `trustAnchors[].keyId`.
- `bundles[].validFrom` / `validUntil` — ISO-8601 with `Z` suffix; `validFrom ≤ validUntil`.

Both peers fetch the allow-list from the signaling-server
configuration; it is never implicit. Peers that cannot fetch the
list (offline lobby) treat ranked play as unavailable and surface
"Ranked play unavailable: bundle attestation not available" per
[`docs/architecture/wiki/screens/77-multiplayer-game/`](./wiki/screens/77-multiplayer-game/).

---

## 4. Handshake enforcement

The match-handshake REVEAL phase (per
[`match-handshake.md`](./match-handshake.md)) carries `bundleSha256`
and `engineHash`. After both REVEALs are exchanged:

| Mode | `signaturePolicy` | Behavior on opponent's `bundleSha256` not in allow-list |
| --- | --- | --- |
| **Ranked** | `required-ranked` | `BUILD_ATTESTATION_MISMATCH` ABORT. |
| **Friendly** | `required-friendly` or `optional` | Warn-only banner ("Opponent is running a non-canonical engine bundle"). Match proceeds. |

The check is symmetric: each peer evaluates the *other* peer's
bundle. The peer that detects a forbidden bundle emits the ABORT;
the peer running the bundle MUST also see the ABORT and tear down
the channel (per
[`match-handshake.md`](./match-handshake.md) § 5).

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
[`scripts/check-build-attestation.mjs`](../../scripts/check-build-attestation.mjs)
(owned by task 15) against
`services/signaling/config/build-attestation.allow.example.json`:

1. Schema-validate the file against the shape in § 3.
2. For every `bundles[]` entry, verify `signature` against the
   listed `signedBy` trust anchor's `publicKey`.
3. Reject any entry with `validFrom > validUntil`, or with
   `validUntil < now()`.
4. Reject any commit that adds a `trustAnchors[]` entry whose
   `publicKey` matches any other repo file (defends against
   accidentally committing a real signing key); the example file
   itself MUST carry an all-zero placeholder key.

Wired into `npm run validate`.

---

## 7. Rotation policy

Trust anchors rotate at most once per quarter. Rotation steps:

1. Generate a new ed25519 keypair locally (out of CI).
2. Add the new public key to the allow-list with
   `validFrom = next-deploy-window`.
3. Sign the next CI bundle with the new key.
4. Retire the old key by setting its `validUntil ≤ next-deploy`.
5. Old bundles signed by the old key remain valid until their own
   `validUntil` expires, so matches in flight do not break
   mid-handshake.

Rotation is governed by the incident-response RACI in
[`docs/operations/rollback-playbook.md` § 6](../operations/rollback-playbook.md#6-incident-response-raci).

---

## 8. Out of scope

- **Engine bundle confidentiality.** The bundle ships to every
  peer's browser; it carries no secret. Attestation proves identity,
  not secrecy.
- **Runtime introspection of a running engine.** Attestation is a
  load-time check. A peer who patches the engine at runtime after
  the handshake cannot be detected by attestation alone — that
  surface relies on per-turn state-hash divergence and the
  visibility precondition (per
  [`security-model.md`](./security-model.md) § 1).

---

## 🔍 Sync Check

- **UI: ✔** — `BuildAttestationBanner` component, `selectors.net.lockstep.buildAttestation` selector, `multiplayer.buildAttestation.friendlyWarning` locale key, and the § 5 warning copy all match [`wiki/screens/77-multiplayer-game/spec.md`](./wiki/screens/77-multiplayer-game/spec.md), [`interactions.md`](./wiki/screens/77-multiplayer-game/interactions.md), and [`data-contracts.md`](./wiki/screens/77-multiplayer-game/data-contracts.md).
- **Schema: ✔** — `bundleSha256`, `signaturePolicy`, and `BUILD_ATTESTATION_MISMATCH` ABORT live on the handshake schema; `MatchHandshake` row in [`schema-matrix.md`](./schema-matrix.md) is registered with the `abort-build-attestation-mismatch` example. The allow-list is config (not a `content-schema/` schema), so no separate matrix row is expected.
- **Tasks: ✔** — Owning task [`15-pack-signature-and-build-attestation-policy.md`](../../tasks/phase-3/01-multiplayer/15-pack-signature-and-build-attestation-policy.md) lists this doc in Read First; CI script [`scripts/check-build-attestation.mjs`](../../scripts/check-build-attestation.mjs) and example file [`services/signaling/config/build-attestation.allow.example.json`](../../services/signaling/config/build-attestation.allow.example.json) exist.

## ⚠ Issues

- **CI gate § 6 is partially aspirational.** [`scripts/check-build-attestation.mjs`](../../scripts/check-build-attestation.mjs) currently enforces only steps 1, 3a (`validFrom > validUntil`), and a stricter form of step 4 (the example file's `publicKey` MUST be all-zero). It does **not** verify ed25519 signatures (step 2), does **not** check `validUntil < now()` (step 3b), and does **not** scan other repo files for a matching `publicKey` (step 4 as written). The script's own header comment notes: *"Real-key signature verification is delegated to Task 15's production CI hook; this gate enforces shape + placeholder-only invariants."* Per task 15's Acceptance Criteria, those checks are still owed; the gap closes inside that task — this skill does not edit the script. Suggested resolution: either complete the missing checks under task 15 (preferred, matches doctrine), or amend § 6 to describe shape-only enforcement and move signature/expiry/cross-file checks into a follow-up task. Skill did not edit the script (Hard Prohibition D).
