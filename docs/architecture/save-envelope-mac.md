# Save-Envelope MAC — Phase-In Plan

> Crypto primitive in use here (HMAC-SHA-256) is catalogued in
> [`crypto-primitives.md`](./crypto-primitives.md).

This document pins the M5+ contract for keyed integrity on save
envelopes. It is **doc-only in M4** — the schema seam is in place
(see [`save-envelope.schema.json`](../../content-schema/schemas/save-envelope.schema.json)),
the migrators emit `mac: undefined`, and no per-installation key
has been derived. M5 cloud-sync / shared-replay surfaces flip the
seam to `required` per § 7.

The doc's job is to make M5 mechanical: every constant (algorithm,
KDF salt, length, canonical input) is pinned here so the implementer
does not invent or vote on a parameter.

Companion docs:

- [`save-migration.md`](./save-migration.md) — migration contract;
  carries the M4-vs-M5 toggle reference.
- [`security-model.md`](./security-model.md) — declares "cloud-sync /
  shared-replay paths require this MAC" as a structural rule.
- [`crypto-rules.md`](./crypto-rules.md) — constant-time comparison.
- [`persistence.md`](./persistence.md) — IndexedDB scope for
  `userInstallationSeed`.

---

## 1. Why now (doc-only)?

Authoring the seam in M4 prevents a breaking save-format change in
M5. Without it, every M4 save would need wrap + version-bump +
fixture rebuild the moment cloud sync ships. With it, M5 simply
flips `mac` from optional to required for `intent: "save"` envelopes
that opt into cloud sync.

`xxh64` (the existing canonical-content hash) detects accidental
corruption only — it is not a signature, not a MAC, and any trusted
multi-device path needs a keyed primitive. Achievement, leaderboard,
and shared-replay surfaces all depend on this contract.

---

## 2. Algorithm

| Property | Value |
| --- | --- |
| Primitive | HMAC-SHA-256 |
| Output length | 32 bytes / 64 hex chars |
| Input | canonical-JSON of `{ envelopeVersion, intent, saveVersion, engineHash, contentPackHashes, body }` (the `mac` field itself is excluded when computing) |
| Key | `deviceKey` (per-installation, M5) → re-keyed to `accountKey` on cloud-sync opt-in (M5+) |
| Comparison | constant-time per [`crypto-rules.md`](./crypto-rules.md) § 1 |

