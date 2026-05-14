# Security Model — Symmetric Input-Only Lockstep

Canonical doctrine for the M5 multiplayer model. This is the single
place the project commits, in writing, to **what symmetric input-only
lockstep protects** and **what it does not**. Every contributor and
AI agent MUST read this before designing any feature that touches the
lockstep boundary, the canonical state, the visibility projection, or
the per-turn state hash.

Companion docs:

- [`determinism.md`](./determinism.md) — pure-reducer + seeded-RNG
  contract this model rests on.
- [`lockstep-envelope.md`](./lockstep-envelope.md) — wire envelope +
  per-match HMAC.
- [`match-handshake.md`](./match-handshake.md) — three-phase
  commit-reveal handshake.
- [`bisect-protocol.md`](./bisect-protocol.md) — Byzantine-tolerant
  hash bisect.
- [`draft-preview-policy.md`](./draft-preview-policy.md) — UI preview
  rule that blocks pre-roll RNG oracles.
- [`pack-contract.md`](./pack-contract.md) — pack signature policy.
- [`build-attestation.md`](./build-attestation.md) — engine-bundle
  attestation.
- [`peer-reputation.md`](./peer-reputation.md) — griefer accounting.
- [`replay-audit-pipeline.md`](./replay-audit-pipeline.md) — opt-in
  post-match audit.

---

## 1. What symmetric input-only lockstep PROTECTS

Each threat below is **detectable and attributable**: the offending
peer is named in an abort report.

| Threat | Detection mechanism |
| --- | --- |
| Outcome-altering tamper (any change that alters canonical state) | Per-turn xxh64 state-hash exchange ([`04-per-turn-hash-exchange-plus-desync-detection.md`](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)); divergence triggers bisect ([`05-auto-bisect-on-hash-mismatch.md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)). |
| Mid-match pack swap | Per-turn `packManifestDigest` re-validation alongside the hash exchange ([`match-handshake.md`](./match-handshake.md) § Mid-Match Re-Validation). |
| Cross-session command replay | Per-match `matchKey` HMAC over the wire envelope ([`lockstep-envelope.md`](./lockstep-envelope.md)); commands captured from match A do not verify under match B's `matchKey`. |
| Same-session mid-stream tamper | HMAC verification on every envelope; one mismatch dispatches `TRUST_VIOLATION_DETECTED` and aborts. |
| Sequence skip / duplicate / in-session replay | Sequence-validation rules ([`03-input-only-lockstep-command-serialization-plus-sequencing.md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) § Sequence Validation): drop on `seq <= lastApplied`, reject duplicate `(playerId, matchEpoch, seq)`, enforce bounded out-of-order window. |
| Host-chosen seed advantage | Three-phase commit-reveal handshake derives `seed = xxh64(nonceA ∥ nonceB)`; neither peer sees the other's nonce before committing its own ([`match-handshake.md`](./match-handshake.md)). |
| Pack-tamper deception (peer claims pack X, runs pack Y) | `signaturePolicy: "required-ranked"` rejects unsigned packs at handshake; per-turn `packManifestDigest` re-validation catches mid-match swap ([`pack-contract.md`](./pack-contract.md) § Signature Policy). |
| Engine-binary swap that changes outcomes | Build-attestation `bundleSha256` + signature checked against the canonical allow-list at handshake; mismatched bundle rejected from ranked, warned in friendly ([`build-attestation.md`](./build-attestation.md)). |
| Stalling / connected-but-idle peer | Per-peer turn timer with `WAITING → STALLED → AUTO_END_DAY` escalation ([`turn-timer.md`](./turn-timer.md)); the auto-`END_DAY` is itself a canonical envelope, so both peers apply it deterministically. |
| Free griefing aborts | Blame-attributed bisect report + signaling-side reputation counter ([`peer-reputation.md`](./peer-reputation.md)); 5 attributed aborts in 24 h triggers a soft-rate-limit. |
| Bisect protocol abuse (lying / silent peer during bisect) | MACed midpoint hashes, two-way exchange, per-step timeout, fallback to "unverifiable bisect" report ([`bisect-protocol.md`](./bisect-protocol.md)). |
| Fog-bypass via crafted command (target a fog-covered tile to probe map contents) | Visibility precondition on every tile-targeting command; reducer rejects canonically on both peers ([`command-schema.md`](./command-schema.md) § Visibility Precondition). |
| Speculative-apply oracle (UI runs `apply()` against the canonical reducer to pre-roll RNG outcomes) | Lint gate `npm run validate:no-stochastic-preview` rejects any call to engine `apply*` / `simulate*` from `src/ui/` unless marked `@deterministic-preview` ([`draft-preview-policy.md`](./draft-preview-policy.md)). |

---

## 2. What symmetric input-only lockstep DOES NOT protect

