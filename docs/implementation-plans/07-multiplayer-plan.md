# Implementation Plan: 07 — Multiplayer

> Derived from [docs/readiness-audit/07-multiplayer.md](../readiness-audit/07-multiplayer.md).
> Original audit file is **not** modified. This plan converts the
> documented gaps (❌ UNKNOWN, ⚠ Partial, Missing Logic, Risks) into
> concrete work items grounded in the existing M5 task tree under
> [tasks/phase-3/01-multiplayer/](../../tasks/phase-3/01-multiplayer/).

---

## 1. Overview

This plan covers the operational and policy gaps in the Phase-3 (M5)
multiplayer module. The audit confirms the **architectural skeleton is
sound**: input-only deterministic lockstep, per-turn xxh64 state-hash
exchange, auto-bisect on desync, log-range reconnection, and
heartbeat host migration are all defined across the eight existing
task files and
[`docs/architecture/diagrams/26-multiplayer-sync.md`](../architecture/diagrams/26-multiplayer-sync.md).

What is missing is the layer of **operational contracts** an AI
implementer would otherwise be forced to invent during M5 execution:

- Concrete latency budgets and stall thresholds.
- A pinned TURN provider and signaling-TLS / room-auth contract.
- A non-deterministic clock policy that does not break replay.
- Idempotency rule for duplicate `(playerId, seq)` commands.
- Multiplayer bot-ownership rule.
- A snapshot-resync fallback so a single non-determinism bug does
  not brick live matches.
- Explicit scope statements for spectators, in-game chat, and
  >2-peer mesh (commit or defer to M7 — do not leave undefined).
- A consolidated network-chaos test matrix.

**Overall readiness state:** 6 / 10 (per audit). Closing the items
below lifts this to 8–9 / 10, which is the threshold for letting
agents implement M5 end-to-end without inventing decisions.

**In scope of this plan:**

- New operational contracts under
  [`docs/architecture/`](../architecture/) and the existing M5 task
  files.
- New task files under
  [`tasks/phase-3/01-multiplayer/`](../../tasks/phase-3/01-multiplayer/)
  for work that does not fit an existing task.
- Extensions (not rewrites) to existing M5 tasks via owned-paths
  shared-extension semantics.

**Explicitly out of scope (deferred to M7 polish):**

- Spectator mode runtime (we will add a scope statement here, but
  the screen package and command set live under M7 — see Q140).
- N-peer (>2) mesh runtime (this plan formalizes the M5 cap at 2;
  N-peer goes to M7 — see Q142).
- Tournament/observer features.

**Cross-plan: Persistence interaction (owned by M1).**
The persistence plan
[`docs/implementation-plans/08-persistence-save-system-plan.md`](08-persistence-save-system-plan.md)
pins the save-side rules that this M5 runtime consumes:

- Saving during a remote match is **host-only**; peer Save tabs are
  read-only and render a "host saved" indicator.
- Loading a save into a multiplayer lobby is host-driven; peers
  receive the full agreed log over the signaling channel during join,
  not a save file.
- Saves include an optional `mp.{ matchId, participants, hostPlayerId }`
  block so a re-loaded match recognizes itself.
- Peers do **not** autosave during a remote match (avoids divergent
  libraries).

These rules are documented in
[`docs/architecture/wiki/screens/55-save-load/interactions.md`](../architecture/wiki/screens/55-save-load/interactions.md) §
"During multiplayer" and consumed by M5 lockstep / lobby tasks. Do
not re-derive them here.

---

## 2. Critical Fixes (Must Do First)

These four items unblock public-facing matches and must land before
M5 exits to "ready for closed beta."

### Issue: No snapshot-resync fallback on desync

**Source:** Q135 (⚠ Partial); Risks bullet 1.

**Problem:**
The current recovery policy is **detect → bisect → report → quit**.
[`tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md`](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)
ends in "report + quit", and
[`docs/architecture/diagrams/26-multiplayer-sync.md`](../architecture/diagrams/26-multiplayer-sync.md)
mentions "Resync from last good state" with **no implementing task**.
A single non-determinism bug in any pack or formula kills every live
match, which makes the determinism gate a single point of failure.