HMAC-SHA-256 wins over xxh64-keyed / Poly1305 / GMAC because Web
Crypto exposes it natively (`crypto.subtle.sign('HMAC', …)`), which
keeps the engine on the WebCrypto floor pinned in
[`runtime-requirements.md` § RR-04](./runtime-requirements.md#rr-04-crypto--web-crypto-cryptosubtle-with-node-parity).
32 bytes is ample for accidental-corruption resistance plus
adversarial-tamper detection on a local save; nothing in this doc
claims server-side forgery resistance against a sophisticated
adversary.

---

## 3. Key derivation (M5 device-bound)

```text
userInstallationSeed:
  - generated once on first run via crypto.getRandomValues(32)
  - persisted in IndexedDB store hr-profile.keys
    (record id "save-envelope-mac.v1.seed")
  - never exported, never echoed in logs, never on the wire
  - wiped by WIPE_LOCAL_DATA scope=profile|all per
    data-inventory.md

deviceKey = HKDF-SHA-256(
  salt   = "hr-save-mac-v1",
  ikm    = userInstallationSeed,
  info   = "save-envelope-mac",
  length = 32,
)
```

`deviceKey` is computed on demand at save and load time — only the
seed is persisted. The KDF is mandatory because re-using
`userInstallationSeed` directly as a MAC key conflates two roles:
M5+'s account-key derivation reuses the same seed under a different
`info` tag (see § 6).

---

## 4. MAC input (canonical-JSON)

```json
{
  "envelopeVersion": 1,
  "intent": "save",
  "saveVersion": 1,
  "engineHash": "...",
  "contentPackHashes": [{ "id": "...", "version": "...", "contentHash": "..." }, ...],
  "body": { ... }
}
```

Rules:

- **Field order: lexicographic** — matches the canonical serializer
  used everywhere in the engine.
- **`saveVersion` is part of the input.** A tampered version
  invalidates the MAC; without this binding a hostile editor could
  rewrite `saveVersion` to steer the migration chain into undefined
  behavior.
- **The `mac` field itself is excluded** when computing — the MAC is
  a function of the rest of the envelope, then placed into the
  envelope.
- **`body` is the inner save record.** Its shape is owned by
  [`save.schema.json`](../../content-schema/schemas/save.schema.json)
  and the migration policy in
  [`save-migration.md`](./save-migration.md); the envelope layer
  treats it opaquely.

---

## 5. Verification

```ts
async function verifyMac(envelope, deviceKey) {
  const macInput = canonicalJsonBytes({
    envelopeVersion: envelope.envelopeVersion,
    intent:          envelope.intent,
    saveVersion:     envelope.saveVersion,
    engineHash:      envelope.engineHash,
    contentPackHashes: envelope.contentPackHashes,
    body:            envelope.body,
  });
  const expected = await crypto.subtle.sign("HMAC", deviceKey, macInput);
  return constantTimeEqual(expected, hexToBytes(envelope.mac));
}
```

On mismatch, the loader refuses with `MAC_MISMATCH` and the
Save/Load screen surfaces the matching missing-state. There is **no
override path** — a MAC mismatch is structurally indistinguishable
from a tamper, and click-through-to-load would defeat the purpose.

---

## 6. Cross-installation transfer

A save MAC'd on installation A cannot load on installation B —
`deviceKey_A ≠ deviceKey_B`. M4 disables this entire path; the
expectation is "saves are device-local."

M5+ introduces an opt-in "transfer this save to cloud sync" flow:

1. Verify the local MAC under `deviceKey_A`.
2. Re-key to `accountKey` (HKDF over the user's account-bound seed,
   `info = "save-envelope-mac-account"`).
3. Re-MAC the envelope under `accountKey`.
4. Upload.

The re-key flow is owned by the cloud-sync feature (out of scope
here); the contract above is what the M5 implementer must satisfy.

---

## 7. Phase-in toggle

| Milestone | `mac` field |
| --- | --- |
| M4 | optional; not produced; not verified |
| M5 (cloud-sync opt-in) | required when `intent === "save"` AND user opted into cloud sync; produced and verified |
| M5 (shared-replay) | absent for `intent === "fixture"`; integrity comes from the envelope's separate `signature` field (Ed25519 by an `engine-fixture` key) — see [`save-migration.md` § Replay-intent migration skip](./save-migration.md#replay-intent-migration-skip) |
| M6+ | required for every `intent === "save"` envelope |

The toggle is a runtime config, not a schema change. The schema
keeps `mac` as optional indefinitely so older fixtures and dev-mode
flows remain valid; the runtime decides whether to require it.

---

## 8. What this MAC does NOT protect

- **Server-side replay.** A user who copies their own MAC'd save and
  uploads it twice produces two valid envelopes. The cloud-sync
  ingest layer must reject duplicates by some other identity (e.g.
  `body.metadata.savedAt + body.stateHash`).
- **Cross-account theft via shared device.** A second user signing
  in on the same OS account inherits the same `userInstallationSeed`.
  Profile-level isolation is owned by
  [`persistence.md`](./persistence.md) and the OS user account, not
  by this MAC.
- **Adversarial attacker who controls the third-party signaling /
  sync server.** `accountKey` derivation re-keys the local seed
  through the user's account credential; if the account credential
  is compromised, the MAC is too.

These limits are referenced from
[`security-model.md`](./security-model.md) § What this codebase does
NOT protect.

---

## 9. Cross-references

- [`save-migration.md`](./save-migration.md) — phase-in toggle in
  the migration policy.
- [`security-model.md`](./security-model.md) — save threat model.
- [`crypto-rules.md`](./crypto-rules.md) — comparison rule.
- [`persistence.md`](./persistence.md) — IndexedDB scope.
- [`data-inventory.md`](./data-inventory.md) — wipe scope for the
  installation seed.
- Owning task (M5):
  [`tasks/mvp/08-persistence/19-save-envelope-mac-phase-in.md`](../../tasks/mvp/08-persistence/19-save-envelope-mac-phase-in.md).

---

## 🔍 Sync Check

- **UI: ✔** — Doc carries no UI surface of its own; the `MAC_MISMATCH` failure surfaces through the Save/Load screen's missing-state path, owned by [`save-migration.md`](./save-migration.md) and the persistence task chain.
- **Schema: ✔** — Algorithm, input shape, hex length, and `intent === "save"` gating all match [`save-envelope.schema.json`](../../content-schema/schemas/save-envelope.schema.json) (`mac` pattern `^[a-f0-9]{64}$`, `signature` reserved for `intent === "fixture"`); row present in [`schema-matrix.md`](./schema-matrix.md) (`SaveEnvelope`).
- **Tasks: ❌** — Owning task [`mvp.08-persistence.19-save-envelope-mac-phase-in`](../../tasks/mvp/08-persistence/19-save-envelope-mac-phase-in.md) reads this doc First and asserts the same `hr-profile.keys` / `save-envelope-mac.v1.seed` / wipe-scope contract, but [`data-inventory.md`](./data-inventory.md) has no row for that seed (only the `local salt` row uses `hr-profile.keys`). CI-blocking gap; see Issues.

## ⚠ Issues

- **Missing data-inventory row for `userInstallationSeed`.** Both this doc (§ 3) and the owning task `mvp.08-persistence.19-save-envelope-mac-phase-in` claim the seed is wiped by `WIPE_LOCAL_DATA scope=profile|all per data-inventory.md`, but [`data-inventory.md`](./data-inventory.md) § 1 has no row for it — only the `local salt` row currently references `hr-profile.keys`. Per CLAUDE.md root contract ("every persisted field is registered in `data-inventory.md`"), `mvp.08-persistence.19-save-envelope-mac-phase-in` must add the row before the seed can ship. Suggested values: Field=`userInstallationSeed` (`save-envelope-mac.v1.seed`), State path=n/a (key material; never mirrored to `state.*`), Medium=`IndexedDB (hr-profile.keys)`, Sensitivity=`high`, Retention=`until user-deleted`, Wipe scope=`WIPE_LOCAL_DATA scope=profile|all`, Notes=`per-installation; HKDF input for the save-envelope MAC; never exported, never echoed in logs, never on the wire`. Skill did not add the row itself (Hard Prohibition D — never edit cross-checked files).
- **Phase-in row corrected: fixtures use `signature`, not `mac`.** The previous § 7 row read "M5 (shared-replay) | required when `intent === 'fixture'` (signed by an `engine-fixture` key, not the device key)" — internally contradictory because the cell value claimed `mac` was required but the parenthetical described an Ed25519 signature. Per [`save-envelope.schema.json`](../../content-schema/schemas/save-envelope.schema.json) (`signature` is reserved for `intent === "fixture"`; `mac` is reserved for `intent === "save"`) and [`save-migration.md` § Envelope, Intent Discriminator & MAC Phase-In](./save-migration.md#envelope-intent-discriminator--mac-phase-in), fixtures carry `signature` and never carry `mac`. The row was rewritten in place to match. No code change implied; this was a doc-only correction.
- **Anchor target tightened.** § 6 / § 7 previously linked `save-migration.md § Replay-intent skip`; the actual heading is `### Replay-intent migration skip`. Updated to a working anchor, no semantic change.
- **M5 vs. M4 framing on `deviceKey`.** § 2 listed the key as "(per-installation, M4)" while § 1 / § 7 say no key is derived in M4 (the seam is doc-only). Aligned to "M5" in the algorithm table; the doc-only-in-M4 stance is unchanged. Flagged so the next reader notices the framing was an inconsistency, not new content.
