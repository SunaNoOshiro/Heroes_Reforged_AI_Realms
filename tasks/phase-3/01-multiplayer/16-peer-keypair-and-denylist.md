# Peer Keypair & Denylist

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Mint and persist a per-profile Ed25519 peer keypair, sign
`JOIN_ROOM` payloads with it, and key the per-room host-side
denylist on the public key half. Closes Q332 (peer identity model)
and unblocks Task 10's host approval / kick flow.

Read First:
- [`docs/architecture/peer-identity.md`](../../../docs/architecture/peer-identity.md)
- [`docs/architecture/lobby-identifiers.md`](../../../docs/architecture/lobby-identifiers.md)
- [`docs/architecture/multiplayer-security.md`](../../../docs/architecture/multiplayer-security.md)

Inputs:
- WebCrypto Ed25519 (Chrome 120+, Firefox 121+, Safari 17+)
- Profile storage layer (IndexedDB)
- `JOIN_ROOM` envelope shape from
  [`peer-identity.md` § 6](../../../docs/architecture/peer-identity.md#6-join_room-envelope)

Outputs:
- `src/profile/peerKeypair.ts` — `mintPeerKeypair()`,
  `loadPeerKeypair()`, `signJoinRoom(payload, key)`,
  `verifyJoinRoom(payload, pubKey, sig)`.
- `src/multiplayer/peerDenylist.ts` — `PeerDenylist` class:
  `add(entry)`, `has(pubKey)`, `clear()`, `entries()`.
- Unit tests under `src/profile/__tests__/peerKeypair.test.ts`
  and `src/multiplayer/__tests__/peerDenylist.test.ts`.

Owned Paths:
- `src/profile/peerKeypair.ts`
- `src/multiplayer/peerDenylist.ts`

Owned Paths (shared):
- `services/signaling/src/server.ts` — additive only. Task 01 is
  the **primary owner** of the signaling server module; this task
  does not rewrite the room-table shape or the message envelope,
  it only adds the `peerPubKey` field to `JOIN_HANDSHAKE` /
  `JOIN_ROOM` and the `peerDenylist` reference in the room state.

Dependencies:
- phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby

Acceptance Criteria:
- `mintPeerKeypair()` returns a fresh Ed25519 keypair via WebCrypto;
  the private key never enters logs, telemetry, or any structured
  payload outside IndexedDB.
- `loadPeerKeypair()` lazily generates a keypair on first profile
  load and persists it in IndexedDB under `profile.peerKeypair`;
  subsequent loads return the same key.
- `signJoinRoom({ roomId, roomSecret, peerPubKey, joinNonceMs },
  key)` returns a base64url Ed25519 signature; `verifyJoinRoom`
  returns `false` for a tampered envelope.
- `PeerDenylist.add(entry)` is **additive** — adding the same
  public key twice does not rewrite the existing entry; the first
  `bannedAtMs` wins. The class **must not** rewrite Task 01's
  in-memory room state shape; Task 01 is the **primary owner** of
  the room table and consumes a `PeerDenylist` reference by
  composition.
- `PeerDenylist.has(pubKey)` returns true after `add` and false
  after `clear`.
- A kicked peer (re-emitting the same `peerPubKey`) is rejected
  by the signaling server before any ICE candidate exchange — no
  TURN-relay candidate flows after the second join attempt.
- A kicked peer that mints a fresh display name **with the same
  keypair** still cannot rejoin — the denylist keys on the
  public key, not on the name.
- Cross-environment test: the same `(privateKey, payload)` pair
  produces a signature accepted by `verifyJoinRoom` on Chrome,
  Firefox, and Safari (Playwright cross-engine job).
- The peer keypair surface contains no PCG32 / `Math.random()` /
  `Date.now()` reads inside any deterministic-engine path; only
  WebCrypto + IndexedDB.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
