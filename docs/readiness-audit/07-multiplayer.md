# 7. MULTIPLAYER (CRITICAL)

### Q: 126. Is the sync model lockstep, deterministic rollback, state-snapshot, or event-sourced?

**Status:** ✔ Defined

**Answer:**
**Input-only deterministic lockstep** (turn-based). Only commands traverse the network — never state. Both peers run the same deterministic reducer over the same command sequence; identical seed + commands + content hashes ⇒ identical state. There is no rollback or state snapshotting; reconciliation is by replaying canonical commands.

**Evidence:**
- `docs/architecture/diagrams/26-multiplayer-sync.md`
- `tasks/phase-3/01-multiplayer.md` ("WebRTC Lockstep (M5)")
- `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md`
- `docs/architecture/determinism.md` (seeded RNG, fixed-point math, command dispatcher, replay API)

---

### Q: 127. If lockstep, what is the input delay budget?

**Status:** ❌ UNKNOWN

**Answer:**
No explicit input-delay budget is defined. The model is a **turn-based gate**, not a per-frame lockstep — local "End Turn" presses canonical `END_DAY` and waits for all peers' same-turn commands to arrive before advancing. There is no documented millisecond budget for command latency or buffered frames.

**Evidence:**
- `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md` (Turn gate description)
- No file specifies `inputDelayMs`, frame-delay, or per-tick budget.

---

### Q: 128. If rollback, what is the maximum rollback window?

**Status:** ✔ Defined (N/A)

**Answer:**
Not applicable — the architecture explicitly chooses input-only lockstep, not rollback netcode. No client-side rollback occurs; on desync the game halts, bisects to find the divergent command, and offers report-and-quit (no automatic rewind).

**Evidence:**
- `tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md` ("present the player with options (report + quit)")
- `tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`

---

### Q: 129. What transport is used (WebRTC data channels, WebSocket, both)?

**Status:** ✔ Defined

**Answer:**
**Both, with separation of duties:**
- **WebRTC DataChannels** carry all gameplay traffic between peers:
  - `commands` channel: `ordered: true, maxRetransmits: null` (reliable/ordered).
  - `heartbeat` channel: `ordered: false, maxRetransmits: 0` (fire-and-forget).
- **WebSocket** is used only for the stateless **signaling server** (room creation, SDP offer/answer, ICE candidate exchange).

**Evidence:**
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`

---

### Q: 130. Is there a relay / TURN strategy for NAT traversal?

**Status:** ⚠ Partial

**Answer:**
**STUN** is mandatory and configured (`stun.l.google.com:19302`). **TURN** is acknowledged as an *optional* corporate-NAT fallback but no TURN server is selected, deployed, or specified in config. There is no documented policy on when to fall back to TURN, who pays for relay bandwidth, or how to provision credentials.

**Evidence:**
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md` ("Optional TURN server config (for corporate NAT fallback)")
- No TURN provider, credentials, or fallback policy defined.

---

### Q: 131. Is the topology peer-to-peer, host-authoritative, or server-authoritative?

**Status:** ✔ Defined

**Answer:**
**Peer-to-peer with a soft host role.** The simulation is symmetric — both peers compute authoritative state via the deterministic reducer. The "host" is a designated peer that owns the canonical command-log publication for catch-up/reconnection and broadcasts the log on host migration. There is no central game server. The signaling server is *not* authoritative and stores no game state.

