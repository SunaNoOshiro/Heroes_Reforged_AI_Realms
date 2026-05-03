# Implementation Report: 07 — Multiplayer

> Companion to
> [`docs/implementation-plans/07-multiplayer-plan.md`](./07-multiplayer-plan.md).
> Records what was actually applied to the repository on 2026-05-03.

---

## Summary

All ten execution-order steps from the plan landed in this pass.
The four critical fixes (snapshot-resync, TURN pin, `wss://` + room
secret, `(playerId, seq)` idempotency) are anchored in named docs
and task files; the seven system improvements (stall thresholds,
in-game chat channel, input-delay budget, clock policy, lockstep
queue cap, bot ownership, anti-cheat threat model) are cross-linked
into the existing M5 task tree. The two scope-statements (2-peer cap
+ spectator scope-out) are pinned in the module README, glossary,
and screen package. The chaos test matrix and the
multiplayer-determinism CI gate close the regression-net gap.

`npm run validate` is green: 323 tasks across 24 modules, 0 issues.
`npm test` is green: 32/32. Three new tasks register in the
phase-3 multiplayer module (Tasks 9, 10, 11) and the module
estimate climbs from ~36 h to ~50 h.

---

## 1. Updated files

### `docs/architecture/determinism.md`

Added a "Multiplayer Determinism Appendix" with four subsections:
**Canonical Command Key** (`(playerId, seq)` is primary key on the
log; lockstep transport drops dups silently with a telemetry
counter), **Clock Policy** (wall-clock forbidden in `state.*`,
allowed only in `state.net.*` and pure side-effect contexts; lint
extends to `src/net/webrtc/**`), **Snapshot Cadence and Resync**
(ring of last 5 snapshots every 20 turns; `SNAPSHOT_TAKEN` /
`SNAPSHOT_AGREE` exchange; restore from newest agreeing
`seqOffset`), and **Bot RNG Sub-Streams**
(`botRngStreamId = hash(matchSeed, botId)`; every peer computes,
only the broadcaster transmits).

### `docs/architecture/diagrams/26-multiplayer-sync.md`

Replaced the single "Resync from last good state" note in the alt
branch with the three-step recovery ladder
(snapshot-resync → bisect → report). Removed the misleading
"synchronized clocks (for timestamps)" determinism requirement and
replaced it with a pointer to the new clock-policy section. Added a
"Recovery Flow" prose block.

### `docs/architecture/glossary.md`

Pinned the M5 2-peer cap on the M5 milestone entry. Added an
"M7 Multiplayer Scope Sketches" section with three preliminary
contracts: spectator (read-only zero-publish peer), N-peer mesh
(formal deferral with implementation notes), and tournament
observer (out of P2P scope by definition).

### `docs/architecture/screen-command-coverage.json`

(No changes shipped after rollback — `SEND_GAME_CHAT` lives in
`task-command-token-coverage.json` until the in-game chat screen
package lands. See Assumption 1 below.)

### `docs/architecture/task-command-token-coverage.json`

Registered four event-only network message types
(`SNAPSHOT_TAKEN`, `SNAPSHOT_AGREE`, `SNAPSHOT_DISAGREE`,
`STALLED_PEER`) and five documented non-command tokens
(`HMAC_SHA1`, `INPUT_DELAY_BUDGETS`, `JOIN_HANDSHAKE`,
`JOIN_REJECTED`, `SEND_GAME_CHAT`).

### `docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md`

Added `inviteUrl` and `statusThresholds` selectors. Annotated
`playerSlots` with the M5 2-peer cap and the M7 N-peer deferral.

### `docs/architecture/wiki/screens/62-multiplayer-setup/spec.md`

Added `statusThresholds` and `inviteUrl` rows to State Bindings.
Cross-linked the 2-peer cap on the `playerSlots` entry.

### `docs/architecture/wiki/screens/62-multiplayer-setup/interactions.md`

Added a `state.net.statusThresholds` State Changes entry and a
"Stall Threshold Behavior" block that pins the 2 s / 10 s / 30 s /
120 s ladder.

### `docs/architecture/wiki/screens/64-network-lobby/spec.md`

Pinned the 2-peer cap on the description and surfaced the
"share invite link with secret embedded" copy directive.

### `docs/planning/implementation-log.md`

Added the "Multiplayer Plan Implementation (2026-05-03)" entry
under "Implemented So Far" — enumerates the doc updates, new task
files, screen-package edits, and the spectator/N-peer M7 sketches.

### `tasks/phase-3/01-multiplayer.md`

Bumped Total Estimate from ~36 h to ~50 h. Added an "M5 Scope Caps"
block (2 peers, spectator deferral, in-game chat reservation) and a
pointer to `multiplayer-security.md`. Listed Tasks 9, 10, 11 in the
Task Files inventory.

### `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`

Added `JOIN_HANDSHAKE`, `JOIN_REJECTED`, room secret, deploy-time
TLS terminal, and the reserved `/turn-credential` HTTP route to
Outputs. Acceptance criteria now require the `wss://` mandate, the
room-secret handshake, the 2-peer cap (`MAX_PEERS_PER_ROOM = 2`),
and the reserved HTTP route stub. Cross-linked the chaos matrix.

### `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`

Added the third `chat` DataChannel (unordered, fire-and-forget) and
the 4 s ICE-gather timeout hook for the TURN fallback in Task 10.
Acceptance criteria now require chat backpressure isolation and the
ICE-gather timeout firing. Cross-linked the chaos matrix.

### `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md`

