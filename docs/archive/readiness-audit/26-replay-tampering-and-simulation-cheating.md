# 26. REPLAY/TAMPERING ATTACKS & DETERMINISTIC SIMULATION CHEATING

### Q: 514. Can a captured command stream be replayed against a fresh peer to forge state advancement?

**Status:** ❌ UNKNOWN

**Answer:**
The architecture has no documented protection against cross-session replay of a captured command log. The lockstep wire format is `{ seq, playerId, turn, command }` — pure JSON with no nonce, no per-session token, and no MAC. A peer that has previously captured a stream could in principle replay it against a freshly-handshaked peer in a new room, and the deterministic reducer would happily apply commands so long as `(seed + contentHash + engineHash)` line up. The only natural defenses are (a) the seed for the new room differs (so the reducer's RNG sub-streams diverge), and (b) the content/engine hashes pinned per match. Neither is positioned as a *replay* defense in any task or doc.

**Evidence:**
- `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md` (wire format has no nonce/MAC)
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (no per-session secret issuance)
- No anti-replay clause anywhere in `docs/architecture/` or `tasks/phase-3/01-multiplayer/`.

---

### Q: 515. Are commands sequenced with monotonically increasing IDs that are validated on receive?

**Status:** ⚠ Partial

**Answer:**
Commands carry a `seq` field and the lockstep transport orders them by sequence; out-of-order delivery is queued until contiguous. However, there is no documented **validation rule** at the receiver: no "reject if `seq <= lastApplied`," no "reject if `seq` skips," no "reject duplicate `(playerId, seq)`." Q145 of the multiplayer audit explicitly flags duplicate-command policy as undefined.

**Evidence:**
- `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md` (sequencing + ordering only)
- `docs/archive/readiness-audit/07-multiplayer.md` Q145 ("idempotency on duplicates … neither defined")

---

### Q: 516. Is each command bound to a specific session/room ID so cross-session replay is rejected?

**Status:** ❌ UNKNOWN

**Answer:**
No. The wire schema `{ seq, playerId, turn, command }` does not include a room ID, session UUID, or match nonce. A captured command from match A is structurally indistinguishable from a fresh command in match B with the same `playerId`/`seq`. The 6-character room code lives in the signaling layer, never in the lockstep payload, and is not bound to the command stream cryptographically.

**Evidence:**
- `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md`
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` ("Room ID: 6-character alphanumeric code" — signaling-only)

---

### Q: 517. Are commands HMAC-signed with a per-session key, or is integrity assumed from DTLS alone?

**Status:** ✔ Defined (by omission)

**Answer:**
Integrity is assumed from **DTLS alone**. WebRTC DataChannels are end-to-end encrypted and authenticated by DTLS-SRTP at the transport layer; no application-level HMAC, signature, or per-session key is specified. Any party that holds the DTLS endpoint (i.e., the peer's browser) sees and can forge commands at will — there is no app-level integrity beyond the transport.

**Evidence:**
- `docs/archive/readiness-audit/07-multiplayer.md` Q144 ("Transport-level only … No application-level authentication")
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`

---

### Q: 518. Can a peer reorder commands locally to cheat (e.g., resolve combat before economy update)?

**Status:** ⚠ Partial

**Answer:**
Within a single peer's turn, ordering is the local player's prerogative — a player legitimately decides whether to recruit before attacking or vice versa. *Across* peers, the lockstep transport orders by `seq` and the per-turn hash exchange will reject any divergent ordering at the next hash check. So a peer cannot unilaterally re-order the *canonical* command stream without producing a desync. What is **not** specified: a deterministic intra-turn ordering rule for commands issued by different peers in the same turn (e.g., simultaneous moves). Without that, the "resolve combat before economy" risk lives inside the turn-gating contract, which is described as "wait for all peers' same-turn commands before advancing" but does not pin a canonical order.

**Evidence:**
- `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md` (turn gate; no intra-turn canonical order)
- `tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md` (hash check catches divergent application order)

---

### Q: 519. Are turn-end hashes exchanged and compared per turn to detect tampering, not only desync?

**Status:** ✔ Defined

**Answer:**
Yes — but the framing is desync, not tampering. The same primitive does the job either way: at end-of-turn, both peers compute the canonical xxh64 state hash and exchange it via `exchangeHashes()`; mismatch fires `DESYNC_DETECTED`. Any tamper that changes the resulting state will surface here within one turn. Tampers that produce identical observable state (information leaks) are *not* caught by this primitive.

**Evidence:**
- `tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md`
- `docs/architecture/determinism.md` (canonical serializer + xxh64 state hash)

---

### Q: 520. What action is taken on hash mismatch — abort, log-and-continue, or auto-bisect?

**Status:** ✔ Defined

**Answer:**
**Auto-bisect → report → quit.** No log-and-continue. On `DESYNC_DETECTED`, the bisect tool (Task 5) binary-searches the command log to identify the first divergent command and produces a diagnostic report `{ commandIndex, command, preMismatchHash, postMismatchHash }`. The player is then offered "report + quit." There is no automatic resync, no rollback, and no in-game recovery path.

**Evidence:**
- `tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md`
- `tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`
- `docs/archive/readiness-audit/07-multiplayer.md` Q135 ("Detect → bisect → report → quit")

---

### Q: 521. Can a peer intentionally produce hash mismatches to grief the opponent without consequence?

**Status:** ❌ UNKNOWN

**Answer:**
Yes, in the current design. A malicious peer can deliberately diverge — e.g., swap a constant in a local pack copy, run a tampered build, or feed a corrupted command — and force every match to abort. There is no peer-reputation system, no "blame attribution" beyond the bisect report (which only names the *command index*, not which peer is responsible), no rate-limit on report-and-quit cycles, and no consequence for the griefer. The signaling server keeps no game state, so it cannot ban repeat offenders either.

**Evidence:**
- `tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md` (report identifies command, not actor)
- `docs/archive/readiness-audit/07-multiplayer.md` Q143 ("does not address … griefing"; "No anti-cheat policy … or peer reputation system is documented")

---

### Q: 522. Is the auto-bisect protocol resistant to a malicious peer that lies about which command they consider divergent?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. The bisect protocol assumes *honest* peers exchanging midpoint hashes during a binary search. A malicious peer could:
- Lie about its own midpoint hash to mis-attribute the divergent command.
- Refuse to participate, stalling the bisect indefinitely.
- Replay an old hash from a different match.
The task only addresses the algorithm, not Byzantine-fault tolerance.

**Evidence:**
- `tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md` (algorithm only; no adversarial model)

---

### Q: 523. Can a peer suppress their own commands ("stalling") to delay opponent indefinitely, and is there a turn timer?

**Status:** ❌ UNKNOWN

**Answer:**
Yes — the turn-gate model explicitly waits for all peers' same-turn commands before advancing, so any peer that withholds `END_DAY` (or simply stops acting) blocks progression. **No turn timer is specified.** Q139 of the multiplayer audit notes that no stall thresholds (e.g., "after X ms show waiting overlay") are formally defined; Q149 also flags no policy for slow-loris / griefing disconnects. The 120-second forfeit-or-wait offer (Task 6) only triggers on *disconnection*, not on a connected-but-idle peer.

**Evidence:**
- `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md` (turn gate; no timer)
- `tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md` (forfeit only on disconnection)
- `docs/archive/readiness-audit/07-multiplayer.md` Q139, Q143, Q149

---

### Q: 524. Are seeds, content hashes, and pack manifests committed to at session start so neither peer can swap content mid-game?

**Status:** ⚠ Partial

**Answer:**
The determinism contract requires that saves, replays, and multiplayer "pin both" `contentHash` and `engineHash`, and the state-flow doc says pack-hash mismatch must "fail loud at load time." So the **intent** is start-of-session commitment. What is **not** documented:
- The exact handshake message that exchanges and freezes `(seed, contentHash, engineHash, packManifest)` between peers.
- A re-validation step during the match to detect mid-game pack swap (a peer reloading a tampered pack between turns).
- Whether the seed is generated by the host, by both peers via a commit-reveal protocol, or pulled from a shared random beacon.

**Evidence:**
- `docs/architecture/determinism.md` ("Saves, replays, and multiplayer pin both [contentHash + engineHash]")
- `docs/architecture/state-flow.md` ("contentHash mismatch → fail loud")
- No handshake message in `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`

---

### Q: 525. Is there protection against a peer that swaps their RNG implementation to bias outcomes while staying within the input-only contract?

**Status:** ⚠ Partial

**Answer:**
**Indirect protection only.** The determinism stack mandates PCG32 with named sub-streams seeded from `(seed + sub-stream label)`, and the per-turn state hash will diverge instantly if either peer produces RNG values that differ from the canonical PCG32 trajectory. So an RNG swap that *changes outcomes* gets caught. What is **not** prevented:
- A peer that uses a faithful-but-instrumented PCG32 implementation to *predict* future rolls (read-only) and adjust strategy accordingly.
- A peer that exploits an `engineHash` collision or runs a non-canonical build whose RNG happens to agree on the test cases but not on edge cases.
- No engine-binary attestation or signed-build check is specified.

**Evidence:**
- `docs/architecture/determinism.md` (PCG32 mandate)
- `tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md` (catches divergent outcomes)
- No engine-attestation task.

---

### Q: 526. Are spectator views fed a verified copy of the canonical command log, not a separate stream a peer could forge?

**Status:** ❌ UNKNOWN

**Answer:**
Spectator mode is **out of M5 scope** — Q140 of the multiplayer audit confirms no spectator screen, command, or task exists. There is therefore no design for spectator stream verification, no "spectators replay the canonical command log" requirement, and no protection against a peer feeding spectators a forged/edited stream.

**Evidence:**
- `docs/archive/readiness-audit/07-multiplayer.md` Q140 ("Spectator mode is not in the M5 multiplayer scope")
- No spectator screen in `docs/architecture/wiki/screens/`

---

### Q: 527. Can a client modify local game state and bypass validation given that simulation is symmetric on both peers?

**Status:** ⚠ Partial

**Answer:**
A client *can* modify its own local state (e.g., poke memory to give itself extra gold), but the modification is local-only:
- The opponent's state is not affected — they run the same reducer over the canonical command log.
- The modification will surface as a state-hash mismatch at the next turn-end exchange, triggering desync abort.
- Information cheats (read-only modifications to UI / fog mask) are *not* caught — see Q528–Q531.
The architecture's anti-cheat is **detection at turn boundary**, not prevention; so an outcome-altering local modification cannot persistently affect the canonical match, but a single cheat-then-DC pattern is undefined territory.

**Evidence:**
- `docs/archive/readiness-audit/07-multiplayer.md` Q143
- `tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md`

---

### Q: 528. How is fog-of-war information protected if the deterministic state on each peer contains the full map?

**Status:** ❌ UNKNOWN

**Answer:**
**It isn't.** The architecture is symmetric input-only lockstep, which by construction means both peers hold identical full state — including the entire map, all enemy stacks, scripted objects, and AI bot internals. The fog-of-war is a *presentation* layer (`FogMask`, `selectors.spells.viewWorldVisibleObjects`) computed from per-player visibility rules; the underlying state is unmasked on every client. There is no design for cryptographic concealment, server-side state partitioning, or zero-knowledge protocol. This is a fundamental limitation of the chosen netcode that is not yet acknowledged in writing.

**Evidence:**
- `docs/architecture/wiki/screens/07-adventure-map/architecture.md` (`FogMask` + `Fog visibility` are renderer/selector concepts)
- `docs/architecture/wiki/screens/16-view-world/spec.md` (`visibleWorld` selector applies fog rules at view layer)
- No "hidden information" or "private state" doc in `docs/architecture/`.

---

### Q: 529. Is there any model for hiding hidden information (hero stats pre-reveal, AI plans, scouting results) given input-only lockstep?

**Status:** ❌ UNKNOWN

**Answer:**
No. There is no documented model for hidden information under symmetric lockstep. AI plans, pre-reveal hero stats, scouting outcomes, hidden artifacts on the map, and similar hidden-info constructs all live in the shared state on both peers. The `viewWorldVisibleObjects` selector hides them in the UI layer only. No commit-reveal scheme, no encrypted-state subset, no host-only secret store is specified.

**Evidence:**
- `docs/architecture/state-flow.md` (single shared state per peer)
- `docs/architecture/wiki/screens/16-view-world/spec.md` (selectors filter visibility, do not encrypt state)

---

### Q: 530. Can a malicious client read its own memory to reveal information the UI is hiding (maphacks)?

**Status:** ✔ Defined (by omission — yes, trivially)

**Answer:**
Yes. Because the full canonical state is in browser memory, any user with devtools or a userscript can inspect the engine state directly and bypass the fog-of-war / visibility selectors. The architecture has no defense against this, and none is feasible under the chosen netcode without redesigning toward a server-authoritative or zero-knowledge model.

**Evidence:**
- `docs/architecture/state-flow.md` (state lives in browser memory)
- `docs/archive/readiness-audit/07-multiplayer.md` Q143 ("does not address … AI-assistance / map-hacks that read but do not write state")

---

### Q: 531. Is it acknowledged that input-only lockstep cannot prevent client-side information leakage, and is the design explicit about that limitation?

**Status:** ⚠ Partial

**Answer:**
The multiplayer readiness audit (Q143) notes that "Information cheats (fog-of-war reveal, opponent stack inspection)" are not addressed by the determinism-as-anti-cheat model. That is the only place this limitation is acknowledged. The core architecture docs (`docs/architecture/determinism.md`, `pack-contract.md`, `master-plan.md`) and the multiplayer task files do **not** state this trade-off explicitly. New contributors and AI agents reading those primary docs would not learn about it.

**Evidence:**
- `docs/archive/readiness-audit/07-multiplayer.md` Q143 (only acknowledgement)
- `docs/architecture/determinism.md` (silent on info-leak class)
- `tasks/phase-3/01-multiplayer/*` (silent on info-leak class)

---

### Q: 532. Can a peer submit commands that the opponent's reducer will accept but their own UI hid (e.g., "click on a tile you cannot see")?

**Status:** ❌ UNKNOWN

**Answer:**
Likely yes — the architecture does not specify a legality check that depends on per-player visibility. The reducer is symmetric and pure: it sees full state, so it will accept a command that targets a tile the issuer's UI was rendering as fogged. No "issuer must have visibility" precondition is documented in `effect-registry.md` or `command-schema.md`. The UI is responsible for *not exposing* unseen tiles, but a hand-crafted command bypassing the UI would still be applied.

**Evidence:**
- `docs/architecture/effect-registry.md` (no visibility-preconditions specified)
- `docs/architecture/command-schema.md` (no per-player visibility check on commands)
- No legal-move-gate task in `tasks/phase-3/01-multiplayer/`

---

### Q: 533. Is there server-side validation of legality (legal-move check) at any point, or only peer-symmetric validation?

**Status:** ✔ Defined (peer-symmetric only)

**Answer:**
**Peer-symmetric only.** The signaling server is explicitly stateless and "does NOT store game state." Legality is whatever the deterministic reducer accepts when both peers run it. There is no server-side authority, no audit pass, and no rejection path other than per-turn hash divergence.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` ("Server does NOT store game state")
- `docs/archive/readiness-audit/07-multiplayer.md` Q131 ("topology peer-to-peer with a soft host role")

---

### Q: 534. Can a peer locally modify pack content (unit stats) and run with mismatched content, and is that detected by content-hash exchange before turn 1?

**Status:** ⚠ Partial

**Answer:**
The intent is yes: `contentHash` is the canonical-JSON digest of all pack records, and saves/replays/multiplayer must "pin both" `contentHash` and `engineHash`. A peer that modifies a pack will produce a different `contentHash` and trip the "fail loud at load time" gate. However:
- The exact pre-turn-1 handshake that exchanges and compares hashes between peers is not written down (see Q524).
- Nothing prevents a peer from **lying about its `contentHash`** — i.e., presenting the canonical hash on the wire while running tampered content (since hashes are not signed; see Q535). The state-hash divergence at turn-end will still catch any *outcome-affecting* tamper, but a peer that tweaks visuals only or local-only fields could remain undetected.

**Evidence:**
- `docs/architecture/determinism.md` (`contentHash` + `engineHash` pinning)
- `docs/architecture/state-flow.md` ("fail loud: contentHash mismatch")
- No pre-turn-1 handshake spec in `tasks/phase-3/01-multiplayer/`

---

### Q: 535. Are content hashes covered by signature so a peer cannot run a tampered pack while presenting the canonical hash?

**Status:** ⚠ Partial

**Answer:**
The pack contract defines an **optional** `signature` field on the manifest (`scheme`, `keyId`, `value`) plus a `sandboxed` boolean trust flag. There is no requirement that multiplayer matches reject unsigned packs, no key-distribution scheme, no canonical signing authority, and no runtime enforcement that the locally-loaded pack's signature was actually verified before reporting `contentHash` to the peer. So in practice: a peer presents whatever hash it computes locally, and the opponent has no cryptographic basis to trust that the hash matches a *signed* canonical pack.

**Evidence:**
- `docs/architecture/pack-contract.md` ("`signature` — optional object with `scheme`, `keyId`, and `value`"; "Use `sandboxed: true` for AI-generated or otherwise restricted content")
- No multiplayer task references signature verification.

---

### Q: 536. Are RNG seeds derived deterministically from inputs both peers see, so neither peer can pre-roll outcomes?

**Status:** ⚠ Partial

**Answer:**
The seed is a single value pinned per match; PCG32 sub-streams are derived from `(seed + sub-stream label)`, where labels are deterministic strings tied to the action context. **Crucially, the source of the seed itself is not specified** — host-chosen, both-peers-derived (commit-reveal), or pulled from a beacon. If the host picks the seed unilaterally, the host can pre-compute outcomes and gain an advantage. A commit-reveal handshake (each peer commits to a random nonce, both reveal, seed = `hash(noncesA || noncesB)`) is the standard mitigation but is not documented.

**Evidence:**
- `docs/architecture/determinism.md` ("Seeded RNG (PCG32 with named sub-streams)")
- `tasks/phase-3/01-multiplayer/*` (no seed-establishment protocol)

---

### Q: 537. Is there protection against time-manipulation (system clock changes) affecting any timer-based command?

**Status:** ✔ Defined (mostly N/A)

**Answer:**
Determinism rules forbid `Date.now()` / `performance.now()` in deterministic paths, and replay artifacts must not contain wall-clock timestamps. Therefore no command's *gameplay effect* depends on system time, and clock manipulation cannot alter game outcomes. **Caveats:**
- Heartbeat detection (6-second host-migration trigger) and reconnection windows (30 s / 120 s) **do** rely on wall clock; a peer that fakes clock-skew could affect host-election fairness or stall detection, but this is non-gameplay.
- No turn timer exists today (Q523), so clock-based abuse on turn limits is N/A — but if a turn timer is later added, this gap must be revisited.

**Evidence:**
- `docs/architecture/determinism.md` ("Forbidden in deterministic paths: `Date.now()` / `performance.now()`")
- `tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md` (6 s wall-clock)
- `tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md` (30 s / 120 s wall-clock)

---

### Q: 538. Can a peer abuse "undo" or "draft" UI states to leak information to themselves before committing the canonical command?

**Status:** ⚠ Partial

**Answer:**
Likely yes for any "draft → commit" UI affordance that previews state. The state-flow doc shows commands enter the reducer at `F → O`; the reducer is pure and deterministic, so a UI that runs a *speculative* `apply(state, draftCommand)` to preview the result would let a peer iteratively probe outcomes (e.g., "does this attack land a critical?") without committing. Whether such draft mode exists is undefined: the data-contracts explicitly exclude transient UI state from save/replay (good), but they do not forbid local-only speculative apply. No "no preview of stochastic outcomes" rule is written.

**Evidence:**
- `docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md` (transient UI state excluded from save/replay)
- `docs/architecture/state-flow.md` (reducer is pure → speculative apply is trivially possible)
- No "draft preview" anti-leak policy in `docs/architecture/`

---

### Q: 539. Is replay-based audit possible after the fact to identify suspicious patterns (always-good RNG outcomes for one side)?

**Status:** ⚠ Partial

**Answer:**
Mechanically, yes: the canonical command log + seed + content hash + engine hash uniquely reproduce the entire match (Replay API), so any audit can reconstruct every RNG roll, decision, and outcome statistically. **What is missing:**
- No audit pipeline, ingestion path, or back-end is documented to *collect* completed match logs.
- No statistical-anomaly detector ("player A wins coin flips at 65% over 200 matches") is specified.
- No retention policy for command logs.
- No anti-cheat tool that consumes replays.
The infrastructure exists *in principle* via determinism, but no operational task implements it.

**Evidence:**
- `docs/architecture/determinism.md` ("Replay API (seed + command log reproduces final state)")
- No anti-cheat or audit-pipeline task in `tasks/`
- `docs/archive/readiness-audit/07-multiplayer.md` Q143 ("No anti-cheat policy … is documented")

---

## 🔍 Summary

### Missing Logic
- **Application-layer integrity** on commands: no HMAC, no per-session key, no anti-replay nonce (Q514, Q517).
- **Session/room binding** of commands so cross-session replay is rejected (Q516).
- **Receiver validation rules** for monotonic/duplicate `seq` (Q515, links to Q145 of audit 07).
- **Canonical intra-turn ordering** when multiple peers' commands collide in one turn (Q518).
- **Turn timer / stall detection** for connected-but-idle peers (Q523).
- **Pre-turn-1 handshake** that binds and exchanges `(seed, contentHash, engineHash, packManifest)` (Q524, Q534).
- **Commit-reveal seed protocol** so neither peer can pre-roll outcomes (Q536).
- **Pack-signature enforcement** in multiplayer mode (Q535).
- **Engine-binary attestation** (signed build / integrity check) so a tampered RNG implementation cannot present canonical hashes (Q525).
- **Byzantine-tolerant bisect** that resists a peer lying about midpoint hashes (Q522).
- **Blame attribution** in the desync report (which peer is the cheat, not just which command index) (Q521).
- **Hidden-information model** — currently impossible under symmetric lockstep; no acknowledged design (Q528, Q529, Q531).
- **Visibility precondition on commands** so unseen-tile clicks are rejected by the reducer (Q532).
- **Server-side legality check** (any) (Q533).
- **Spectator-stream verification** (out of scope but undefined when added) (Q526).
- **Speculative-apply / draft-preview policy** to prevent stochastic-outcome probing (Q538).
- **Audit pipeline** that collects match logs and runs anomaly detection (Q539).
- **Peer reputation / griefer banning** (Q521).

### Risks
- **Information cheats are unsolvable** under input-only symmetric lockstep — fog-of-war, hidden hero stats, and AI plans are *all* in browser memory on every client. This is a structural property, not a bug, but it is not acknowledged in primary docs and will surface as a launch risk for any competitive mode.
- **Trivial cross-session replay** — without a session-binding nonce or HMAC, a captured command stream is structurally indistinguishable from a fresh one. If matched seeds collide (low but non-zero given a host-chosen seed), replays could cause material game effects in a fresh match.
- **Pack-tamper deception** — `contentHash` is computed locally and presented on the wire; without signature enforcement, a peer can lie about which pack they're running. State-hash divergence catches outcome-altering tampers but not stealth tampers (visuals, local-only fields, or tampers that match canonical outcomes by accident).
- **Host-chosen seed advantage** — if the host generates the match seed unilaterally, they can pre-compute every RNG roll for the entire match. Commit-reveal is industry-standard for this and not specified.
- **Stalling / griefing** — no turn timer + no peer reputation + abort-on-desync = a malicious peer can deliberately desync every match they enter, with zero cost. This is an asymmetric DoS against the lobby and against any matchmaking system layered on top.
- **Speculative-apply leak** — if UI implementers add a "preview attack outcome" affordance, they will inadvertently let one peer iterate over RNG outcomes before committing.
- **Bisect protocol is not Byzantine-tolerant** — a malicious peer can mis-attribute or stall the bisect, wasting time and producing false bug reports.

### Improvements
- Add a **per-match shared secret** (`matchKey`) issued during the signaling handshake (or derived via commit-reveal between peers), and HMAC every command payload with `(seq, playerId, turn, command, matchKey)` as MAC input. Reject any command whose MAC does not verify.
- Bind commands to **`{ roomId, matchEpoch }`** in the wire schema so cross-session/cross-match replay is structurally impossible.
- Specify **sequence-validation rules**: drop on `seq <= lastApplied[playerId]`, reject on `seq` skip beyond contiguous window, reject duplicate `(playerId, seq)` after delivery.
- Add a **start-of-match handshake**: both peers commit-then-reveal nonces; `seed = xxh64(nonceA ∥ nonceB)`; both peers exchange `(contentHash, engineHash, packManifest digest)` and abort if any disagree. Re-validate on each turn against the pinned manifest digest.
- Mandate **`signature` on packs used in multiplayer**: signed manifests only, with a key-rotation policy and a pin list of trusted `keyId`s. Reject unsigned or `sandboxed: true` packs from ranked play.
- Add a **`signedBuild` / engine attestation** check (e.g., subresource-integrity-style hash of the engine bundle the peer is running, exchanged at handshake).
- Define a **turn timer** (e.g., 90 s default, configurable per scenario) that auto-emits `END_DAY` on expiry and surfaces as a "slow / stalled / forfeit" status to the opponent.
- Add **blame attribution** to the desync report: when bisect identifies the divergent command at index N, also identify *which peer's local-state hash* changed first, and include it in the report so a back-end can track repeat offenders.
- Add a **draft-preview rule** to the architecture: any UI that previews stochastic outcomes must consume a separate, non-canonical RNG sub-stream that does **not** advance the canonical seed; or, simpler, "no preview of stochastic outcomes" — preview shows expected value and ranges, not pre-rolled samples.
- Add an explicit `docs/architecture/security-model.md` that **states the limitations** of symmetric lockstep (no fog-of-war secrecy, no hidden information, maphacks are inherent) so that downstream features and AI implementers do not assume protections that aren't there.
- Add a **post-match audit pipeline**: peers (consensually) upload the canonical command log + seed + hashes; a back-end batch job replays them, computes per-player RNG luck, win-rate vs. expected, and flags anomalies for human review.
- Add a **legal-move precondition** to the command schema: each command kind declares the visibility/state preconditions its issuer must satisfy; the reducer rejects commands whose preconditions don't hold for the issuing peer's view.
- Specify **bisect Byzantine handling**: timeouts on midpoint-hash exchanges, parallel cross-checks, and fallback to "abort + report unverifiable bisect" if a peer is unresponsive or inconsistent.

### AI-Readiness
Score: **3/10**

Reason: This audit area is one of the **least-defined** in the project. The core determinism stack (PCG32, canonical hash, replay API, bisect) gives a foundation, and the multiplayer audit (07) candidly admits anti-cheat is undefined. But the specific contracts an AI implementer needs — wire-level integrity, session binding, seed-establishment protocol, pack-signature enforcement in multiplayer, hidden-information model, turn timer, blame attribution, audit pipeline — are essentially absent. An AI given these questions would have to invent the security model rather than implement a spec. Closing the items in **Improvements** (especially the security-model doc, the handshake protocol, HMAC, signed packs, commit-reveal seed, and visibility preconditions) would lift this to 7–8/10. Until then, multiplayer should be treated as **friendly-only / closed-beta** — anything competitive (ladder, ranked, prizes) is not ready to be designed against.
