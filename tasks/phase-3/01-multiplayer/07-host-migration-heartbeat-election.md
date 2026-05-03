# Host Migration — Heartbeat Election

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
If the host player disconnects, a new host is elected. The new host publishes the authoritative command log.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Task 6, heartbeat DataChannel (Task 2)

Outputs:
- `src/net/webrtc/host-migration.ts`
- Heartbeat sent every 2 seconds on unordered channel
- If host heartbeat absent for 6 seconds: non-host peers elect new host by highest-priority peer ID
- New host broadcasts `HOST_CHANGED` + full log to all peers
- Signaling server updated with new host's peer ID

Owned Paths:
- `src/net/webrtc/host-migration.ts`

Dependencies:
- phase-3.01-multiplayer.02-webrtc-peer-connection-plus-datachannel-setup
- phase-3.01-multiplayer.06-reconnection-log-range-request-plus-replay

Acceptance Criteria:
- Host closes browser tab → new host elected within 8 seconds
- After migration, game continues from last consistent turn (no state loss)
- New host correctly takes over log publication and hash exchange
- Peer-priority order also drives the bot-broadcaster election
  defined in [`03-input-only-lockstep-command-serialization-plus-sequencing.md` § Bot Commands](./03-input-only-lockstep-command-serialization-plus-sequencing.md#bot-commands);
  re-electing the host re-elects the bot broadcaster atomically.

Network-Chaos Coverage:
- Exercised by the consolidated network-chaos test matrix
  ([`11-network-chaos-test-matrix.md`](./11-network-chaos-test-matrix.md))
  — the `simultaneous disconnect` failure-injection cell pins
  regression protection for this task.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