**Evidence:**
- `docs/architecture/diagrams/26-multiplayer-sync.md`
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` ("Server does NOT store game state")
- `tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md` (host serves log range)
- `tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`

---

### Q: 132. Who is the source of truth, and what happens if they disconnect?

**Status:** ✔ Defined

**Answer:**
**Source of truth = the deterministic reducer state on each peer**, gated by per-turn state-hash agreement. The "host" peer is the authoritative source for the **command log** (used for late-joiner catch-up). If the host disconnects, the heartbeat election (Task 7) promotes a new host: peers detect a missing heartbeat for 6 seconds, elect the highest-priority remaining peer ID, broadcast `HOST_CHANGED` plus the full log, and notify the signaling server. Game continues from the last consistent turn.

**Evidence:**
- `tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`
- `docs/architecture/determinism.md` (state hash + replay API)

---

### Q: 133. How is host migration handled?

**Status:** ✔ Defined

**Answer:**
Heartbeat-based election:
1. Host emits a heartbeat every 2 seconds on the unordered DataChannel.
2. If the heartbeat is absent for 6 seconds, non-host peers elect a new host by **highest-priority peer ID** (deterministic tie-break).
3. The new host broadcasts `HOST_CHANGED` plus the full canonical command log to all peers.
4. The signaling server is updated with the new host's peer ID.
Acceptance: new host elected within 8 seconds of tab-close; no state loss.

**Evidence:**
- `tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`

---

### Q: 134. How is desync detected (state hash, command hash, periodic checkpoint)?

**Status:** ✔ Defined

**Answer:**
**Per-turn state-hash exchange.** At the end of every turn, both peers compute a canonical xxh64 hash over the sorted-key, whitespace-stripped serialized state and exchange it via `exchangeHashes()`. If hashes diverge, `DESYNC_DETECTED` fires immediately with both hashes plus the turn number. Hashing is also used during recovery bisection.

**Evidence:**
- `tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md`
- `docs/architecture/determinism.md` ("Canonical serializer + state hash (sorted keys, no whitespace, xxh64 over canonical bytes)")
- `docs/architecture/diagrams/26-multiplayer-sync.md`

---

### Q: 135. What is the desync recovery policy (resync, rollback, abort)?

**Status:** ⚠ Partial

**Answer:**
**Detect → bisect → report → quit.** There is no automatic resync or rollback. On mismatch, the bisect tool (Task 5) binary-searches the command log to identify the first diverging command, produces a diagnostic report (`{ commandIndex, command, preMismatchHash, postMismatchHash }`), and the player is offered "report + quit." The diagram alludes to "Resync from last good state," but no implementation task exists for an in-game resync — recovery is *out-of-band* (file a determinism bug; restart match).

**Evidence:**
- `tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md` ("present the player with options (report + quit)")
- `tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`
- `docs/architecture/diagrams/26-multiplayer-sync.md` (Note "Resync from last good state" — no implementing task)

---

### Q: 136. How are dropped packets handled?

**Status:** ⚠ Partial

**Answer:**
- **Commands channel** uses `ordered: true, maxRetransmits: null` — WebRTC SCTP transparently retransmits until delivered, so drops are absorbed by the transport.
- **Heartbeat channel** uses `ordered: false, maxRetransmits: 0` — drops are tolerated (fire-and-forget); only sustained 6-second loss triggers host-migration logic.
- **Out-of-order delivery on the commands channel** is queued by the lockstep transport until the missing sequence numbers arrive.
No application-level retransmit, ACK timeout, or NACK strategy is defined beyond the SCTP guarantees.

**Evidence:**
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`
- `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md` (Acceptance: out-of-order delivery handled)

---

### Q: 137. What is the input buffer size, and how is it tuned?

**Status:** ❌ UNKNOWN

