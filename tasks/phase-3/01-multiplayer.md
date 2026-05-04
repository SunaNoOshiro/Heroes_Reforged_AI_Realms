# Module: Multiplayer — WebRTC Lockstep (M5)

P2P multiplayer. Two players on different machines complete a real match using WebRTC DataChannels. The sim's determinism guarantees they stay in sync; the signaling server is a stateless lobby only.

**Milestone**: M5 — Multiplayer  
**Prerequisite**: Fuzz harness (`01-engine-core.md` Task 9) must pass before this module starts. No exceptions.  
**Total Estimate**: ~56 hours
**Exit Criteria**: Two players on different networks complete a full match with no desync; disconnection and reconnection work.

**M5 Scope Caps**

- **2 peers per room.** N-peer mesh is M7 scope; the signaling
  server enforces `MAX_PEERS_PER_ROOM = 2` at handshake (see
  [Task 1](./01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)).
- **Spectators are M7 scope, not M5.** Preliminary contract sketched
  in [`docs/architecture/glossary.md`](../../docs/architecture/glossary.md);
  no screen package, command, or DataChannel ships in M5.
- **In-game chat ships in M5** on a dedicated `chat` DataChannel
  (Task 2); screen package
  [`docs/architecture/wiki/screens/65-in-game-chat/`](../../docs/architecture/wiki/screens/)
  is optional for M5 and required before in-game chat is exposed in
  the UI.

Anti-cheat threat model and TLS / room-secret / TURN credentials
contract live in [`docs/architecture/multiplayer-security.md`](../../docs/architecture/multiplayer-security.md).

---

## Task Files

- [01-signaling-server-node-js-websocket-lobby.md](01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  🤖 Task 1: Signaling server — Node.js WebSocket lobby (~4h)
- [02-webrtc-peer-connection-plus-datachannel-setup.md](01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  🧠⚠️ Task 2: WebRTC peer connection + DataChannel setup (~5h)
- [03-input-only-lockstep-command-serialization-plus-sequencing.md](01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)
  🧠⚠️ Task 3: Input-only lockstep — command serialization + sequencing (~5h)
- [04-per-turn-hash-exchange-plus-desync-detection.md](01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)
  🧠⚠️ Task 4: Per-turn hash exchange + desync detection (~4h)
- [05-auto-bisect-on-hash-mismatch.md](01-multiplayer/05-auto-bisect-on-hash-mismatch.md)
  🧠⚠️ Task 5: Auto-bisect on hash mismatch (~4h)
- [06-reconnection-log-range-request-plus-replay.md](01-multiplayer/06-reconnection-log-range-request-plus-replay.md)
  🧠 Task 6: Reconnection — log-range request + replay (~5h)
- [07-host-migration-heartbeat-election.md](01-multiplayer/07-host-migration-heartbeat-election.md)
  🤖 Task 7: Host migration — heartbeat election (~4h)
- [08-multiplayer-ui-lobby-invite-link-in-game-status.md](01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md)
  🤖 Task 8: Multiplayer UI — lobby, invite link, in-game status (~5h)
- [09-snapshot-resync-fallback.md](01-multiplayer/09-snapshot-resync-fallback.md)
  🧠⚠️ Task 9: Snapshot-resync fallback (~6h)
- [10-turn-fallback-and-credentials.md](01-multiplayer/10-turn-fallback-and-credentials.md)
  🤖 Task 10: TURN fallback and credentials (~4h)
- [11-network-chaos-test-matrix.md](01-multiplayer/11-network-chaos-test-matrix.md)
  🧠⚠️ Task 11: Network-chaos test matrix (~6h)
- [12-network-chaos-harness.md](01-multiplayer/12-network-chaos-harness.md)
  🧠⚠️ Task 12: Network-chaos harness — NetSim transport (~6h)

## Chaos Test Contract

The four adversarial scenarios required by the per-PR module-level
chaos harness ([Task 12](./01-multiplayer/12-network-chaos-harness.md))
plus the nightly stack-level chaos matrix
([Task 11](./01-multiplayer/11-network-chaos-test-matrix.md)). Both
layers ship; both gates must pass before the multiplayer module is
considered done.

| Adversarial scenario | Per-PR (Task 12) | Nightly (Task 11) | Owner task |
|---|---|---|---|
| Lockstep under loss + jitter | NetSim seeded loss / latency | matrix axes (loss × RTT × jitter) | [Task 3](./01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) |
| Bisect under reorder | NetSim reorder window | matrix `determinism injection` cell | [Task 5](./01-multiplayer/05-auto-bisect-on-hash-mismatch.md) |
| Reconnect under transient partition | NetSim `partitionAt → heal` | matrix `signaling restart` cell | [Task 6](./01-multiplayer/06-reconnection-log-range-request-plus-replay.md) |
| Host migration under permanent partition | NetSim permanent partition | matrix `simultaneous disconnect` cell | [Task 7](./01-multiplayer/07-host-migration-heartbeat-election.md) |

Per-PR chaos targets reproducibility: same `(seed, scenario)` →
identical trace. Nightly chaos targets coverage of real-network
failure modes that NetSim cannot represent. The two layers complement
each other; neither replaces the other.
