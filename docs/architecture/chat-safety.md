# Chat Safety

Single source of truth for lobby-chat safety: channel reservation,
envelope schema, normalization, sanitization, rate limit, mute /
block, report flow, retention, and the trust-model disclosure.
Authored by
[`docs/implementation-plans/19-chat-safety-and-user-reporting-plan.md`](../implementation-plans/19-chat-safety-and-user-reporting-plan.md).

When chat-related rules change, update this file first per the
project Contribution Rule, then mirror the change into the
[`64-network-lobby`](./wiki/screens/64-network-lobby/) screen package
and any owning task file.

---

## 1. Scope

- **Lobby chat only** in MVP. Reuses the
  [`64-network-lobby`](./wiki/screens/64-network-lobby/) screen
  package's `ChatPanel`.
- **In-game chat is reserved**, not implemented. The envelope schema
  exposes a `scope` enum so the same shape can later carry an `ingame`
  value without a breaking migration.
- **No server-side moderation** in MVP. The signaling server never
  sees chat — chat rides the WebRTC peer-to-peer DataChannel.

## 2. Channel Reservation

Chat MUST flow on a dedicated WebRTC DataChannel, never on the
deterministic command channel.

| `id` | `label`     | `ordered` | `maxRetransmits` | `negotiated` | Purpose                              |
| ---- | ----------- | --------- | ---------------- | ------------ | ------------------------------------ |
| 1    | `commands`  | `true`    | (reliable)       | `true`       | Deterministic command lockstep.      |
| 2    | `chat`      | `true`    | `3`              | `true`       | Lobby chat envelope.                 |
| 3–7  | reserved    | —         | —                | —            | Reserved for future channels.        |

Channel-property notes:

- The `chat` channel is best-effort (`maxRetransmits: 3`). The
  command channel remains reliable-ordered.
- `maxMessageSize` is enforced application-side at **1 KiB per
  envelope**. The receive-side validator drops anything larger and
  increments a per-peer abuse counter.
- **No game-state writes ever flow on this channel.** Reducers MUST
  refuse any payload received on `chat`; reducers MUST refuse any
  payload received on `commands` whose `kind` matches the chat
  envelope shape.