These threats are **structurally inherent** to the netcode and are
not closed by anything in section 1. Every design that depends on
the contrary assumption MUST acknowledge them.

| Limit | Why it is structural |
| --- | --- |
| **Information leak via local memory read** (maphacks, hidden hero stats, AI plan inspection) | Symmetric input-only lockstep keeps the *full canonical state* on every client — fog-covered tiles, hidden enemy stacks, scripted-object internals, AI bot lookahead. Hiding values in the UI layer (`viewWorldVisibleObjects`) does not hide them in browser memory; a peer with devtools dumps everything. |
| **AI bot internals on every peer** | Every peer runs the same deterministic AI per [`ai-contract.md`](./ai-contract.md); a peer can introspect bot search trees and intended commands before they execute. |
| **Visual / locale / non-canonical-field tamper** | If a tamper does not change canonical state, the per-turn state hash agrees and the divergence detector does not fire. Pack signature + manifest digest catches *advertised* pack identity, but cannot catch local re-skinning that does not affect outcomes. |
| **Spectator-mode information secrecy** | Out of M5 scope; see [`spectator-mode-requirements.md`](./spectator-mode-requirements.md) for the constraints any future spectator design must respect. |
| **Server-authoritative rollback** | There is no server-authoritative simulation; only the two peers run the reducer. No third party can declare one peer's hash "correct" without a separate replay-audit run. |

### Worked example

If a player opens browser devtools mid-match and inspects engine
state, they can learn:

- The full adventure-map tile array, including fog-covered tiles.
- The full enemy-army composition of every visible and hidden hero.
- Every hidden hero secondary stat (luck, morale, spell mastery)
  before any reveal event.
- The AI bot's planned moves for the current and next turn (computed
  deterministically and stored in canonical state per
  [`ai-contract.md`](./ai-contract.md)).
- Every PCG32 sub-stream's current cursor; combined with the seed
  from the handshake (recorded locally), they can precompute the
  next N RNG outcomes per named sub-stream.

This is *not* a bug — it is a property of input-only lockstep. The
mitigation is **not** to obfuscate. The mitigation is to gate
features that depend on hidden information behind a future Phase-4
redesign (server-authoritative or zero-knowledge protocol) and to
state, in product copy, that the M5 multiplayer model is
**friendly / closed-beta only** for any scenario whose fairness
depends on information secrecy.

---

## 3. Mitigations in this codebase

Each row closes an information-leak vector that *can* be closed
under symmetric lockstep. None of them claim to close the structural
limits in section 2.

1. **Wire envelope + per-match HMAC** — see
   [`lockstep-envelope.md`](./lockstep-envelope.md) and the schema
   [`lockstep-envelope.schema.json`](../../content-schema/schemas/lockstep-envelope.schema.json).
   Closes cross-session replay, mid-stream forgery, and forged
   bisect midpoints.
2. **Three-phase commit-reveal handshake** — see
   [`match-handshake.md`](./match-handshake.md) and the schema
   [`match-handshake.schema.json`](../../content-schema/schemas/match-handshake.schema.json).
   Closes host-chosen-seed advantage and binds
   `(seed, contentHash, engineHash, packManifestDigest, bundleSha256)`
   on both peers before the first command is sent.
