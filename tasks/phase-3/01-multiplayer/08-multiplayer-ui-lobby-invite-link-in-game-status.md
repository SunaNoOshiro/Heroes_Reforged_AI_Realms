# Multiplayer UI — Lobby, Invite Link, In-Game Status

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Multiplayer lobby UI: create room, get invite link, wait for peer, show connection status. In-game: show opponent's turn indicator and connection quality.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- `docs/architecture/wiki/screens/62-multiplayer-setup/spec.md`
- `docs/architecture/wiki/screens/62-multiplayer-setup/interactions.md`
- `docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md`
- `docs/architecture/wiki/screens/62-multiplayer-setup/architecture.md`
- `docs/architecture/wiki/screens/62-multiplayer-setup/mockup.html`
- `docs/architecture/wiki/screens/64-network-lobby/spec.md`
- `docs/architecture/wiki/screens/64-network-lobby/interactions.md`
- `docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`
- `docs/architecture/wiki/screens/64-network-lobby/architecture.md`
- `docs/architecture/wiki/screens/64-network-lobby/mockup.html`

Inputs:
- Tasks 1–7, `07-ui-shell.md`
- Screen package `docs/architecture/wiki/screens/62-multiplayer-setup/`
- Screen package `docs/architecture/wiki/screens/64-network-lobby/`

Outputs:
- `src/ui/components/MultiplayerLobby.tsx`
- Create room → show invite link (copy button) + QR code (URL fragment carries the room secret per
  [`docs/architecture/multiplayer-security.md` § Room Secret + Handshake](../../../docs/architecture/multiplayer-security.md#room-secret--handshake))
- Join room → paste code or follow link → show "Waiting for host…"
- Connection status indicator (green/yellow/red) driven by the
  thresholds below
- "Disconnected" banner when peer drops, with reconnect timer

Stall Thresholds:
The status-indicator state machine reads `INPUT_DELAY_BUDGETS` from
`src/net/webrtc/constants.ts` (Task 3):

| Elapsed since expected response | Indicator | UI |
| --- | --- | --- |
| 0 – 2 s | green | normal |
| 2 – 10 s | yellow | "your turn" badge swaps to "waiting on opponent" |
| 10 – 30 s | red | overlay with last-seen turn |
| 30 s+ | red | overlay reveals "wait" / "request resync" buttons |
| 120 s+ | red | overlay reveals "forfeit" button (cross-links Task 6) |

The same thresholds drive the lockstep `STALLED_PEER` UX (Task 3
pending-queue overflow surfaces the same overlay as the 30 s wait
threshold).

Owned Paths:
- `src/ui/components/MultiplayerLobby.tsx`

Dependencies:
- phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby
- phase-3.01-multiplayer.02-webrtc-peer-connection-plus-datachannel-setup

Acceptance Criteria:
- Full flow: create → invite → join → game starts in < 30 seconds on LAN
- Connection indicator updates in real time
- Disconnection banner shows within 7 seconds of peer dropping
- Artificial 12 s pause after expected opponent response: overlay
  appears with "waiting on opponent" copy and the last-seen turn
- Artificial 35 s pause: overlay reveals "wait" / "request resync"
  buttons

Network-Chaos Coverage:
- Exercised by the consolidated network-chaos test matrix
  ([`11-network-chaos-test-matrix.md`](./11-network-chaos-test-matrix.md))
  — the stall-threshold UI states are asserted on every cell with a
  non-zero RTT or packet-loss value.
- Layout, bindings, and commands match `docs/architecture/wiki/screens/62-multiplayer-setup/mockup.html`, `docs/architecture/wiki/screens/62-multiplayer-setup/interactions.md`, and `docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md`.
- Layout, bindings, and commands match `docs/architecture/wiki/screens/64-network-lobby/mockup.html`, `docs/architecture/wiki/screens/64-network-lobby/interactions.md`, and `docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
