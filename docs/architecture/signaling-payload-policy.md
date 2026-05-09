# Signaling Payload Policy

This file is the canonical allow / deny list for any payload that
crosses the M5 signaling server. The signaling server is a
**stateless lobby** — it has no business handling content hashes,
display names, or chat — and a third-party deployment of the
server must remain a fingerprinting non-target.

If a payload is not on the allowlist below, it MUST NOT traverse
the signaling server. The host and the joiner exchange it on the
WebRTC DataChannel after `APPROVE_PEER`.

---

## 1. Allowlist (signaling-server payloads)

The complete set of payloads that the signaling server is allowed
to forward. Any other payload type is a contract violation.

| Payload | Direction | Purpose |
|---|---|---|
| `CREATE_ROOM` | client → server | Mint a new room. |
| `JOIN_HANDSHAKE` | client → server | First frame after WebSocket upgrade; carries `roomId`, `peerId`, `peerPubKey`, `secret`, `sigSchemaVersion`. |
| `JOIN_REJECTED` | server → client | Connection-level rejection (bad secret, room full, room closed, denylisted). |
| `JOIN_ROOM` | client → server → host | Forwarded verbatim; signature verified by host, not server. |
| `OFFER` / `ANSWER` | host ↔ joiner | SDP exchange. |
| `ICE_CANDIDATE` | host ↔ joiner | Filtered to `typ relay` for unapproved peers per [`ice-disclosure-policy.md`](./ice-disclosure-policy.md). |
| `PEER_PENDING` | server → host | Notice that a joiner is waiting for approval. |
| `APPROVE_PEER` / `REJECT_PEER` | host → server | Host moderation. |
| `PEER_REJECTED` | server → joiner | Result of `REJECT_PEER` or `denylisted`. |
| `KICK_PEER` | host → server | Remove an approved peer. |
| `PEER_KICKED` | server → joiner | Notice of being kicked. |
| `PEER_CONNECTED` / `PEER_DISCONNECTED` | server → all-in-room | Liveness updates. |
| `JOIN_ATTEMPT_REJECTED` | server → host | Aggregated count per 30 s window. |
| `RATE_LIMITED` | server → client | Throttle reply with `retryAfterMs`. |
| `CLOSE_ROOM` | host → server | Host-initiated close. |
| `ROOM_EXPIRED` / `ROOM_CLOSED` | server → all-in-room | TTL or close notice. |

Each entry must already appear on the protocol-message list inside
[`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md).
Adding a new entry requires updating both files in the same change.

## 2. Denylist (never traverses signaling)

The signaling server MUST NOT see:

- **Display names.** Carried on the WebRTC DataChannel after
  approval; validated by the host per
  [`display-name-policy.md`](./display-name-policy.md).
- **Chat content.** Lobby and in-game chat ride the `chat`
  DataChannel
  ([Task 02](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)).
- **Pack hash.** Exchanged on the DataChannel after approval; see
  [`screens/62-multiplayer-setup/spec.md`](./wiki/screens/62-multiplayer-setup/spec.md)
  `contentCompatibilityHash` binding.
- **Save hash.** Same.
- **`typ host` / `typ srflx` ICE candidates** destined for an
  unapproved peer. See
  [`ice-disclosure-policy.md`](./ice-disclosure-policy.md).
- **Replay artifacts.** Replays never enter the signaling layer.
- **Authentication tokens** (other than the per-room secret in §
  1's `JOIN_HANDSHAKE`).

## 3. Lint enforcement

A lint rule under `services/signaling/` rejects:

- Any import of `displayName`, `chat`, `contentHash`, `saveHash`,
  or any module under `src/profile/`, `src/content-runtime/`,
  `src/save/`, or `src/replay/`.
- Any string literal containing `"displayName"`,
  `"contentHash"`, `"saveHash"`, or `"chat"` in keys of an
  outgoing payload (a small AST walker; the configuration lives
  alongside the server module).
- Any reference to a record under `content-schema/` from server
  code paths.

The rule is wired into the existing repo lint pipeline
(`npm run validate:tasks`); a violation fails CI.

A grep gate on the server module:

```sh
git grep -nE 'displayName|contentHash|saveHash|chatPayload' \
  -- 'services/signaling/'
```

…must return zero matches. Any match indicates a contract
violation and a CI failure.

## 4. Threat model

| Threat | Mitigation |
|---|---|
| A third-party signaling host fingerprints peers via display name | Display names never reach the server. |
| A third-party signaling host correlates pack adoption | Content hashes never reach the server. |
| A third-party signaling host harvests chat for moderation profile | Chat never reaches the server. |
| A pending peer learns the host's IP via `typ srflx` | Pre-consent ICE filter (see [`ice-disclosure-policy.md`](./ice-disclosure-policy.md)). |
| An implementer naïvely adds `CONTENT_HASH` to the protocol | Lint rule + grep gate in § 3. |