3. **Sequence validation + canonical intra-turn order** — see
   [`03-input-only-lockstep-command-serialization-plus-sequencing.md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md).
   Drops stale, duplicate, and skip-ahead commands; pins
   reducer-side application order so per-turn hash agreement is the
   default rather than the exception.
4. **Turn timer + stall detection** — see
   [`turn-timer.md`](./turn-timer.md) and
   [`11-turn-timer-and-stall-detection.md`](../../tasks/phase-3/01-multiplayer/11-turn-timer-and-stall-detection.md).
   Closes connected-but-idle griefing.
5. **Visibility precondition on commands** — see
   [`command-schema.md`](./command-schema.md) § Visibility
   Precondition and
   [`12-visibility-preconditions-on-commands.md`](../../tasks/phase-3/01-multiplayer/12-visibility-preconditions-on-commands.md).
   Closes fog-bypass via crafted command.
6. **Draft-preview policy + lint** — see
   [`draft-preview-policy.md`](./draft-preview-policy.md). Closes
   speculative-apply RNG oracles in UI code.
7. **Pack-signature policy** — see
   [`pack-contract.md`](./pack-contract.md) § Signature Policy.
   Required for ranked play; warn-only for friendly.
8. **Engine-bundle attestation** — see
   [`build-attestation.md`](./build-attestation.md). Required for
   ranked play; warn-only for friendly.
9. **Byzantine-tolerant bisect** — see
   [`bisect-protocol.md`](./bisect-protocol.md). MACed midpoint
   hashes; two-way exchange; timeout fallback; blame attribution.
10. **Peer-reputation counter** — see
    [`peer-reputation.md`](./peer-reputation.md). In-memory,
    TTL-bound counter on the signaling side; soft-rate-limit at 5
    attributed aborts in 24 h.
11. **Replay-audit pipeline contract** — see
    [`replay-audit-pipeline.md`](./replay-audit-pipeline.md).
    Opt-in upload, consumed by the future Phase-4 hosted ingestion
    service plus its admin review UI (no terminal / CLI surface in
    M5).

---

## 4. Inherent limits and product gating

Information secrecy under symmetric input-only lockstep is
**structurally impossible** without a redesign toward
server-authoritative simulation or zero-knowledge protocols. The M5
multiplayer module is therefore product-gated:

- **Friendly matches**: allowed; all warnings (build-attestation
  mismatch, unsigned pack, etc.) surfaced as UI hints.
- **Closed-beta competitive**: allowed with required pack signature,
  required build attestation, and per-match opt-in to the
  audit-pipeline upload.
- **Public ranked ladder**: **NOT delivered** by M5. Any ranked
  surface that depends on information secrecy (hidden hero stats,
  fog-of-war as a tactical resource) must wait for a
  server-authoritative or zero-knowledge redesign in Phase 4 or
  later.
- **Tournament prize pool**: NOT delivered by M5 — same reason.
- **Spectator mode**: NOT delivered by M5. See
  [`spectator-mode-requirements.md`](./spectator-mode-requirements.md)
  for the requirements any Phase-4 spectator design must satisfy.

This gating is referenced from the multiplayer-game screen package
[`docs/architecture/wiki/screens/77-multiplayer-game/`](./wiki/screens/77-multiplayer-game/)
under the trust-banner copy.

---

## 5. Threat-model summary

A malicious peer:

- **Can** read any value in canonical state on their own client.
- **Can** inspect AI bot internals and plan their own moves with
  full information.
- **Can** observe RNG sub-stream cursors and predict future rolls
  on canonical sub-streams.
- **Cannot** persistently affect canonical match outcomes without
  producing a state-hash divergence at turn-end (caught by
  [`04-per-turn-hash-exchange-plus-desync-detection.md`](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)).
- **Cannot** replay captured commands across matches (per-match
  `matchKey` rejects the HMAC).
- **Cannot** stall a match indefinitely (turn timer auto-ends the
  day after `STALL_LIMIT_MS`).
- **Cannot** abort matches without cost beyond a small threshold
  (peer-reputation counter throttles repeat aborters).
- **Cannot** bypass the fog by submitting commands targeting
  unrevealed tiles (visibility precondition rejects them
  canonically on both peers).
- **Cannot** preview stochastic outcomes via the UI (lint gate
  rejects calls to engine `apply*` / `simulate*` from `src/ui/`).

---

## 5a. Save threat model

> Source: Save & Pack Threat Model.

The save loader assumes hostile input. `xxh64` over canonical JSON
detects accidental corruption only — it is **not** a signature and
**not** a MAC. Determinism + post-replay state-hash equality is the
integrity backstop, not the integrity *primitive*.

Defenses run in this order:

1. Parser hardening — size / ratio / depth / array caps per
   [`parser-hardening.md`](./parser-hardening.md).
2. `save-envelope.schema.json` validation — `intent` discriminator,
   `saveVersion` range, capped `contentPackHashes`.
3. `save.schema.json` validation — capped `commandLog`,
   integer-only numerics, per-field bounds.
4. Pack-hash gate — `contentPackHashes` matches the pack registry
   active at load time.
5. Pre-replay command-log validation — every command resolves
   against the active registry before the reducer runs.
6. Reducer replay — pure, deterministic.
7. Post-replay state-hash check — must equal the saved hash.
8. (M5+) Save-envelope MAC — keyed integrity per
   [`save-envelope-mac.md`](./save-envelope-mac.md); refuses on
   `MAC_MISMATCH` with no override path.

A tampered save that survives all gates either matches the saved
`stateHash` (in which case it is functionally equivalent to a
legitimate save by the determinism contract) or fails the final hash
gate. The single-player threat model is **"the player can edit their
own save and the only victim is themselves"**; cloud-sync /
leaderboard / shared-replay paths require the M5+ MAC before they
ship.

## 5b. Pack threat model

> Source: Save & Pack Threat Model.

The pack loader assumes hostile input even from the local
filesystem. Defenses run in this order:

1. Archive integrity — ZIP CRC over each entry.
2. Parser hardening — same caps as the save loader, scaled up per
   [`parser-hardening.md`](./parser-hardening.md).
3. Manifest schema-parse — `manifest.schema.json` validation.
4. Signature verify — Ed25519 over the canonical signed message per
   [`pack-signing.md`](./pack-signing.md) § 1; consults the publisher
   registry, revocation list, and trust store.
5. Publisher-registry lookup — assigns the trust tier
   (`canonical | thirdParty | sandboxed`).
6. Trust-store / TOFU consultation — refuses `SIGNATURE_STRIPPED`,
   refuses `UNKNOWN_KEY_ID` without rotation proof, refuses
   `DOWNGRADE_REFUSED` without explicit confirm.
7. Asset extraction — last step; each binary asset's `sha256` is
   verified against `assets/index.json` before exposure.

Failure at any gate refuses the load with a closed reason. The
pack's effective trust tier is the **minimum** of its own tier and
every transitive dependency's tier (Dependency Trust Propagation,
[`pack-signing.md` § 9](./pack-signing.md)).

## 5c. What this codebase does NOT protect

> Source: Save & Pack Threat Model.

Cross-referenced from § 4 Inherent limits:

- **Single-player saves are not authenticated.** Any save loaded
  into a single-player session can be tampered without consequence.
  The fix is not to "protect single-player from cheating"; it is to
  keep multiplayer / leaderboard / shared-replay paths gated behind
  the optional save-envelope MAC and never to extend single-player
  credentials to those paths.
- **No save-format claim against a hostile server.** Cloud-sync /
  leaderboard / shared-replay require the M5+ MAC. Until they ship,
  no claim is made against an attacker who controls a third-party
  server.
- **Software-key publisher signing.** A publisher whose private
  Ed25519 key is stolen can be impersonated until the next
  revocation-list update reaches each user. Hardware-key signing is
  out of scope for M4–M5.
- **Asset-bypass via re-zipping.** Per-asset `sha256` plus the
  manifest-bound `assetDigest` block byte-substitution — but a
  fully re-built signed pack from a stolen private key is
  indistinguishable from a legitimate update without revocation.

---

## 6. Required reading order for downstream features

Any new feature that touches the multiplayer surface MUST read, in
order:

1. This file.
2. [`determinism.md`](./determinism.md).
3. [`lockstep-envelope.md`](./lockstep-envelope.md).
4. [`match-handshake.md`](./match-handshake.md).
5. The screen package
   [`docs/architecture/wiki/screens/77-multiplayer-game/`](./wiki/screens/77-multiplayer-game/).

Any feature copy that promises information secrecy on the M5
multiplayer surface MUST be reviewed against section 2 of this
document before merge.

---

## 🔍 Sync Check

- **UI: ✔** — Trust-banner, build-attestation, and product-gating copy in [`wiki/screens/77-multiplayer-game/spec.md`](./wiki/screens/77-multiplayer-game/spec.md) cite this doc's § 4 verbatim; `selectors.net.lockstep.trustBanner` and `selectors.net.lockstep.buildAttestation` resolve against the canonical companion docs.
- **Schema: ✔** — Envelope, handshake, and save/pack schemas referenced here exist in [`content-schema/schemas/`](../../content-schema/schemas/) (`lockstep-envelope.schema.json`, `match-handshake.schema.json`, `save.schema.json`, `save-envelope.schema.json`, `manifest.schema.json`); enum values (`signaturePolicy: required-ranked`, `TRUST_VIOLATION_DETECTED`, `WAITING / STALLED / AUTO_END_DAY`, `STALL_LIMIT_MS = 90_000`) match the canonical companions.
- **Tasks: ⚠** — Owning task [`phase-3.01-multiplayer.13-security-model-and-doctrine`](../../tasks/phase-3/01-multiplayer/13-security-model-and-doctrine.md) reads-first this doc; every mitigation row resolves to a real task ID; sibling doctrine docs cross-link back. The mitigation-5 anchor `command-schema.md § Visibility Precondition` is unresolved — see ⚠ Issues.

## ⚠ Issues

- **Missing `## Visibility Precondition` heading in `command-schema.md`.** This doc cites `command-schema.md § Visibility Precondition` from § 1 (fog-bypass row) and § 3 (mitigation 5). The only related heading in [`command-schema.md`](./command-schema.md) is `## Field Visibility (Desync Redaction)`, which is about redaction during desync reports — a different concern. Per the doctrine that every command-schema reference must resolve to a real anchor, the owner of [`12-visibility-preconditions-on-commands.md`](../../tasks/phase-3/01-multiplayer/12-visibility-preconditions-on-commands.md) should add a `## Visibility Precondition` section to `command-schema.md` documenting the per-command precondition that rejects tile-targeting against fog-covered tiles canonically on both peers. (Same gap was already flagged in the [`lockstep-envelope.md`](./lockstep-envelope.md) sync check.) Suggested heading id: `visibility-precondition`. Skill did not add the section (Hard Prohibition D — never edit cross-checked files).
