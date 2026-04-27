# Implementation Plan: 26 — Replay/Tampering Attacks & Deterministic Simulation Cheating

> Source audit: [docs/readiness-audit/26-replay-tampering-and-simulation-cheating.md](../readiness-audit/26-replay-tampering-and-simulation-cheating.md)
> Audit AI-Readiness score at time of writing: **3 / 10** — target after this plan: **8 / 10**.
> The original audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic, and Risk item from Q514–Q539 into
> concrete, executable work items grounded in existing artifacts:
> [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md),
> [`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md),
> [`tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md),
> [`tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md`](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md),
> [`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md),
> [`tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md`](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md),
> [`tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md`](../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md),
> [`docs/architecture/determinism.md`](../architecture/determinism.md),
> [`docs/architecture/state-flow.md`](../architecture/state-flow.md),
> [`docs/architecture/pack-contract.md`](../architecture/pack-contract.md),
> [`docs/architecture/command-schema.md`](../architecture/command-schema.md),
> [`docs/architecture/effect-registry.md`](../architecture/effect-registry.md),
> [`docs/architecture/schema-matrix.md`](../architecture/schema-matrix.md),
> [`docs/architecture/wiki/screens/07-adventure-map/`](../architecture/wiki/screens/07-adventure-map/),
> [`docs/architecture/wiki/screens/16-view-world/`](../architecture/wiki/screens/16-view-world/),
> [`docs/architecture/wiki/screens/62-multiplayer-setup/`](../architecture/wiki/screens/62-multiplayer-setup/),
> [`docs/architecture/wiki/screens/63-multiplayer-game/`](../architecture/wiki/screens/63-multiplayer-game/) (created by this plan if absent — see Improvements),
> and adjacent plans **07** (multiplayer baseline), **24** (TLS / WebRTC
> auth), **25** (TURN credentials & signaling abuse), **31** (trust
> boundaries / logging / monitoring).

---

## 1. Overview

Audit 26 evaluated 26 questions across four themes — **wire-level
integrity & replay** (Q514–Q517), **command sequencing & turn order**
(Q518–Q520), **desync attribution & griefing** (Q521–Q523), **session
commitment & build attestation** (Q524–Q525, Q534–Q537), **information
secrecy under symmetric lockstep** (Q526–Q532), and **server / audit
recourse** (Q533, Q538–Q539). **Of the 26, three are ✔ Defined
(Q519, Q520, Q533, Q537), eight are ⚠ Partial, and the remaining
fourteen are ❌ UNKNOWN.**

The repository today specifies the **detection** half of multiplayer
anti-cheat (canonical xxh64 state hash + per-turn exchange + bisect →
report → quit) and the **substrate** for replay (PCG32 seeded engine,
canonical command log, content/engine hashes pinned per match) — but
says **nothing** about:

1. **Application-layer integrity** on the wire — no MAC, no per-match
   key, no nonce, no `roomId`/`matchEpoch` binding. Cross-session
   replay is structurally indistinguishable from fresh play.
2. **Sequence-validation rules** at the receiver — no "drop on `seq <=
   lastApplied`", no duplicate-`(playerId, seq)` rejection, no skip
   detection. Q145 of audit 07 already flagged this.
3. **Canonical intra-turn ordering** when commands from multiple peers
   collide in the same turn — only the per-turn hash exchange catches
   divergence; no rule pins the canonical order.
4. **Turn timer / stall detection** for connected-but-idle peers —
   forfeit only triggers on disconnection, not on a peer who connects
   then sits silent.
5. **Pre-turn-1 commit-reveal handshake** that binds `(seed,
   contentHash, engineHash, packManifestDigest)` between peers and
   re-validates the manifest digest each turn.
6. **Pack-signature enforcement in multiplayer** — `signature` is
   optional in the pack contract and never required at the lockstep
   join boundary.
7. **Engine-binary attestation** — nothing prevents a peer from
   running a doctored build whose RNG agrees on canonical paths but
   leaks information or biases edge cases.
8. **Byzantine-tolerant bisect** — algorithm assumes honest peers;
   midpoint hashes are not signed, lying or stalling is undefined.
9. **Blame attribution** in the desync report — bisect names a
   command index, not the peer whose local state diverged first.
10. **Hidden-information model** under symmetric lockstep — fog of
    war, hidden hero stats, AI plans all live in browser memory on
    every client; this is a structural property of input-only
    lockstep that primary docs do not yet acknowledge.
11. **Visibility precondition on commands** — the reducer accepts a
    target tile regardless of issuer visibility; the UI is the only
    gate today.
12. **Speculative-apply / draft-preview policy** — a "preview attack"
    UI affordance against a pure deterministic reducer leaks RNG
    outcomes pre-commit unless explicitly forbidden.
13. **Post-match audit pipeline** — replays exist mechanically but no
    ingestion, retention, or anomaly-detection task is documented.
14. **Peer reputation / griefer accounting** — desync abort is free
    for the abuser; no rate-limit on report-and-quit, no signaling
    record, no consequence.

A naive autonomous implementer following the current task spec ships a
multiplayer build that is detection-honest but tamper-naïve: any
captured stream replays into a fresh room, any peer can deliberately
diverge with zero cost, and any UI implementer who adds an "attack
preview" button silently introduces a stochastic-outcome oracle. This
plan formalizes:

1. A **canonical security-model doctrine**
   (`docs/architecture/security-model.md`) — explicit statement of
   what symmetric input-only lockstep does and does not protect:
   detected outcome-altering tampers, undetected information leaks,
   maphacks as inherent, hidden information impossible without
   redesign. Cross-linked from [`CLAUDE.md`](../../CLAUDE.md) and from
   `determinism.md`.
2. A **wire-envelope contract**
   (`content-schema/schemas/lockstep-envelope.schema.json`) — every
   in-game command is wrapped in `{ matchId, matchEpoch, seq,
   playerId, turn, command, mac }` where `mac` is HMAC-SHA-256 over
   the canonical-JSON of the inner record using a per-match
   `matchKey`.
3. A **start-of-match handshake protocol**
   (`docs/architecture/match-handshake.md` +
   `content-schema/schemas/match-handshake.schema.json`) — three
   phases: (a) commit `H(nonce ∥ contentHash ∥ engineHash ∥
   packManifestDigest ∥ buildAttestation)`, (b) reveal nonces and
   raw values, (c) derive `seed = xxh64(nonceA ∥ nonceB)` and
   `matchKey = HKDF(nonceA ∥ nonceB, "lockstep-mac-v1")`. Abort on
   any commit/reveal mismatch or any `(contentHash, engineHash,
   packManifestDigest)` disagreement.
4. **Sequence-validation rules** baked into
   `03-input-only-lockstep-command-serialization-plus-sequencing.md`
   — drop on `seq <= lastApplied[playerId]`, reject duplicate
   `(playerId, seq)`, reject skip beyond a contiguous receive
   window, reject `seq` outside the current `(turn, matchEpoch)`.
5. A **canonical intra-turn ordering rule** —
   `sort by (turn, playerId, seq)` with `playerId` lexicographic; the
   reducer applies in that order regardless of arrival order.
6. A **turn timer + stall detection contract**
   (`tasks/phase-3/01-multiplayer/03-...md` extension + a new task)
   — default 90-second per-peer turn budget, with `WAITING` →
   `STALLED` → `AUTO_END_DAY_OR_FORFEIT` UI states surfaced in the
   multiplayer game screen and a server-relay-free fallback.
7. A **pack-signature enforcement** clause —
   `docs/architecture/pack-contract.md` adds a multiplayer
   `signaturePolicy: "required"` field; ranked play rejects
   `sandboxed: true` and unsigned packs at handshake time, before
   the first command.
8. An **engine-build attestation** field
   (`buildAttestation: { engineHash, bundleSha256, signedBy,
   signature }`) added to the handshake; a CI-built canonical engine
   bundle is the reference, and any peer presenting a different
   `bundleSha256` is rejected from ranked play (allowed in friendly
   matches with a UI warning).
9. A **Byzantine-tolerant bisect** —
   `docs/architecture/bisect-protocol.md` — every midpoint hash is
   MACed with `matchKey` and tagged with the hashing peer's
   `playerId`; both peers exchange their *own* per-prefix hash, not
   just one peer's claim about the other; timeouts on midpoint
   exchanges; fallback to "abort + report unverifiable bisect" if a
   peer is unresponsive or inconsistent.
10. A **blame-attribution rule** in the desync report — record both
    peers' state hashes at every prefix boundary; first prefix where
    they disagree, plus *which* peer's hash first diverged from the
    canonical replay run by the offline tool, becomes the report's
    `attributedPeer` field.
11. A **visibility-precondition on commands** —
    `docs/architecture/command-schema.md` adds a `visibility`
    precondition for tile-targeting commands (`MOVE`, `ATTACK`,
    `CAST_ON_TILE`, `INTERACT_OBJECT`, etc.); the reducer rejects
    any such command whose target is not in the issuing peer's
    `viewWorldVisibleObjects` derivation at the issuance turn.
12. A **draft-preview policy**
    (`docs/architecture/draft-preview-policy.md`) — UI must not run
    `apply(state, draft)` against the canonical reducer for stochastic
    outcomes; previews must show expected value and ranges, never
    pre-rolled samples; if a sample preview is required (e.g.,
    "preview line of sight"), it must consume a non-canonical RNG
    sub-stream that does **not** advance the canonical seed.
13. A **post-match audit pipeline contract**
    (`docs/architecture/replay-audit-pipeline.md` + a new task) —
    optional, opt-in upload of `(commandLog, seed, contentHash,
    engineHash, matchKey-deriving-nonces)` to a back-end that
    (a) re-runs the deterministic reducer, (b) computes per-player
    RNG luck statistics, (c) flags anomalies for human review,
    (d) retains logs per the privacy retention plan (Plan 22).
14. A **peer-reputation / griefer-accounting** rule
    (`docs/architecture/peer-reputation.md`) — signaling-side TTL
    counter on `(peerId, ip-prefix)` for "matches aborted via
    `DESYNC_DETECTED` within 3 turns"; a soft-rate-limit kicks in at
    `≥ 5` aborts in 24 h; cooperates with Plan 25's blocklist
    surface but stays stateless-by-deploy (in-memory, ≤ 24 h TTL).
15. A **CI gate** rejecting (a) a multiplayer task spec missing the
    handshake/MAC/visibility/timer sections, (b) any command schema
    that lacks an explicit `visibility` precondition where applicable,
    (c) any code path under `src/engine/` or `src/rules/` that calls
    the canonical RNG sub-streams from a non-reducer caller (catches
    speculative-apply leaks), (d) any pack manifest used in a
    multiplayer fixture without `signature` set.

This plan **only formalizes missing artifacts** — no gameplay rules
are invented. Where audits 07 / 24 / 25 / 22 / 31 already produced
plans, this plan **defers** to those artifacts and adds only the
integrity, attribution, hidden-information, and audit surfaces unique
to the lockstep simulation boundary.

**Overall readiness state:** 3 / 10 (per audit). Closing the items
below lifts this to 8 / 10, which is the threshold for letting agents
ship a friendly-or-closed-beta M5 multiplayer build. Reaching 10 / 10
would require a server-authoritative or zero-knowledge information
model that this plan deliberately treats as **out of scope** — see
Risk note in Section 6.

---

## 2. Critical Fixes (Must Do First)

These five items are the *active risk surface* (cross-session replay,
host-chosen-seed advantage, undetected pack tamper, free griefing
abort-spam, undefined hidden-information model) and must land before
any public-facing M5 build.

### Critical Fix 1 — Wire Envelope, Match Key, and Cross-Session Binding

**Source:** Q514, Q516, Q517. Risks "Trivial cross-session replay",
"DTLS-only integrity", "Cross-session indistinguishability".

**Problem:**
[`tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)
defines the wire shape `{ seq, playerId, turn, command }` — pure JSON,
no `matchId`, no `matchEpoch`, no MAC, no nonce. Integrity is assumed
from DTLS-SRTP at the WebRTC transport layer (Q517). A peer-side
captured stream is structurally indistinguishable from a fresh stream
in another match with the same `(playerId, seq)`; if the second
match's seed and content hashes happen to align (a host-controlled
quantity today — see Critical Fix 2), the reducer will accept the
captured commands as valid.