**Impact:**
- Production matches abort instead of recovering.
- Zero margin for a regression escaping the M1 fuzz harness.
- "Report + quit" UX is unacceptable for a public ladder.

**Solution:**
Add a periodic canonical state snapshot keyed by command-log offset.
On `DESYNC_DETECTED`, both peers attempt to roll back to the latest
snapshot whose hash agrees on both sides; only if no agreeing
snapshot exists do we fall through to the bisect-and-quit path.

**Files to Update:**
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — add a "Snapshot cadence and resync" section.
- [docs/architecture/diagrams/26-multiplayer-sync.md](../architecture/diagrams/26-multiplayer-sync.md)
  — replace the unsourced "Resync from last good state" note with
  the new snapshot flow.
- [tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)
  — add Snapshot-resync as the first recovery branch before bisect.

**New Files (if needed):**
- `tasks/phase-3/01-multiplayer/09-snapshot-resync-fallback.md`
  (new M5 task — owned paths: `src/multiplayer/snapshot.ts`,
  shared with Task 4 on the recovery state machine).

**Implementation Steps:**
1. Define snapshot cadence (every N=20 turns; configurable per match).
2. Specify snapshot artifact: `{ seqOffset, turn, contentHash, engineHash, canonicalState, stateHash }`.
3. Add `SNAPSHOT_TAKEN` and `SNAPSHOT_AGREE` exchange messages.
4. On `DESYNC_DETECTED`, both peers walk back through the in-memory
   snapshot ring (last 5) and compare hashes; if any pair agrees,
   restore that snapshot and re-apply commands from `seqOffset+1`.
5. If no snapshot agrees, fall through to existing bisect path.
6. Acceptance: inject a one-formula divergence at turn 30 in a
   recorded match; both peers resync to turn 20 snapshot and finish
   the match successfully.

**Dependencies:**
- Task 4 (per-turn hash exchange) — must already produce stateHash.
- Determinism canonical serializer (existing).

**Complexity:** L

---

### Issue: TURN server not pinned

**Source:** Q130 (⚠ Partial); Risks bullet 2; Improvements bullet 1.

