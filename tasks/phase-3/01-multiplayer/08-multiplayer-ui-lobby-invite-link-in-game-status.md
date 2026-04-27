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
- Create room → show invite link (copy button) + QR code
- Join room → paste code or follow link → show "Waiting for host…"
- Connection status indicator (green/yellow/red) based on heartbeat latency
- "Disconnected" banner when peer drops, with reconnect timer

Owned Paths:
- `src/ui/components/MultiplayerLobby.tsx`

Dependencies:
- phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby
- phase-3.01-multiplayer.02-webrtc-peer-connection-plus-datachannel-setup

Acceptance Criteria:
- Full flow: create → invite → join → game starts in < 30 seconds on LAN
- Connection indicator updates in real time
- Disconnection banner shows within 7 seconds of peer dropping
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