Added `src/net/webrtc/constants.ts` to Outputs / Owned Paths.
Authored four new contract sections: **Idempotency** (`(playerId,
seq)` dedupe set + telemetry), **Input-Delay Budget**
(`INPUT_DELAY_BUDGETS = { softMs, hardMs, forfeitMs }`),
**Pending-Queue Cap** (`LOCKSTEP_PENDING_MAX = 256` →
`STALLED_PEER`), and **Bot Commands** (broadcaster election reuses
peer-priority order from Task 7). Cross-linked the chaos matrix.

### `tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md`

Re-wrote the description to declare the three-step recovery ladder
(snapshot-resync → bisect → report). Acceptance now requires the
recovery state machine to delegate to Task 9 first. Cross-linked
the chaos matrix.

### `tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`

Acceptance now requires bisect to run only after Task 9 emits
`SNAPSHOT_DISAGREE` for every entry in the snapshot ring.
Cross-linked the chaos matrix.

### `tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md`

Added an "Idempotency Note" pinning the rule that `LOG_RESPONSE`
overlap is expected and silently dropped by the lockstep transport
dedupe set. Cross-linked the chaos matrix.

### `tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`

Acceptance now requires the peer-priority order to atomically drive
the bot-broadcaster election. Cross-linked the chaos matrix
(simultaneous-disconnect cell).

### `tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md`

Added the room-secret invite-URL note, replaced the green/yellow/red
indicator with the formal stall-threshold table (2 s / 10 s / 30 s /
120 s), and added two new acceptance criteria (12 s pause shows
overlay; 35 s pause reveals action buttons). Cross-linked the chaos
matrix.

---

## 2. New files

### `docs/architecture/multiplayer-security.md`

Single canonical doc consolidating: `wss://` mandate, room-secret +
`JOIN_HANDSHAKE` contract, transport threat model, TURN credential
format (HMAC-SHA1, 600 s TTL), TURN threat model, and the anti-cheat
threat-model table (outcome / information / replay-rewind /
slow-loris / map-hack / modified client / lobby griefing /
privileged-peer drift). Each row points at an owning task or
explicit M7 deferral.

### `services/multiplayer/turn-config.md`

Operational config: provider pin (Cloudflare Calls TURN with coturn
fallback), `/turn-credential` endpoint contract, rotation policy
(30-day shared-secret window with 5-min overlap), region list, cost
owner table, and the client-side fallback flow.

### `tasks/phase-3/01-multiplayer/09-snapshot-resync-fallback.md`

New M5 task. Owns `src/net/webrtc/snapshot.ts` (snapshot ring +
exchange messages + restore flow). Shares `sync-check.ts` with
Task 4 under additive-extension semantics. ~6 h.

### `tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md`

New M5 task. Owns `services/multiplayer/turn/` and
`src/net/webrtc/ice-config.ts`. Shares `services/signaling/src/server.ts`
(Task 1) and `src/net/webrtc/peer-connection.ts` (Task 2) under
additive-extension semantics. ~4 h.

### `tasks/phase-3/01-multiplayer/11-network-chaos-test-matrix.md`

New M5 task. Owns `tests/multiplayer/chaos/`. Defines the matrix
axes (loss / RTT / jitter / NAT / failure injection), the 200-turn
fixture replay driver, and the nightly GitHub Actions schedule.
Depends on Tasks 4, 6, 7, 9, 10. ~6 h.

### `.github/workflows/multiplayer-determinism.yml`

Path-filtered CI gate. Triggers on changes to `src/net/webrtc/**`,
`src/engine/**`, `src/rules/**`, `resources/**/pack.*`, or the
chaos-test directory. Runs the cheap chaos-shim subset per-PR
(no-op until Task 11's directory exists, so it can ship ahead of
the implementing tasks).

---

## 3. Assumptions

1. **In-game chat screen package deferred.** The plan listed the
   screen package as "Optional for M5; required before in-game chat
   ships," but registering `SEND_GAME_CHAT` in
   `screen-command-coverage.json` (the second file the plan asked
   to update for Q147) requires an `interactions.md` cite, which
   in turn requires a screen package and a UI task that owns it —
   a scope expansion the plan explicitly avoided. Resolution: the
   wire reservation for `SEND_GAME_CHAT` lives in Task 2 outputs,
   the token is registered as a documented non-command in
   `task-command-token-coverage.json`, and the screen-command
   registration follows once the M7 chat UI screen package lands.
   The chat DataChannel itself is reserved in M5 per the plan.

2. **New module code lives under `src/net/webrtc/`, not
   `src/multiplayer/`.** The plan referenced `src/multiplayer/`
   five times (e.g., `src/multiplayer/snapshot.ts`,
   `src/multiplayer/constants.ts`); the existing M5 tasks all use
   `src/net/webrtc/` and the module-graph contract assigns the
   multiplayer layer to `src/net/**`. Resolution: every owned-path
   citation in the new task files (9, 10, 11) and the determinism
   appendix uses `src/net/webrtc/` for consistency with the eight
   pre-existing tasks. The plan's `src/multiplayer/...` references
   are interpreted as "the multiplayer module under `src/`."

3. **In-game chat screen number.** The plan suggested
   `docs/architecture/wiki/screens/65-in-game-chat/`, but `65` is
   already taken by `65-map-editor`. When the screen package lands
   (post-M5), it will need an unused number (e.g., `68-in-game-chat`).

---

## 4. Blockers

None. Validation green:

- `npm run validate`: 323 tasks across 24 modules; all sub-checks
  (links, contracts, cross-refs, commands, tasks, arch,
  ui-components, animation-budgets, enums) pass.
- `npm test`: 32/32.
