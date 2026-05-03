# Reconnection — Log-Range Request + Replay

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
When a player disconnects and reconnects, they request the missing command log range from the host. The host sends the log range; the peer replays to catch up.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Task 3, Replay API (`01-engine-core.md` Task 8)

Outputs:
- `src/net/webrtc/reconnection.ts`
- Reconnect flow:
  1. Peer re-connects to signaling server and rejoins room
  2. Sends `LOG_REQUEST { fromSeq, toSeq }` to host via DataChannel
  3. Host sends `LOG_RESPONSE { commands[] }` in chunks if needed
  4. Peer replays commands, advances to current turn, resumes normal lockstep

Owned Paths:
- `src/net/webrtc/reconnection.ts`

Dependencies:
- phase-3.01-multiplayer.02-webrtc-peer-connection-plus-datachannel-setup
- phase-3.01-multiplayer.03-input-only-lockstep-command-serialization-plus-sequencing

Acceptance Criteria:
- Player disconnects for 30 seconds and reconnects → catches up and resumes play
- Catch-up replay is invisible to the other player (game continues during reconnection)
- If disconnection exceeds 120 seconds: offer forfeit or wait option

Idempotency Note:
- The `LOG_RESPONSE { commands[] }` will overlap commands the
  reconnecting peer already replayed. **Overlap is expected and
  silently dropped** by the lockstep transport's `(playerId, seq)`
  dedupe set; do not pre-trim the response.
- See
  [`03-input-only-lockstep-command-serialization-plus-sequencing.md` § Idempotency](./03-input-only-lockstep-command-serialization-plus-sequencing.md#idempotency)
  and
  [`docs/architecture/determinism.md` § Canonical Command Key](../../../docs/architecture/determinism.md#canonical-command-key).

Network-Chaos Coverage:
- This task is exercised by the consolidated network-chaos test matrix
  ([`11-network-chaos-test-matrix.md`](./11-network-chaos-test-matrix.md)).

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
