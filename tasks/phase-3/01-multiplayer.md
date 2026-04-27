# Module: Multiplayer — WebRTC Lockstep (M5)

P2P multiplayer. Two players on different machines complete a real match using WebRTC DataChannels. The sim's determinism guarantees they stay in sync; the signaling server is a stateless lobby only.

**Milestone**: M5 — Multiplayer  
**Prerequisite**: Fuzz harness (`01-engine-core.md` Task 9) must pass before this module starts. No exceptions.  
**Total Estimate**: ~36 hours  
**Exit Criteria**: Two players on different networks complete a full match with no desync; disconnection and reconnection work.

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