**Impact:** A captured replay of even one decisive turn (e.g., an
attack-then-recruit sequence) can be injected into a fresh match by
either the original opponent (collusion exit) or a third-party who
captured the WebRTC payload before encryption (compromised browser /
extension). Detection-by-state-hash only catches the *outcome* once
both peers diverge; if both peers run the same captured stream, no
divergence appears.

**Solution:** Wrap every command in a signed envelope keyed by a
per-match secret derived during the handshake (Critical Fix 2). The
envelope includes the match identifier and an epoch counter, so the
same command body cannot be replayed across matches or after a
mid-match reset.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) — add **Wire Envelope**, **MAC Verification**, **Match Binding** sections; replace the bare `{ seq, playerId, turn, command }` shape with the envelope; extend `verifyCommands` to run `npm run validate:lockstep`
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) — note that DataChannel payloads are envelope-wrapped, not raw JSON; reference the envelope schema
- [docs/architecture/command-schema.md](../architecture/command-schema.md) — register the envelope shape; clarify that the `command` field of the envelope is the existing in-game command record
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — register `lockstep-envelope.schema.json` row with owning task

**New Files:**
- `content-schema/schemas/lockstep-envelope.schema.json` — strict
  `additionalProperties: false`; required fields:
  - `matchId`: UUID v4 (assigned by handshake; never a `roomId`)
  - `matchEpoch`: integer ≥ 0 (incremented on host migration / reconnect-replay; see Plan 07)
  - `seq`: integer ≥ 0
  - `playerId`: UUID v4
  - `turn`: integer ≥ 0
  - `command`: existing in-game command record (passes
    `command.schema.json`)
  - `mac`: 32-byte hex string (HMAC-SHA-256 over the canonical-JSON
    of all preceding fields with the per-match `matchKey`)
- `content-schema/examples/lockstep-envelope/*.json` — at least one
  canonical example per command kind
- `docs/architecture/lockstep-envelope.md` — canonical doctrine:
  field order, canonical-JSON serialization rule (lexicographic key
  sort, no whitespace, integers not strings), MAC input definition,
  rejection behavior (drop, log `LOCKSTEP_MAC_REJECTED`, do not echo
  payload)
- `tasks/phase-3/01-multiplayer/09-lockstep-envelope-and-mac.md` —
  owning task; `ownedPaths` covers
  `content-schema/schemas/lockstep-envelope.schema.json`,
  `src/net/lockstep/envelope.ts`,
  `src/net/lockstep/mac.ts`, the schema-matrix row
- `src/net/lockstep/envelope.ts` — `wrap(matchKey, inner) →
  Envelope`, `unwrap(matchKey, raw) → { ok: true, inner } | { ok:
  false, reason }`
- `src/net/lockstep/mac.ts` — `mac(matchKey, canonicalJson) →
  hex32` using `globalThis.crypto.subtle.sign('HMAC', …)` only;
  *no* `node:crypto` import in the deterministic engine path

**Implementation Steps:**
1. Author `docs/architecture/lockstep-envelope.md` with the field
   order, canonical-JSON rule, and MAC input definition.
2. Define `lockstep-envelope.schema.json` with the seven required
   fields above; pin `mac` `pattern` to `^[a-f0-9]{64}$`.
3. Author canonical example fixtures for at least four representative
   command kinds (`MOVE_HERO`, `END_DAY`, `CAST_SPELL`,
   `RESOLVE_BATTLE_ACTION`).
4. Implement `src/net/lockstep/mac.ts`. The MAC is computed over the
   canonical-JSON of the envelope **with the `mac` field absent**; the
   verifier reconstructs the same canonical-JSON before comparison.
   Constant-time comparison only.
5. Implement `src/net/lockstep/envelope.ts`. `wrap` is called by
   the local-player command pipeline before transmission; `unwrap`
   is the *only* allowed entry point into the lockstep reducer
   queue. Raw JSON never reaches the reducer.
6. Update the lockstep transport to call `unwrap` on every received
   payload; on `ok: false`, drop and emit telemetry
   `LOCKSTEP_MAC_REJECTED` (count only; no payload contents).
7. Add `npm run validate:lockstep` — runs:
   - JSON Schema check on every example fixture
   - Canonical-JSON round-trip equivalence test
   - MAC verify/reject golden tests (positive: known matchKey + known
     payload → known MAC; negative: tampered field → reject)
8. Wire the validator into `npm run validate` and into the
   `verifyCommands` of the new task.
9. Update [tasks/phase-3/01-multiplayer/03-...md](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)
   to depend on task `09` and replace the wire-shape block with a
   pointer to `lockstep-envelope.md`.

**Dependencies:** Critical Fix 2 (`matchKey` derivation must be
specified before MAC verification has a key to consume).

**Complexity:** **M**

---

### Critical Fix 2 — Start-of-Match Commit-Reveal Handshake (Seed, Content, Engine, Pack, Match Key)

**Source:** Q524, Q534, Q536, Q525. Risks "Pack-tamper deception",
"Host-chosen seed advantage", "No documented handshake", "Engine RNG
swap".

**Problem:** `docs/architecture/determinism.md` requires `(seed +
contentHash + engineHash)` to be pinned per match and "fail loud at
load time", but no task documents *how* peers exchange and freeze
those values, who picks the seed, or how a mid-match pack swap is
re-validated. If the host picks the seed unilaterally (the obvious
naive default), the host can pre-compute every PCG32 sub-stream and
optimize their entire match plan against future RNG. If the
`contentHash` is computed locally and presented on the wire without
signature backing (Q535) and without re-validation, a peer can lie
about the pack they actually loaded, especially for visuals or
local-only fields that don't affect outcomes.

**Impact:** Asymmetric RNG advantage is the single largest fairness
risk in the entire multiplayer model — a host who knows that turn 7
will land a critical with 80% probability adjusts strategy
accordingly. Pack tamper that escapes state-hash divergence (visual
swap, locale swap, AI-personality tweak that changes only own-bot
decisions) silently degrades trust in any match outcome.

