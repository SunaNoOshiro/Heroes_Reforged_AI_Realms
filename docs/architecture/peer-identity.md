# Peer Identity

Canonical contract for the **per-profile Ed25519 peer identity** that
the M5 lobby uses to authenticate `JOIN_ROOM`, key the host-side
denylist, sign every signaling envelope, and gate the reconnect
continuity challenge. The keypair is **per-profile** — not per-room
and not per-session.

This doc owns the keypair shape, lifecycle, denylist, and the
`JOIN_ROOM` wire shape. It does **not** own the room code (see
[`lobby-identifiers.md`](./lobby-identifiers.md)) or the room secret
(see
[`multiplayer-security.md` § Room Secret + Handshake](./multiplayer-security.md#room-secret--handshake)).

Companion docs:

- [`signaling-envelope.md`](./signaling-envelope.md) — signed
  envelope wrapped around every signaling frame after
  `JOIN_HANDSHAKE`; reuses the keypair pinned here.
- [`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md) —
  reconnect continuity challenge and DTLS-fingerprint pinning.
- [`signaling-audit-log.md`](./signaling-audit-log.md) —
  server-side log format mirrored by `REPORT_PEER`'s local bundle.
- [`display-name-policy.md`](./display-name-policy.md) — NFC +
  category validation for `displayNameDraft`.
- [`diagrams/31-reconnect-continuity-challenge.md`](./diagrams/31-reconnect-continuity-challenge.md)
  — Mermaid sequence for § 9.

Schemas:
[`peer-identity.schema.json`](../../content-schema/schemas/peer-identity.schema.json),
[`session-token.schema.json`](../../content-schema/schemas/session-token.schema.json),
[`signaling-envelope.schema.json`](../../content-schema/schemas/signaling-envelope.schema.json).

---

## 1. Keypair shape

Each profile holds one **Ed25519** keypair (RFC 8032), minted on
first profile launch.

| Half | Size | Encoding | Storage | Purpose |
|---|---|---|---|---|
| Public key | 32 bytes | base64url, 43 chars unpadded | Embedded in `JOIN_HANDSHAKE`, `JOIN_ROOM`, lobby slot rows, `peerDenylist` entries | Public peer identifier; binds the slot to a stable identity. |
| Private key | 32 bytes | base64url | Local IndexedDB only — never on the wire, never on the signaling server | Signs `JOIN_ROOM` payloads and every signed signaling envelope. |

`peerId` (lower-case UUID v4 derived from the public key bytes) is
the schema-level handle used by
[`peer-identity.schema.json`](../../content-schema/schemas/peer-identity.schema.json),
[`session-token.schema.json`](../../content-schema/schemas/session-token.schema.json),
and the local trust slices in
[`peer-trust.md`](./peer-trust.md). The lobby slot row, denylist, and
`PEER_PENDING` envelope key on `peerPubKey` directly because the
host verifies signatures against the raw public key.

## 2. Lifecycle

- **Mint.** On first profile creation, the client calls
  `crypto.subtle.generateKey({ name: "Ed25519" })`. Browsers without
  native Ed25519 fall back per § 7; if no path is available the
  lobby fails loudly with a localized "ed25519 unavailable" error.
- **Persist.** The keypair is stored in IndexedDB store
  `hr-profile.peerIdentity`, public + derived `peerId` per
  [`peer-identity.schema.json`](../../content-schema/schemas/peer-identity.schema.json),
  with the private half held under `state.profile.peerKeypair`. The
  UI surfaces a "local-only; resetting your profile invalidates
  your bans against other peers" hint.
- **Use.** Every `JOIN_ROOM` payload is signed with the private key
  (§ 6); the host verifies the signature before emitting
  `APPROVE_PEER`. The same key signs every signed signaling
  envelope (§ 7) and the reconnect challenge response (§ 9).
- **Rotation.** **Not in M5.** A user-triggered "reset peer identity"
  flow is deferred to M7 (mints a new keypair, drops the old one,
  warns that prior bans by other hosts will not follow). Reserved
  command token: `ROTATE_PEER_KEYPAIR` per
  [`command-schema.md` § Multiplayer Trust & Identity Commands](./command-schema.md#multiplayer-trust--identity-commands).
- **Revocation.** Not in scope for M5; see § 10.

## 3. `peerDenylist` shape

The denylist is **per-room**, in-memory only on the host, and never
persisted to the signaling server.

```ts
type PeerDenylistEntry = {
  peerPubKey: string;                                  // base64url, 32 bytes decoded
  reason: "kicked" | "rejected" | "rate_limited";
  bannedAtMs: number;                                  // wall-clock; UI display only
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
  entry. M5 keeps the denylist append-only for the room's lifetime;
  unban UI is M7.

The denylist is dropped when the room expires or is closed; bans
do not leak across rooms. The slice is bound to the lobby UI via
`state.net.lobby.peerDenylist` per
[`screens/64-network-lobby/data-contracts.md`](./wiki/screens/64-network-lobby/data-contracts.md).

## 4. Privacy posture

- The keypair is local-only. The signaling server stores **no**
  peer identity beyond in-flight active sessions.
- The public key is visible to other peers in the same room. It
  rotates only via § 2's M7 reset flow.
- Bans are per-host, per-room. There is no central reputation
  service in M5; `REPORT_PEER` writes a local
  [`report-bundle.schema.json`](../../content-schema/schemas/report-bundle.schema.json)
  using the structured format mirrored from
  [`signaling-audit-log.md`](./signaling-audit-log.md), which the
  user can review and export.

## 5. Schema integration

The persisted **public** record conforms to
[`peer-identity.schema.json`](../../content-schema/schemas/peer-identity.schema.json)
(`{ schemaVersion, peerId, publicKey, alg: "Ed25519", createdAt,
displayName? }`), stored in IndexedDB under
`hr-profile.peerIdentity`. The **private** half is held alongside it
at `state.profile.peerKeypair` and is never serialized into any
schema, save, replay, or wire message.

The `peerPubKey` field appears on the lobby slot row
([`screens/64-network-lobby/data-contracts.md`](./wiki/screens/64-network-lobby/data-contracts.md)),
on every `peerDenylist` entry (§ 3), and on every signed signaling
envelope as the implicit signer of `signerId` (§ 7). The
[`schema-matrix.md`](./schema-matrix.md) row `PeerIdentity`
catalogues this shape.

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

- **Server role.** The signaling server forwards this to the host
  **without verifying the signature** (server is stateless on
  identity per
  [`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md)).
- **Host role.** Verifies the signature, then emits `APPROVE_PEER`
  or `REJECT_PEER`. A bad signature is a host-side rejection
  reason: `reason: "bad_signature"`.
- **Envelope nesting.** When carried on the post-handshake
  channel, `JOIN_ROOM` rides inside the signed signaling envelope
  per
  [`signaling-envelope.md` § 2](./signaling-envelope.md#2-payload-type-enum)
  (`payloadType: "JOIN_ROOM"`).

## 7. Signed Signaling Envelope

Every signaling frame after `JOIN_HANDSHAKE`
(`OFFER` / `ANSWER` / `ICE_CANDIDATE` / `HOST_CHANGED` /
`PEER_DISCONNECTED` / `JOIN_ROOM` / `CHALLENGE` /
`CHALLENGE_RESPONSE`) is wrapped in a signed envelope per
[`signaling-envelope.md`](./signaling-envelope.md). The envelope
re-uses the Ed25519 keypair pinned in § 1; the receiver verifies
`sig` against the pinned `peerPubKey` before consuming `payload`. A
signaling-server compromise cannot forge any of these messages
because the server holds no peer's private key.

## 8. Session Token

On `JOIN_ROOM` the host mints a
[`session-token.schema.json`](../../content-schema/schemas/session-token.schema.json)
record (per
[`signaling-envelope.md` § 7](./signaling-envelope.md#7-session-token))
and signs it with its own keypair. The joiner replays
`sessionTokenHash = sha256(canonicalJson(token))` on every outbound
envelope so the signaling server can pre-filter envelopes that do
not belong to the active session. Token shape and rate limits are
owned by `signaling-envelope.md` and
[`signaling-rate-limits.md`](./signaling-rate-limits.md).

## 9. Reconnect Continuity Challenge

On reconnect, the host issues a fresh nonce and the reconnecting
peer signs it with the **same** keypair that signed the original
`JOIN_ROOM`. Mismatched signer = reject. The full
sequence (states, timeouts, mermaid) lives in
[`diagrams/31-reconnect-continuity-challenge.md`](./diagrams/31-reconnect-continuity-challenge.md);
the DTLS-fingerprint half of the rejoin gate lives in
[`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md).
Both gates must pass before the host re-pins the new SDP.

## 10. Out of scope

- **Rotation UI.** Deferred to M7. Reserved command token
  `ROTATE_PEER_KEYPAIR` is already declared in
  [`command-schema.md` § Multiplayer Trust & Identity Commands](./command-schema.md#multiplayer-trust--identity-commands)
  so the future flow has a stable entry point.
- **WebCrypto Ed25519 polyfill** for browsers without native
  support. If neither the native API nor a polyfill is available,
  the lobby fails loudly with a localized "ed25519 unavailable"
  error per
  [`fail-loud.md`](./fail-loud.md). The discoverable lobby surface
  itself is deferred under
  [`DEF-016`](../planning/deferred.md).
- **Cross-host reputation.** Bans are local per § 4; there is no
  central reputation service in M5.
- **Revocation lists.** No central registry in M5.

---

## 🔍 Sync Check

- **UI: ✔** — Slot-row `peerPubKey`, `pendingPeers`, and
  `peerDenylist` bindings on
  [`screens/64-network-lobby/data-contracts.md`](./wiki/screens/64-network-lobby/data-contracts.md)
  match § 3 and § 6 (`peerPubKey`, `displayNameDraft`,
  `joinNonceMs`, `bannedAtMs`, three-value `reason` enum). Display
  names route through
  [`display-name-policy.md`](./display-name-policy.md) per the
  cited spec.
- **Schema: ⚠** —
  [`peer-identity.schema.json`](../../content-schema/schemas/peer-identity.schema.json)
  pairs a derived `peerId` UUID with the public key; the row in
  [`schema-matrix.md`](./schema-matrix.md) names the IndexedDB
  store `hr-profile.peerIdentity`. The previous § 5 example
  embedded a `privateKey` field and named the persistence path
  `profile.peerKeypair`; the rewrite separates the public-only
  schema record from the local-only `state.profile.peerKeypair`
  private slice without changing meaning.
  [`session-token.schema.json`](../../content-schema/schemas/session-token.schema.json)
  and
  [`signaling-envelope.schema.json`](../../content-schema/schemas/signaling-envelope.schema.json)
  match §§ 7–8 verbatim.
- **Tasks: ❌** — Owning tasks
  [`16-peer-keypair-and-denylist`](../../tasks/phase-3/01-multiplayer/16-peer-keypair-and-denylist.md),
  [`14-host-approval-and-moderation`](../../tasks/phase-3/01-multiplayer/14-host-approval-and-moderation.md),
  [`25-peer-keypair-and-session-token`](../../tasks/phase-3/01-multiplayer/25-peer-keypair-and-session-token.md),
  [`26-signed-signaling-envelope`](../../tasks/phase-3/01-multiplayer/26-signed-signaling-envelope.md),
  and
  [`27-dtls-fingerprint-pinning`](../../tasks/phase-3/01-multiplayer/27-dtls-fingerprint-pinning.md)
  all read-first this doc and pin its anchors. However, the
  `state.profile.peerKeypair` / `hr-profile.peerIdentity` slice is
  **still not registered** in
  [`data-inventory.md`](./data-inventory.md) (the gap is
  self-flagged in that file's `## ⚠ Issues`). CI-blocking per
  CLAUDE.md root contract — see Issues.

## ⚠ Issues

- **Missing `data-inventory.md` row for `state.profile.peerKeypair` /
  `hr-profile.peerIdentity`.** § 1–§ 2 and § 5 of this doc define
  both halves of the persisted peer identity, and
  [`schema-matrix.md`](./schema-matrix.md) row `PeerIdentity` cites
  the same store. The gap is already flagged in
  [`data-inventory.md`](./data-inventory.md)'s own `## ⚠ Issues`
  block. Per CLAUDE.md root contract ("every persisted field is
  registered in `data-inventory.md`"), the owning task —
  [`16-peer-keypair-and-denylist`](../../tasks/phase-3/01-multiplayer/16-peer-keypair-and-denylist.md)
  — must add the row before the slice can ship. Suggested values:
  Field=`peer keypair`,
  State path=`state.profile.peerKeypair` (private + public halves),
  Medium=`IndexedDB (hr-profile.peerIdentity)`,
  Sensitivity=`high` (private key never on the wire),
  Retention=`until profile reset`,
  Wipe scope=`WIPE_LOCAL_DATA scope=profile|all`,
  Notes=`peer-identity.schema.json`; Ed25519 per this doc.
  Skill did not edit `data-inventory.md` (Hard Prohibition D — never
  edit cross-checked files).
- **Stale "Task 12" reference for the Ed25519 polyfill demoted.**
  The previous § 7 attributed the WebCrypto Ed25519 polyfill to
  "Task 12's verifyCommands". Tasks 12 in
  [`tasks/phase-3/01-multiplayer/`](../../tasks/phase-3/01-multiplayer/)
  are
  [`12-network-chaos-harness`](../../tasks/phase-3/01-multiplayer/12-network-chaos-harness.md)
  and
  [`12-visibility-preconditions-on-commands`](../../tasks/phase-3/01-multiplayer/12-visibility-preconditions-on-commands.md);
  neither owns Ed25519. The keypair runtime lives in
  [`16-peer-keypair-and-denylist`](../../tasks/phase-3/01-multiplayer/16-peer-keypair-and-denylist.md)
  and
  [`25-peer-keypair-and-session-token`](../../tasks/phase-3/01-multiplayer/25-peer-keypair-and-session-token.md);
  no task in the registry currently owns a polyfill specifically.
  The rewrite preserves the fail-loud behavior but drops the stale
  task pointer rather than silently picking a new owner. A
  follow-up task ticket should either fold the polyfill path into
  Task 16 / 25 acceptance criteria or carve a new task; the skill
  did not amend the registry (Hard Prohibition D).
- **`peerId` vs `peerPubKey` cross-cut documented, not unified.**
  The schema layer keys on a derived UUID `peerId` (per
  [`peer-identity.schema.json`](../../content-schema/schemas/peer-identity.schema.json)
  and
  [`peer-trust.md`](./peer-trust.md)), while the lobby slot row,
  pending-peer queue, and denylist key on `peerPubKey` directly.
  This co-existence is intentional but was undocumented; § 1 now
  states it inline. Not CI-blocking; FYI.
