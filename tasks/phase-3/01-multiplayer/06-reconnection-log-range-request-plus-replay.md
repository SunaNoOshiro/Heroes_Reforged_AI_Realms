# Reconnection — Log-Range Request + Replay

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
When a player disconnects and reconnects, they request the missing command log range from the host. The host sends the log range; the peer replays to catch up.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/dtls-fingerprint-pinning.md`](../../../docs/architecture/dtls-fingerprint-pinning.md)
- [`docs/architecture/signaling-envelope.md`](../../../docs/architecture/signaling-envelope.md)
- [`docs/architecture/abandon-penalty.md`](../../../docs/architecture/abandon-penalty.md)
- [`docs/architecture/diagrams/31-reconnect-continuity-challenge.md`](../../../docs/architecture/diagrams/31-reconnect-continuity-challenge.md)

Inputs:
- Task 3, Replay API (`01-engine-core.md` Task 8)

Outputs:
- `src/net/webrtc/reconnection.ts`
- Reconnect flow:
  1. Peer re-connects to signaling server and rejoins room.
  2. Host emits a signed `CHALLENGE` envelope; reconnecting peer
     replies with `CHALLENGE_RESPONSE` signed by the **same** Ed25519
     keypair that signed the original `JOIN_ROOM`. Host verifies
     the signature **and** compares the new SDP's DTLS fingerprint
     against `state.net.peers[peerId].dtlsFp` per
     [`dtls-fingerprint-pinning.md` § 4](../../../docs/architecture/dtls-fingerprint-pinning.md#4-reconnect-continuity-challenge).
     Either gate failing aborts the rejoin and dispatches
     `TRUST_VIOLATION_DETECTED { kind }`.
  3. Sends `LOG_REQUEST { fromSeq, toSeq }` to host via DataChannel
     (only after the continuity challenge passes).
  4. Host sends `LOG_RESPONSE { commands[] }` in chunks if needed.
  5. Peer replays commands, advances to current turn, resumes normal lockstep.

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

## Combat-Specific Behaviour

The 30 s reconnect / 120 s forfeit window applies during combat
with these refinements (full framing in
[`docs/architecture/edge-cases-policy.md` § 9](../../../docs/architecture/edge-cases-policy.md#9-mid-combat-disconnect-q213)):

- **Combat clock pauses** during the reconnect window. The
  still-connected player sees a banner localized via
  `mp.combat.disconnect_banner` ("Opponent disconnected — 0:30 to
  reconnect"). The combat reducer emits no auto-advance.
- **AI does not take over** the absent player's stack during the
  reconnect window. Fairness is preferred over throughput.
- **At 120 s**, defender wins by forfeit (or attacker, if the
  defender is the disconnected party — the still-present player
  wins the combat). Combat resolves; the absent player's hero is
  treated as defeated; the still-present player resumes the
  adventure-map turn. The forfeit modal is localized via
  `mp.combat.forfeit_modal`. The forfeit path requires a verified
  disconnect attestation (host-signed `PEER_DISCONNECTED` envelope
  + signaling-server witness) per
  [`abandon-penalty.md` § 1](../../../docs/architecture/abandon-penalty.md#1-quorum-rule);
  if attestation does not arrive within 30 s, the surviving peer
  surfaces `Disconnect attestation failed — match aborted` and
  records no penalty against either peer (owned by
  [Task 28](./28-abandon-penalty-and-quorum-disconnect.md)).
- **No per-combat checkpoint** in MVP. The reconnecting peer
  replays the full pre-combat state plus commands; the
  deterministic reducer guarantees identical state. Phase-3 may
  revisit if reconnect time becomes problematic.

Network-Chaos Coverage:
- Per-PR module-level chaos: this task must pass the **reconnect
  under transient partition** scenario in
  [`12-network-chaos-harness.md`](./12-network-chaos-harness.md).
  Acceptance: a peer that survives a `partitionAt(seq) → heal()`
  cycle catches up via the log-range protocol and ends with bit-
  identical reducer state.
- Nightly stack-level chaos: also exercised by the consolidated
  network-chaos test matrix
  ([`11-network-chaos-test-matrix.md`](./11-network-chaos-test-matrix.md)).

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