**Solution:** Specify a three-phase commit-reveal handshake that runs
*before* any in-game command is sent. Both peers contribute equal
entropy to the seed; both peers freeze and exchange `(contentHash,
engineHash, packManifestDigest, buildAttestation)`; both peers derive
the per-match `matchKey` deterministically from the revealed nonces.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) — add **Match Handshake** section as the first message exchanged on the open DataChannel before `seq=0`
- [docs/architecture/determinism.md](../architecture/determinism.md) — add a **Seed Establishment Protocol** subsection; reference the new doctrine doc; explicitly forbid host-unilateral seeds in multiplayer
- [docs/architecture/state-flow.md](../architecture/state-flow.md) — add the handshake as the upstream gate before any command enters the reducer
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) — register `packManifestDigest` as the canonical-JSON xxh64 over `manifest.json` (pinned definition; not just any hash)
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — register `match-handshake.schema.json` row

**New Files:**
- `content-schema/schemas/match-handshake.schema.json` —
  discriminated union keyed by `phase`:
  - `COMMIT`: `{ phase, peerId, commit }` where `commit =
    xxh64(nonce ∥ contentHash ∥ engineHash ∥ packManifestDigest ∥
    bundleSha256 ∥ signaturePolicy)`
  - `REVEAL`: `{ phase, peerId, nonce, contentHash, engineHash,
    packManifestDigest, bundleSha256, signaturePolicy,
    packSignature }`
  - `ACCEPT`: `{ phase, peerId, matchId }` (echoes the agreed
    `matchId` derived as `xxh64(nonceA ∥ nonceB)`)
  - `ABORT`: `{ phase, peerId, reason }` (one of
    `COMMIT_MISMATCH`, `CONTENT_HASH_MISMATCH`,
    `ENGINE_HASH_MISMATCH`, `PACK_DIGEST_MISMATCH`,
    `BUILD_ATTESTATION_MISMATCH`, `PACK_SIGNATURE_REQUIRED`,
    `PACK_SIGNATURE_INVALID`)
- `content-schema/examples/match-handshake/*.json` — canonical
  example for every phase
- `docs/architecture/match-handshake.md` — canonical doctrine:
  three phases, derivation rules:
  - `seed = xxh64(nonceA ∥ nonceB)` (lexicographic peerId order on
    concatenation; specify exact byte order)
  - `matchId = xxh64("matchId-v1" ∥ nonceA ∥ nonceB)`
  - `matchKey = HKDF-SHA-256(salt = "lockstep-mac-v1", ikm =
    nonceA ∥ nonceB, length = 32)`
  - reject conditions: any reveal whose `commit` does not equal
    `xxh64(reveal-fields)`, any disagreement on the pinned values,
    any unsigned pack when `signaturePolicy = "required"`, any
    `bundleSha256` outside the allow-list when running in ranked
    mode
- `tasks/phase-3/01-multiplayer/10-match-handshake-protocol.md` —
  owning task; `ownedPaths` covers
  `content-schema/schemas/match-handshake.schema.json`,
  `src/net/lockstep/handshake.ts`, the schema-matrix row
- `src/net/lockstep/handshake.ts` — `runHandshake(channel,
  localContext) → { ok: true, seed, matchId, matchKey,
  matchEpoch: 0 } | { ok: false, reason }`
- `src/content-runtime/manifest-digest.ts` — pinned canonical-JSON
  xxh64 over `manifest.json` (so two peers with the same pack
  always derive the same digest; not a free choice of hash
  function)

**Implementation Steps:**
1. Author `docs/architecture/match-handshake.md`. Pin every byte
   order, canonical-JSON rule, and KDF parameter explicitly.
2. Define `match-handshake.schema.json` with all four phases.
3. Author the example fixtures (commit, reveal, accept, abort × 7
   reasons).
4. Implement `src/content-runtime/manifest-digest.ts`.
5. Implement `src/net/lockstep/handshake.ts`. Each peer:
   - generates 32-byte random `nonce` via `crypto.getRandomValues`
     (out of the deterministic path)
   - sends `COMMIT`
   - waits for opponent `COMMIT`
   - sends `REVEAL`
   - waits for opponent `REVEAL` and verifies the commit
   - validates the four pinned values against local computation
   - if `signaturePolicy = "required"`, validates the opponent's
     `packSignature` against the trusted-key list (Plan 25 owns the
     key list on the signaling side; this plan only consumes it)
   - validates the opponent's `bundleSha256` against the allow-list
     (ranked) or surfaces a UI warning (friendly)
   - emits `ACCEPT` and waits for the opponent's `ACCEPT`
6. Update [tasks/phase-3/01-multiplayer/02-...md](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
   so the very first DataChannel send is the `COMMIT` message; no
   in-game `seq=0` command is permitted before both `ACCEPT` are
   exchanged.
7. Add a per-turn re-validation rule: at end-of-turn, alongside the
   state-hash exchange, peers re-send their `packManifestDigest`. Any
   mid-match drift triggers a `MID_MATCH_PACK_SWAP` desync abort.
8. Add `npm run validate:handshake` golden tests for derivation and
   abort reasons; wire into `npm run validate`.
9. Update [docs/architecture/determinism.md](../architecture/determinism.md)
   "Seeded RNG" section: in single-player and replay, the seed is
   pinned by save metadata; in multiplayer, the seed is **always**
   the commit-reveal output. Forbid the host-unilateral path
   explicitly.

**Dependencies:** Critical Fix 5 (security model) for the
"signaturePolicy required vs. allowed" decision rule; Plan 25
(signed-pack key list) for the trust anchor; Plan 07 (matchEpoch
on host migration / reconnect) for `matchEpoch` semantics.

**Complexity:** **L**

---

### Critical Fix 3 — Sequence Validation Rules + Canonical Intra-Turn Order

**Source:** Q515, Q518. Risks "Duplicate-command policy undefined",
"No canonical intra-turn order".

**Problem:**
[`tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)
defines a `seq` field and an "ordered by `seq`" delivery rule but
specifies *no validation rule* at the receiver. Q145 of audit 07
already flagged duplicate-command policy as undefined. Worse, when two
peers both submit commands tagged with the same `turn` (the normal
case for any same-turn interaction), the spec only says "wait for all
peers' same-turn commands before advancing" without pinning a
canonical *order* for application — yet the per-turn state hash
*depends* on application order. The hash-exchange catch fires only
*after* a divergence; without a pinned order, that divergence is the
default rather than the exception.

**Impact:** Without validation rules: duplicate `(playerId, seq)`
delivery (legitimately possible under retransmit) silently double-
applies a command, producing a desync the bisect tool then chases as
if it were a tamper. Skip-ahead: a peer that drops `seq=N` and accepts
`seq=N+1` produces a phantom-state desync. Without intra-turn
ordering: every multi-peer turn races to a different order on each
peer based on packet arrival, producing a desync on the first turn
both peers act in.

**Solution:** Pin both the receiver validation rules and the
canonical intra-turn application order in the lockstep task spec.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) — add **Sequence Validation**, **Canonical Intra-Turn Order**, **Duplicate-Command Policy** sections
- [docs/architecture/determinism.md](../architecture/determinism.md) — cross-link the canonical order rule from the "Determinism" section; pin it as a determinism contract (not a transport detail)
- [docs/architecture/command-schema.md](../architecture/command-schema.md) — note the precondition: `seq` is per-`(playerId, matchEpoch)` monotonic; cross-link to lockstep envelope

**New Files:**
- `src/net/lockstep/sequence.ts` — pure stateless predicates:
  - `isValidSeq(envelope, lastApplied[playerId]): boolean`
  - `canonicalOrder(envelopes: Envelope[]): Envelope[]` — sort by
    `(turn ascending, playerId lexicographic ascending, seq
    ascending)`; stable sort
- `src/net/lockstep/queue.ts` — per-peer receive buffer enforcing
  the canonical order before handing batches to the reducer

**Implementation Steps:**
1. Pin the validation rules in the task spec:
   - drop on `seq <= lastApplied[playerId]`
   - drop on `seq > lastApplied[playerId] + 1` until contiguous (do
     not buffer beyond `MAX_OUT_OF_ORDER = 64`; reject with
     `LOCKSTEP_SEQ_GAP` beyond that)
   - reject duplicate `(playerId, matchEpoch, seq)` after delivery
   - reject any `seq` whose `turn` differs from the receiver's
     known `(turn, matchEpoch)` window
2. Pin the canonical intra-turn order rule:
   `sort by (turn ascending, playerId lexicographic ascending, seq
   ascending)`. The reducer applies in that order regardless of
   arrival order.
3. Implement `src/net/lockstep/sequence.ts` and
   `src/net/lockstep/queue.ts`. Both are pure-deterministic; no
   wall-clock, no `Date.now()`.
4. Add golden tests:
   - duplicate-`seq` delivery → second drop, no double-apply
   - skip-ahead delivery → buffer until contiguous; gap beyond 64
     → reject
   - same-turn commands from peers A and B in arbitrary arrival
     order → reducer applies in canonical order on both peers
5. Update [tasks/phase-3/01-multiplayer/04-...md](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md):
   the per-turn state-hash check now operates on the *canonical
   order*, not arrival order. Document that the hash-exchange
   continues to function as the final integrity gate.
6. Add `npm run validate:lockstep` cases for the sequence rules.

**Dependencies:** Critical Fix 1 (envelope must already define
`matchEpoch` as a sequence-binding field).

**Complexity:** **M**

---

### Critical Fix 4 — Turn Timer & Stall Detection

**Source:** Q523. Risks "Stalling / griefing", "No turn timer".

**Problem:**
[`tasks/phase-3/01-multiplayer/03-...md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)
gates turn advance on "all peers' same-turn commands". A peer that
connects, completes the handshake, then sits idle blocks the gate
indefinitely. The 120-second forfeit-or-wait offer in
[`06-...md`](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md)
only triggers on *disconnection*. There is no defined behavior for a
connected-but-silent peer.

**Impact:** Asymmetric DoS: a malicious peer joins ranked matches and
just doesn't end the day. Every match they enter ties up the opponent
indefinitely until the opponent quits (which counts as their forfeit
in any future ladder system). Combined with desync-grief (Q521), this
is the single most likely abuse pattern in early M5.

**Solution:** Define a per-peer turn budget with three escalation
states surfaced to the opponent's UI; auto-emit `END_DAY` at the
threshold to keep gameplay deterministic.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) — add **Turn Timer & Stall Detection** section
- [docs/architecture/wiki/screens/63-multiplayer-game/spec.md](../architecture/wiki/screens/63-multiplayer-game/spec.md) — surface the three states (`waiting`, `stalled`, `auto-ended`); see Improvement under UI / Screens for the screen package itself
- [docs/architecture/command-schema.md](../architecture/command-schema.md) — register `END_DAY_AUTO` discriminator on `END_DAY` (`source: 'manual' | 'auto-timeout'`)