**Answer:**
No buffer size is documented. The lockstep transport queues out-of-order commands until contiguous, but maximum queue depth, backpressure thresholds, and tuning rules are not specified. Because the model is turn-based rather than tick-based, input buffering is implicit (a turn's commands are batched until `END_DAY`).

**Evidence:**
- `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md` (no buffer-size constants)

---

### Q: 138. How are clock differences between peers reconciled?

**Status:** ⚠ Partial

**Answer:**
**Wall-clock is not used in deterministic state.** Determinism rules forbid `Date.now()` / `performance.now()` in deterministic paths, and replays must not contain wall-clock timestamps. Synchronization is sequence-number-based (`{ seq, playerId, turn, command }`), not time-based. The diagram does mention "synchronized clocks (for timestamps)," but no NTP, drift correction, or timestamp protocol is defined — and per the data-contracts and determinism docs, gameplay state must not depend on it.

**Evidence:**
- `docs/architecture/determinism.md` ("Forbidden in deterministic paths: `Date.now()` / `performance.now()`")
- `docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md` ("Replays use stable IDs and scalar command inputs, never … wall-clock timestamps")
- `docs/architecture/diagrams/26-multiplayer-sync.md` (mentions "synchronized clocks" with no implementation contract)

---

### Q: 139. Is there a frame-skipping or stalling strategy under jitter?

**Status:** ❌ UNKNOWN

**Answer:**
Not applicable in the obvious sense: turn-based lockstep does not run frame-perfect simulation. Animation/UI is decoupled from deterministic state, so visual jitter is absorbed by the renderer. However, no stall-handling rules (e.g., "after X ms of waiting, show a 'waiting on opponent' overlay") are formally specified beyond the multiplayer UI status indicator.

**Evidence:**
- `tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md` (connection status indicator green/yellow/red, no stall thresholds)

---

### Q: 140. Are spectators supported, and do they participate in sync?

**Status:** ❌ UNKNOWN

**Answer:**
Spectator mode is **not in the M5 multiplayer scope**. No screen, command, or task references spectators. Tournament/observer features are mentioned as "M7 polish" but not specified.

**Evidence:**
- No spectator screen in `docs/architecture/wiki/screens/`
- `docs/architecture/glossary.md` ("M7 polish — advanced AI, rendering, tournament quality") — undefined

---

### Q: 141. How are late joiners initialized — full snapshot or replay-from-zero?

**Status:** ✔ Defined

**Answer:**
**Replay-from-zero via canonical command log.** Reconnecting peers send `LOG_REQUEST { fromSeq, toSeq }` to the host; the host replies with `LOG_RESPONSE { commands[] }` (chunked if needed). The peer replays commands deterministically from the beginning of the missing range until caught up, then resumes lockstep. There are no state snapshots — determinism + content/engine hash pinning means the command log is the only authoritative artifact.

**Evidence:**
- `tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md`
- `docs/architecture/determinism.md` ("Replay API (seed + command log reproduces final state)")

---

### Q: 142. What is the maximum supported player count, and what limits it?

**Status:** ⚠ Partial

**Answer:**
Documentation consistently describes **two-player matches** (M5 exit criteria: "Two players on different networks complete a full match"). The signaling server is sized for **up to 100 concurrent rooms**, but per-room player count is not generalized beyond 2. No explicit cap on >2-peer mesh is set, but the all-peers-must-agree lockstep model and full-mesh DataChannel cost would limit practical counts (typically 4–8 for similar architectures). This is undefined in spec.

**Evidence:**
- `tasks/phase-3/01-multiplayer.md` ("Two players on different machines")
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` ("up to 100 concurrent rooms")
- `docs/architecture/wiki/screens/62-multiplayer-setup/spec.md` (player slots, no explicit max)

---

### Q: 143. How is cheating mitigated in P2P mode?

**Status:** ❌ UNKNOWN

**Answer:**
The architecture relies on **determinism as the primary anti-cheat**: any peer that produces a divergent state hash is detected within one turn, the bisect tool identifies the offending command, and the affected match aborts. This catches *outcome-altering* cheats but does **not** address:
- Information cheats (fog-of-war reveal, opponent stack inspection).
- Replay/rewind exploits.
- Slow-loris / griefing (intentional disconnects to stall).
- AI-assistance / map-hacks that read but do not write state.
No anti-cheat policy, signed-content enforcement at runtime, or peer reputation system is documented.

**Evidence:**
- `tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md` (covers state divergence only)
- No anti-cheat task or doc.

---

### Q: 144. How is encryption / authentication of the channel handled?

**Status:** ⚠ Partial

**Answer:**
**Transport-level only:**
- WebRTC DataChannels are end-to-end encrypted by **DTLS-SRTP** by default — implicit by browser API; not separately specified.
- Signaling server is described as a stateless WebSocket lobby. **TLS (`wss://`) is not explicitly required** in the task spec.
- **No application-level authentication** (no peer identity verification, no signed offers, no room password / token policy beyond a 6-character alphanumeric code).
This leaves the room-code join as the only access control.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (no TLS mandate, no auth)
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md` (relies on browser WebRTC defaults)

---

### Q: 145. What happens on duplicate command IDs from the same actor?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. The wire format `{ seq, playerId, turn, command }` implies a per-peer monotonic sequence number, and the lockstep transport orders commands by `seq`, but neither idempotency on duplicates, deduplication policy, nor rejection-on-conflict is defined. The reliable+ordered DataChannel makes duplicates rare but not impossible (e.g., after reconnection log-range overlap).

**Evidence:**
- `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md` (no duplicate-handling rule)

---

### Q: 146. Are bots simulated locally on each peer or by host only?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified for multiplayer. The AI is deterministic (PCG32 seeded, pure functions) so in principle bots could run identically on every peer using the shared seed and command stream — but no task documents whether bot moves are issued by the host, by every peer redundantly, or are forbidden in multiplayer mode entirely.

**Evidence:**
- No reference to multiplayer-bot ownership in `tasks/phase-3/01-multiplayer/` or `docs/architecture/`.
- AI determinism (`docs/architecture/determinism.md`) makes both options viable but neither is selected.

---

### Q: 147. How is chat / out-of-band data isolated from sync state?

**Status:** ⚠ Partial

**Answer:**
Chat is **lobby-only and not part of deterministic gameplay state**:
- The `SEND_LOBBY_CHAT` command is owned by the multiplayer module and writes to `state.net.lobby.chat`, separate from gameplay reducers.
- Data contracts explicitly exclude transient UI state (hover, focus, chat-typing buffers) from save/replay artifacts.
However, **in-game chat is not specified at all** — there is no in-game chat screen, command, or transport-channel reservation. The separation is by *namespace* (`state.net.*` vs. gameplay state), not by a different DataChannel.

**Evidence:**
- `docs/architecture/wiki/screens/64-network-lobby/spec.md` (`state.net.lobby.chat`)
- `docs/architecture/screen-command-coverage.json` (`SEND_LOBBY_CHAT` owned by phase-3 multiplayer)
- `docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md` (transient state excluded from save/replay)

---

### Q: 148. Is there a reconnection window, and how long?

**Status:** ✔ Defined

**Answer:**
Yes:
- Reconnection itself is supported indefinitely as long as the room exists; the reconnecting peer rejoins via signaling and requests the missing log range.
- **30 seconds**: standard reconnect window — peer catches up invisibly to opponent; game continues.
- **120 seconds**: hard threshold — after 2 minutes the still-connected player is offered "**forfeit or wait**."
- **6 seconds**: heartbeat-loss threshold that triggers host-migration election (separate concern).

**Evidence:**
- `tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md` ("30 seconds … 120 seconds")
- `tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md` (6s heartbeat)

---

### Q: 149. What is the test plan for adversarial network conditions?

**Status:** ⚠ Partial

**Answer:**
Several acceptance criteria touch adversarial cases, but no consolidated network-chaos test plan exists:
- 1000 sequential commands on the ordered channel (`02-webrtc-peer-connection-plus-datachannel-setup`).
- Out-of-order delivery via "artificial delay" (`03-input-only-lockstep-command-serialization-plus-sequencing`).
- 30-second / 120-second disconnect-and-reconnect (`06-reconnection-log-range-request-plus-replay`).
- Host tab-close → migration within 8 seconds (`07-host-migration-heartbeat-election`).
- Cross-browser matrix: Chrome 120+, Firefox 121+, Safari 17+.
- Determinism fuzz harness (M1/`01-engine-core` Task 9) is the M5 prerequisite — random-command bit-identical replay.
**Missing**: packet-loss percentage targets, jitter/latency curves, NAT/CG-NAT testing, TURN failover validation, bandwidth caps, simultaneous-disconnect chaos, signaling-server outage during a match.

**Evidence:**
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`
- `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md`
- `tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md`
- `tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`
- `docs/architecture/determinism.md` (fuzz harness requirement)

---

## 🔍 Summary

### Missing Logic
- **Input-delay budget** for command latency (Q127).
- **Authoritative TURN server** identity, credentials, and fallback policy (Q130).
- **Wall-clock reconciliation contract** — diagram says "synchronized clocks" but determinism rules forbid `Date.now()` in state; need an explicit non-deterministic-only clock policy (Q138).
- **Stall / waiting-on-opponent** UX thresholds (Q139).
- **Spectator mode** entirely undefined (Q140).
- **Player count cap > 2** for any non-hotseat configuration (Q142).
- **Anti-cheat policy** beyond state-divergence detection (Q143).
- **Signaling TLS requirement** and any peer-identity / room-auth contract (Q144).
- **Duplicate command-ID** dedupe / reject rule (Q145).
- **Bot ownership** in multiplayer (Q146).
- **In-game chat** — not specified; only lobby chat exists (Q147).
- **Buffer / queue depth** sizing for the lockstep transport (Q137).
- **Adversarial-network test plan** — no formal jitter/loss/NAT matrix (Q149).

### Risks
- **No automated desync recovery** — only "abort + report." A single non-determinism bug in any pack or rules formula bricks live matches in the field. Mitigation depends entirely on the M1 fuzz harness being airtight.
- **TURN absence** — without a contracted TURN server, ~10–20% of consumer NATs (especially symmetric / CG-NAT mobile) will fail to connect after STUN. Acceptable for closed beta, blocking for public launch.
- **Room-code only access control** — 6-character alphanumeric is enumerable (~36⁶ ≈ 2 B keyspace, but birthday/lookup attacks are trivial against a public lobby). No authentication = trivial griefing.
- **Host migration on a 6-second window** assumes liveness signals work over flaky mobile / corporate NAT; could mis-fire and split the session.
- **Determinism debt** — any new effect, formula, or content pack must respect fixed-point + canonical-serialization rules. The audit pipeline does not currently include a multiplayer-specific determinism gate beyond the engine-core fuzz harness.
- **No tests for adversarial signaling** (server restart mid-match, dropped offer/answer, ICE timeout race).

### Improvements
- Pin a **TURN provider** (Cloudflare / Twilio / coturn self-host) with credentials issued via signaling and auto-fallback policy.
- Define **input-delay budget** (e.g., max 2 s per command before peer is flagged "slow"; max 10 s before "stalled" UI).
- Add a **resync-from-snapshot fallback**: at every Nth turn, persist a canonical state snapshot keyed by command-log offset; on desync, both peers can re-load the latest matching snapshot rather than only abort.
- Specify **command idempotency**: `(playerId, seq)` is a primary key; duplicates are silently dropped.
- Specify **multiplayer bot policy**: bots run on every peer using the same seeded RNG sub-stream — no host-only bot injection (which would create a privileged peer).
- Mandate **`wss://` for signaling** and add a per-room shared secret (rotated, short-lived) so the room code alone cannot be brute-forced.
- Produce a **network-chaos test matrix**: {0%, 1%, 5% loss} × {0, 50, 200 ms RTT} × {0, 50 ms jitter} × {full-cone, symmetric NAT} replayed against the fuzz harness.
- Define **>2-peer scope explicitly**: either commit to N-peer mesh with documented limits, or formally exclude it from M5 and queue it for M7.
- Add an **in-game chat channel** (separate DataChannel, not on commands path) so out-of-band traffic cannot back up the deterministic queue.
- Add a **determinism CI job** that runs the fuzz harness against every multiplayer-relevant PR, and a **content-pack determinism gate** that recomputes contentHash on each pack change.

### AI-Readiness
Score: **6/10**

Reason: The *architectural skeleton* is clear and well-aligned with determinism-first design (input-only lockstep, per-turn hash, replay API, log-range reconnect, heartbeat election). An AI implementer can build M5 against the eight task files end-to-end. However, several operational contracts are unspecified (TURN, auth/TLS, dedupe rule, input-delay budget, bot policy, snapshot-resync, chaos test matrix, >2-player scope), and "abort-on-desync" is brittle without a snapshot fallback. These gaps will surface as decisions the AI must invent during implementation — which violates the spec-first principle. Closing the items in **Improvements** would lift this to 8–9/10.
