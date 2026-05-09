# Abandon Penalty & Quorum-Attested Disconnect

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Implement the quorum-attested `PEER_DISCONNECTED` envelope, the
`state.profile.abandonHistory` ring buffer, and the abandon-penalty
tier ladder per
[`abandon-penalty.md`](../../../docs/architecture/abandon-penalty.md).
Closes the disconnect-spoof / forfeit-fraud window where a peer
about to lose can fake the opponent's drop and claim a win-on-
timeout.


Read First:
- [`docs/architecture/abandon-penalty.md`](../../../docs/architecture/abandon-penalty.md)
- [`docs/architecture/signaling-envelope.md`](../../../docs/architecture/signaling-envelope.md)
- [`docs/architecture/peer-trust.md`](../../../docs/architecture/peer-trust.md)
- [`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../../../docs/architecture/wiki/screens/64-network-lobby/interactions.md)
- [`content-schema/schemas/abandon-penalty.schema.json`](../../../content-schema/schemas/abandon-penalty.schema.json)

Inputs:
- Heartbeat-loss observation from
  [Task 03](./03-input-only-lockstep-command-serialization-plus-sequencing.md).
- Signed envelope wrap / verify from
  [Task 26](./26-signed-signaling-envelope.md).
- Continuity challenge from
  [Task 27](./27-dtls-fingerprint-pinning.md).
- Heartbeat / host-election state from
  [Task 07](./07-host-migration-heartbeat-election.md).

Outputs:
- `src/net/abandon/penalty.ts` — `recordAbandonPenalty`,
  `inspectAbandonHistory`, ring-buffer pruning at 64 entries,
  decay rule per
  [`abandon-penalty.md` § 4](../../../docs/architecture/abandon-penalty.md#4-penalty-tiers).
- `src/net/abandon/quorum.ts` — `verifyDisconnectAttestation(env)`:
  consumes a host-signed `PEER_DISCONNECTED` envelope and asserts
  both witness conditions (peer heartbeat-loss observation +
  signaling-server `signalingObservedAt` timestamp); enforces the
  30 s attestation timeout.
- `src/net/abandon/__tests__/*.test.ts` — coverage for genuine
  disconnect, forged envelope rejection, and attestation timeout.

Owned Paths:
- `src/net/abandon/penalty.ts`
- `src/net/abandon/quorum.ts`
- `src/net/abandon/__tests__/`

Dependencies:
- phase-3.01-multiplayer.26-signed-signaling-envelope
- phase-3.01-multiplayer.27-dtls-fingerprint-pinning

Acceptance Criteria:
- On heartbeat loss ≥ 30 s the surviving peer enters
  `awaitingDisconnectAttestation` state and renders
  `Awaiting disconnect attestation…` per
  [`64-network-lobby/interactions.md` § Trust Violation](../../../docs/architecture/wiki/screens/64-network-lobby/interactions.md).
- The signaling server's WebSocket-close timestamp is wrapped into
  a host-signed `PEER_DISCONNECTED` envelope per
  [`signaling-envelope.md`](../../../docs/architecture/signaling-envelope.md);
  the surviving peer verifies both witnesses before consumption.
- Verified disconnect dispatches `RECORD_ABANDON_PENALTY` per
  [`docs/architecture/command-schema.md` § Multiplayer Trust & Identity Commands](../../../docs/architecture/command-schema.md#multiplayer-trust--identity-commands)
  and writes a [`abandon-penalty.schema.json`](../../../content-schema/schemas/abandon-penalty.schema.json)-conformant
  row to `state.profile.abandonHistory`.
- Abandon-history ring buffer is capped at 64 entries; older
  entries are dropped on push.
- Decay rule: one tier-step decay per 5 clean sessions for
  `cooldown-15min`, per 10 clean sessions for
  `leaverboard-flag`.
- Forged-envelope test: a `PEER_DISCONNECTED` envelope from a
  non-host peer is rejected by the envelope verification step
  (Task 26); no penalty is recorded.
- Attestation-timeout test: 30 s with no signaling-server
  attestation surfaces
  `Disconnect attestation failed — match aborted`; no penalty is
  recorded against either peer.
- `INSPECT_ABANDON_HISTORY` opens a read-only panel rendering
  `state.profile.abandonHistory`; the panel never enters the
  deterministic engine command log.
- The implementation imports no PCG32 RNG; the only wall-clock
  read is via the privileged signaling-clock helper per
  [`determinism.md` § Wall-clock readers](../../../docs/architecture/determinism.md#wall-clock-readers).

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