**Problem:**
[`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
calls TURN "optional." Without TURN, ~10–20% of consumer NATs
(symmetric / CG-NAT mobile) fail to connect once STUN cannot punch.

**Impact:**
- Public launch is blocked: many players never reach a peer.
- No documented credential issuance, rotation, or cost owner.

**Solution:**
Pin **one** TURN provider, define credential issuance through the
signaling server (short-lived tokens), and add automatic STUN→TURN
fallback after a configurable ICE-gather timeout.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  — replace "Optional TURN server config" with a mandatory section.
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — add a `/turn-credential` endpoint contract (HMAC-signed,
  expiring).
- [services/](../../services/) — pick the home for the TURN config
  doc (existing folder).

**New Files (if needed):**
- `services/multiplayer/turn-config.md` — provider choice
  (Cloudflare Calls TURN / Twilio NTS / self-hosted coturn),
  credential rotation policy, region list, cost owner.
- `tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md`
  — owned paths: `services/multiplayer/turn/`,
  `src/multiplayer/ice-config.ts`.

**Implementation Steps:**
1. Pick provider (default: Cloudflare Calls TURN; document
   self-hosted coturn as a fallback for self-publishers).
2. Define HMAC credential format (`username = unix-ts:roomId`,
   `credential = base64(hmacSha1(secret, username))`).
3. Signaling server adds `GET /turn-credential` returning
   `{ urls, username, credential, ttl }`.
4. Client adds TURN URLs to `RTCConfiguration.iceServers` only
   after a 4-second STUN-only attempt fails.
5. Acceptance: simulate symmetric NAT (use webrtc-internals + a
   Linux nftables rule); connection succeeds via TURN within 8 s.

**Dependencies:**
- Signaling server (Task 1) must support an HTTP route in addition
  to WebSocket upgrade.

**Complexity:** M

---

### Issue: No `wss://` mandate, no peer auth on signaling

**Source:** Q144 (⚠ Partial); Risks bullet 3; Improvements bullet 6.

**Problem:**
[`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
does not require TLS, and the only access control is a 6-character
alphanumeric room code. The keyspace is enumerable for any active
public lobby; griefing is trivial.

**Impact:**
- Sniffable signaling on public Wi-Fi.
- Room codes alone cannot prevent intruders joining a private match.
- No way to evict a known griefer (no peer identity).

**Solution:**
Mandate `wss://` for the signaling endpoint, add a per-room
shared secret (rotated, short-lived) issued at room creation, and
require a peer-handshake message that carries `{ roomId, peerId,
secret, sigSchemaVersion }`.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — add TLS, room secret, and handshake to acceptance criteria.
- [docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md](../architecture/wiki/screens/62-multiplayer-setup/data-contracts.md)
  — add room-secret field to the join URL contract.
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../architecture/wiki/screens/64-network-lobby/spec.md)
  — surface "share invite link with secret embedded" copy.

**New Files (if needed):**
- `docs/architecture/multiplayer-security.md` — single canonical
  doc on TLS, room secrets, TURN credentials, and threat model.

**Implementation Steps:**
1. Define `JOIN_HANDSHAKE { roomId, peerId, secret }`; signaling
   server rejects mismatches with `JOIN_REJECTED { reason }`.
2. Generate `secret` (16 bytes, base64url) at room creation; embed
   in the invite URL fragment so it does not hit server logs.
3. Configure dev/staging/prod signaling with `wss://`; HTTP
   plain-text disabled in prod.
4. Acceptance: an unauthenticated WebSocket client cannot join an
   existing room; load-balancer health checks ignore handshake.

**Dependencies:**
- Multiplayer-setup screen invite-link generator (existing).

**Complexity:** M

---

### Issue: Duplicate `(playerId, seq)` commands have no defined behavior

**Source:** Q145 (❌ UNKNOWN); Improvements bullet 4.

**Problem:**
The wire format `{ seq, playerId, turn, command }` implies a
per-peer monotonic sequence number, but no idempotency rule is
written down. After reconnection (Task 6), the log-range response
will overlap commands the client already replayed. Without a
defined dedupe rule, behavior is implementation-dependent and
divergent across peers.

**Impact:**
- Reconnection replay risks double-applying a command, breaking
  determinism on the very path designed to recover from drops.
- Two parallel implementers will pick different rules.

**Solution:**
Specify `(playerId, seq)` as a primary key on the command log;
duplicates are silently dropped at the lockstep transport layer
before they reach the reducer.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)
  — add an "Idempotency" subsection to acceptance criteria.
- [tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md)
  — note that overlap is expected and dropped.
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — add `(playerId, seq)` as the canonical command key.

**Implementation Steps:**
1. Add `Set<string>` (`${playerId}:${seq}`) to the lockstep
   transport's seen set.
2. On `RECEIVE_COMMAND`, drop if key is already present; emit a
   counter `dup_command_dropped_total` to telemetry.
3. Acceptance: replay a 1000-command match, then re-feed the last
   200 commands; reducer state is identical, dup counter == 200.

**Dependencies:** none.

**Complexity:** S

---

## 3. System Improvements

Grouped by system. Each issue follows the same shape as Section 2.

### UI / Screens

#### Issue: No stall / "waiting on opponent" thresholds

**Source:** Q139 (❌ UNKNOWN); Improvements bullet 2.

**Problem:**
[`tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md`](../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md)
defines a green/yellow/red status indicator but no thresholds for
when the UI should escalate from "your turn" → "waiting on opponent"
→ "opponent appears stalled."

**Impact:**
- Players cannot tell whether to wait, retry, or quit.
- Designers cannot tune match feel without numbers.

**Solution:**
Pin three thresholds on a single contract:
- 2 s after expected response: status indicator yellow.
- 10 s: visible "waiting on opponent" overlay with last-seen turn.
- 30 s: offer "wait" / "request resync" buttons.
These tie into the existing 30 s reconnect window (Q148).

**Files to Update:**
- [docs/architecture/wiki/screens/62-multiplayer-setup/spec.md](../architecture/wiki/screens/62-multiplayer-setup/spec.md)
- [docs/architecture/wiki/screens/62-multiplayer-setup/interactions.md](../architecture/wiki/screens/62-multiplayer-setup/interactions.md)
- [tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md](../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md)