**New Files:**
- `tasks/phase-3/01-multiplayer/11-turn-timer-and-stall-detection.md` —
  owning task; `ownedPaths` covers
  `src/net/lockstep/turn-timer.ts`, the screen-spec entries, the
  command-schema row
- `src/net/lockstep/turn-timer.ts` — wall-clock-driven (this is
  *not* a deterministic gameplay value; the *effect* is the
  auto-`END_DAY` command which is itself canonical because both
  peers run the same timer rule):
  - `WAITING` state from turn start
  - `STALLED` state at `WAITING_THRESHOLD_MS = 30_000`
  - `AUTO_END_DAY` at `STALL_LIMIT_MS = 90_000`
- `docs/architecture/turn-timer.md` — canonical doctrine: timer
  values are *configurable per scenario* (single source of truth
  in pack metadata `multiplayer.turnTimerMs`), default 90 s for
  ranked, configurable in friendly. The auto-`END_DAY` command
  is canonical and goes through the envelope/MAC pipeline like
  any other command — so it appears in the canonical command log
  and is replayable.

**Implementation Steps:**
1. Author `docs/architecture/turn-timer.md` with the three states
   and threshold matrix.
2. Implement `src/net/lockstep/turn-timer.ts`. Use
   `performance.now()` (this is a non-deterministic UI / transport
   path, *not* the deterministic engine path; document that the
   auto-`END_DAY` command becomes canonical only when both peers
   independently emit it, and the canonical path is the command
   itself).
3. Surface the three states in the multiplayer game screen package
   (see Improvement: UI / Screens).
4. Update the command schema with the `source` discriminator on
   `END_DAY`.
5. Add the `multiplayer.turnTimerMs` field to
   `content-schema/schemas/manifest.schema.json` (pack-level
   override, optional, default 90 000).
6. Golden tests: simulated wall-clock advance triggers
   `STALLED` then `AUTO_END_DAY`; the resulting envelope passes
   the canonical-order rule.

**Dependencies:** Critical Fix 1 (envelope) so the auto-`END_DAY`
command is wrapped and signed like any other; Plan 07's
disconnection forfeit policy (separate from this; this is the
*connected-but-idle* gap).

**Complexity:** **M**

---

### Critical Fix 5 — Security Model Doctrine + Visibility Preconditions on Commands

**Source:** Q528, Q529, Q531, Q532, Q530. Risks "Information cheats
unsolvable under symmetric lockstep", "Visibility precondition
missing", "Maphack inherent and unacknowledged".

**Problem:** The architecture is symmetric input-only lockstep, which
*by construction* puts the full canonical state on every client —
including the entire map, all enemy stacks, scripted objects, AI bot
internals, and hidden hero stats. The `viewWorldVisibleObjects`
selector hides them in the UI layer only. There is no explicit
acknowledgement of this in primary docs (Q531) — a new contributor
reading `determinism.md` or `pack-contract.md` would not learn that
fog-of-war secrecy and "hidden hero stats pre-reveal" are *not*
protected. Worse, the reducer accepts tile-targeting commands without
any visibility precondition (Q532), so a hand-crafted command that
targets a fog-covered tile is accepted, producing an information leak
*and* an unintended canonical effect.

**Impact:** Two distinct failure modes. (a) **Information leak via
local read** (Q530) is *inherent* to the chosen netcode; we cannot
fix it without redesigning toward server-authoritative or
zero-knowledge. We can only acknowledge it in writing so downstream
features and AI implementers don't assume a protection that doesn't
exist. (b) **Information leak via crafted command** (Q532) *is*
fixable: the reducer can reject a `MOVE_HERO` whose target is not in
the issuer's `viewWorldVisibleObjects` projection. Without that gate,
a scripted client can probe map contents by submitting commands and
observing whether they're applied vs. rejected.

**Solution:** Author a single canonical security-model doctrine
that both (a) states the limitations honestly and (b) defines the
visibility-precondition contract on commands.

**Files to Update:**
- [docs/architecture/determinism.md](../architecture/determinism.md) — cross-link to security model in the "What determinism does and does not give you" section
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) — cross-link
- [docs/architecture/master-plan.md](../architecture/master-plan.md) — register the security-model doc in the architecture doc index
- [docs/architecture/command-schema.md](../architecture/command-schema.md) — add a `visibility` precondition field to the command-record contract: each command kind declares `visibility: 'none' | 'tile' | 'object' | 'hero'`, where `tile` requires the issuing peer's `viewWorldVisibleObjects(turn)` to include the target tile, `object` requires it to include the target object id, etc.
- [docs/architecture/effect-registry.md](../architecture/effect-registry.md) — note that effects are *applied* only after visibility-precondition checks pass; the precondition lives on the command, not on individual effects
- [docs/architecture/wiki/screens/07-adventure-map/spec.md](../architecture/wiki/screens/07-adventure-map/spec.md) — note that the UI's fog mask and the reducer's visibility precondition are *both* enforced; UI is presentation, reducer is canonical
- [docs/architecture/wiki/screens/16-view-world/spec.md](../architecture/wiki/screens/16-view-world/spec.md) — same note
- [CLAUDE.md](../../CLAUDE.md) — add `docs/architecture/security-model.md` to the **Read first** list and the **Protect These Rules** list ("information secrecy is not provided by symmetric lockstep")

**New Files:**
- `docs/architecture/security-model.md` — canonical doctrine. Sections:
  - **What symmetric input-only lockstep protects**: outcome-altering tampers (caught by per-turn state-hash exchange), pack swaps (caught by handshake + per-turn manifest re-validation), RNG-implementation swaps that *change outcomes* (caught by state-hash divergence)
  - **What it does not protect**: information leaks via local memory read (maphacks, hidden-stat reveal, AI-plan inspection), speculative-apply oracles unless explicitly disallowed, host-chosen-seed advantage unless commit-reveal is used
  - **Mitigations in this codebase**: visibility precondition on commands (this fix), draft-preview policy (Improvement), commit-reveal seed (Critical Fix 2), pack signature requirement (Improvement), engine bundle attestation (Improvement)
  - **Inherent limits**: zero-knowledge / server-authoritative information hiding is *out of scope* for M5; ranked / competitive modes that require information secrecy must wait for a redesign
  - **Threat model summary**: a malicious peer can read memory and predict any value visible in canonical state on their own client; they cannot persistently affect the canonical match outcome without producing a state-hash divergence at turn-end
- `src/engine/visibility/precondition.ts` — pure function
  `checkVisibilityPrecondition(state, command, issuingPeer): { ok:
  true } | { ok: false, reason: 'TILE_NOT_VISIBLE' |
  'OBJECT_NOT_VISIBLE' | 'HERO_NOT_OWNED' }` — re-uses the
  existing `viewWorldVisibleObjects` selector
- `tasks/phase-3/01-multiplayer/12-visibility-preconditions-on-commands.md` — owning task
- `tasks/phase-3/01-multiplayer/13-security-model-and-doctrine.md` — owning task for the doctrine doc + CLAUDE.md cross-links

**Implementation Steps:**
1. Author `docs/architecture/security-model.md` with the four
   sections above. Include a worked example: "If the user opens
   devtools and inspects engine state, what can they learn? The
   full map, full enemy stacks, full hidden hero stats, the AI
   bot's planned moves for the next turn. This is *not* a bug;
   it is a property of input-only lockstep."
2. Cross-link from [`CLAUDE.md`](../../CLAUDE.md) "Read first"
   (item 11 onward) and "Protect These Rules". This is the most
   important integration point — autonomous agents must encounter
   the doctrine before they design downstream features.
