# Peer Trust Display

> Companion to [`peer-identity.md`](./peer-identity.md),
> [`chat-safety.md`](./chat-safety.md), and screen
> [`64-network-lobby`](./wiki/screens/64-network-lobby/). Plan 23 / Q447
> introduces the `state.profile.knownPeers` allowlist, the
> `trustLevel` selector, and the per-row badge.

## 1. Storage

```text
state.profile.knownPeers : PeerAllowlist
```

Schema: [`peer-allowlist.schema.json`](../../content-schema/schemas/peer-allowlist.schema.json).
Persisted in IndexedDB `hr-profile.knownPeers` per
[`data-inventory.md`](./data-inventory.md). Wiped by
`WIPE_LOCAL_DATA scope=profile|all`. Writes require
`state.profile.consent.multiplayer.state === 'granted'` (the consent
that gates multiplayer also gates retention of peer identifiers).

## 2. Trust-Level Derivation

```text
trustLevel(peerId) =
    if peerAllowlist.find(p => p.peerId === peerId && p.tier === 'friend')
       then 'friend'
    else if peerAllowlist.find(p => p.peerId === peerId
            && now() - p.lastSeenAt < 30 days)
       then 'recent'
    else 'unknown'
```

The selector is `selectors.net.peerTrustLevel(peerId)`. UI consumes the
selector; never re-derive the predicate inline.

## 3. UI Surface

The lobby `PlayerSlotList` renders a compact badge per peer:

| `trustLevel` | Badge label | Color |
|--------------|-------------|-------|
| `friend`     | Friend      | green |
| `recent`     | Recent      | amber |
| `unknown`    | Unknown     | grey  |

Per-row context menu adds:

- `Add to friends` → `ADD_PEER_TO_ALLOWLIST(peerId, displayName, tier='friend')`
- `Remove from friends` → `REMOVE_PEER_FROM_ALLOWLIST(peerId)`

Both actions require `consent.multiplayer === 'granted'` and the
button is disabled with a localized rationale otherwise.

## 4. Refresh

On every successful WebRTC handshake (after `APPROVE_PEER` and the
DataChannel opens), the lobby reducer dispatches
`RECORD_PEER_CONTACT(peerId)` which refreshes `lastSeenAt` and
re-bumps the LRU position. The `tier` is **not** auto-promoted to
`friend`; promotion is always user-driven.

## 5. Capacity

Default cap: **256** entries (LRU). Configurable per the schema's
`capacity` field within [16, 1024]. When the cap is exceeded, the
oldest `tier: 'recent'` entry is dropped first; `tier: 'friend'`
entries are never auto-evicted.

## 6. Cross-Cuts

- **Chat safety**: `BLOCK_PEER` / `MUTE_PEER` (Plan 19) are local-only
  slices and live in `state.net.lobby.muted` / `.blocked`. They do not
  merge with `knownPeers`; a blocked friend stays a friend in this
  allowlist but their messages stay filtered.
- **Reports**: `REPORT_PEER` does not move the peer to `unknown`;
  reporting is logged to the audit-log without altering the trust
  display.
- **Save / replay**: the allowlist is profile-side and never enters
  saves, replays, or the canonical state hash.