**Implementation Steps:**
1. Add `multiplayer.statusThresholds` to the screen
   `data-contracts.md`.
2. Wire thresholds into the status indicator state machine.
3. Acceptance: artificial 12 s pause shows the overlay; 35 s pause
   reveals action buttons.

**Dependencies:** Task 8 UI (existing).

**Complexity:** S

---

#### Issue: In-game chat unspecified

**Source:** Q147 (⚠ Partial); Improvements bullet 9.

**Problem:**
Lobby chat exists (`SEND_LOBBY_CHAT` → `state.net.lobby.chat`), but
in-game chat has no screen, command, or DataChannel. If teams add
in-game chat ad-hoc on the `commands` channel, deterministic command
delivery will compete with chat backpressure.

**Impact:**
- Risk of in-game chat starving the gameplay command channel.
- A future contributor will land in-game chat in the wrong place.

**Solution:**
Either (a) reserve a third DataChannel `chat` (`ordered: false,
maxRetransmits: 0`) and a `SEND_GAME_CHAT` command in `state.net.*`
(non-deterministic namespace), or (b) explicitly defer in-game chat
to M7 with a written scope-out. **Pick (a) for M5** — the
infrastructure cost is one DataChannel.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  — add the third channel.
- [docs/architecture/screen-command-coverage.json](../architecture/screen-command-coverage.json)
  — register `SEND_GAME_CHAT` under phase-3 multiplayer.

**New Files (if needed):**
- `docs/architecture/wiki/screens/65-in-game-chat/` — five-package
  set (`mockup.html`, `spec.md`, `interactions.md`,
  `data-contracts.md`, `architecture.md`). Optional for M5; required
  before in-game chat ships.

**Implementation Steps:**
1. Reserve the `chat` DataChannel in the peer-connection setup.
2. Define `SEND_GAME_CHAT` and route to `state.net.game.chat`
   (non-deterministic; never enters the reducer).
3. Acceptance: chat traffic does not appear in replay artifacts;
   chat backpressure does not delay command delivery.

**Dependencies:** Task 2 (peer connection).

**Complexity:** M

---

### Interactions / Operational Contracts

#### Issue: No input-delay budget

**Source:** Q127 (❌ UNKNOWN); Improvements bullet 2.

**Problem:**
The model is turn-based gating, not per-frame lockstep, so there is
no continuous "frame delay." But there is no budget for how long a
peer may take to publish a command before the UI escalates or the
match takes a recovery action.

**Impact:**
- The stall thresholds in the UI fix above need a number to anchor
  on.
- Network-chaos tests cannot have pass/fail criteria.

**Solution:**
Document the canonical budget:
- Soft budget: 2 s per command (UI yellow above this).
- Hard budget: 10 s (overlay).
- Forfeit-or-wait: 120 s (already in
  [Task 6](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md)).

**Files to Update:**
- [tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)
  — add the budget to acceptance criteria.
- [docs/architecture/diagrams/26-multiplayer-sync.md](../architecture/diagrams/26-multiplayer-sync.md)
  — surface the budget on the diagram.

**Implementation Steps:**
1. Constant `INPUT_DELAY_BUDGETS` in
   `src/multiplayer/constants.ts` (new).
2. Reference from UI status indicator and from chaos test plan.

**Dependencies:** none.

**Complexity:** S

---

#### Issue: Wall-clock reconciliation contract is contradictory

**Source:** Q138 (⚠ Partial); Missing-logic bullet 3.

**Problem:**
[`docs/architecture/diagrams/26-multiplayer-sync.md`](../architecture/diagrams/26-multiplayer-sync.md)
mentions "synchronized clocks (for timestamps)," but
[`docs/architecture/determinism.md`](../architecture/determinism.md)
forbids `Date.now()` and `performance.now()` in deterministic paths
and the screen data-contracts forbid wall-clock in replays.

**Impact:**
- Implementer reading the diagram alone might add wall-clock to
  state and break determinism.
- No defined home for genuinely non-deterministic timestamps
  (telemetry, UI debounces, heartbeat scheduling).

