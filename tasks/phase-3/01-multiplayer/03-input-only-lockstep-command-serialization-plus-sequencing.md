# Input-Only Lockstep — Command Serialization + Sequencing

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Only Commands travel over the network — never state. Each command includes a sequence number. Both peers apply commands in the same sequence number order. Out-of-order commands are queued until their turn.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Command dispatcher (`01-engine-core.md` Task 6)
- Peer connection (Task 2)

Outputs:
- `src/net/webrtc/lockstep.ts`
- `LockstepTransport`: wraps `PeerConn`, handles command sequencing
- Wire format: `{ seq: number, playerId: number, turn: number, command: Command }` (JSON)
- Both peers must apply turn N's commands before processing turn N+1
- Turn gate: local player presses "End Turn" in the UI, which sends
  canonical `END_DAY` through the command log, then waits for all peers
  to send their same-turn commands before advancing

Owned Paths:
- `src/net/webrtc/lockstep.ts`

Dependencies:
- phase-3.01-multiplayer.02-webrtc-peer-connection-plus-datachannel-setup

Acceptance Criteria:
- 100 commands sent and received in sequence with no drops (on good connection)
- Out-of-order delivery (simulate by artificial delay) is handled correctly
- Same command applied at same position → same state on both peers (fuzz test variant)

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
