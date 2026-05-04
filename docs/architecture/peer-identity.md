# Peer Identity

> Source plan:
> [`docs/implementation-plans/18-room-codes-and-lobby-discovery-plan.md`](../implementation-plans/18-room-codes-and-lobby-discovery-plan.md)
> § 3 (Issue: No peer-identity keypair schema; Q332).

This file is the canonical contract for the **peer identity**
that the M5 lobby uses to authenticate `JOIN_ROOM`, key the
host-side denylist, and stamp local `REPORT_PEER` records.

The room **code** is owned by
[`lobby-identifiers.md`](./lobby-identifiers.md). The room **secret**
is owned by
[`multiplayer-security.md` § Room Secret + Handshake](./multiplayer-security.md#room-secret--handshake).
The peer identity is **per-profile**, not per-room and not
per-session.

---

## 1. Keypair shape

Each profile generates one **Ed25519** keypair on first launch.

| Half | Storage | Purpose |
|---|---|---|
| Public key (32 bytes, base64url) | Embedded in `JOIN_HANDSHAKE`, `JOIN_ROOM`, lobby slot rows, `peerDenylist` entries | The canonical peer ID. |
| Private key (32 bytes, base64url) | Local IndexedDB only — never on the wire, never on the signaling server | Signs `JOIN_ROOM` payloads so the host can verify the joiner. |

The public key is treated as a public identifier; the private key
never leaves the device.

## 2. Lifecycle

- **Mint**: at first profile creation, the client generates a
  fresh Ed25519 keypair via `crypto.subtle.generateKey({ name:
  "Ed25519" })` (or the WebCrypto fallback when `Ed25519` is
  unavailable, deferred to a polyfill task; see § 7).
- **Persist**: the keypair is stored in IndexedDB under
  `profile.peerKeypair`. The UI surfaces a clear
  "this is local-only; resetting your profile invalidates your
  bans against other peers" hint.
- **Use**: every `JOIN_ROOM` payload is signed with the private
  key. The host verifies the signature before emitting
  `APPROVE_PEER`. The signature also covers `roomId`, `roomSecret`,
  and a per-join nonce to prevent replay across rooms.
- **Rotation**: **no rotation in M5.** A user-triggered "reset peer
  identity" flow is deferred to M7 (will mint a new keypair, drop
  the old one, and surface a warning that prior bans of the user
  by other hosts will not follow them to the new identity).
- **Revocation**: not in scope for M5; see § 7.

## 3. `peerDenylist` shape

The denylist lives in lobby memory on the host side. It is **per
room**, in-memory only, and not persisted to the signaling server.

```ts
type PeerDenylistEntry = {
  peerPubKey: string; // base64url, 32 bytes decoded
  reason: "kicked" | "rejected" | "rate_limited";
  bannedAtMs: number; // wall-clock; UI display only
};

type Lobby = {
  // …
  peerDenylist: PeerDenylistEntry[];
};
```

A peer whose `peerPubKey` is on the active room's denylist:

- Cannot enter the pending-peer queue. The signaling server emits
  `PEER_REJECTED { reason: "denied" }` immediately on `JOIN_ROOM`.
- Cannot be re-approved by the host without first clearing the
  entry (M7 surface; for M5 the denylist is append-only and lives
  for the room's lifetime).

The denylist is dropped when the room expires or is closed; bans
do not leak across rooms.

## 4. Privacy posture

- The keypair is local-only. The signaling server stores **no**
  peer identity beyond the in-flight active sessions.
- The public key is visible to other peers in the same room. It
  rotates only via § 2's M7 reset flow.
- Bans are per-host, per-room. There is no central reputation
  service in M5; `REPORT_PEER` writes a structured local log
  (see [`signaling-audit-log.md`](./signaling-audit-log.md) for
  the analogous server-side format) that the user can review.

## 5. Schema integration

The profile schema gains a `peerKeypair` block:

```jsonc
{
  "peerKeypair": {
    "publicKey": "<base64url, 32 bytes>",
    "privateKey": "<base64url, 32 bytes; LOCAL ONLY>",
    "alg": "Ed25519",
    "createdAt": "<ISO 8601>"
  }
}
```

The `peerPubKey` field appears on the lobby slot row
([`screens/64-network-lobby/data-contracts.md`](./wiki/screens/64-network-lobby/data-contracts.md))
and on every `peerDenylist` entry.

## 6. `JOIN_ROOM` envelope

```jsonc
{
  "type": "JOIN_ROOM",
  "roomId": "<canonical 8-char code>",
  "roomSecret": "<16-byte base64url secret>",
  "peerPubKey": "<base64url public key>",
  "displayNameDraft": "<NFC-normalized name; validated per display-name-policy>",
  "joinNonceMs": "<wall-clock, monotonic per profile>",
  "sig": "<Ed25519 signature over (roomId | roomSecret | peerPubKey | joinNonceMs)>"
}
```

The signaling server forwards this to the host **without
verifying the signature** (server is stateless on identity); the
host verifies, then emits `APPROVE_PEER` or `REJECT_PEER`. A bad
signature is a host-side rejection reason
(`reason: "bad_signature"`).

## 7. Out of scope

- **Rotation UI** — deferred to M7.
- **WebCrypto Ed25519 polyfill** for browsers that lack native
  support — owned by Task 12's verifyCommands; if no native or
  polyfill path exists at run time the lobby renders a
  localized "ed25519 unavailable" error, deferred under
  [`DEF-016`](../planning/deferred.md) for the lobby-discovery
  surface.
- **Cross-host reputation** — explicitly out of scope; bans are
  local.
- **Revocation lists** — there is no central registry in M5.