**Solution:**
Write a "Clock policy" appendix that explicitly says wall-clock is
forbidden in `state.*` (deterministic) and allowed only in
`state.net.*` and pure side-effect contexts (telemetry, heartbeat
scheduling, UI). Remove the misleading "synchronized clocks" note
from the diagram.

**Files to Update:**
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — add "Clock policy" appendix.
- [docs/architecture/diagrams/26-multiplayer-sync.md](../architecture/diagrams/26-multiplayer-sync.md)
  — remove the "synchronized clocks" note; replace with a pointer
  to the clock-policy appendix.

**Implementation Steps:**
1. Author appendix.
2. Update diagram.
3. Add a lint rule: any `Date.now()` / `performance.now()` import
   inside `src/engine/`, `src/rules/`, or `src/multiplayer/lockstep/`
   fails CI (extends the existing float-ban lint scope).

**Dependencies:** none.

**Complexity:** S

---

#### Issue: Lockstep buffer/queue depth not sized

**Source:** Q137 (❌ UNKNOWN); Missing-logic bullet 12.

**Problem:**
The lockstep transport queues out-of-order commands until contiguous
but no maximum depth, backpressure threshold, or behavior on overflow
is defined.

**Impact:**
- Pathological peer could fill memory by withholding `seq=N` while
  flooding `seq=N+1..N+M`.
- Tests cannot assert pass/fail on "queue too deep."

**Solution:**
Cap the per-peer pending queue at 256 commands; on overflow, treat
as a `STALLED_PEER` event and surface the same UX as the 30 s wait
threshold.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)

**Implementation Steps:**
1. Constant `LOCKSTEP_PENDING_MAX = 256` in
   `src/multiplayer/constants.ts`.
2. On overflow, drop new commands and emit `STALLED_PEER`.
3. Acceptance: synthetic test withholds `seq=10` and floods `seq=11..400`;
   peer reports stalled by `seq=266`.

**Dependencies:** Issue "No input-delay budget" (constants file).

**Complexity:** S

---

#### Issue: Multiplayer bot ownership undefined

**Source:** Q146 (❌ UNKNOWN); Improvements bullet 5.

**Problem:**
AI is deterministic (PCG32 seeded, pure functions), so bots could
run identically on every peer or be issued by the host. Not picking
one is the bug — host-only bots create a privileged peer; redundant
bot computation must not produce different commands per peer.

**Impact:**
- A peer-divergent bot implementation kills determinism.
- AI vs. multiplayer mixing has no contract today.

**Solution:**
Specify: **bots run on every peer** using the shared seed and a
designated RNG sub-stream per bot ID. The first peer in the
deterministic peer order is the *broadcaster* — only that peer's
emitted bot commands are accepted on the wire (others compute but
do not transmit), so we get O(1) traffic with no privileged peer
state.

**Files to Update:**
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — add "Bot RNG sub-streams" subsection.
- [tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)
  — add "Bot commands" section.
- [tasks/phase-2/](../../tasks/phase-2/) — cross-link the AI module
  (existing) to the new contract once that path exists.

**Implementation Steps:**
1. Define `botRngStreamId = hash(matchSeed, botId)`.
2. Lockstep transport accepts only the elected broadcaster's bot
   commands, drops the rest.
3. Acceptance: 1v1+1bot match on two peers; both replay-bit-identical
   over 200 turns.

**Dependencies:**
- Task 7 (host migration) — broadcaster election reuses peer-priority
  ordering.

**Complexity:** M

---

### Architecture / Tasks

#### Issue: Anti-cheat policy missing beyond determinism

**Source:** Q143 (❌ UNKNOWN).

**Problem:**
Determinism catches *outcome-altering* cheats but not information
cheats (fog-of-war reveal, opponent-stack inspection),
replay/rewind exploits, or slow-loris griefing.

**Impact:**
- No documented mitigations means contributors will plug fog-of-war
  data into shared state by mistake.
- Public ladders are infeasible.

**Solution:**
Author an anti-cheat threat model that lists each class and its
mitigation, even when the mitigation is "out of scope for M5":