The transport-level reservation lives in
[`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md).

## 3. Envelope Schema

The chat envelope is canonicalized in
[`content-schema/schemas/chat-message.schema.json`](../../content-schema/schemas/chat-message.schema.json).
Canonical example:
[`content-schema/examples/chat-message/canonical.chat-message.json`](../../content-schema/examples/chat-message/canonical.chat-message.json).
A negative fixture used by validator unit tests lives in
[`content-schema/examples/chat-message/__rejected__/oversized.chat-message.json`](../../content-schema/examples/chat-message/__rejected__/oversized.chat-message.json)
(skipped by the example-record validator; consumed by reducer tests).

Required fields: `v`, `scope`, `senderId`, `t`, `nonce`, `text`.
Optional (additive): `sig`. Receive-side validation order:

1. Drop on payload > 1 KiB (channel cap).
2. Run normalization (§ 4) on `text` and `freeText`-equivalent fields.
3. Validate against the schema; drop on miss.
4. **Rewrite `senderId` to the transport peer's canonical id** at
   ingress. WebRTC DTLS protects the wire but not the application
   claim; the rewrite makes `senderId` effectively authoritative
   because peers cannot inject envelopes for other transport peers.
5. Apply rate limit (§ 6) before reducer ingest.

The `sig` field is reserved-additive in v1. The TLS / WebRTC
authentication plan activates the field by making it a mandatory
signature over the canonical-JSON envelope under the long-lived peer
key. v1 implementations MUST accept envelopes with or without `sig`.

## 4. Normalization

Applied on **both send and receive**, before schema validation:

1. NFKC normalize.
2. Strip C0 / C1 controls except literal newline (`\n`) — and
   `\n` is also stripped, because chat is single-line in MVP.
3. Strip the following ranges (zero-width, bidi overrides,
   isolates):
   - `U+200B` – `U+200F`
   - `U+202A` – `U+202E`
   - `U+2066` – `U+2069`
4. Collapse runs of whitespace (Unicode `\s`) into a single space.
5. Enforce `text.length ≤ 240` UTF-16 code units after normalization.

If the post-normalization string differs from the input, **keep the
normalized form** (do not reject). Rejecting a benign accent is bad
UX; the goal is to defang abuse vectors, not to police input.

Reuse the same `normalizeChatText(input)` pure function for any
chat-adjacent free-text (e.g., `freeText` in
[`report-bundle.schema.json`](../../content-schema/schemas/report-bundle.schema.json)).

## 5. Sanitization & Rendering

`ChatPanel` renders **plain-text only**. The MVP rendering contract:

- Render via `{text}` JSX binding only. No
  `dangerouslySetInnerHTML`. No markdown library. No link
  auto-detector.
- URLs are not auto-linked. If the user copies a URL out of the
  channel, that is the user's choice — there is no clickable
  surface.
- A CI / lint rule fails the build on any
  `dangerouslySetInnerHTML` usage anywhere under
  `src/ui/screens/network-lobby/` (and the lobby chat surface
  generally).

If a future iteration introduces clickable URLs:

- Allow `https:` only.
- Deny `javascript:`, `data:`, `vbscript:`, `file:`, and any
  scheme not on the allow-list.
- Require an explicit user confirm-on-click step, consistent with
  the unsafe-actions UX policy.
- That change MUST update this file first per the Contribution Rule.

## 6. Rate Limit

Per-peer **token bucket** keyed on the post-rewrite `senderId`:

- **Capacity**: 5 tokens.
- **Refill**: 1 token per 1 s.
- **On exhaustion**: drop incoming chat from that peer for **10 s**
  ("soft mute"); after 3 soft-mutes inside a 5-minute window,
  escalate to **session-mute** (for that one session) and surface a
  system message via
  `ui.network-lobby.chat.peer-rate-limited`.
- **Send-side mirror**: the local client refuses to enqueue on
  bucket-empty and surfaces an inline hint
  (`ui.network-lobby.chat.send.rate-limited`).
- Bucket state resets on lobby leave and on lobby join; it is per
  session and never persisted.

The bucket is a pure reducer slice; it must not leak into the
deterministic command log.

The rate-limit registry plan (the global rate-limit policy plan)
references these constants; this file is the canonical home and
that plan should not redefine the values.

## 7. Mute / Block

Two commands with a per-roster-row overflow menu (`Mute` / `Block`
/ `Report`) on
[`64-network-lobby`](./wiki/screens/64-network-lobby/):

- `MUTE_PEER { peerId, scope: 'session' | 'persistent' }` — drops
  inbound chat from that peer for the remainder of the session
  (`'session'`) or persists the rule under `localStorage` keyed by
  the long-lived peer key (`'persistent'`). Persistent variant is
  available only after the TLS / WebRTC authentication plan lands;
  until then the option renders disabled with the localized reason
  `ui.network-lobby.chat.mute.persistent-disabled`.
- `BLOCK_PEER { peerId }` — superset of `MUTE_PEER`. Also removes
  the peer's chat envelope from `state.net.lobby.chat` history view
  and prevents re-display if the peer rejoins under the same
  session-scoped id.

State slices:

- `state.net.lobby.muted: Record<peerId, MuteEntry>`.
- `state.net.lobby.blocked: Record<peerId, BlockEntry>`.

Both slices are **presentation-only** — they never enter saves,
replays, or the canonical state hash.

`ChatPanel` filters incoming envelopes on
`muted[senderId] || blocked[senderId]` after the receive-side
rewrite (§ 3 step 4).

## 8. Report

`REPORT_PEER { peerId, reasonCode, freeText? }` opens
`ReportPeerDialog`. Reason codes (closed enum, locale-bound labels):

- `harassment`
- `slurs-or-hate`
- `cheating-suspected`
- `unsafe-ai-content` — routed to the AI-UGC intake (owned by the
  personal-data plan).
- `other`

`freeText` is optional, capped at 500 chars, NFKC-normalized
(reuse `normalizeChatText`), plain-text only.

The command produces an in-memory **report bundle** conforming to
[`content-schema/schemas/report-bundle.schema.json`](../../content-schema/schemas/report-bundle.schema.json)
(see canonical examples
[peer-behavior](../../content-schema/examples/report-bundle/canonical-peer-behavior.report-bundle.json)
and
[ai-ugc](../../content-schema/examples/report-bundle/canonical-ai-ugc.report-bundle.json)).

Intake in v1:

- Bundle is serialized to a single JSON file and offered for
  download via blob URL. There is **no network upload** in MVP.
- Output filename:
  `heroes-reforged-report-<sessionId>-<ISO>.json` for
  `peer-behavior`,
  `heroes-reforged-report-ai-ugc-<sessionId>-<ISO>.json` for
  `ai-ugc`. The future AI-UGC intake (personal-data plan) branches
  on the filename prefix without re-parsing the body.
- The dialog explains: *"This will save a report file to your
  device. To file the report, attach the file to an email to
  support@… (intake route is not finalized; until then the file
  is for your records and any future appeal)."*

Evidence inclusion rules (`evidence.chatExcerpt`):

- Up to **50 messages** from the subject preceding the report
  click.
- ±2-message context window of reporter messages around each
  subject message, to provide minimal context without
  self-incrimination data.
- Reporter-only chatter outside that context window is excluded.

`evidence.saveHash` is included so a future backend can correlate
to a cheating claim deterministically.

`deviceCapture` is reserved-empty in v1. Activating any field
there requires a privacy / retention policy update plus an
explicit user-consent step.

A separate `EXPORT_CHAT_LOG { format: 'json' | 'txt' }` command
saves the lobby chat log to a single file — surfaced as
"Save chat log" in the chat-panel overflow menu. JSON output
contains schema-valid `chat-message.schema.json` entries. No
network call.

## 9. Retention

In-memory:

- `state.net.lobby.chat`, `state.net.lobby.muted`, and
  `state.net.lobby.blocked` are cleared on `LEAVE_NETWORK_LOBBY`
  and on session end.
- The token-bucket slice (§ 6) resets at the same lifecycle points.

On disk:

- The only persisted artefacts are files explicitly saved via
  `EXPORT_CHAT_LOG` or `REPORT_PEER`. Those files live in the
  user's downloads folder; the user owns them.
- The "forget me" flow (owned by the personal-data plan) MUST
  surface a notice that locally-saved exports are not
  automatically deleted, and provide a one-click "Open downloads
  folder" affordance.

Server-side:

- No server retention exists in MVP. Any future server-side
  retention requires a privacy / retention policy update.

## 10. Trust-Model Disclosure

A one-line, dismissable banner above the chat input on the first
lobby session of a given install:

> **Chat is peer-to-peer. There is no server moderation. Use Mute
> or Block to silence a player; use Report to save an evidence
> bundle.**

- Localization key: `ui.network-lobby.chat.trust-banner`.
- Dismissal persists in `localStorage` under
  `hr.ui.lobby.chat.trust-banner.dismissed = true`.
- Accessibility: announce on first show (live region); focus-trap
  is not required (banner is dismissable, not modal).

The general unsafe-actions UX plan owns the broader trust-model
disclosure pattern; this file owns the chat-specific copy and
dismissal binding.

## 11. Reserved Fields & Cross-Plan Hooks

- **`sig` (chat-message)** — reserved for the long-lived peer-key
  signature. The TLS / WebRTC authentication plan activates the
  field; v1 implementations accept envelopes with or without it.
- **`deviceCapture` (report-bundle)** — reserved-empty in v1.
  Activating any field requires the privacy / retention plan to
  set an explicit retention policy and the unsafe-actions plan to
  add a user-consent step.
- **AI-UGC report routing** — `kind: "ai-ugc"` bundles use a
  distinct filename prefix (§ 8) so the AI-content intake (owned
  by the personal-data plan) can branch on filename without
  re-parsing the body.
- **"Forget me" flow** — owned by the personal-data plan. This
  file documents the chat-history hook and the
  locally-saved-exports notice; the actual flow lands there.
- **Persistent mute/block** — depends on stable peer identity from
  the TLS / WebRTC authentication plan. Until that lands, only
  session-scoped mute and block ship; the persistent option
  renders disabled.

---

## Verify

- `npm run validate` runs the cross-reference and schema-shape
  gates that cover the chat-message and report-bundle schemas.
- Reducer-side unit tests for the chat envelope, normalization,
  rate limit, and report-bundle generation live alongside the
  owning task files (chat-envelope-channel-and-rate-limit,
  mute-block-and-trust-banner, report-bundle-and-export).
