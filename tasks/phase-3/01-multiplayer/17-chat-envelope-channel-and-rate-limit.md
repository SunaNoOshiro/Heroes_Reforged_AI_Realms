# Chat Envelope, Channel Validators & Rate Limit

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Author the lobby-chat envelope schema, the dedicated `chat`
DataChannel send/receive validators, the `normalizeChatText`
pipeline (NFKC + control + bidi strip + length cap), and the
per-peer token-bucket rate limit. Closes Q333–Q336, Q342–Q343 and
the chat-DoS / identity-spoofing risks documented in
[`docs/readiness-audit/19-chat-safety-and-user-reporting.md`](../../../docs/readiness-audit/19-chat-safety-and-user-reporting.md).

Read First:
- [`docs/architecture/chat-safety.md`](../../../docs/architecture/chat-safety.md)
- [`content-schema/schemas/chat-message.schema.json`](../../../content-schema/schemas/chat-message.schema.json)
- [`docs/architecture/wiki/screens/64-network-lobby/spec.md`](../../../docs/architecture/wiki/screens/64-network-lobby/spec.md)
- [`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../../../docs/architecture/wiki/screens/64-network-lobby/interactions.md)
- [`docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`](../../../docs/architecture/wiki/screens/64-network-lobby/data-contracts.md)

Inputs:
- `chat` DataChannel reservation from Task 02 (`id: 2`,
  `ordered: true`, `maxRetransmits: 3`, `negotiated: true`).
- `peerId` shape from
  [`docs/architecture/peer-identity.md`](../../../docs/architecture/peer-identity.md)
  and the lobby-discovery plan.

Outputs:
- `src/multiplayer/chat/normalizeChatText.ts` — pure function:
  NFKC normalize, strip C0/C1 controls (including `\n`), strip
  `U+200B–U+200F`, `U+202A–U+202E`, `U+2066–U+2069`, collapse
  runs of whitespace, enforce 240 UTF-16 code-unit cap. Idempotent.
- `src/multiplayer/chat/validateChatEnvelope.ts` — receive-side
  validator: drops on payload > 1 KiB, runs `normalizeChatText`,
  validates against
  [`chat-message.schema.json`](../../../content-schema/schemas/chat-message.schema.json),
  rewrites `senderId` to the transport peer's canonical id,
  applies the per-peer token bucket. Exposes a per-peer abuse
  counter for telemetry.
- `src/multiplayer/chat/chatRateBucket.ts` — pure reducer slice:
  capacity 5, refill 1 token / 1 s, 10 s soft-mute on exhaustion,
  3-strikes-in-5-min escalation to session-mute. Reset on lobby
  leave/join.
- Reducer integration: ingress on `state.net.lobby.chat[]`
  appends only after the validator returns ok. The `chat`
  DataChannel never feeds the deterministic command channel.
- Unit tests under
  `src/multiplayer/chat/__tests__/`:
  - `normalizeChatText.test.ts` — NFKC compose case, zero-width
    strip, bidi-override strip, control-char strip, idempotence,
    length truncation.
  - `validateChatEnvelope.test.ts` — accepts well-formed; drops
    oversize (uses
    [`content-schema/examples/chat-message/__rejected__/oversized.chat-message.json`](../../../content-schema/examples/chat-message/__rejected__/oversized.chat-message.json)
    as fixture); drops malformed `nonce`; rewrites spoofed
    `senderId` to transport peer.
  - `chatRateBucket.test.ts` — 6th send within 1 s drops; refill
    after 1 s; 10 s soft-mute; 3-strikes session-mute.

Owned Paths:
- `src/multiplayer/chat/normalizeChatText.ts`
- `src/multiplayer/chat/validateChatEnvelope.ts`
- `src/multiplayer/chat/chatRateBucket.ts`
- `src/multiplayer/chat/__tests__/normalizeChatText.test.ts`
- `src/multiplayer/chat/__tests__/validateChatEnvelope.test.ts`
- `src/multiplayer/chat/__tests__/chatRateBucket.test.ts`
- `content-schema/schemas/chat-message.schema.json`
- `content-schema/examples/chat-message/canonical.chat-message.json`
- `content-schema/examples/chat-message/__rejected__/oversized.chat-message.json`
- `docs/architecture/chat-safety.md`

Dependencies:
- phase-3.01-multiplayer.02-webrtc-peer-connection-plus-datachannel-setup

Acceptance Criteria:
- A well-formed envelope accepted by the receive-side validator
  is appended to `state.net.lobby.chat[]`. Schema validation runs
  **before** reducer ingest.
- An oversized envelope (text > 240 chars after normalization)
  is dropped and the per-peer abuse counter increments.
- A spoofed `senderId` (claim mismatched against transport peer)
  is **rewritten** to the transport peer's canonical id; the
  envelope is not dropped on the rewrite alone.
- A malformed `nonce` (regex miss) is dropped.
- `normalizeChatText` is idempotent: `f(f(x)) === f(x)` for the
  full test-vector set.
- Rate limit: a 6th send in 1 s drops; the bucket refills after
  1 s; on 3 soft-mutes within 5 minutes the peer is
  session-muted and `ui.network-lobby.chat.peer-rate-limited`
  is surfaced.
- Send-side mirror: `SEND_LOBBY_CHAT` refuses to enqueue when the
  local bucket is empty; `ui.network-lobby.chat.send.rate-limited`
  is shown next to the input.
- The `chat` DataChannel never feeds the command channel, and a
  command-shaped payload received on `chat` is rejected.
- **Screen package coverage**: the contract matches
  [`docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`](../../../docs/architecture/wiki/screens/64-network-lobby/data-contracts.md)
  and
  [`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../../../docs/architecture/wiki/screens/64-network-lobby/interactions.md);
  no validator is invoked outside those packages.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