| Class | M5 mitigation | Owner |
| --- | --- | --- |
| Outcome cheat | Per-turn state hash | Existing (Task 4) |
| Information cheat | Server-authoritative fog state — **deferred to M7** | Doc only |
| Replay/rewind | Pinned engineHash + contentHash on every command | Existing (Task 3) |
| Slow-loris | Input-delay budget + forfeit-or-wait | New (above) |
| Map-hack (read-only) | Acknowledged not solvable in P2P | Doc only |

**Files to Update:**
- New: `docs/architecture/multiplayer-security.md` (same file as the
  TLS / room-secret fix above — fold both into one canonical doc).

**Implementation Steps:**
1. Author the doc.
2. Cross-link from `tasks/phase-3/01-multiplayer.md` and from
   `docs/architecture/overview.md`.
3. Acceptance: doc lints clean, every cell has either an owning task
   or "deferred to M7 — see <ticket>".

**Dependencies:**
- Issue "No `wss://` mandate" (same doc).

**Complexity:** S

---

#### Issue: >2-peer scope undefined

**Source:** Q142 (⚠ Partial); Improvements bullet 8.

**Problem:**
M5 exit criteria say "two players on different networks." Signaling
sizes for 100 concurrent rooms but per-room player count is not
generalized. Full-mesh DataChannel cost would limit practical N to
4–8 anyway. Leaving this implicit means an agent will eventually
build for N>2 against M5 acceptance criteria written for 2.

**Impact:**
- Unbounded scope risk on M5.
- N-peer determinism (per-bot RNG, per-peer log replay) is hairier
  than 2-peer.

**Solution:**
Explicitly cap M5 at 2 peers per room. Defer N-peer to M7 with a
sketch.

**Files to Update:**
- [tasks/phase-3/01-multiplayer.md](../../tasks/phase-3/01-multiplayer.md)
  — module description: "M5 ships 2-player only."
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — add `MAX_PEERS_PER_ROOM = 2` validation.
- [docs/architecture/wiki/screens/62-multiplayer-setup/spec.md](../architecture/wiki/screens/62-multiplayer-setup/spec.md)
  — slot count fixed at 2.

**Implementation Steps:**
1. Add the constant.
2. Reject `JOIN_HANDSHAKE` if room already full.
3. Add an "M7: N-peer mesh" line to
   [docs/architecture/glossary.md](../architecture/glossary.md).

**Dependencies:** Critical fix "wss:// + auth" (handshake exists).

**Complexity:** S

---

#### Issue: Spectator mode undefined

**Source:** Q140 (❌ UNKNOWN); Missing-logic bullet 5.

**Problem:**
No screen, command, or task references spectators. Audit lists
"M7 polish" but no scope statement.

**Impact:**
- Implementers may design state shape that excludes a
  read-only-peer use case.

**Solution:**
Defer to M7. Add an explicit scope-out and a one-paragraph
preliminary contract: spectators receive the canonical command log
read-only over a separate `spectator` DataChannel, never publish
commands, and join via a separate room-code that the players opt in
to share.

**Files to Update:**
- [docs/architecture/glossary.md](../architecture/glossary.md)
  — replace the bare "M7 polish" line with the preliminary contract.
- [tasks/phase-3/01-multiplayer.md](../../tasks/phase-3/01-multiplayer.md)
  — note "spectators are M7 scope, not M5."

**Implementation Steps:**
1. Author the M7 sketch.
2. Cross-link from
   [docs/planning/implementation-log.md](../planning/implementation-log.md).

**Dependencies:** none.

**Complexity:** S

---

### Tasks (Test Plan)

#### Issue: No consolidated network-chaos test plan

**Source:** Q149 (⚠ Partial); Improvements bullet 7.

**Problem:**
Five existing tasks each have point acceptance criteria (1000-command
soak, out-of-order delivery, 30/120 s reconnect, 8 s host migration,
browser matrix), but there is no consolidated matrix covering
packet-loss percentages, jitter, NAT type, TURN failover, signaling
restart, or simultaneous disconnect.

**Impact:**
- M5 can pass per-task acceptance and still fail the first day in
  consumer hands.
- No shared dataset to regress against on every multiplayer PR.

**Solution:**
Author a **network-chaos test matrix** and wire it into CI as a
nightly job (not per-PR; the matrix is too slow). Cross-link from
each existing task's "Test Plan" section.

