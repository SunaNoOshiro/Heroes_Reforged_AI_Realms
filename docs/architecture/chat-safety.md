# Chat Safety

Single source of truth for lobby-chat safety: channel reservation,
envelope schema, normalization, sanitization, rate limit, mute /
block, report flow, retention, and the trust-model disclosure.

**Companion docs (read first):**
- [`wiki/screens/64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md)
  — `ChatPanel`, `ChatTrustBanner`, `ChatPanelOverflowMenu`,
  `ReportPeerDialog`, `MutedBadge`.
- [`wiki/screens/64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md)
  — `network.chat`, `network.mutePeer`, `network.blockPeer`,
  `network.reportPeer`, `network.exportChatLog`,
  `network.dismissChatTrustBanner`.
- [`wiki/screens/64-network-lobby/data-contracts.md`](./wiki/screens/64-network-lobby/data-contracts.md)
  — schema and state-slice bindings used by the lobby.
- [`signaling-audit-log.md` § 7](./signaling-audit-log.md#7-local-report-log-report_peer)
  — local audit-log row written alongside `REPORT_PEER`.
- [`peer-trust.md`](./peer-trust.md) — `MUTE_PEER` / `BLOCK_PEER` /
  `REPORT_PEER` interaction with peer trust state.

**Schemas:**
- [`chat-message.schema.json`](../../content-schema/schemas/chat-message.schema.json)
- [`report-bundle.schema.json`](../../content-schema/schemas/report-bundle.schema.json)

When chat-related rules change, update **this file first**, then
mirror the change into the
[`64-network-lobby`](./wiki/screens/64-network-lobby/) screen package
and the owning task files (Tasks 17 / 18 / 19 under
[`tasks/phase-3/01-multiplayer/`](../../tasks/phase-3/01-multiplayer/)).

---

## 1. Scope

- **Lobby chat only** in MVP. Reuses the
  [`64-network-lobby`](./wiki/screens/64-network-lobby/) screen
  package's `ChatPanel`.
- **In-game chat is reserved**, not implemented. The envelope
  `scope` enum exists so the same shape can later carry an `ingame`
  value without a breaking migration.
- **No server-side moderation in MVP.** The signaling server never
  sees chat — chat rides the WebRTC peer-to-peer DataChannel.

## 2. Channel Reservation

Chat MUST flow on a dedicated WebRTC DataChannel, never on the
deterministic command channel.

| `id` | `label`     | `ordered` | `maxRetransmits` | `negotiated` | Purpose                              |
| ---- | ----------- | --------- | ---------------- | ------------ | ------------------------------------ |
| 1    | `commands`  | `true`    | (reliable)       | `true`       | Deterministic command lockstep.      |
| 2    | `chat`      | `true`    | `3`              | `true`       | Lobby chat envelope.                 |
| 3–7  | reserved    | —         | —                | —            | Reserved for future channels.        |

- `chat` is best-effort (`maxRetransmits: 3`); `commands` stays
  reliable-ordered.
- `maxMessageSize` is enforced application-side at **1 KiB per
  envelope**. The receive-side validator drops anything larger and
  increments a per-peer abuse counter.
- **No game-state writes flow on `chat`.** Reducers MUST refuse
  any payload received on `chat`; reducers MUST refuse any payload
  on `commands` whose `kind` matches the chat envelope shape.

The transport-level reservation is owned by
[`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md).

## 3. Envelope Schema

Schema:
[`chat-message.schema.json`](../../content-schema/schemas/chat-message.schema.json).
Canonical example:
[`canonical.chat-message.json`](../../content-schema/examples/chat-message/canonical.chat-message.json).
Negative fixture used by reducer unit tests:
[`__rejected__/oversized.chat-message.json`](../../content-schema/examples/chat-message/__rejected__/oversized.chat-message.json)
(skipped by the example-record validator).

- **Required:** `v`, `scope`, `senderId`, `t`, `nonce`, `text`.
- **Optional (additive):** `sig`.

Receive-side validation order:

1. Drop on payload > 1 KiB (channel cap).
2. Run normalization (§ 4) on `text` and `freeText`-equivalent fields.
3. Validate against the schema; drop on miss.
4. **Rewrite `senderId` to the transport peer's canonical id.**
   WebRTC DTLS protects the wire but not the application claim;
   the rewrite makes `senderId` effectively authoritative because
   peers cannot inject envelopes for other transport peers.
5. Apply rate limit (§ 6) before reducer ingest.

`sig` is reserved-additive in v1: future TLS / WebRTC peer-key
authentication makes it a mandatory signature over the
canonical-JSON envelope under the long-lived peer key. v1
implementations MUST accept envelopes with or without `sig`.

## 4. Normalization

Applied on **both send and receive**, before schema validation:

1. NFKC normalize.
2. Strip C0 / C1 controls **including** literal newline (`\n`) —
   chat is single-line in MVP.
3. Strip these ranges (zero-width, bidi overrides, isolates):
   - `U+200B`–`U+200F`
   - `U+202A`–`U+202E`
   - `U+2066`–`U+2069`
4. Collapse runs of whitespace (Unicode `\s`) into a single space.
5. Enforce `text.length ≤ 240` UTF-16 code units after
   normalization.

If the post-normalization string differs from the input, **keep
the normalized form** — do not reject. Rejecting a benign accent
is bad UX; the goal is to defang abuse vectors, not to police
input.

Reuse the same `normalizeChatText(input)` pure function for any
chat-adjacent free-text (e.g., `freeText` in
[`report-bundle.schema.json`](../../content-schema/schemas/report-bundle.schema.json)).

## 5. Sanitization & Rendering

`ChatPanel` renders **plain-text only**. v1 contract:

- Render via `{text}` JSX binding only. **No
  `dangerouslySetInnerHTML`. No markdown library. No link
  auto-detector.**
- URLs are not auto-linked. If the user copies a URL out of the
  channel, that is the user's choice — there is no clickable
  surface.
- A CI / lint rule fails the build on any
  `dangerouslySetInnerHTML` usage anywhere under
  `src/ui/screens/network-lobby/` (and the lobby chat surface
  generally).

If a future iteration introduces clickable URLs, all four MUST
hold:

- Allow `https:` only.
- Deny `javascript:`, `data:`, `vbscript:`, `file:`, and any
  scheme not on the allow-list.
- Require an explicit user confirm-on-click step, consistent with
  the unsafe-actions UX policy.
- Update this file first (see Contribution note at top).

## 6. Rate Limit

Per-peer **token bucket** keyed on the post-rewrite `senderId`:

- **Capacity:** 5 tokens.
- **Refill:** 1 token / 1 s.
- **On exhaustion:** drop incoming chat from that peer for
  **10 s** ("soft mute"). After **3 soft-mutes inside a 5-minute
  window**, escalate to **session-mute** (for that one session)
  and surface a system message via
  `ui.network-lobby.chat.peer-rate-limited`.
- **Send-side mirror:** the local client refuses to enqueue on
  bucket-empty and surfaces an inline hint
  `ui.network-lobby.chat.send.rate-limited`.
- Bucket state resets on lobby leave and on lobby join; per
  session, never persisted.

The bucket is a pure reducer slice; it MUST NOT leak into the
deterministic command log. This file is the canonical home for the
constants — the rate-limit registry referenced elsewhere should
not redefine them.

## 7. Mute / Block

Two commands surfaced through the per-roster-row overflow menu
(`Mute` / `Block` / `Report`) on
[`64-network-lobby`](./wiki/screens/64-network-lobby/):

- **`MUTE_PEER { peerId, scope: 'session' | 'persistent' }`** —
  drops inbound chat from that peer for the rest of the session
  (`'session'`) or persists the rule keyed by the long-lived
  peer key (`'persistent'`). The persistent variant is available
  only after the TLS / WebRTC authentication plan lands; until
  then the option renders disabled with the localized reason
  `ui.network-lobby.chat.mute.persistent-disabled`.
- **`BLOCK_PEER { peerId }`** — superset of `MUTE_PEER`. Also
  removes the peer's chat envelopes from the rendered
  `state.net.lobby.chat` history view and prevents re-display if
  the peer rejoins under the same session-scoped id.

State slices:

- `state.net.lobby.muted: Record<peerId, MuteEntry>`.
- `state.net.lobby.blocked: Record<peerId, BlockEntry>`.

Both slices are **presentation-only** — they never enter saves,
replays, or the canonical state hash. `ChatPanel` filters
incoming envelopes on `muted[senderId] || blocked[senderId]`
after the receive-side rewrite (§ 3 step 4).

Owning task:
[`18-mute-block-and-trust-banner.md`](../../tasks/phase-3/01-multiplayer/18-mute-block-and-trust-banner.md).

## 8. Report

`REPORT_PEER { peerId, reasonCode, freeText? }` opens
`ReportPeerDialog`.

**Reason codes** (closed enum, locale-bound labels):

- `harassment`
- `slurs-or-hate`
- `cheating-suspected`
- `unsafe-ai-content` — routed to the AI-UGC intake (owned by the
  personal-data plan).
- `other`

`freeText` is optional, capped at **500 chars**, NFKC-normalized
(reuse `normalizeChatText`), plain-text only.

**Bundle.** The command produces an in-memory **report bundle**
conforming to
[`report-bundle.schema.json`](../../content-schema/schemas/report-bundle.schema.json)
(canonical examples:
[peer-behavior](../../content-schema/examples/report-bundle/canonical-peer-behavior.report-bundle.json),
[ai-ugc](../../content-schema/examples/report-bundle/canonical-ai-ugc.report-bundle.json)).

**Intake (v1):**

- Bundle is serialized to a single JSON file and offered for
  download via blob URL. **No network upload in MVP.**
- Filenames:
  - `peer-behavior` → `heroes-reforged-report-<sessionId>-<ISO>.json`
  - `ai-ugc` → `heroes-reforged-report-ai-ugc-<sessionId>-<ISO>.json`

  The future AI-UGC intake (personal-data plan) branches on the
  filename prefix without re-parsing the body.
- The dialog explains: *"This will save a report file to your
  device. To file the report, attach the file to an email to
  support@… (intake route is not finalized; until then the file
  is for your records and any future appeal)."*

**Evidence inclusion (`evidence.chatExcerpt`):**

- Up to **50 messages from the subject** preceding the report
  click.
- **±2-message context window** of reporter messages around each
  subject message (minimal context without self-incrimination
  data).
- Reporter-only chatter outside that window is excluded.

`evidence.saveHash` is included so a future backend can correlate
to a cheating claim deterministically.

`deviceCapture` is reserved-empty in v1. Activating any field
requires a privacy / retention policy update plus an explicit
user-consent step.

**Chat log export.** A separate
`EXPORT_CHAT_LOG { format: 'json' | 'txt' }` command saves the
lobby chat log to a single file — surfaced as **"Save chat log"**
in the chat-panel overflow menu. JSON output entries conform to
[`chat-message.schema.json`](../../content-schema/schemas/chat-message.schema.json).
No network call.

Owning task:
[`19-report-bundle-and-export.md`](../../tasks/phase-3/01-multiplayer/19-report-bundle-and-export.md).

## 9. Retention

**In-memory:**

- `state.net.lobby.chat`, `state.net.lobby.muted`, and
  `state.net.lobby.blocked` are cleared on `LEAVE_NETWORK_LOBBY`
  and on session end.
- The token-bucket slice (§ 6) resets at the same lifecycle
  points.

**On disk:**

- The only persisted artefacts are files explicitly saved via
  `EXPORT_CHAT_LOG` or `REPORT_PEER`. Those files live in the
  user's downloads folder; the user owns them.
- The "forget me" flow (owned by the personal-data plan) MUST
  surface a notice that locally-saved exports are not
  automatically deleted, plus a one-click "Open downloads
  folder" affordance.

**Server-side:**

- No server retention exists in MVP. Any future server-side
  retention requires a privacy / retention policy update.

## 10. Trust-Model Disclosure

A one-line, dismissable banner above the chat input on the first
lobby session of a given install:

> **Chat is peer-to-peer. There is no server moderation. Use
> Mute or Block to silence a player; use Report to save an
> evidence bundle.**

- Localization key: `ui.network-lobby.chat.trust-banner`.
- Dismissal binding: command
  `ACKNOWLEDGE_CHAT_TRUST_BANNER` (per
  [`interactions.md`](./wiki/screens/64-network-lobby/interactions.md)
  row "Dismiss trust banner"); persists
  `hr.ui.lobby.chat.trust-banner.dismissed = true` in
  `localStorage`.
- Accessibility: announce on first show via a live region;
  focus-trap is not required (banner is dismissable, not modal).

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
- **Persistent mute / block** — depends on stable peer identity
  from the TLS / WebRTC authentication plan. Until that lands,
  only session-scoped mute and block ship; the persistent option
  renders disabled.

---

## Verify

- `npm run validate` runs the cross-reference and schema-shape
  gates that cover the chat-message and report-bundle schemas.
- Reducer-side unit tests for the chat envelope, normalization,
  rate limit, and report-bundle generation live alongside the
  owning task files (Tasks 17 / 18 / 19 under
  [`tasks/phase-3/01-multiplayer/`](../../tasks/phase-3/01-multiplayer/)).

---

## 🔍 Sync Check

- **UI: ✔** — `ChatPanel`, `ChatTrustBanner`,
  `ChatPanelOverflowMenu`, `ReportPeerDialog`, `MutedBadge`,
  and the localization keys (`ui.network-lobby.chat.*`,
  `hr.ui.lobby.chat.trust-banner.dismissed`) all match
  [`wiki/screens/64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md)
  and
  [`interactions.md`](./wiki/screens/64-network-lobby/interactions.md)
  exactly. Dismissal command name `ACKNOWLEDGE_CHAT_TRUST_BANNER`
  added inline (§ 10) to match the interactions row, which the
  prior revision omitted.
- **Schema: ✔** — Required fields, enums, length caps, and
  validation order match
  [`chat-message.schema.json`](../../content-schema/schemas/chat-message.schema.json)
  and
  [`report-bundle.schema.json`](../../content-schema/schemas/report-bundle.schema.json).
  Both schemas are registered in
  [`schema-matrix.md`](./schema-matrix.md) (`ChatMessage`,
  `ReportBundle` rows) and `chat-message.schema.json` correctly
  cites this doc as authority.
- **Tasks: ✔** — `17-chat-envelope-channel-and-rate-limit`,
  `18-mute-block-and-trust-banner`, and
  `19-report-bundle-and-export` (all under
  [`tasks/phase-3/01-multiplayer/`](../../tasks/phase-3/01-multiplayer/))
  all list this file in their `Read First` block; the four
  command tokens (`MUTE_PEER`, `BLOCK_PEER`, `REPORT_PEER`,
  `EXPORT_CHAT_LOG`) and the reservation `LEAVE_NETWORK_LOBBY`
  are all registered in
  [`screen-command-coverage.json`](./screen-command-coverage.json).
  The transport reservation is owned by Task 02. State slices
  `state.net.lobby.muted` / `.blocked` are presentation-only and
  correctly absent from
  [`data-inventory.md`](./data-inventory.md) (in-memory only,
  per-row policy applies only to persisted slices).

## ⚠ Issues

- **`localStorage` writes are not yet on the persistence
  allowlist.** This file says
  `hr.ui.lobby.chat.trust-banner.dismissed` writes to
  `localStorage` (§ 10) and that the persistent `MUTE_PEER`
  variant (§ 7) will write to `localStorage` keyed by the
  long-lived peer key. Per
  [`persistence.md` § 2](./persistence.md#2-localstorage-ban),
  the `localStorage` allowlist is "currently empty" and the
  CI lint gate (`scripts/check-repo-contracts.mjs` per
  `tasks/mvp/02-content-schemas/25-safe-user-text-helper-and-jsx-lint.md`)
  fails on any `localStorage.setItem` outside the allowlist.
  Suggested fix (one of):
  1. Task 18 routes the trust-banner dismissed flag through
     IndexedDB `hr-profile.options` (preferred — already async,
     already covered by `WIPE_LOCAL_DATA scope=profile|all`),
     and add a
     [`data-inventory.md`](./data-inventory.md) row for it; or
  2. `persistence.md` § 2 adds an explicit allowlist row for
     `hr.ui.lobby.chat.trust-banner.dismissed` (and, post-auth,
     for the persistent-mute key) and the CI lint gate is
     extended to honor it.

  Owning tasks would be Task 18 (banner) and the future
  persistent-mute work (gated on the TLS / WebRTC auth plan).
  This skill did not edit `persistence.md`,
  `data-inventory.md`, or Task 18 (Hard Prohibition D).
- **Doc not registered in
  [`INDEX.md`](./INDEX.md).** `chat-safety.md` is the canonical
  home for the rules referenced by Tasks 17 / 18 / 19, the
  network-lobby screen package, and `peer-trust.md`, but it has
  no entry in [`INDEX.md`](./INDEX.md). Suggested cluster:
  "Decision and policy registers (39–47)", appended after row
  47. Skill did not edit `INDEX.md` (Hard Prohibition D).
