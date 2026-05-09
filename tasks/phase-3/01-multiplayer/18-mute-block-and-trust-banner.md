# Mute / Block & Trust Banner

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Add `MUTE_PEER`, `BLOCK_PEER`, the `state.net.lobby.muted` and
`state.net.lobby.blocked` slices, the per-roster-row Mute / Block
overflow menu, the `MutedBadge` indicator, and the
`ChatTrustBanner` (one-line "P2P chat — no server moderation"
banner with `localStorage` dismissal). Closes the
harassment-without-recourse risk by giving each peer per-row
mute / block controls and a persistent trust-model banner.

Read First:
- [`docs/architecture/chat-safety.md`](../../../docs/architecture/chat-safety.md)
- [`docs/architecture/wiki/screens/64-network-lobby/spec.md`](../../../docs/architecture/wiki/screens/64-network-lobby/spec.md)
- [`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../../../docs/architecture/wiki/screens/64-network-lobby/interactions.md)
- [`docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`](../../../docs/architecture/wiki/screens/64-network-lobby/data-contracts.md)
- [`docs/architecture/wiki/screens/64-network-lobby/architecture.md`](../../../docs/architecture/wiki/screens/64-network-lobby/architecture.md)

Inputs:
- Validated chat ingress from Task 17.
- `peerId` shape from Task 16 (peer keypair). The persistent
  variant of `MUTE_PEER` is gated on the long-lived peer key —
  until that lands, the option renders disabled with the
  localized reason `ui.network-lobby.chat.mute.persistent-disabled`.

Outputs:
- `src/multiplayer/chat/muteBlock.ts` — reducer slices
  `state.net.lobby.muted: Record<peerId, MuteEntry>` and
  `state.net.lobby.blocked: Record<peerId, BlockEntry>`. Both
  are presentation-only and never enter saves, replays, or the
  canonical state hash. `BLOCK_PEER` is a superset of
  `MUTE_PEER` and additionally strips the peer's existing
  envelopes from the rendered chat log.
- `src/ui/network-lobby/MutedBadge.tsx` — per-row indicator.
- `src/ui/network-lobby/ChatTrustBanner.tsx` — first-session
  banner; localized via `ui.network-lobby.chat.trust-banner`;
  dismissal persists to `localStorage` under
  `hr.ui.lobby.chat.trust-banner.dismissed = true`.
- Per-row roster overflow menu extended to `Mute / Block /
  Report` (Report is wired by Task 19).
- Unit tests under `src/multiplayer/chat/__tests__/muteBlock.test.ts`:
  mute / block round-trip; block strips existing envelopes;
  persistent variant gated when peer-key flag is off.
- UI smoke test stubs covering Mute / Block menu render and
  banner dismissal.

Owned Paths:
- `src/multiplayer/chat/muteBlock.ts`
- `src/ui/network-lobby/MutedBadge.tsx`
- `src/ui/network-lobby/ChatTrustBanner.tsx`
- `src/multiplayer/chat/__tests__/muteBlock.test.ts`

Owned Paths (shared):
- Task 08 ([`08-multiplayer-ui-lobby-invite-link-in-game-status.md`](./08-multiplayer-ui-lobby-invite-link-in-game-status.md))
  is the **primary owner** of
  `src/ui/components/MultiplayerLobby.tsx`. This task contributes
  only the per-row overflow-menu mount points and the
  `ChatTrustBanner` mount above the chat input. The split is
  **additive**: it does not rewrite the slot list, ready-state
  seal, or chat panel layout.

Dependencies:
- phase-3.01-multiplayer.02-webrtc-peer-connection-plus-datachannel-setup
- phase-3.01-multiplayer.08-multiplayer-ui-lobby-invite-link-in-game-status
- phase-3.01-multiplayer.17-chat-envelope-channel-and-rate-limit

Acceptance Criteria:
- `MUTE_PEER { peerId, scope: 'session' | 'persistent' }` adds
  an entry to `state.net.lobby.muted`. Inbound chat from that
  peer is filtered before render. Session scope clears on lobby
  leave; persistent scope persists to `localStorage` keyed on
  the long-lived peer key.
- `BLOCK_PEER { peerId }` adds an entry to
  `state.net.lobby.blocked` and additionally strips the peer's
  existing envelopes from the rendered chat history.
- The persistent `MUTE_PEER` variant renders disabled with the
  reason `ui.network-lobby.chat.mute.persistent-disabled` when
  the peer-key flag (Task 16) is off.
- `ChatTrustBanner` mounts on first lobby session of a given
  install; clicking dismiss persists
  `hr.ui.lobby.chat.trust-banner.dismissed = true` and the
  banner does not remount.
- Accessibility: the banner announces on first show via a live
  region; focus-trap is not required.
- **Screen package coverage**: components, bindings, and
  commands match
  [`docs/architecture/wiki/screens/64-network-lobby/spec.md`](../../../docs/architecture/wiki/screens/64-network-lobby/spec.md)
  and
  [`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../../../docs/architecture/wiki/screens/64-network-lobby/interactions.md);
  mockup geometry is not invented locally.
- **Shared-ownership split with Task 08**: Task 08 is the
  **primary owner** of `src/ui/components/MultiplayerLobby.tsx`.
  This task's contribution is **additive**: it MUST NOT rewrite
  the slot list, ready-state seal, or existing chat panel
  layout — only the per-row overflow-menu mount points and the
  `ChatTrustBanner` mount above the chat input are added.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
