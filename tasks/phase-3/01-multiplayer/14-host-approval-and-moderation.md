# Host Approval & Moderation

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Insert a pending-peer queue between `JOIN_ROOM` and ICE-candidate
forwarding. Adds host approval (`APPROVE_PEER` / `REJECT_PEER`),
kick (`KICK_PEER`), per-room peer denylist, and the lobby UI
modal that surfaces pending peers. Closes Q317 / Q318 / Q320 /
Q332 and the missing-moderation-primitives risk.

Read First:
- [`docs/architecture/peer-identity.md`](../../../docs/architecture/peer-identity.md)
- [`docs/architecture/ice-disclosure-policy.md`](../../../docs/architecture/ice-disclosure-policy.md)
- [`docs/architecture/lobby-identifiers.md`](../../../docs/architecture/lobby-identifiers.md)
- [`docs/architecture/wiki/screens/64-network-lobby/spec.md`](../../../docs/architecture/wiki/screens/64-network-lobby/spec.md)
- [`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../../../docs/architecture/wiki/screens/64-network-lobby/interactions.md)
- [`docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`](../../../docs/architecture/wiki/screens/64-network-lobby/data-contracts.md)
- [`docs/architecture/wiki/screens/64-network-lobby/architecture.md`](../../../docs/architecture/wiki/screens/64-network-lobby/architecture.md)

Inputs:
- `peerPubKey` from Task 16 (peer keypair)
- ICE filter contract from
  [`ice-disclosure-policy.md`](../../../docs/architecture/ice-disclosure-policy.md)

Outputs:
- `services/signaling/approval.ts` — pending-peer queue,
  `APPROVE_PEER` / `REJECT_PEER` / `KICK_PEER` handlers, `typ
  relay`-only ICE filter, 30 s pending-timeout sweeper.
- `src/ui/network-lobby/PendingPeerModal.tsx` — host-side modal
  with approve / reject / details affordances; per-row
  kick / mute / report dots-menu in the slot list.
- `services/signaling/__tests__/approval.test.ts` — buffered ICE
  exchange, denylist key match, 30 s timeout, `typ host`/`typ srflx`
  drop.
- New protocol messages on Task 01:
  `PEER_PENDING`, `APPROVE_PEER`, `REJECT_PEER`, `PEER_REJECTED`,
  `KICK_PEER`, `PEER_KICKED`.

Owned Paths:
- `services/signaling/approval.ts`
- `src/ui/network-lobby/PendingPeerModal.tsx`
- `services/signaling/__tests__/approval.test.ts`

Owned Paths (shared):
- `services/signaling/src/server.ts` — Task 01 is the **primary
  owner**. This task contributes only the pending-queue dispatch
  table and the ICE filter call site. The split is **additive**:
  this task does not rewrite Task 01's room-table shape or the
  `JOIN_HANDSHAKE` envelope; the queue lives alongside the room
  state.
- `src/ui/components/MultiplayerLobby.tsx` — Task 08 is the
  **primary owner**. This task adds the `PendingPeerModal` mount
  point and the per-row dots-menu; the existing slot list,
  ready-state seal, and chat panel are not rewritten.

Dependencies:
- phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby
- phase-3.01-multiplayer.08-multiplayer-ui-lobby-invite-link-in-game-status
- phase-3.01-multiplayer.16-peer-keypair-and-denylist

Acceptance Criteria:
- Pending-peer queue: a `JOIN_ROOM` from a non-host peer is held
  in a per-room queue until the host emits `APPROVE_PEER` or
  `REJECT_PEER`. Multiple simultaneous pending peers are queued
  in arrival order.
- `PEER_PENDING { peerPubKey, displayNameDraft, joinNonceMs }` is
  forwarded to the host on every queue arrival.
- `APPROVE_PEER` and `REJECT_PEER` are accepted only from the
  room's host peer; non-host invocations receive
  `JOIN_REJECTED { reason: "not_host" }`.
- 30 s pending timeout: an unanswered `PEER_PENDING` auto-rejects
  with `PEER_REJECTED { reason: "timeout" }`.
- `KICK_PEER`: the host emits it on an approved peer; the
  signaling server emits `PEER_KICKED` to the kicked peer, drops
  the WebSocket, and adds the peer's `peerPubKey` to
  `peerDenylist[]`. Subsequent `JOIN_ROOM` from the same key
  receives `PEER_REJECTED { reason: "denied" }` immediately.
- A kicked peer that mints a fresh display name with the **same
  keypair** still cannot rejoin (denylist keys on `peerPubKey`,
  not on the name).
- ICE filter: an `ICE_CANDIDATE` payload destined for a pending
  peer has every non-`typ relay` candidate stripped. A capture of
  the pending-peer SDP exchange asserts no `typ host` /
  `typ srflx` candidate appears. Post-`APPROVE_PEER`, the full
  candidate set flows after `iceRestart`.
- The pending-peer modal surfaces the joiner's display name
  draft, `peerPubKey` short fingerprint, and approve / reject
  buttons. Approve and reject dispatch the matching server
  command and clear the modal.
- **Shared-ownership splits**:
  - Task 01 is the **primary owner** of
    `services/signaling/src/server.ts`. This task's contribution
    is **additive**: it MUST NOT rewrite the request-handler
    entrypoint, the room-table layout, or the message envelope;
    only the pending-queue dispatch and ICE filter call sites are
    added.
  - Task 08 is the **primary owner** of
    `src/ui/components/MultiplayerLobby.tsx`. This task's
    contribution is **additive**: it MUST NOT rewrite the slot
    list, ready-state seal, or chat panel layout owned by Task
    08; only the pending-peer modal mount point and the per-row
    dots-menu are added.
- **Screen package coverage**: this task implements the
  network-lobby moderation surface defined in
  [`docs/architecture/wiki/screens/64-network-lobby/spec.md`](../../../docs/architecture/wiki/screens/64-network-lobby/spec.md)
  and
  [`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../../../docs/architecture/wiki/screens/64-network-lobby/interactions.md).
  The PendingPeerModal mount point and per-row dots-menu match
  the screen-package contract; mockup geometry, bindings, and
  commands are not invented locally.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
