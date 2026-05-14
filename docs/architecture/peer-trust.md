# Peer Trust Display

Owns the local **`state.profile.knownPeers`** allowlist, the
`peerTrustLevel(peerId)` selector, and the per-row trust badge in
the lobby. Profile-scoped, IndexedDB-backed, never on the wire,
never in saves or replays.

Companion docs:

- [`peer-identity.md`](./peer-identity.md) — defines the stable
  `peerId` (UUID v4 derived from the long-lived public key) that
  this doc keys on.
- [`chat-safety.md`](./chat-safety.md) — owns `MUTE_PEER` /
  `BLOCK_PEER` / `REPORT_PEER`; this doc only describes how those
  commands interact with the trust badge.
- [`wiki/screens/64-network-lobby/`](./wiki/screens/64-network-lobby/)
  — `PlayerSlotList` row binding, badge column, per-row context
  menu, and the `RECORD_PEER_CONTACT` dispatch site.

Schema:
[`peer-allowlist.schema.json`](../../content-schema/schemas/peer-allowlist.schema.json)
(row `PeerAllowlist` in
[`schema-matrix.md`](./schema-matrix.md)). Persisted field row in
[`data-inventory.md`](./data-inventory.md) (`known peers`).
Commands defined in
[`command-schema.md`](./command-schema.md#multiplayer-trust--identity-commands).

---

## 1. Storage

```text
state.profile.knownPeers : PeerAllowlist
```

- **Medium.** IndexedDB store `hr-profile.knownPeers`, per
  [`data-inventory.md`](./data-inventory.md).
- **Wipe.** `WIPE_LOCAL_DATA scope=profile|all` clears the slice.
- **Consent gate.** Writes require
  `state.profile.consent.multiplayer.state === 'granted'`. The
  same consent that gates multiplayer also gates retention of
  peer identifiers; revocation drops new writes (existing rows
  are cleared by the wipe path above).
- **Out of save / replay.** Profile-side; never enters saves,
  replays, or the canonical state hash.

## 2. Trust-Level Derivation

The closed enum `'friend' | 'recent' | 'unknown'` is computed by
`selectors.net.peerTrustLevel(peerId)`. UI consumes the selector;
never re-derive the predicate inline.

```text
peerTrustLevel(peerId) =
    if knownPeers.peers.some(p =>
         p.peerId === peerId && p.tier === 'friend')
       then 'friend'
    else if knownPeers.peers.some(p =>
              p.peerId === peerId
              && now - p.lastSeenAt < 30 days)
       then 'recent'
    else 'unknown'
```

Tier semantics match the schema:
`friend` = explicit allowlist add; `recent` = seen within 30 days
but never explicitly added. Entries whose `tier === 'recent'` and
whose `lastSeenAt` has aged past 30 days remain in the list (they
get evicted by the LRU rule in § 5) but report as `'unknown'`.

## 3. UI Surface

`PlayerSlotList` renders one badge per peer:

| `trustLevel` | Badge label | Color |
|--------------|-------------|-------|
| `friend`     | Friend      | green |
| `recent`     | Recent      | amber |
| `unknown`    | Unknown     | grey  |

Per-row context menu adds:

- `Add to friends` →
  `ADD_PEER_TO_ALLOWLIST { peerId, displayName, tier: 'friend' }`.
  The persisted record stores `displayName` as `displayNameAtAdd`
  per the schema; display-name validation runs through
  [`display-name-policy.md`](./display-name-policy.md).
- `Remove from friends` →
  `REMOVE_PEER_FROM_ALLOWLIST { peerId }`.

Both actions disable with a localized rationale when the consent
gate fails (per § 1). Commands are registered in
[`command-schema.md`](./command-schema.md#multiplayer-trust--identity-commands);
the bindings live in
[`wiki/screens/64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md)
under "Peer Trust Display".

## 4. Refresh

On every successful WebRTC handshake (after `APPROVE_PEER` and the
DataChannel opens), the lobby reducer dispatches
`RECORD_PEER_CONTACT { peerId }`, which:

- refreshes `lastSeenAt` to wall-clock now,
- bumps the LRU position, and
- inserts a new row with `tier: 'recent'` if the peer is not yet
  on the list.

Promotion to `tier: 'friend'` is **always** user-driven; this
command never auto-promotes.

## 5. Capacity

- **Default cap:** 256 entries, configurable per the schema's
  `capacity` field within `[16, 1024]` (default 256).
- **Eviction:** LRU. The oldest `tier: 'recent'` entry is dropped
  first when the cap is exceeded. `tier: 'friend'` entries are
  **never** auto-evicted; they only leave via
  `REMOVE_PEER_FROM_ALLOWLIST` or `WIPE_LOCAL_DATA`.

## 6. Cross-Cuts

- **Chat safety.** `MUTE_PEER` / `BLOCK_PEER` write the local-only
  presentation slices `state.net.lobby.muted` /
  `state.net.lobby.blocked` (per
  [`chat-safety.md` § 7](./chat-safety.md#7-mute--block)). They
  do **not** merge with `knownPeers`: a blocked friend stays a
  friend in this allowlist, but their messages stay filtered.
- **Reports.** `REPORT_PEER` produces a local report bundle and
  appends a `signaling.report.*` row to the audit log
  ([`chat-safety.md` § 8](./chat-safety.md#8-report)). It does
  **not** move the peer to `'unknown'` and does not mutate
  `knownPeers`.
- **Save / replay.** The allowlist is profile-scoped and never
  enters saves, replays, or the canonical state hash (mirrors
  § 1).

---

## 🔍 Sync Check

- **UI: ✔** — Badge enum, colors, labels, and the per-row
  `Add to friends` / `Remove from friends` actions match
  [`wiki/screens/64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md)
  and the "Peer Trust Display" section of
  [`interactions.md`](./wiki/screens/64-network-lobby/interactions.md).
  The selector handle `selectors.net.peerTrustLevel` matches
  [`data-contracts.md`](./wiki/screens/64-network-lobby/data-contracts.md).
- **Schema: ✔** —
  [`peer-allowlist.schema.json`](../../content-schema/schemas/peer-allowlist.schema.json)
  pins `tier: ['friend', 'recent']` (default `recent`),
  `capacity` `[16, 1024]` default 256, required keys
  `[schemaVersion, capacity, peers]`, and the consent-gate
  string in its `description`. Row `PeerAllowlist` is registered
  in [`schema-matrix.md`](./schema-matrix.md).
- **Tasks: ✔** — Schema task
  [`mvp.02-content-schemas.42-consent-and-peer-allowlist-schemas`](../../tasks/mvp/02-content-schemas/42-consent-and-peer-allowlist-schemas.md)
  delivers the schema; runtime task
  [`phase-3.01-multiplayer.23-multiplayer-consent-and-trust-display`](../../tasks/phase-3/01-multiplayer/23-multiplayer-consent-and-trust-display.md)
  delivers `peerTrustLevel`, `ADD_PEER_TO_ALLOWLIST`,
  `REMOVE_PEER_FROM_ALLOWLIST`, and `RECORD_PEER_CONTACT`. Both
  list this file in their `Read First` block. Persisted-field
  row `known peers` is present in
  [`data-inventory.md`](./data-inventory.md) line 32.

## ⚠ Issues

_None._
