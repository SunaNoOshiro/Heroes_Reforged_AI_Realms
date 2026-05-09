# Screen Package — Multiplayer Game Status (in-match overlay)

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Add screen package
[`docs/architecture/wiki/screens/77-multiplayer-game/`](../../../docs/architecture/wiki/screens/77-multiplayer-game/)
that surfaces the in-match multiplayer trust state — opponent turn
indicator, build-attestation banner, envelope statistics, desync
banner / bisect report panel, developer-mode match-key display, and
the post-match audit-pipeline consent prompt. Splits the in-game
status surface off
[Task 08](./08-multiplayer-ui-lobby-invite-link-in-game-status.md)
into its own owning task per the wiki convention. System Improvements / UI / Multiplayer-game-screen.

Read First:
- [`docs/architecture/wiki/screens/77-multiplayer-game/spec.md`](../../../docs/architecture/wiki/screens/77-multiplayer-game/spec.md)
- [`docs/architecture/wiki/screens/77-multiplayer-game/interactions.md`](../../../docs/architecture/wiki/screens/77-multiplayer-game/interactions.md)
- [`docs/architecture/wiki/screens/77-multiplayer-game/data-contracts.md`](../../../docs/architecture/wiki/screens/77-multiplayer-game/data-contracts.md)
- [`docs/architecture/wiki/screens/77-multiplayer-game/architecture.md`](../../../docs/architecture/wiki/screens/77-multiplayer-game/architecture.md)
- [`docs/architecture/turn-timer.md`](../../../docs/architecture/turn-timer.md)
- [`docs/architecture/bisect-protocol.md`](../../../docs/architecture/bisect-protocol.md)
- [`docs/architecture/build-attestation.md`](../../../docs/architecture/build-attestation.md)
- [`docs/architecture/security-model.md`](../../../docs/architecture/security-model.md)

Inputs:
- Telemetry surfaces from
  [Task 09](./09-lockstep-envelope-and-mac.md) (envelope stats),
  [Task 10](./10-match-handshake-protocol.md) (build attestation),
  [Task 11](./11-turn-timer-and-stall-detection.md) (turn timer
  states), and
  [Task 05](./05-auto-bisect-on-hash-mismatch.md) (bisect report
  shape with `attributedPeer`).
- Localization keys per the data-contracts file.

Outputs:
- `docs/architecture/wiki/screens/77-multiplayer-game/mockup.html`
- `docs/architecture/wiki/screens/77-multiplayer-game/spec.md`
- `docs/architecture/wiki/screens/77-multiplayer-game/interactions.md`
- `docs/architecture/wiki/screens/77-multiplayer-game/data-contracts.md`
- `docs/architecture/wiki/screens/77-multiplayer-game/architecture.md`
- `src/ui/multiplayer/MultiplayerGameStatus.tsx` — composition root
  per the spec's component tree.
- Registration in
  [`docs/architecture/wiki/screens/index.json`](../../../docs/architecture/wiki/screens/index.json)
  under the `multiplayer` group.

Owned Paths:
- `docs/architecture/wiki/screens/77-multiplayer-game/`
- `src/ui/multiplayer/MultiplayerGameStatus.tsx`

Dependencies:
- phase-3.01-multiplayer.11-turn-timer-and-stall-detection
- phase-3.01-multiplayer.09-lockstep-envelope-and-mac
- phase-3.01-multiplayer.10-match-handshake-protocol

Acceptance Criteria:
- All five package files
  (`mockup.html`, `spec.md`, `interactions.md`,
  `data-contracts.md`, `architecture.md`) exist and follow the
  conventions in
  [`docs/architecture/wiki/README.md`](../../../docs/architecture/wiki/README.md).
- The package is registered in
  [`docs/architecture/wiki/screens/index.json`](../../../docs/architecture/wiki/screens/index.json)
  under the `multiplayer` category.
- `OpponentTurnIndicator` renders all four states (`waiting`,
  `stalled`, `auto-ended`, `disconnected`) per
  [`docs/architecture/wiki/screens/77-multiplayer-game/spec.md`](../../../docs/architecture/wiki/screens/77-multiplayer-game/spec.md).
- `BisectReportPanel` renders `attributedAbortPeer` (peer-hash
  digest, never raw `peerId`) and `attributionConfidence`.
- `MatchKeyDisplay` is gated by
  `state.developer.flags.showMatchKey` and renders nothing when
  the flag is `false`.
- `npm run generate:wiki` folds the screen into
  `docs/architecture/architecture-wiki.html`.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