**Files to Update:**
- All eight task files under
  [tasks/phase-3/01-multiplayer/](../../tasks/phase-3/01-multiplayer/)
  — each gets a one-line pointer to the consolidated matrix.

**New Files (if needed):**
- `tasks/phase-3/01-multiplayer/11-network-chaos-test-matrix.md`
  (new task — owned paths: `tests/multiplayer/chaos/`).

**Implementation Steps:**
1. Define matrix:
   - Loss: {0%, 1%, 5%}.
   - RTT: {0, 50, 200 ms}.
   - Jitter: {0, 50 ms}.
   - NAT: {full-cone, symmetric}.
   - Failure injection: {none, signaling restart mid-match,
     TURN timeout, simultaneous disconnect}.
2. Driver: replay a recorded 200-turn fixture match through the
   chaos shim against two headless browsers.
3. Pass/fail: bit-identical final state with at most one TURN
   fallback per match.
4. Schedule: nightly GitHub Actions job tagged `multiplayer-chaos`.

**Dependencies:**
- Determinism fuzz harness (M1).
- TURN fix (Critical fix #2).

**Complexity:** L

---

#### Issue: Float-ban / determinism lint scope misses multiplayer code paths

**Source:** Risks bullet 5; Improvements bullet 10.

**Problem:**
The audit notes "the audit pipeline does not currently include a
multiplayer-specific determinism gate beyond the engine-core fuzz
harness." Multiplayer code can drift on its own without engine
changes.

**Impact:**
- A reducer change inside `src/multiplayer/lockstep/` could
  introduce non-determinism that the engine fuzz harness never
  exercises.

**Solution:**
Extend the existing CI determinism gate so any change to
`src/multiplayer/**`, `src/engine/**`, `src/rules/**`, or
`resources/**/pack.*` re-runs the fuzz harness with the multiplayer
chaos shim enabled (cheap subset, not the full nightly matrix).

**Files to Update:**
- `.github/workflows/` (path TBD when CI exists) — add a
  `multiplayer-determinism` job.
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — document the gate.

**Implementation Steps:**
1. Add a path-filtered CI job.
2. Acceptance: a synthetic non-deterministic edit in
   `src/multiplayer/lockstep/` fails CI.

**Dependencies:**
- Network-chaos test matrix (above).

**Complexity:** S

---

## 4. Suggested Task Breakdown

Concrete task files to add or extend under
[`tasks/phase-3/01-multiplayer/`](../../tasks/phase-3/01-multiplayer/).
Numbering continues from existing Task 8.

- [ ] **Task 9** — Snapshot-resync fallback
  (`09-snapshot-resync-fallback.md`).
- [ ] **Task 10** — TURN fallback and credentials
  (`10-turn-fallback-and-credentials.md`).
- [ ] **Task 11** — Network-chaos test matrix
  (`11-network-chaos-test-matrix.md`).
- [ ] **Extend Task 1** — `wss://` mandate, room secret, handshake.
- [ ] **Extend Task 2** — third `chat` DataChannel; ICE-gather
  timeout for TURN fallback.
- [ ] **Extend Task 3** — `(playerId, seq)` idempotency rule;
  `LOCKSTEP_PENDING_MAX = 256`; bot-broadcaster rule;
  input-delay-budget constants.
- [ ] **Extend Task 4** — snapshot-resync as first recovery branch.
- [ ] **Extend Task 6** — overlap is expected and dropped (cross-link
  to idempotency rule).
- [ ] **Extend Task 8** — stall thresholds (2 s / 10 s / 30 s).
- [ ] **New doc** — `docs/architecture/multiplayer-security.md`
  (TLS, room secrets, TURN credentials, anti-cheat threat model).
- [ ] **New doc** — `services/multiplayer/turn-config.md` (provider
  pin, rotation policy, cost owner).
- [ ] **New section** — `docs/architecture/determinism.md` "Clock
  policy" + "Snapshot cadence and resync" + "Bot RNG sub-streams".
- [ ] **Diagram update** —
  [`docs/architecture/diagrams/26-multiplayer-sync.md`](../architecture/diagrams/26-multiplayer-sync.md)
  removes the unsourced "synchronized clocks" / "Resync from last
  good state" notes; adds snapshot-resync flow.
- [ ] **Glossary** — `docs/architecture/glossary.md` carries the
  M7 spectator + N-peer scope sketches.
- [ ] **CI gate** — multiplayer-determinism job on path-filter.

After authoring, run:
- `npm run generate:task-registry`
- `npm run validate:tasks`
- `npm run validate`

---

## 5. Execution Order

Driven by dependencies and risk. Each step is a self-contained
checkpoint.

1. **Clock policy + idempotency rule** — pure documentation +
   small code change. Unblocks every later task; no other
   dependencies.
   *(Issues: Q138, Q145, Q137.)*
2. **Multiplayer security doc** — TLS, room secret, TURN
   credentials, anti-cheat table consolidated into one doc.
   *(Issues: Q143, Q144.)*
3. **TURN fallback + credentials (Task 10)** — depends on #2
   for credential format.
   *(Issue: Q130.)*
4. **wss:// mandate + handshake on signaling (extend Task 1)** —
   depends on #2.
   *(Issue: Q144.)*
5. **In-game chat DataChannel + bot-broadcaster (extend Task 2 /
   Task 3)** — depends on #1 for clock policy and on Task 7
   (host migration) for peer-priority ordering.
   *(Issues: Q146, Q147.)*
6. **Snapshot-resync (Task 9, extend Task 4)** — depends on #1
   for canonical-serializer rules and on Task 4's hash exchange.
   *(Issue: Q135.)*
7. **Stall-threshold UI (extend Task 8)** — depends on #1 for
   the input-delay budget constants.
   *(Issue: Q139.)*
8. **>2-peer cap + spectator scope-out** — pure documentation;
   parallelizable with #5 / #6.
   *(Issues: Q140, Q142.)*
9. **Network-chaos test matrix (Task 11)** — depends on #3 (TURN)
   and #6 (snapshot-resync) so the matrix can validate them.
   *(Issue: Q149.)*
10. **Multiplayer-determinism CI gate** — depends on #9 for the
    chaos shim.
    *(Issue: Risks bullet 5.)*

---

## 6. Risks if Not Implemented

- **Single-bug match-killer.** Without snapshot-resync (#6), any
  pack regression aborts every concurrent match. The M1 fuzz
  harness becomes a single point of failure.
- **NAT exclusion.** Without TURN (#3), a meaningful slice of
  consumer mobile + corporate users cannot complete a match —
  blocks public launch.
- **Replay-divergent reconnects.** Without idempotency (#1), the
  log-range overlap on reconnect (Task 6) double-applies commands
  and triggers exactly the desync the system claims to prevent.
- **Privileged-peer drift.** Without a bot-broadcaster rule (#5),
  bot-included matches will have peer-divergent commands and
  cannot survive the per-turn hash gate.
- **Public lobby griefing.** Without `wss://` + room secret (#4),
  6-character room codes are enumerable and matches can be hijacked.
- **No regression net.** Without the chaos matrix and CI gate
  (#9, #10), the system passes the per-task acceptance criteria
  but fails its first day in consumer networks.
- **Scope creep on M5.** Without the >2-peer cap (#8), agents
  will start designing N-peer mesh against 2-peer acceptance
  criteria.

---

## 7. AI Implementation Readiness

Score: **8 / 10** (post-plan; current state is 6 / 10 per audit).

After the plan executes:
- Every operational decision the audit flagged is anchored in a
  named doc or task file.
- Snapshot-resync replaces "abort + report" as the default recovery
  branch, removing the only single-point-of-failure risk in the
  architecture.
- Determinism rules cover bots, chat, clocks, and snapshots — not
  just the reducer.
- Security has one canonical doc instead of being implicit.
- The chaos test matrix turns "we think it works" into a regression
  net the CI gate enforces.

The remaining 2-point gap is acceptable for M5 and tracks two
things that genuinely belong in M7:
- Spectator mode (preliminary contract only; full screen package
  is M7).
- N-peer mesh (formally deferred; sketch only in glossary).

Closing those would lift this to 10 / 10 but is out of M5 scope by
design.