3. Add the `visibility` precondition declaration to every existing
   command in [docs/architecture/command-schema.md](../architecture/command-schema.md).
   Walk every command kind:
   - `MOVE_HERO`, `ATTACK`, `CAST_ON_TILE`,
     `INTERACT_OBJECT`, `RECRUIT_FROM_DWELLING`,
     `VISIT_TOWN`, `EXPLORE` → `visibility: 'tile' | 'object'`
   - `END_DAY`, `RECRUIT_FROM_OWN_TOWN`, `LEARN_SPELL`,
     `EQUIP_ARTIFACT`, etc. → `visibility: 'none'`
   - Battle-context commands → `visibility: 'battle-cell'` (a new
     enum value) where the cell must be reachable from the
     issuing creature
4. Implement `src/engine/visibility/precondition.ts`. The
   function is *pure* and takes the *issuing peer's projection*
   of state at the issuance turn, not the live state. (Issuance
   turn is in the envelope.)
5. Wire the check into the lockstep reducer entry point: every
   command runs `checkVisibilityPrecondition(state, command,
   issuingPeer)` before any effect resolution. On `ok: false`,
   the command is *rejected canonically* (i.e., both peers
   reject it identically based on the canonical state) and the
   issuing peer's UI receives a `COMMAND_REJECTED_PRECONDITION`
   telemetry event.
6. Golden tests:
   - `MOVE_HERO` to a fog-covered tile → reject on both peers
   - `MOVE_HERO` to a tile in `viewWorldVisibleObjects` → accept
   - hand-crafted `ATTACK` against an unrevealed enemy stack →
     reject; canonical state-hash unchanged
7. Update screen specs `07-adventure-map` and `16-view-world` to
   note the *two-layer* enforcement (UI fog mask + reducer
   precondition).

**Dependencies:** None for the doctrine doc. The visibility
precondition depends on the existing
`viewWorldVisibleObjects` selector being available (already
shipped in the screen specs).

**Complexity:** **L**

---

## 3. System Improvements

Grouped by system. These are non-critical-path improvements that
close the remaining ⚠ Partial / ❌ items beyond the five Critical
Fixes.

### UI / Screens

#### Issue: Multiplayer game-screen surface for stalled / desynced / aborted states

**Source:** Q521, Q523, Q520. Risks "Stalling unaddressed in UI",
"Bisect report does not name peer".

**Problem:** Screen package
[`docs/architecture/wiki/screens/62-multiplayer-setup/`](../architecture/wiki/screens/62-multiplayer-setup/)
exists for the lobby, but no screen package exists for the
*in-match* multiplayer status surface. The bisect-report and
stall states (Critical Fix 4) need a UI home. Audit
[`08-multiplayer-ui-lobby-invite-link-in-game-status.md`](../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md)
references "in-game status" but does not own a numbered screen
package per the wiki convention.

**Solution:** Add screen package `63-multiplayer-game/`.

**Files to Update:**
- [docs/architecture/wiki/screens/index.json](../architecture/wiki/screens/index.json) — register package `63-multiplayer-game` in the Multiplayer group
- [tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md](../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md) — split: lobby/invite-link stays here; the in-game status surface moves to a new owning task with the new screen package

**New Files:**
- `docs/architecture/wiki/screens/63-multiplayer-game/mockup.html` — visual mock of the in-match status overlay
- `docs/architecture/wiki/screens/63-multiplayer-game/spec.md` — components: `OpponentTurnIndicator` (`waiting | stalled | auto-ended | disconnected`), `DesyncBanner`, `BisectReportPanel`, `MatchKeyDisplay` (debug-only), `EnvelopeStats`
- `docs/architecture/wiki/screens/63-multiplayer-game/interactions.md` — per-control: "Show bisect report → Quit match", "Continue (allowed only if peer reconnects within Plan 07's window)"
- `docs/architecture/wiki/screens/63-multiplayer-game/data-contracts.md` — schemas: opponent state object (`{ status, lastActionTurn, ms-since-last-input, attributedAbortPeer? }`)
- `docs/architecture/wiki/screens/63-multiplayer-game/architecture.md` — diagram of how the UI consumes telemetry from `src/net/lockstep/turn-timer.ts`, `bisect.ts`, and `desync.ts`
- `tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md`

**Implementation Steps:**
1. Build the screen package per the five-file convention
   (`mockup.html`, `spec.md`, `interactions.md`, `data-contracts.md`,
   `architecture.md`).
2. Register in [`index.json`](../architecture/wiki/screens/index.json).
3. Re-run `npm run generate:wiki` to fold into the architecture
   wiki HTML.
4. Split the in-game-status responsibility off [`08-...md`](../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md) into the new task.

**Dependencies:** Critical Fix 4 (turn timer states), the
blame-attribution improvement below (`attributedAbortPeer`).

**Complexity:** **M**

---

#### Issue: Draft-preview policy in adventure-map and battle UIs

**Source:** Q538. Risk "Speculative-apply leak".

**Problem:** The state-flow doc shows commands enter the reducer at
`F → O`. The reducer is pure and deterministic, so a UI that runs
`apply(state, draftCommand)` for a "preview attack outcome"
affordance lets the player iteratively probe RNG outcomes pre-commit.
No "no preview of stochastic outcomes" rule is written.

**Solution:** Author the policy and back it with a CI gate that
detects misuse.

**Files to Update:**
- [docs/architecture/wiki/screens/07-adventure-map/spec.md](../architecture/wiki/screens/07-adventure-map/spec.md) — add **Preview Affordances** subsection: previews show expected value and ranges, never pre-rolled samples
- [docs/architecture/wiki/screens/35-battle-action/spec.md](../architecture/wiki/screens/35-battle-action/spec.md) (if exists; otherwise the battle screen package per the wiki) — same
- [docs/architecture/effect-registry.md](../architecture/effect-registry.md) — note that effects with `stochastic: true` MUST NOT be invoked from any non-canonical caller

**New Files:**
- `docs/architecture/draft-preview-policy.md` — canonical doctrine:
  - rule: UI previews must compute *closed-form* expected values and
    ranges from effect parameters; they may *not* call
    `apply(state, draftCommand)` against the canonical reducer for
    any stochastic effect
  - exception: a "preview tile traversal" or "preview line of
    sight" that is purely deterministic (no `random()` call) is
    allowed and must be marked `@deterministic-preview` in source
  - if a sample preview is genuinely needed (rare; e.g., "show 5
    representative damage rolls"), it must consume a *separate*
    PCG32 sub-stream seeded from `('preview', commandId)` that
    never re-enters the canonical seed advancement
- `tools/lint/no-stochastic-preview.ts` — AST lint that scans
  `src/ui/` for any call to a function under `src/engine/`,
  `src/rules/`, or `src/content-runtime/` whose name matches
  `apply*` or `simulate*`; rejects unless the call site is marked
  `@deterministic-preview`

**Implementation Steps:**
1. Author `docs/architecture/draft-preview-policy.md`.
2. Add the preview-affordance subsections to the adventure-map and
   battle screen specs.
3. Implement `tools/lint/no-stochastic-preview.ts` as a
   `npm run lint:no-stochastic-preview` script; wire into
   `npm run validate`.
4. Cross-link the policy from `security-model.md` (Critical Fix 5)
   under "Mitigations in this codebase".

**Dependencies:** Critical Fix 5 (security model doc must exist
before this can cross-link to it).

**Complexity:** **M**

---

### Data Contracts

#### Issue: Pack-signature mandate in multiplayer; engine-build attestation

**Source:** Q525, Q535. Risks "Pack-tamper deception",
"Engine-binary swap undetectable".

**Problem:** `docs/architecture/pack-contract.md` already defines an
*optional* `signature` field. There is no requirement that
multiplayer reject unsigned packs, no key-distribution scheme, no
canonical signing authority, no runtime enforcement that the
locally-loaded pack's signature was actually verified before
reporting `contentHash` to the peer. Separately, no engine-binary
attestation exists — a peer running a doctored build whose RNG
agrees on canonical paths but leaks information or biases edge cases
is undetectable.

**Solution:** Make pack signature required for ranked multiplayer;
add an engine-bundle SHA attestation to the handshake (Critical Fix
2 already places the field; this Improvement specifies the policy
and the trust list).

**Files to Update:**
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) — add **Signature Policy** section: `signaturePolicy: "optional" | "required-friendly" | "required-ranked"`; default `optional`; ranked play sets `required-ranked` and rejects unsigned and `sandboxed: true` packs at handshake
- [docs/architecture/match-handshake.md](../architecture/match-handshake.md) (created in Critical Fix 2) — pin the rejection table for unsigned / sandboxed / unknown-key
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json) — make `signature.scheme` an enum (`ed25519` only for now; key id format pinned)

