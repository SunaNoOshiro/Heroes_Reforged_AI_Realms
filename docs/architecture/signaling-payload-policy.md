# Signaling Payload Policy

Canonical allow / deny list for any payload that crosses the M5
signaling server. The signaling server is a **stateless lobby** —
it has no business handling content hashes, display names, or chat
— and a third-party deployment must remain a fingerprinting
non-target.

If a payload is not on the § 1 allowlist, it MUST NOT traverse the
signaling server. Host and joiner exchange it on the WebRTC
DataChannel after `APPROVE_PEER`.

**Companion docs (read first):**
- [`signaling-message-schema.md`](./signaling-message-schema.md) —
  the wire-shape layer beneath this allowlist (closed
  discriminated union, length caps, `additionalProperties: false`).
- [`signaling-envelope.md`](./signaling-envelope.md) — outer signed
  envelope wrapping every frame after `JOIN_HANDSHAKE`
  (`CHALLENGE` / `CHALLENGE_RESPONSE` shape).
- [`signaling-audit-log.md`](./signaling-audit-log.md) — events
  emitted on `signaling.payload.rejected` and
  `signaling.ice.dropped_pre_consent`.
- [`ice-disclosure-policy.md`](./ice-disclosure-policy.md) —
  pre- vs post-consent ICE-candidate matrix; canonical owner of
  the relay-only filter referenced from § 1's `ICE_CANDIDATE` row.
- [`display-name-policy.md`](./display-name-policy.md) — display
  names ride the DataChannel after approval; never the signaling
  server.
- [`turn-credentials.md`](./turn-credentials.md) —
  `TURN_CREDENTIALS` / `REQUEST_TURN_REFRESH` issuance contract.

**Schemas:**
- [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)
  — closed `oneOf` of every variant on the allowlist; row in
  [`schema-matrix.md`](./schema-matrix.md) (`SignalingMessage`).

**Implementation:**
- Server entrypoint —
  [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md).
- Validation gate —
  [`tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md`](../../tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md).
