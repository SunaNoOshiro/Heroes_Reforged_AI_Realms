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

## Combat-Specific Behaviour (Q213)

The 30 s reconnect / 120 s forfeit window applies during combat
with these refinements (full framing in
[`docs/architecture/edge-cases-policy.md` § 9](../../../docs/architecture/edge-cases-policy.md#9-mid-combat-disconnect-q213)):

- **Combat clock pauses** during the reconnect window. The
  still-connected player sees a banner localized via
  `mp.combat.disconnect_banner` ("Opponent disconnected — 0:30 to
  reconnect"). The combat reducer emits no auto-advance.
- **AI does not take over** the absent player's stack during the
  reconnect window. Fairness is preferred over throughput; this
  matches the audit Q146 deferral.
- **At 120 s**, defender wins by forfeit (or attacker, if the
  defender is the disconnected party — the still-present player
  wins the combat). Combat resolves; the absent player's hero is
  treated as defeated; the still-present player resumes the
  adventure-map turn. The forfeit modal is localized via
  `mp.combat.forfeit_modal`.
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
