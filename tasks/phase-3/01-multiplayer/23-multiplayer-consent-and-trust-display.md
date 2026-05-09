# Multiplayer Consent Gate & Peer Trust Display

Module: [Multiplayer (M5)](../01-multiplayer.md)

Description:
Implement the multiplayer consent gate declared in
[`docs/architecture/onboarding.md`](../../../docs/architecture/onboarding.md)
and the peer-trust display declared in
[`docs/architecture/peer-trust.md`](../../../docs/architecture/peer-trust.md).
`Host` and `Join` are blocked until
`state.profile.consent.multiplayer.state === 'granted'`. The lobby
`PlayerSlotList` renders a `trustLevel` badge per peer derived from
`state.profile.knownPeers`, and the casual lobby gates `Launch`
behind a per-peer ack when any pack is unsigned.

Read First:
- [`docs/architecture/onboarding.md`](../../../docs/architecture/onboarding.md)
- [`docs/architecture/peer-trust.md`](../../../docs/architecture/peer-trust.md)
- `docs/architecture/wiki/screens/62-multiplayer-setup/spec.md`
- `docs/architecture/wiki/screens/62-multiplayer-setup/interactions.md`
- `docs/architecture/wiki/screens/64-network-lobby/spec.md`
- `docs/architecture/wiki/screens/64-network-lobby/interactions.md`
- `docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`

Inputs:
- `consent.schema.json` and `peer-allowlist.schema.json` from
  [`mvp.02-content-schemas.42-consent-and-peer-allowlist-schemas`](../../mvp/02-content-schemas/42-consent-and-peer-allowlist-schemas.md).
- Pack `trustState: 'signed' | 'unsigned' | 'invalid-signature'`.

Outputs:
- `src/multiplayer/consent-gate.ts`
- `src/multiplayer/peer-trust.ts`
- `src/multiplayer/__tests__/consent-gate.test.ts`
- `src/multiplayer/__tests__/peer-trust.test.ts`

Owned Paths:
- `src/multiplayer/consent-gate.ts`
- `src/multiplayer/peer-trust.ts`
- `src/multiplayer/__tests__/consent-gate.test.ts`
- `src/multiplayer/__tests__/peer-trust.test.ts`

Owned Paths (shared):
- `src/ui/multiplayer/lobby-screen.tsx` — extends `PlayerSlotList`
  with the `trustLevel` badge and the per-row context menu.

Dependencies:
- mvp.02-content-schemas.42-consent-and-peer-allowlist-schemas
- mvp.07-ui-shell.27-onboarding-consent-screen
- phase-3.01-multiplayer.02-webrtc-peer-connection-plus-datachannel-setup
- phase-3.01-multiplayer.16-peer-keypair-and-denylist

Acceptance Criteria:
- Layout matches the consent-gate, trust-badge, and unsigned-pack ack
  affordances in
  `docs/architecture/wiki/screens/62-multiplayer-setup/interactions.md`
  and `docs/architecture/wiki/screens/64-network-lobby/interactions.md`.
- `src/ui/multiplayer/lobby-screen.tsx` is **owned by** the existing UI shell / multiplayer tasks; this task is additive (`trustLevel` badge column, per-row context menu, casual unsigned-pack ack checklist) and must not rewrite the existing slot list, ready-state controls, chat panel, or pending-peer modal.
- `docs/architecture/wiki/screens/64-network-lobby/` is **owned by** the existing UI / multiplayer screen-package tasks; this task is additive (Leave confirmation, peer trust display, unsigned-pack ack) and must not rewrite the existing chat / mute / report flows.
- The runtime refuses to instantiate `RTCPeerConnection` while
  `consent.multiplayer.state !== 'granted'`.
- `Host` and `Join` controls are disabled with the localized
  rationale `consent.multiplayer.denied.body` when the gate fails.
- `peerTrustLevel(peerId)` returns `'friend'` / `'recent'` / `'unknown'`
  per the rules in [`peer-trust.md`](../../../docs/architecture/peer-trust.md).
- `ADD_PEER_TO_ALLOWLIST` and `REMOVE_PEER_FROM_ALLOWLIST` write to
  `state.profile.knownPeers`; entries persist across sessions.
- `RECORD_PEER_CONTACT` refreshes `lastSeenAt` on every successful
  WebRTC handshake.
- Casual lobbies disable `Launch` until every peer's
  `unsignedPacksAck` is present when
  `lobby.compatibility.signatureGate.requiresAck === true`.
- Each ack appends a row to the consent audit log under scope
  `unsignedPacks`, `tier: 'optional'`, `method: 'session'`.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