- DataChannel side (where denylisted payloads actually flow) —
  [`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md).

---

## 1. Allowlist (signaling-server payloads)

Every payload the signaling server is allowed to forward. Any other
`type` is a contract violation.

| Payload | Direction | Purpose |
|---|---|---|
| `JOIN_HANDSHAKE` | client → server | First frame after WebSocket upgrade; carries `roomId`, `peerId`, `peerPubKey`, `secret`, `sigSchemaVersion`. Raw, not envelope-wrapped. |
| `JOIN_REJECTED` | server → client | Connection-level rejection (bad secret, room full, room closed, denylisted). |
| `CREATE_ROOM` | client → server | Mint a new room. |
| `CLOSE_ROOM` | host → server | Host-initiated close. |
| `ROOM_EXPIRED` / `ROOM_CLOSED` | server → all-in-room | TTL-sweep or host-close notice. |
| `JOIN_ROOM` | client → server → host | Forwarded verbatim; signature verified by host, not server. |
| `OFFER` / `ANSWER` | host ↔ joiner | SDP exchange. |
| `ICE_CANDIDATE` | host ↔ joiner | Filtered to `typ relay` for unapproved peers per [`ice-disclosure-policy.md`](./ice-disclosure-policy.md). |
| `PEER_PENDING` | server → host | A joiner is waiting for approval. |
| `APPROVE_PEER` / `REJECT_PEER` | host → server | Host moderation. |
| `PEER_REJECTED` | server → joiner | Result of `REJECT_PEER` or `denylisted`. |
| `KICK_PEER` | host → server | Remove an approved peer. |
| `PEER_KICKED` | server → joiner | Notice of being kicked. |
| `PEER_CONNECTED` / `PEER_DISCONNECTED` | server → all-in-room | Liveness updates. |
| `JOIN_ATTEMPT_REJECTED` | server → host | Aggregated count per 30 s window. |
| `RATE_LIMITED` | server → client | Throttle reply with `retryAfterMs`. |
| `ROOM_FULL` | server → client | Reply on the 3rd `JOIN_HANDSHAKE` (per-room cap = 2). |
| `CHALLENGE` / `CHALLENGE_RESPONSE` | server ↔ client | Envelope replay-defense nonce + Ed25519 reply per [`signaling-envelope.md`](./signaling-envelope.md). |
| `HOST_CHANGED` | server → all-in-room | Host-rotation notice. |
| `TURN_CREDENTIALS` | server → client | Short-TTL TURN credential issued at admit per [`turn-credentials.md`](./turn-credentials.md). |
| `REQUEST_TURN_REFRESH` | client → server | Joiner-initiated credential refresh. |
| `ERROR` | server → client | Closed `code` envelope plus optional `action`, `retryAfterMs`, `captchaToken`. |

The closed `type` enum is owned by
[`signaling-message-schema.md` § 1](./signaling-message-schema.md#1-message-types).
Adding a new entry requires updating that doc, this allowlist, and
the protocol-message list in
[Task 01](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
in the same change.

## 2. Denylist (never traverses signaling)

The signaling server MUST NOT see:

- **Display names.** Carried on the WebRTC DataChannel after
  approval; validated by the host per
  [`display-name-policy.md`](./display-name-policy.md). The
  schema-reserved `displayNameDraft` field is never set on the
  wire (policy beats schema).
- **Chat content.** Lobby and in-game chat ride the `chat`
  DataChannel
  ([Task 02](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)).
- **Pack hash.** Exchanged on the DataChannel after approval; see
  [`screens/62-multiplayer-setup/spec.md`](./wiki/screens/62-multiplayer-setup/spec.md)
  `contentCompatibilityHash` binding.
- **Save hash.** Same.
- **Non-`typ relay` ICE candidates** destined for an unapproved
  peer (`typ host`, `typ srflx`, `typ prflx`). Canonical filter
  matrix in
  [`ice-disclosure-policy.md` § 1](./ice-disclosure-policy.md#1-pre-consent-vs-post-consent-matrix).
- **Replay artifacts.** Replays never enter the signaling layer.
- **Authentication tokens** other than the per-room `secret` in
  the § 1 `JOIN_HANDSHAKE` row.

## 3. Lint enforcement

A lint rule under `services/signaling/` rejects:

- Any import of `displayName`, `chat`, `contentHash`, `saveHash`,
  or any module under `src/profile/`, `src/content-runtime/`,
  `src/save/`, or `src/replay/`.
- Any string literal `"displayName"`, `"contentHash"`,
  `"saveHash"`, or `"chat"` in keys of an outgoing payload (small
  AST walker; configuration lives alongside the server module).
- Any reference to a record under `content-schema/` from server
  code paths.

The rule is wired into `npm run validate:tasks`; a violation fails
CI.

A grep gate on the server module:

```sh
git grep -nE 'displayName|contentHash|saveHash|chatPayload' \
  -- 'services/signaling/'
```

…must return zero matches. Any match is a contract violation and a
CI failure.

## 4. Threat model

| Threat | Mitigation |
|---|---|
| A third-party signaling host fingerprints peers via display name | Display names never reach the server. |
| A third-party signaling host correlates pack adoption | Content hashes never reach the server. |
| A third-party signaling host harvests chat for moderation profile | Chat never reaches the server. |
| A pending peer learns the host's IP via `typ srflx` / `typ host` / `typ prflx` | Pre-consent ICE filter (see [`ice-disclosure-policy.md`](./ice-disclosure-policy.md)). |
| An implementer naïvely adds `CONTENT_HASH` to the protocol | Closed schema `oneOf` ([`signaling-message-schema.md`](./signaling-message-schema.md)) + lint rule + grep gate in § 3. |

---

## 🔍 Sync Check

- **UI: ✔** — Screen-62 `contentCompatibilityHash` row in [`62-multiplayer-setup/spec.md`](./wiki/screens/62-multiplayer-setup/spec.md) cites this policy verbatim ("never traverses the signaling server"); no copy drift.
- **Schema: ⚠** — [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json) and [`signaling-message-schema.md` § 1](./signaling-message-schema.md#1-message-types) enumerate seven payload variants that were missing from the prior § 1 allowlist (`ROOM_FULL`, `CHALLENGE`, `CHALLENGE_RESPONSE`, `HOST_CHANGED`, `TURN_CREDENTIALS`, `REQUEST_TURN_REFRESH`, `ERROR`). Rewrote § 1 to include them; details in `## ⚠ Issues`. The `SignalingMessage` row in [`schema-matrix.md`](./schema-matrix.md) explicitly defers the kind-level allow/deny to this file — alignment restored.
- **Tasks: ✔** — [Task 01](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) lists this file in `Read First` and its `Outputs` block enumerates the same 26-message set as § 1; [Task 02](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) and [Task 31](../../tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md) reciprocally cite this policy.

## ⚠ Issues

- **Allowlist drift (closed in this rewrite, additive only).** The pre-rewrite § 1 omitted `ROOM_FULL`, `CHALLENGE`, `CHALLENGE_RESPONSE`, `HOST_CHANGED`, `TURN_CREDENTIALS`, `REQUEST_TURN_REFRESH`, and `ERROR`. All seven appear in [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json) `oneOf` and in [Task 01 § Outputs](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) message list. Per skill § 8 Option A (target stale, system consistent), § 1 was extended; the existing 18 rows are unchanged. No code change implied. Future bumps should remember the three-doc invariant: this file + [`signaling-message-schema.md`](./signaling-message-schema.md) + [Task 01](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) move together.
- **Cross-doc validation gate (`npm run validate:signaling-payload-policy`) is unowned.** [`signaling-message-schema.md` § 1](./signaling-message-schema.md#1-message-types) cites a CI gate `npm run validate:signaling-payload-policy` to keep this allowlist in sync with the closed schema enum, "deferred to the owning task". `package.json` has no such script today, and no task `Outputs` row claims it. The drift documented in the previous issue is exactly what this gate would have caught. Suggested owner: [Task 31](../../tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md) (which already owns the AJV gate) — extend its `Outputs` to add the script and wire it into `npm run validate`. Skill did not edit Task 31 or `package.json` (Hard Prohibition D).
- **Field-name alias for the redacted-IP value flows through this allowlist.** `JOIN_ATTEMPT_REJECTED` and `RATE_LIMITED` rows in § 1 do not carry an IP, but their audit-log counterparts in [`signaling-audit-log.md`](./signaling-audit-log.md) carry the same 16-char hex value under three different field names (`creatorIpHash` / `key` / `ipPrefix`). Already tracked in `signaling-audit-log.md`'s own `## ⚠ Issues`; cross-referenced here so callers reading § 1 are not surprised when the log shape uses one name and the schema uses another.
