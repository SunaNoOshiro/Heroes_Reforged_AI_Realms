# Host Migration — Heartbeat Election

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
If the host player disconnects, a new host is elected. The new host publishes the authoritative command log.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/signaling-envelope.md`](../../../docs/architecture/signaling-envelope.md)
- [`docs/architecture/abandon-penalty.md`](../../../docs/architecture/abandon-penalty.md)

Inputs:
- Task 6, heartbeat DataChannel (Task 2)

Outputs:
- `src/net/webrtc/host-migration.ts`
- Heartbeat sent every 2 seconds on unordered channel
- If host heartbeat absent for 6 seconds: non-host peers elect new host by highest-priority peer ID
- New host broadcasts a signed `HOST_CHANGED` envelope (signed by
  the elected host's Ed25519 keypair per
  [`signaling-envelope.md`](../../../docs/architecture/signaling-envelope.md))
  + full log to all peers. Receivers verify against the candidate-
  host pool snapshot frozen at the last consistent turn; mismatched
  signer dispatches
  `TRUST_VIOLATION_DETECTED { kind: 'unknownSigner' }`.
- Quorum-attested `PEER_DISCONNECTED` for the dropped host: the
  new host wraps both its heartbeat-loss observation and the
  signaling server's WebSocket-close timestamp into a host-signed
  envelope per
  [`abandon-penalty.md` § 1](../../../docs/architecture/abandon-penalty.md#1-quorum-rule).
  Owned by [Task 28](./28-abandon-penalty-and-quorum-disconnect.md).
- Signaling server updated with new host's peer ID.

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
- **`WILL_BACKGROUND` extension protocol (Q217).** When a peer
  emits `visibilitychange:hidden`, it sends a `WILL_BACKGROUND`
  transport message to its peers. Receiving peers extend that
  side's heartbeat tolerance from 6 s to **30 s** for the next
  **60 s**. After 60 s of continuous backgrounding the normal
  6 s threshold resumes (mobile sleep ≈ disconnect). On
  `:visible`, the peer emits a `STATE_HASH_PROBE` and the standard
  desync / reconnection flow takes over. See
  [`docs/architecture/visibility-policy.md`](../../../docs/architecture/visibility-policy.md).

Network-Chaos Coverage:
- Per-PR module-level chaos: this task must pass the **host
  migration under permanent partition** scenario in
  [`12-network-chaos-harness.md`](./12-network-chaos-harness.md).
  Acceptance: a peer whose heartbeat times out during a NetSim
  permanent partition triggers re-election within 8 seconds and the
  new host successfully resumes log publication on the surviving
  peer's transport.
- Nightly stack-level chaos: also exercised by the consolidated
  network-chaos test matrix
  ([`11-network-chaos-test-matrix.md`](./11-network-chaos-test-matrix.md))
  — the `simultaneous disconnect` failure-injection cell pins
  regression protection for this task.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