**New Files:**
- `docs/architecture/build-attestation.md` — canonical doctrine:
  - the canonical engine bundle is built by CI from a tagged
    commit; the build emits `bundleSha256` and an `ed25519`
    signature over `(engineHash, bundleSha256, buildCommitSha)`
  - the trust-list of acceptable signers lives in
    `services/signaling/config/build-attestation.allow.json`
    (Plan 25's signaling-config surface) and is consumed by both
    peers during the handshake
  - friendly matches: warn-only on attestation mismatch
  - ranked matches: hard reject
- `tasks/phase-3/01-multiplayer/15-pack-signature-and-build-attestation-policy.md`
- `services/signaling/config/build-attestation.allow.example.json`
  (placeholder; real keys come from Plan 25's secret management)

**Implementation Steps:**
1. Add `signaturePolicy` and the rejection table to the pack
   contract.
2. Author `build-attestation.md`.
3. Add the allow-list example file.
4. Update the handshake implementation
   (`src/net/lockstep/handshake.ts`, Critical Fix 2) to consume the
   allow-list and emit `BUILD_ATTESTATION_MISMATCH` /
   `PACK_SIGNATURE_REQUIRED` / `PACK_SIGNATURE_INVALID` aborts
   per the pinned table.
5. Add CI gate `npm run validate:build-attestation` that asserts
   the allow-list file is present, well-formed, and the example
   keys are placeholders (no real keys committed).

**Dependencies:** Critical Fix 2 (handshake schema already has the
fields).

**Complexity:** **M**

---

### Schemas

Already covered in Critical Fixes 1–3:
`lockstep-envelope.schema.json` (Fix 1),
`match-handshake.schema.json` (Fix 2), and the
`visibility`-precondition extensions to `command.schema.json` (Fix
5). Listed here only as a pointer for the schema-matrix /
validate-tasks gate.

**Files to Update:**
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — register the two new schemas with their owning tasks (`09` and `10` from this plan)

**Complexity:** **S**

---

### Architecture

#### Issue: Byzantine-tolerant bisect protocol

**Source:** Q522. Risks "Bisect protocol is not Byzantine-tolerant".

**Problem:**
[`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)
specifies the binary-search algorithm but not the adversarial model.
A malicious peer can lie about its midpoint hash, refuse to
participate (stalling the bisect indefinitely), or replay an old
hash from a different match.

**Solution:** Pin the protocol with MACed midpoint hashes, two-way
exchange, timeouts, and a "report unverifiable bisect" fallback.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md) — add **Byzantine Handling** section

**New Files:**
- `docs/architecture/bisect-protocol.md` — canonical doctrine:
  - every midpoint hash is wrapped in a lockstep envelope with a
    distinct `command` discriminator (`BISECT_MIDPOINT`) and is
    therefore MACed under `matchKey` — replay across matches is
    impossible
  - both peers exchange their *own* per-prefix hash at every
    midpoint (so the report can attribute the divergence rather
    than trust one peer's claim about the other)
  - per-step timeout: 10 s; on miss, fallback to "report
    unverifiable bisect" with the last-good prefix index
  - if the two peers disagree on midpoint hashes for the *first*
    prefix already, the divergence is at turn 0 → the report
    points to the handshake (likely a build-attestation or
    pack-signature gap)

**Implementation Steps:**
1. Author `docs/architecture/bisect-protocol.md`.
2. Update the bisect task spec with the **Byzantine Handling**
   section.
3. Update `src/net/lockstep/bisect.ts` (owned by task 05) to wrap
   midpoint exchanges in the lockstep envelope; add the timeout
   and fallback path.
4. Add a `BISECT_MIDPOINT` envelope variant to
   `lockstep-envelope.schema.json`.
5. Golden tests:
   - lying peer: midpoint hash inconsistent with the prefix → the
     report attributes to that peer
   - silent peer: midpoint timeout → fallback report

**Dependencies:** Critical Fix 1 (envelope MAC must exist before
midpoint hashes can be MACed).

**Complexity:** **M**

---

#### Issue: Blame attribution in the desync report

**Source:** Q521. Risks "Free griefing aborts", "No attribution".

**Problem:**
[`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)
identifies the *command index* of divergence but not *which peer*
diverged. Every desync looks like a tie, so a malicious peer pays
no cost for repeated griefing aborts.

**Solution:** Add `attributedPeer` to the desync report by
comparing each peer's exchanged per-prefix hashes against the
canonical replay run by the offline tool.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md) — extend the report shape to include `attributedPeer` and `attributionConfidence`
- [docs/architecture/wiki/screens/63-multiplayer-game/data-contracts.md](../architecture/wiki/screens/63-multiplayer-game/data-contracts.md) — surface `attributedAbortPeer` to the bisect-report panel
- [docs/architecture/peer-reputation.md](../architecture/peer-reputation.md) (new — see next Issue) — define how `attributedPeer` feeds the reputation counter

**Implementation Steps:**
1. Update the bisect tool to emit `(commandIndex, command,
   preMismatchHash, postMismatchHash, peerAHash, peerBHash,
   canonicalHash, attributedPeer, attributionConfidence)`.
2. Surface `attributedPeer` in the `BisectReportPanel` UI.
3. Add the `attributedPeer` to the (opt-in) post-match telemetry
   that feeds the audit pipeline (Improvement: Audit Pipeline).
4. Confidence rule: `'high'` when only one peer's per-prefix hash
   matches canonical; `'low'` when neither matches (rare; the
   bisect tool's own canonical replay is the tiebreaker).

**Dependencies:** Critical Fix 1 (MACed midpoints prevent forged
attribution); the canonical replay capability already exists in
`docs/architecture/determinism.md` ("Replay API").

**Complexity:** **M**

---

#### Issue: Peer reputation / griefer accounting

**Source:** Q521. Risks "Asymmetric DoS via desync grief".

**Problem:** No peer-reputation system, no rate-limit on
report-and-quit cycles, no consequence for repeat aborters. The
signaling server is stateless-by-deploy and cannot ban offenders.

**Solution:** Add a *bounded* in-memory counter on the signaling
side, keyed by `(peerId, ip-prefix)`, with a 24-hour TTL and a
soft-rate-limit at five attributed aborts. Cooperates with Plan
25's blocklist surface but does not introduce persistence.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) — add **Peer Reputation** subsection (cross-links Plan 25)
- [docs/architecture/signaling-stateless-invariant.md](../architecture/signaling-stateless-invariant.md) (created by Plan 25) — pin that the reputation counter is in-memory, TTL-bound, and explicitly allowed under the stateless invariant

**New Files:**
- `docs/architecture/peer-reputation.md` — canonical doctrine:
  - counter key: `(peerId, /24-or-/64 ip-prefix)`
  - TTL: 24 h
  - increment on: `DESYNC_DETECTED` *with* `attributedPeer ==
    self` and within first 3 turns of a match (heuristic for
    "intentional grief" rather than late-game-divergence-bug)
  - threshold: ≥ 5 attributed aborts in 24 h → soft-rate-limit
    (cannot create or join a new room for the remainder of the
    TTL window; existing matches unaffected)
  - escalation: handed off to Plan 25's blocklist surface, *not*
    persisted by this system
- `tasks/phase-3/01-multiplayer/16-peer-reputation-counter.md`
- `services/signaling/src/reputation/counter.ts` — in-memory
  bounded LRU; metric `signaling_reputation_aborts_total{peerId,
  prefix}` exposed on the admin port (Plan 25)

**Implementation Steps:**
1. Author `docs/architecture/peer-reputation.md`.
2. Implement `services/signaling/src/reputation/counter.ts`. The
   counter receives an `(opt-in)` post-match
   `MATCH_ABORTED_DESYNC` notification from each peer's lockstep
   layer (this is *separate* from the audit pipeline; this is a
   one-shot signaling notification, no command log).
3. Wire the soft-rate-limit at the signaling-server admit gate
   (`CREATE_ROOM` / `JOIN_ROOM`).
4. Cross-link from Plan 25's blocklist doctrine.

**Dependencies:** Critical Fix 1 (blame attribution feeds the
counter), Plan 25 (signaling stateless-invariant + blocklist).

**Complexity:** **M**

---

#### Issue: Post-match audit pipeline

**Source:** Q539. Risks "No anti-cheat tool that consumes
replays".

**Problem:** Replays exist mechanically (canonical command log +
seed + content hash + engine hash uniquely reproduce the entire
match), but no audit pipeline, ingestion path, or back-end is
documented. No statistical-anomaly detector, no retention policy
for command logs, no anti-cheat tool that consumes replays.

**Solution:** Specify the pipeline contract; build a minimal
batch-replay tool; defer the back-end ingestion to Plan 22
(privacy / retention) for retention semantics and Plan 31 (trust
boundaries / logging) for transport semantics.

**Files to Update:**
- [docs/architecture/determinism.md](../architecture/determinism.md) — cross-link to the new pipeline doc

**New Files:**
- `docs/architecture/replay-audit-pipeline.md` — canonical
  doctrine:
  - opt-in: at end-of-match, the lobby UI offers "Submit replay
    for analysis"; consent is recorded per Plan 23 (consent UX)
  - upload payload: `(commandLog, seed, contentHash, engineHash,
    handshakeNonces, attributedPeer, matchOutcome)` — *no
    personally identifying material*
  - back-end: a separate service `services/audit-pipeline/`
    (declared but not implemented in this plan; ownership
    transferred to a future "audit pipeline" task in Phase 4)
  - retention: per Plan 22 — default 30 days for raw logs, 1
    year for aggregated statistics
  - anomaly detection (initial, conservative): per-player RNG
    luck (Bernoulli p-value over coin-flip-equivalent decisions),
    win-rate-vs-expected, abort-pattern clustering
- `tasks/phase-3/01-multiplayer/17-replay-audit-pipeline-contract.md`
  — owns *only the contract and the local batch-replay CLI*; the
  back-end service is a Phase-4 follow-up
- `tools/replay/batch-replay.ts` — local CLI that takes a
  replay JSON file and re-runs the deterministic reducer; used
  for human review and golden tests

**Implementation Steps:**
1. Author `docs/architecture/replay-audit-pipeline.md`.
2. Implement `tools/replay/batch-replay.ts`. Re-uses the
   existing `Replay API` (per `determinism.md`); no new engine
   surface required.
3. Add a `npm run replay:audit -- <path>` script.
4. Add the opt-in surface to
   `docs/architecture/wiki/screens/63-multiplayer-game/spec.md`
   (post-match summary).
5. Cross-link Plan 22 (retention) and Plan 23 (consent).

**Dependencies:** Critical Fix 5 (security model frames the audit
pipeline as detection-honest, not a magic anti-cheat); Critical
Fix 1 (envelope MACs make the command log self-authenticating);
Plan 22 + Plan 23 for the privacy and consent surfaces.

**Complexity:** **L**

---

#### Issue: Spectator-stream verification (deferred)

**Source:** Q526. Risk "Out-of-scope but undefined".

**Problem:** Spectator mode is out of M5 scope (audit 07 Q140).
There is no design for spectator stream verification today.
Future addition without a plan would inherit all the gaps in this
audit *plus* the spectator-specific surface (multi-recipient
broadcast, fan-out integrity).

**Solution:** Pin the *requirements* for the future spectator
mode now, so when it lands it lands correctly.

**New Files:**
- `docs/architecture/spectator-mode-requirements.md` — sections:
  - spectators receive the canonical command log + handshake
    nonces from the host *or* from a relay; either way, the log
    is self-authenticating via envelope MACs (Critical Fix 1)
  - spectators run the same deterministic reducer; the spectator
    UI applies the same `viewWorldVisibleObjects` projection as
    the player UI (so spectator-perspective fog respects player
    visibility)
  - the spectator client *does not* sign or accept commands of
    its own; it is read-only
  - the host *cannot* feed a forged stream to spectators because
    the MAC verification would fail under any non-canonical
    `matchKey`
  - this is a **Phase-4** deliverable; it is not built by M5
- `tasks/phase-4/spectator-mode/00-requirements.md` — placeholder
  task with the requirements

**Complexity:** **S** (doctrine-only; no code in this plan)

---

### Tasks

#### Issue: Owning tasks for the new doctrine + schema + service surfaces

**Source:** All ❌ items, plus the task-system invariant
(`validate:tasks`) that every schema and screen change has an
owning task.

**Problem:** The five Critical Fixes plus the Improvements
introduce ~12 new artifacts. Without owning task files,
`npm run validate:tasks` fails on the unowned-path check.

**Solution:** New task files, one per major surface, with
`Owned Paths`, `Dependencies`, `verifyCommands`, and `Read First`
filled per [`CLAUDE.md`](../../CLAUDE.md):

- `tasks/phase-3/01-multiplayer/09-lockstep-envelope-and-mac.md` (Fix 1)
- `tasks/phase-3/01-multiplayer/10-match-handshake-protocol.md` (Fix 2)
- `tasks/phase-3/01-multiplayer/11-turn-timer-and-stall-detection.md` (Fix 4)
- `tasks/phase-3/01-multiplayer/12-visibility-preconditions-on-commands.md` (Fix 5)
- `tasks/phase-3/01-multiplayer/13-security-model-and-doctrine.md` (Fix 5)
- `tasks/phase-3/01-multiplayer/14-screen-multiplayer-game-status.md` (Improvement)
- `tasks/phase-3/01-multiplayer/15-pack-signature-and-build-attestation-policy.md` (Improvement)
- `tasks/phase-3/01-multiplayer/16-peer-reputation-counter.md` (Improvement)
- `tasks/phase-3/01-multiplayer/17-replay-audit-pipeline-contract.md` (Improvement)
- `tasks/phase-4/spectator-mode/00-requirements.md` (Improvement; placeholder)

Plus *updates* to existing tasks:
- `03-input-only-lockstep-command-serialization-plus-sequencing.md`
  (Fixes 1, 3, 4 add sections; one new dependency on `09`)
- `04-per-turn-hash-exchange-plus-desync-detection.md`
  (Fix 3 ties hash check to canonical order)
- `05-auto-bisect-on-hash-mismatch.md`
  (Byzantine handling, blame attribution)
- `02-webrtc-peer-connection-plus-datachannel-setup.md`
  (handshake as first message)
- `08-multiplayer-ui-lobby-invite-link-in-game-status.md`
  (split: in-game-status moves to `14`)

**Files to Update:**
- [tasks/task-registry.json](../../tasks/task-registry.json) — regenerated by `npm run generate:task-registry`
- [docs/planning/implementation-log.md](../planning/implementation-log.md) — add a one-line entry per task on completion

**Complexity:** **M** (mechanical, but ten new files and five
updates; cross-dependency wiring is non-trivial)

---

## 4. Suggested Task Breakdown

- [ ] **T1** Author `docs/architecture/security-model.md` and cross-link from `CLAUDE.md` (Fix 5 doctrine)
- [ ] **T2** Author the ten owning task files (`09`–`17` + `phase-4/spectator-mode/00-requirements`); regenerate `tasks/task-registry.json`
- [ ] **T3** Author `docs/architecture/lockstep-envelope.md` and `content-schema/schemas/lockstep-envelope.schema.json` with example fixtures (Fix 1)
- [ ] **T4** Implement `src/net/lockstep/mac.ts` and `src/net/lockstep/envelope.ts`; wire into transport (Fix 1)
- [ ] **T5** Add `npm run validate:lockstep` golden tests (Fix 1)
- [ ] **T6** Author `docs/architecture/match-handshake.md` and `content-schema/schemas/match-handshake.schema.json` with example fixtures (Fix 2)
- [ ] **T7** Implement `src/net/lockstep/handshake.ts` and `src/content-runtime/manifest-digest.ts` (Fix 2)
- [ ] **T8** Update [`02-webrtc-...md`](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) so handshake is first DataChannel exchange (Fix 2)
- [ ] **T9** Add per-turn pack-manifest re-validation in `src/net/lockstep/turn-end.ts` (Fix 2)
- [ ] **T10** Add `npm run validate:handshake` golden tests (Fix 2)
- [ ] **T11** Pin sequence-validation rules + canonical intra-turn order in [`03-...md`](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) (Fix 3)
- [ ] **T12** Implement `src/net/lockstep/sequence.ts` and `src/net/lockstep/queue.ts` with golden tests (Fix 3)
- [ ] **T13** Author `docs/architecture/turn-timer.md` and implement `src/net/lockstep/turn-timer.ts` (Fix 4)
- [ ] **T14** Add `multiplayer.turnTimerMs` to `manifest.schema.json`; update `END_DAY` command with `source` discriminator (Fix 4)
- [ ] **T15** Add the `visibility` precondition column to every command in [`command-schema.md`](../architecture/command-schema.md) (Fix 5)
- [ ] **T16** Implement `src/engine/visibility/precondition.ts` and wire into the lockstep reducer (Fix 5)
- [ ] **T17** Add visibility-precondition golden tests (Fix 5)
- [ ] **T18** Add screen package `63-multiplayer-game/` (mockup, spec, interactions, data-contracts, architecture); register in [`index.json`](../architecture/wiki/screens/index.json) (Improvement)
- [ ] **T19** Author `docs/architecture/draft-preview-policy.md`; implement `tools/lint/no-stochastic-preview.ts`; wire into `npm run validate` (Improvement)
- [ ] **T20** Add `signaturePolicy` to `pack-contract.md`; author `docs/architecture/build-attestation.md`; add `services/signaling/config/build-attestation.allow.example.json`; wire reject paths into the handshake (Improvement)
- [ ] **T21** Author `docs/architecture/bisect-protocol.md`; add `BISECT_MIDPOINT` envelope variant; update `src/net/lockstep/bisect.ts` with timeout + MAC + two-way exchange (Improvement)
- [ ] **T22** Add `attributedPeer` to the bisect report; surface in `63-multiplayer-game/data-contracts.md` (Improvement)
- [ ] **T23** Author `docs/architecture/peer-reputation.md`; implement `services/signaling/src/reputation/counter.ts`; wire into the signaling admit gate (Improvement)
- [ ] **T24** Author `docs/architecture/replay-audit-pipeline.md`; implement `tools/replay/batch-replay.ts`; add `npm run replay:audit` (Improvement)
- [ ] **T25** Author `docs/architecture/spectator-mode-requirements.md` (Improvement; placeholder)
- [ ] **T26** Register every new schema / command / screen in `schema-matrix.md` and `command-schema.md` (Tasks)
- [ ] **T27** Wire all new validators into `npm run validate` and `npm run validate:tasks`; regenerate `task-registry.json` and `task-system-report.md`

---

## 5. Execution Order

The order respects dependency direction (each step assumes its
predecessors landed) and front-loads the items that block the most
downstream surface. T1 (security model doctrine) is first because
it frames every later decision and must be cross-linked before
contributors design downstream features.

1. **T1** — `security-model.md` + `CLAUDE.md` cross-link. Doctrine
   first, code second.
2. **T2** — author the ten owning task files so every later
   commit has a registered owner; regenerate the registry.
3. **T3, T4, T5** — Critical Fix 1 (envelope + MAC + CI). Unblocks
   every later message-shape change because both the handshake and
   bisect midpoints ride the envelope.
4. **T6, T7, T8, T9, T10** — Critical Fix 2 (handshake +
   commit-reveal seed + per-turn pack re-validation). Depends on
   T3–T5 (envelope must exist for `BISECT_MIDPOINT`-adjacent
   wiring), and on the security-model framing for
   `signaturePolicy` defaults.
5. **T11, T12** — Critical Fix 3 (sequence rules + canonical
   intra-turn order). Depends on T3 (envelope `matchEpoch`
   semantics).
6. **T13, T14** — Critical Fix 4 (turn timer). Depends on T3
   (auto-`END_DAY` envelope), T11 (canonical order so the
   auto-command applies deterministically).
7. **T15, T16, T17** — Critical Fix 5 (visibility preconditions).
   Depends on T1 (doctrine context); independent of other code
   fixes.
8. **T18** — multiplayer-game screen package. Depends on T13
   (states to surface), T22 (attributed-peer field).
9. **T19** — draft-preview policy + lint. Depends on T1.
10. **T20** — pack-signature mandate + build attestation. Depends
    on T6–T7 (handshake schema fields).
11. **T21, T22** — Byzantine bisect + blame attribution. Depends
    on T3–T5 (envelope MAC) and T6–T7 (handshake `matchKey`).
12. **T23** — peer-reputation counter. Depends on T22
    (attributed-peer feed) and Plan 25 (signaling
    stateless-invariant + admit gate).
13. **T24** — replay-audit pipeline contract + batch-replay CLI.
    Depends on T1 (security framing), T3 (envelope
    self-authentication), and Plan 22 / Plan 23 (privacy +
    consent).
14. **T25** — spectator-mode requirements (placeholder).
15. **T26, T27** — registry, schema-matrix, command-schema,
    validator wiring. Final cleanup before validation.

---

## 6. Risks if Not Implemented

- **Trivial cross-session replay.** A captured command stream is
  structurally indistinguishable from a fresh one (Q514, Q516,
  Q517). If any naïve handshake (e.g., host-chosen seed) lands
  before Critical Fix 2, replay attacks become economically
  feasible — record one match, replay decisive turns into a fresh
  match against a fresh opponent.
- **Host-chosen seed advantage.** If the host generates the match
  seed unilaterally (the obvious naive default before Critical
  Fix 2), they pre-compute every PCG32 sub-stream for the entire
  match and optimize strategy against future RNG (Q536). This is
  the single largest fairness risk in the multiplayer model and
  is *invisible* to detection-by-state-hash because both peers
  agree on the rolls.
- **Pack-tamper deception.** `contentHash` is computed locally
  and presented on the wire; without signature enforcement
  (Q535) and without per-turn re-validation (Q524), a peer can
  lie about which pack they're running. State-hash divergence
  catches outcome-altering tampers but not stealth tampers
  (visuals, locale, AI-personality tweaks that change only the
  cheating peer's bot decisions).
- **Engine-binary swap undetectable.** A peer can run a doctored
  engine whose RNG agrees on canonical paths but leaks
  information or biases edge cases (Q525). Without build
  attestation, the canonical match looks valid even when the
  cheating peer is reading hidden state.
- **Information cheats are inherent and unacknowledged.** Without
  the security-model doctrine (Q531), new contributors and AI
  agents will design downstream features assuming fog-of-war
  secrecy and hidden hero stats are protected. They are not.
  The first competitive feature built on that assumption (a
  ranked ladder, a tournament prize pool, a fog-of-war scenario)
  is dead-on-arrival — and a public commitment to a feature that
  cannot be delivered under the chosen netcode is the worst
  possible failure mode.
- **Fog-bypass via crafted command.** Without visibility
  preconditions (Q532), a scripted client probes map contents by
  submitting commands and observing accept/reject. The bisect
  tool will not catch this because the canonical state agrees
  on both peers — the leak is one-way to the cheater's UI.
- **Speculative-apply leak.** If UI implementers add a "preview
  attack outcome" affordance against the canonical reducer
  (Q538), they inadvertently let one peer iterate over RNG
  outcomes pre-commit. This is a one-line bug at the application
  layer that the deterministic engine cannot catch.
- **Stalling / griefing.** Without a turn timer (Q523) plus a
  reputation counter (Q521), a malicious peer ties up matches
  indefinitely or aborts every match they enter, with zero
  cost. Asymmetric DoS against the lobby.
- **Bisect protocol non-Byzantine.** A malicious peer can
  mis-attribute or stall the bisect (Q522), wasting time and
  producing false bug reports. Without timeouts and MACed
  midpoints, the protocol is a denial-of-debug surface.
- **No audit pipeline.** Replays exist but no one consumes them
  (Q539). The infrastructure is one HTTP POST away from being
  useful, but without it, RNG-luck anomalies, abort-pattern
  clusters, and statistical cheats live indefinitely.
- **Out-of-scope but inevitable.** Spectator mode (Q526) is
  Phase 4, but adding it without prior requirements
  invites every gap in this audit *plus* a fan-out integrity
  surface. The deferred-requirements doc closes that gap before
  it opens.

**Out-of-scope risk acknowledged:** information secrecy under
symmetric input-only lockstep is *structurally impossible* without
a redesign toward server-authoritative or zero-knowledge
protocols. This plan does not attempt to fix it; it acknowledges
the limit in writing and gates competitive modes behind
"friendly-only / closed-beta" until a future Phase-4 work-stream
addresses it. That is the deliberate scope ceiling for this
plan's 8 / 10 target.

---

## 7. AI Implementation Readiness

**Score: 8 / 10**

After this plan lands:

- An autonomous implementer reading [`docs/architecture/security-model.md`](../architecture/security-model.md)
  and [`CLAUDE.md`](../../CLAUDE.md) finds a named **Security
  Model** doctrine that explicitly states what symmetric lockstep
  protects (outcome-altering tampers, pack swaps, RNG-implementation
  swaps that change outcomes) and what it does not (information
  leaks via local read, speculative-apply oracles unless forbidden,
  host-chosen-seed advantage unless commit-reveal is used).
- The lockstep task spec mandates `lockstep-envelope.schema.json`
  + a per-match HMAC-SHA-256 MAC keyed by `matchKey`; a CI gate
  rejects any wire payload that does not pass `unwrap`.
- The handshake task spec pins the three-phase commit-reveal
  protocol with explicit derivation rules (`seed = xxh64(nonceA ∥
  nonceB)`, `matchKey = HKDF(…, "lockstep-mac-v1")`) and an
  enumerated abort table.
- Sequence rules are pinned (drop-on-stale, reject-duplicate,
  bounded out-of-order window) with golden tests for every case.
- The canonical intra-turn order is pinned (`(turn, playerId,
  seq)` lexicographic) and the per-turn state-hash check operates
  on canonical order, not arrival order.
- The turn-timer task spec defines three states (`waiting`,
  `stalled`, `auto-end`) with thresholds and a canonical
  auto-`END_DAY` envelope.
- Every command in `command-schema.md` carries a `visibility`
  precondition; `src/engine/visibility/precondition.ts` is the
  canonical gate; the reducer rejects fog-bypass commands.
- The bisect protocol pins MACed midpoint hashes, two-way
  exchange, timeouts, and an "unverifiable bisect" fallback;
  reports include `attributedPeer` with confidence.
- The signaling reputation counter increments on
  attributed-and-griefed aborts; a soft-rate-limit kicks in at 5
  aborts in 24 h.
- The audit-pipeline contract is published with an opt-in upload
  surface; a local `npm run replay:audit` CLI reproduces every
  match deterministically.
- The draft-preview lint catches misuse of the canonical reducer
  in UI code paths.
- Pack signatures are required for ranked play; build attestation
  is mandatory in ranked, warn-only in friendly.
- Every new schema, screen, command, and service surface has an
  owning task file and is registered in `schema-matrix.md` /
  `command-schema.md` / `index.json`.

The remaining 2 / 10 reflects two genuinely-policy items that this
plan deliberately defers:

1. **Hidden-information model.** Symmetric input-only lockstep
   cannot hide information from a determined client-side
   inspector. This plan acknowledges the limitation in
   `security-model.md` and gates competitive modes behind
   "friendly-only / closed-beta" until a server-authoritative or
   zero-knowledge redesign is undertaken (Phase 4+).
2. **Audit-pipeline back-end.** This plan ships the contract and
   the local batch-replay CLI; the hosted ingestion service is a
   Phase-4 follow-up that lives alongside the privacy / retention
   surfaces from Plan 22 and the trust-boundary surfaces from
   Plan 31.

Closing those last two would lift this to 10 / 10, but they
require either a netcode redesign (item 1) or a separate
back-end service work-stream (item 2) — neither is on the
critical path for shipping a friendly / closed-beta M5
multiplayer build that resists casual replay, host-seed
advantage, pack tamper, free desync griefing, and trivial fog
bypass.
