# Implementation Plan: 19 — Chat Safety & User Reporting

> Source audit: [docs/archive/readiness-audit/19-chat-safety-and-user-reporting.md](../readiness-audit/19-chat-safety-and-user-reporting.md)
> Audit AI-Readiness score at time of writing: **1 / 10** — target after this plan: **8 / 10**.
> Original audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic and Risk item from Q333–Q360
> into concrete work items grounded in the existing M5 task tree
> ([tasks/phase-3/01-multiplayer/](../../../tasks/phase-3/01-multiplayer/))
> and the lobby screen package
> ([64-network-lobby](../../architecture/wiki/screens/64-network-lobby/)).

---

## 1. Overview

The audit found that **chat-safety and user-reporting are essentially
unspecified**. Of 28 questions, 25 are ❌ UNKNOWN and 2 are ⚠ Partial.
The only existing chat surface is the lobby's `SEND_LOBBY_CHAT` →
`state.net.lobby.chat` plumbing in
[64-network-lobby](../../architecture/wiki/screens/64-network-lobby/);
there is no schema, no length cap, no rate limit, no escaping contract,
no profanity filter, no Unicode normalization, no mute/block, no
report flow, no moderation backend, and no trust-model disclosure.
The single `ChatPanel` component currently relies on implicit React
JSX escaping as its sole defense against XSS.

This plan formalizes:

1. A **chat-message envelope schema** under
   [`content-schema/schemas/`](../../../content-schema/schemas/) and a
   matching transient state contract.
2. A **dedicated chat DataChannel** (separate from the deterministic
   command channel) with payload caps and per-peer rate limit.
3. **Sanitization, normalization, and rendering** policy for
   `ChatPanel` (plain-text only, NFKC normalize, length cap, no rich
   text in MVP).
4. **Mute / block / report** commands and UI on
   [64-network-lobby](../../architecture/wiki/screens/64-network-lobby/).
5. A **report-bundle** artifact and a "save bundle locally" intake
   path that works without a moderation backend.
6. A **trust-model disclosure** on the lobby (one-line "chat is
   peer-to-peer; no server moderation") to align with audit 23.
7. Coverage of chat history under the **"forget me"** flow already
   tracked by audit 21/Q406.

**Sibling plan boundaries.**

- **Plan 07** ([07-multiplayer-plan.md](./07-multiplayer-plan.md))
  owns the WebRTC transport: DataChannel allocation, lockstep, desync.
  This plan defines the **chat channel reservation contract**; Plan 07
  is updated to reference it but does not redefine it.
- **Plan 18** ([18-room-codes-and-lobby-discovery-plan.md](./18-room-codes-and-lobby-discovery-plan.md))
  owns lobby identity, kick/ban primitives, and display-name hygiene.
  This plan **depends on** Plan 18's stable `peerId` for mute/block
  anchoring; until that lands, mute/block is session-scoped only.
- **Plan 21** (UGC and personal data) owns the "forget me" flow and
  separate UGC report intake. This plan adds the **chat-history
  inclusion** hook only.
- **Plan 22** (privacy / retention / error leaks) owns retention TTLs.
  This plan declares the report-bundle's local-only retention policy
  and references Plan 22 for any future server-side retention.
- **Plan 23** (unsafe-actions UX / consent) owns trust-model
  disclosures generally; this plan adds the **chat-specific** banner.
- **Plan 24** (TLS / WebRTC authentication) owns the long-lived peer
  key. This plan declares chat-envelope `senderId` integrity as a
  reserved field that becomes signed once Plan 24 lands.
- **Plan 29** (rate-limiting / secrets) owns global rate-limit policy.
  This plan defines the **chat- and report-specific limits** and
  registers them with Plan 29.

**In scope:**

- One new schema:
  [`content-schema/schemas/chat-message.schema.json`](../../../content-schema/schemas/chat-message.schema.json).
- One new schema:
  [`content-schema/schemas/report-bundle.schema.json`](../../../content-schema/schemas/report-bundle.schema.json).
- New architecture doc:
  [`docs/architecture/chat-safety.md`](../../architecture/chat-safety.md).
- Extensions to the
  [64-network-lobby](../../architecture/wiki/screens/64-network-lobby/)
  screen package (spec, interactions, data-contracts, architecture).
- Edits to
  [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  to reserve a second DataChannel.
- Edits to
  [tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md](../../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md)
  to add chat-safety UI bindings.
- Three new task files under
  [`tasks/phase-3/01-multiplayer/`](../../../tasks/phase-3/01-multiplayer/):
  09 (chat envelope + caps), 10 (mute/block + UI), 11 (report bundle).

**Explicitly out of scope (deferred / owned elsewhere):**

- Server-side moderation backend, triage queue, and appeals workflow
  (no backend exists; deferred to **M7 polish** with a backend RFC).
- AI-classifier-based profanity filter — MVP uses a wordlist registry
  only (audit 21/Q393 owns the AI-content variant).
- In-game (post-launch) chat — confirmed deferred by audit 07/Q147.
  This plan covers **lobby chat only**, plus a reserved DataChannel
  shape that an in-game chat can later piggy-back on.
- Cryptographic message signing — reserved as additive field; activated
  by Plan 24.

---

## 2. Critical Fixes (Must Do First)

These five items unblock safe lobby chat and must land before M5 can
be exposed to non-internal users. Compliance posture (App Store /
Google Play / EU DSA) requires functional report + block flows for
any P2P chat, so all five are gating.

---

### Issue: Chat shares the deterministic command DataChannel

**Source:** Q333 (⚠), Q335 (❌); Risks bullet "DoS via oversized chat";
Improvements bullet 2; cross-reference audit 07/Q147.

**Problem:**
[`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
specifies a single deterministic command DataChannel. Lobby chat
currently rides the same channel, separated by namespace only. An
oversized or flooded chat payload stalls the input-lockstep flow that
the entire deterministic engine depends on.

**Impact:**
- DoS surface: a malicious peer can freeze opposing input by spamming
  large chat frames on the command channel.
- Backpressure on the command channel mixes two unrelated traffic
  classes; no clean QoS policy is possible.
- An in-game chat (currently out of scope) cannot be added later
  without re-opening the same wound.

**Solution:**
Reserve a **second DataChannel** named `chat` on the WebRTC peer
connection. Channel properties:

- `label`: `"chat"`.
- `ordered`: `true`.
- `maxRetransmits`: `3` (chat is best-effort, command channel is
  reliable-ordered).
- `negotiated`: `true`, `id`: `2` (command channel keeps `id`: `1`).
- `maxMessageSize`: enforced application-side at 1 KiB per envelope
  (see chat-envelope schema below); receive-side validator drops
  anything larger and increments a per-peer abuse counter.
- **No game-state writes** ever flow on this channel.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  — add `Owned Paths (shared)` entry for the `chat` DataChannel
  reservation; add an `# Acceptance` bullet that two channels exist
  and crossing payloads is rejected.
- [docs/architecture/diagrams/multiplayer-handshake.md](../../architecture/diagrams/multiplayer-handshake.md)
  (if present; otherwise add a `chat-channel.md` note) — show two
  channels in the post-DTLS state.

**New Files (if needed):**
- [docs/architecture/chat-safety.md](../../architecture/chat-safety.md)
  — single source of truth for channel reservation, envelope schema,
  caps, normalization, sanitization, mute/block, and reports.

**Implementation Steps:**
1. Add the channel-reservation block to the multiplayer task and to
   `chat-safety.md`.
2. Document the negotiated `id` allocation table (1=cmd, 2=chat,
   reserved 3–7) in `chat-safety.md`.
3. Add an integration-test stub in the task that proves chat traffic
   does not appear on the command channel when both are open.

**Dependencies:**
- None upstream of this plan; transport is a green-field reservation.

**Complexity:** S

---

### Issue: No chat-message envelope schema

**Source:** Q334 (❌), Q336 (❌); Missing-Logic bullet 1; Improvements
bullet 3.

**Problem:**
There is no chat schema in
[`content-schema/schemas/`](../../../content-schema/schemas/). Without a
schema there is no `senderId` binding, no length cap, no nonce, no
timestamp contract, and no integrity field. The receive side has
nothing to validate against.

**Impact:**
- Spoofed `senderId` (Q334) — peers can impersonate any other peer
  or "host".
- No way for a future signed-chat upgrade (Plan 24) to be additive.
- Receive-side validators cannot fail loudly on malformed input;
  the React layer becomes the de facto validator.

**Solution:**
Create
[`content-schema/schemas/chat-message.schema.json`](../../../content-schema/schemas/chat-message.schema.json)
with:

```jsonc
{
  "$id": "https://heroes-reforged/chat-message.schema.json",
  "type": "object",
  "required": ["v", "scope", "senderId", "t", "nonce", "text"],
  "additionalProperties": false,
  "properties": {
    "v": { "const": 1 },
    "scope": { "enum": ["lobby"] },           // "ingame" reserved
    "senderId": { "type": "string", "pattern": "^peer:[a-z0-9-]{8,64}$" },
    "t": { "type": "integer", "minimum": 0 }, // ms since session start
    "nonce": { "type": "string", "pattern": "^[A-Za-z0-9_-]{12,16}$" },
    "text": { "type": "string", "minLength": 1, "maxLength": 240 },
    "sig":  { "type": "string", "pattern": "^[A-Za-z0-9_-]+$" } // reserved, optional v1
  }
}
```

- `text` is **NFKC-normalized, plain-text only** (sanitization rule
  declared in `chat-safety.md`).
- `senderId` shape mirrors Plan 18's peer identity contract.
- `sig` is an additive-first field reserved for Plan 24.
- Receive-side validation is **mandatory** and runs before the message
  reaches reducers or `ChatPanel`.

Add the matching transient-state contract to
[`docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`](../../architecture/wiki/screens/64-network-lobby/data-contracts.md)
under "Runtime State Selectors": `state.net.lobby.chat[]` items
conform to `chat-message.schema.json` after validation.

**Files to Update:**
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md)
  — add `chat-message.schema.json`.
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../../architecture/wiki/screens/64-network-lobby/data-contracts.md)
  — bind `chatMessages` selector to the schema.
- [content-schema/README.md](../../../content-schema/README.md) — list new
  schema.

**New Files (if needed):**
- [content-schema/schemas/chat-message.schema.json](../../../content-schema/schemas/chat-message.schema.json).
- [content-schema/examples/chat-message/canonical.json](../../../content-schema/examples/chat-message/canonical.json)
  — one happy-path example per repo convention.
- [content-schema/examples/chat-message/oversized-rejected.json](../../../content-schema/examples/chat-message/oversized-rejected.json)
  — one negative example (text > 240 chars) used by validator tests.

**Implementation Steps:**
1. Author the schema and two examples.
2. Wire schema into `npm run validate` cross-ref check.
3. Add reducer guard in `state.net.lobby.chat` ingress (drop on schema
   miss; increment per-peer abuse counter).
4. Add unit tests: well-formed accepted, oversize dropped, malformed
   `nonce` dropped, spoofed `senderId` (mismatched against transport
   peer) dropped.

**Dependencies:**
- DataChannel split (above) — chat envelope only flows on `chat`
  channel.

**Complexity:** M

---

### Issue: No rendering-safety contract for `ChatPanel`

**Source:** Q337 (❌), Q338 (❌); Risks bullet "XSS through ChatPanel".

**Problem:**
[`docs/architecture/wiki/screens/64-network-lobby/spec.md`](../../architecture/wiki/screens/64-network-lobby/spec.md)
names a `ChatPanel` component but documents no rendering-safety
contract. Today's React stack happens to escape via JSX, but this is
implicit; the moment somebody introduces markdown, links, or embeds
the door re-opens.

**Impact:**
- Stored XSS via crafted unicode + future markdown parser is a
  one-line regression away.
- No allow/deny scheme for URL schemes (`javascript:`, `data:`, etc.).
- No SSRF posture if image embeds ever land.

**Solution:**
Add a **plain-text-only** rendering contract to `chat-safety.md` and
mirror the binding in
[64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md):

- `ChatPanel` MUST render `text` via `{text}` JSX binding only
  (no `dangerouslySetInnerHTML`, no markdown library, no link
  auto-detector in MVP).
- URLs are not auto-linked. If the user copies a URL out of the
  channel, that is the user's choice — there is no clickable surface.
- If a future iteration introduces clickable URLs:
  - allow `https:` only;
  - deny `javascript:`, `data:`, `vbscript:`, `file:`;
  - require an explicit user confirm-on-click step (audit 23 alignment);
  - that change must update `chat-safety.md` first per the Contribution
    Rule.

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md)
  — add "Rendering Safety" subsection naming the contract.
- [docs/architecture/wiki/screens/64-network-lobby/architecture.md](../../architecture/wiki/screens/64-network-lobby/architecture.md)
  — show `validate → normalize → render` flow.

**New Files (if needed):**
- See [docs/architecture/chat-safety.md](../../architecture/chat-safety.md)
  (created above).

**Implementation Steps:**
1. Add a lint rule (or CI check) that fails on
   `dangerouslySetInnerHTML` usage anywhere under
   `src/ui/screens/network-lobby/`.
2. Add a screen-snapshot test: payload `<img src=x onerror=alert(1)>`
   renders as literal text.
3. Document the rule in `chat-safety.md` § "Rendering".

**Dependencies:**
- Schema (above) — text length is bounded before render.

**Complexity:** S

---

### Issue: No NFKC normalization or length cap on chat input

**Source:** Q336 (❌), Q343 (❌); Risks bullet "Homoglyph / RTL /
zero-width abuse"; cross-reference audit 18/Q324.

**Problem:**
Audit 18/Q324 flagged the same gap for display names. Without NFKC
normalization, slurs wrapped in zero-width or combining marks bypass
any future filter, RTL-override characters reverse rendering, and
homoglyphs let one peer impersonate another's name in chat.

**Impact:**
- Filter bypass (any wordlist is trivially defeated).
- Visual impersonation (Cyrillic homoglyphs).
- Layout attacks (RTL override).

**Solution:**
Define a single normalization step that runs on **both** send and
receive, before schema validation:

1. NFKC normalize.
2. Strip C0/C1 controls except `\n` (which is also stripped because
   chat is single-line in MVP).
3. Strip `U+200B–U+200F`, `U+202A–U+202E`, `U+2066–U+2069`
   (zero-width and bidi overrides).
4. Collapse runs of whitespace to a single space.
5. After normalization, enforce `text.length ≤ 240` (UTF-16 code
   units; matches schema cap).

If the post-normalization string differs from the input, keep the
normalized form — do not reject (rejecting a benign accent is bad UX).

**Files to Update:**
- [docs/architecture/chat-safety.md](../../architecture/chat-safety.md)
  — § "Normalization" with the exact code-point ranges.
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md)
  — note that `Send chat` runs the normalization step before
  `SEND_LOBBY_CHAT`.

**New Files (if needed):**
- None.

**Implementation Steps:**
1. Add a `normalizeChatText(input: string): string` pure function
   under `src/multiplayer/chat/` (owned by new task 09).
2. Test cases: zero-width space removal, NFKC compose, bidi-override
   strip, control-char strip, length truncation.
3. Re-use the same function for display names if Plan 18's
   display-name normalization lands later (DRY hook noted, not forced).

**Dependencies:**
- Schema (above) — schema enforces the post-normalization shape.

**Complexity:** S

---

### Issue: No rate-limit on chat sends

**Source:** Q335 (❌), Q342 (❌); Improvements bullet 9; cross-reference
audit 29/Q602.

**Problem:**
No token-bucket, sliding window, or per-peer counter exists. Audit 29
explicitly defers chat rate-limit policy.

**Impact:**
- A peer floods chat to grief the opponent.
- Combined with the shared command channel (now split — see above),
  the impact is reduced but still degrades the lobby UX.
- No automatic throttle means the only recourse is `LEAVE_NETWORK_LOBBY`.

**Solution:**
Define a **per-peer token bucket** in `chat-safety.md`:

- Capacity: 5 tokens.
- Refill: 1 token per 1 s.
- On exhaustion: drop incoming chat from that peer for 10 s
  ("soft mute"); after 3 soft-mutes inside 5 minutes, escalate to
  session-mute (for that one session) and surface a system message:
  `ui.network-lobby.chat.peer-rate-limited`.
- Send-side mirror: client refuses to enqueue on bucket-empty and
  surfaces an inline hint.

**Files to Update:**
- [docs/architecture/chat-safety.md](../../architecture/chat-safety.md)
  — § "Rate Limit".
- [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](../readiness-audit/29-rate-limiting-and-secret-management.md)
  is **not** edited (per the no-modify rule); reference is added in
  Plan 29 instead.
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md)
  — add bucket-empty inline hint binding.

**New Files (if needed):**
- None.

**Implementation Steps:**
1. Implement bucket as a pure reducer slice keyed by `peerId`.
2. Reset on lobby leave/join.
3. Test: 6th send within 1 s drops; recovery after 1 s; soft-mute
   timer; session-mute escalation.

**Dependencies:**
- Chat-message schema (sender identity is the bucket key).

**Complexity:** S

---

## 3. System Improvements

### UI / Screens

#### Issue: No mute / block / ignore UI on `64-network-lobby`

**Source:** Q340 (❌), Q341 (❌); Missing-Logic bullet 3; Improvements
bullet 5.

**Problem:**
Lobby commands are limited to `SET_LOBBY_READY`, `SEND_LOBBY_CHAT`,
`REQUEST_LOBBY_SLOT_CHANGE`, `LAUNCH_NETWORK_GAME`,
`LEAVE_NETWORK_LOBBY`. No `MUTE_PEER`, no `BLOCK_PEER`, no UI affordance
on the player roster.

**Impact:**
- A harassed player has only `LEAVE_NETWORK_LOBBY` available, which
  forfeits the match.
- App store review will flag the missing block surface for any P2P chat.

**Solution:**
Add two commands and a per-row context menu on the lobby roster:

- `MUTE_PEER { peerId, scope: 'session' | 'persistent' }` — drops
  inbound chat from that peer for the remainder of the session
  (`'session'`) or persists to `localStorage` keyed by long-lived
  peer key (`'persistent'`, only available once Plan 24 lands; until
  then the option is shown disabled with the localized reason
  `ui.network-lobby.chat.mute.persistent-disabled`).
- `BLOCK_PEER { peerId }` — superset of mute: also kicks the peer's
  chat envelope from `state.net.lobby.chat` history view and prevents
  re-display if the peer rejoins under the same session-scoped id.

Roster row gets a `…` overflow menu with: Mute / Block / Report.

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md)
  — add roster-row overflow menu and `MutedBadge`.
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md)
  — add Mute/Block/Report interactions.
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../../architecture/wiki/screens/64-network-lobby/data-contracts.md)
  — add `state.net.lobby.muted` and `state.net.lobby.blocked` selectors.
- [docs/architecture/wiki/screens/64-network-lobby/mockup.html](../../architecture/wiki/screens/64-network-lobby/mockup.html)
  — add the menu.
- [docs/architecture/screen-command-coverage.json](../../architecture/screen-command-coverage.json)
  — register `MUTE_PEER`, `BLOCK_PEER`.

**New Files (if needed):**
- None.

**Implementation Steps:**
1. Spec updates first.
2. Reducer slice `state.net.lobby.muted: Record<peerId, MuteEntry>`
   added.
3. `ChatPanel` filters incoming on `muted[peerId]`.
4. Persistent variant gated on Plan 24 readiness flag.

**Dependencies:**
- Plan 18 (stable peer identity for persistent variant; session
  variant works today).

**Complexity:** M

---

#### Issue: No trust-model disclosure for P2P chat

**Source:** Q347 (❌); Improvements bullet 6; cross-reference
audit 23.

**Problem:**
Players are not warned that chat is end-to-end peer with no server
moderation. Audit 23 has no chat-trust disclosure question.

**Impact:**
- Users assume server moderation exists; report-flow expectations
  are misaligned with reality.
- Compliance posture: most app-store policies require an in-product
  notice for P2P chat without backend moderation.

**Solution:**
Add a one-line, dismissable banner above the chat input on first
lobby session: `ui.network-lobby.chat.trust-banner` →
*"Chat is peer-to-peer. There is no server moderation. Use Mute or
Block to silence a player; use Report to save an evidence bundle."*

Dismissal persists in `localStorage` under
`hr.ui.lobby.chat.trust-banner.dismissed = true`.

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md)
  — add `ChatTrustBanner` component.
- [docs/architecture/wiki/screens/64-network-lobby/mockup.html](../../architecture/wiki/screens/64-network-lobby/mockup.html)
  — render banner.
- Localization: register key in
  [content-schema/examples/localization/](../../../content-schema/examples/localization/)
  fallback example.

**Implementation Steps:**
1. Banner component + dismiss persistence.
2. A11y: announce on first show; focus-trap not required.

**Dependencies:**
- None.

**Complexity:** S

---

#### Issue: No chat-export / "save evidence" affordance

**Source:** Q348 (❌); Improvements bullet 4 (partial).

**Problem:**
There is no `EXPORT_CHAT` / `COPY_CHAT_LOG` command, no clipboard
handler, no JSON dump button.

**Impact:**
- A user has no way to capture chat evidence for an offline report
  to a community admin or to the developer email.
- This blocks the "no backend yet, route to local file" report
  intake (see report flow below).

**Solution:**
Add `EXPORT_CHAT_LOG { format: 'json' | 'txt' }` command, surfaced as
a "Save chat log" item in the chat panel's overflow menu. Output is
a single file download (`heroes-reforged-chat-<sessionId>-<ISO>.json`)
containing schema-validated `chat-message.schema.json` entries. No
network call.

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md)
  — chat panel overflow menu.
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md).
- [docs/architecture/screen-command-coverage.json](../../architecture/screen-command-coverage.json)
  — register command.

**Implementation Steps:**
1. Command + handler that serializes `state.net.lobby.chat`.
2. Trigger browser download via blob URL; revoke immediately.
3. Test: roundtrip parse passes schema validation.

**Dependencies:**
- Chat-message schema.

**Complexity:** S

---

### Interactions

#### Issue: No `REPORT_PEER` command

**Source:** Q349 (❌), Q350 (❌); Missing-Logic bullet 4; Improvements
bullet 4.

**Problem:**
The only "report" surface in the spec is the desync diagnostic in
[`tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md`](../../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)
and
[`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md).
That captures engine state, not peer behavior.

**Impact:**
- No moderation surface at all.
- Compliance gap.

**Solution:**
Add `REPORT_PEER { peerId, reasonCode, freeText? }` triggered from the
roster row overflow menu. Reason codes (closed enum, locale-bound
labels):

- `harassment`
- `slurs-or-hate`
- `cheating-suspected`
- `unsafe-ai-content`  ← routed to UGC intake (audit 21/Q393, Plan 21)
- `other`

`freeText` is optional, capped at 500 chars, NFKC-normalized,
plain-text only.

The command produces an in-memory **report bundle** (next issue) and
opens a "Save report" dialog. There is no network upload in MVP. The
dialog explains: *"This will save a report file to your device. To
file the report, attach the file to an email to support@…  (route is
TBD; until then the file is for your records and any future appeal)."*

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md)
  — add Report flow.
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md)
  — `ReportPeerDialog`.
- [docs/architecture/screen-command-coverage.json](../../architecture/screen-command-coverage.json)
  — register `REPORT_PEER`.

**Implementation Steps:**
1. Command + dialog component.
2. Reason-code locale entries.
3. Wire `unsafe-ai-content` to a separate output filename prefix so
   the future Plan 21 intake can branch on filename without re-parsing.

**Dependencies:**
- Report-bundle schema (next issue).

**Complexity:** M

---

### Data Contracts

#### Issue: Report bundle has no defined evidence shape

**Source:** Q350 (❌), Q355 (❌); Improvements bullet 4.

**Problem:**
The desync report defines its own evidence schema (turn number,
hashes, last-10 commands). No equivalent exists for behavior reports.

**Impact:**
- A report bundle with no schema cannot be parsed by any future
  triage backend.
- A future spec change to add device fingerprinting cannot be done
  additively without a baseline schema.

**Solution:**
Create
[`content-schema/schemas/report-bundle.schema.json`](../../../content-schema/schemas/report-bundle.schema.json):

```jsonc
{
  "$id": "https://heroes-reforged/report-bundle.schema.json",
  "type": "object",
  "required": ["v", "kind", "createdAt", "reporter", "subject", "evidence"],
  "additionalProperties": false,
  "properties": {
    "v": { "const": 1 },
    "kind": { "enum": ["peer-behavior", "ai-ugc"] },
    "createdAt": { "type": "string", "format": "date-time" },
    "reporter": {
      "type": "object",
      "required": ["peerId"],
      "properties": {
        "peerId": { "type": "string", "pattern": "^peer:[a-z0-9-]{8,64}$" },
        "displayName": { "type": "string", "maxLength": 64 }
      }
    },
    "subject": {
      "type": "object",
      "required": ["peerId", "reasonCode"],
      "properties": {
        "peerId": { "type": "string", "pattern": "^peer:[a-z0-9-]{8,64}$" },
        "displayName": { "type": "string", "maxLength": 64 },
        "reasonCode": { "enum": ["harassment","slurs-or-hate","cheating-suspected","unsafe-ai-content","other"] },
        "freeText": { "type": "string", "maxLength": 500 }
      }
    },
    "evidence": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "chatExcerpt": {
          "type": "array",
          "maxItems": 50,
          "items": { "$ref": "chat-message.schema.json" }
        },
        "saveHash": { "type": "string", "pattern": "^[A-Fa-f0-9]{64}$" },
        "scenarioId": { "type": "string" },
        "rulesetHash": { "type": "string" },
        "sessionStartedAt": { "type": "string", "format": "date-time" }
      }
    },
    "deviceCapture": {
      "type": "object",
      "description": "Reserved. v1 emits an empty object. No IP, no UA, no fingerprint until a backend exists and the user is warned (Plan 22).",
      "additionalProperties": false
    }
  }
}
```

Notes:
- `chatExcerpt` includes the **last 50 messages from the subject**
  before the report click; never the reporter's outgoing messages
  unless they directly precede a subject message (context window of
  ±2 messages around each subject message), to limit reporter
  self-incrimination data.
- `saveHash` is included so a future backend can correlate to a
  cheating claim deterministically.
- `deviceCapture` is reserved-empty in v1; activating any field there
  requires a Plan 22 retention policy update **and** an explicit
  user-consent step.

**Files to Update:**
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md).
- [content-schema/README.md](../../../content-schema/README.md).

**New Files (if needed):**
- [content-schema/schemas/report-bundle.schema.json](../../../content-schema/schemas/report-bundle.schema.json).
- [content-schema/examples/report-bundle/canonical-peer-behavior.json](../../../content-schema/examples/report-bundle/canonical-peer-behavior.json).
- [content-schema/examples/report-bundle/canonical-ai-ugc.json](../../../content-schema/examples/report-bundle/canonical-ai-ugc.json).

**Implementation Steps:**
1. Author schema + 2 examples.
2. Wire into validate pipeline.
3. Add unit test: bundle generated from a synthetic chat log
   round-trips through schema validation.

**Dependencies:**
- Chat-message schema.

**Complexity:** M

---

#### Issue: Chat history not covered by "forget me" flow

**Source:** Q345 (⚠), Q346 (❌); cross-reference audit 21/Q406,
audit 22.

**Problem:**
`state.net.lobby.chat` likely clears on `LEAVE_NETWORK_LOBBY` but no
durable contract documents this. If a user invokes "forget me"
(audit 21/Q406 owned by Plan 21), it must also wipe any persisted
chat history (today: none; tomorrow: report bundles saved to disk
via the `EXPORT_CHAT_LOG` flow above).

**Impact:**
- Privacy regression risk: report bundles saved to disk persist
  past the user's intended forgetting.
- Audit 21/Q406 stays open.

**Solution:**
Document in `chat-safety.md` § "Retention":

- In-memory: `state.net.lobby.chat` cleared on `LEAVE_NETWORK_LOBBY`
  and on `SESSION_ENDED`.
- On disk: only files explicitly saved via `EXPORT_CHAT_LOG` or
  `REPORT_PEER` exist; the user owns those files. The "forget me"
  flow MUST surface a notice that locally-saved exports are not
  automatically deleted and provide a one-click "Open downloads
  folder" affordance.
- No server retention exists in MVP.

**Files to Update:**
- [docs/architecture/chat-safety.md](../../architecture/chat-safety.md)
  — § "Retention".
- Plan 21's task / plan file (referenced, not edited here) — note
  the chat-history hook.

**Implementation Steps:**
1. Add reducer cleanup on `LEAVE_NETWORK_LOBBY` and verify with test.
2. Document "forget me" hook — actual implementation owned by Plan 21.

**Dependencies:**
- Plan 21.

**Complexity:** S

---

### Schemas

Already covered above:

- [content-schema/schemas/chat-message.schema.json](../../../content-schema/schemas/chat-message.schema.json) — Critical fix.
- [content-schema/schemas/report-bundle.schema.json](../../../content-schema/schemas/report-bundle.schema.json) — Data Contracts.

Schema-matrix update:

- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md)
  gets two rows; canonical owning task is **task 09** for chat-message
  and **task 11** for report-bundle (created below).

---

### Architecture

#### Issue: No single "chat safety" doc

**Source:** All ❌ items collectively; Improvements bullets 1–9.

**Problem:**
Chat safety rules are spread (or absent) across multiple files; no
single source of truth exists. Per the project Contribution Rule
("prefer one canonical explanation over repeated prose"), this needs
one home.

**Solution:**
Create
[`docs/architecture/chat-safety.md`](../../architecture/chat-safety.md).
Sections:

1. Scope (lobby chat only; in-game chat reserved).
2. Channel reservation (DataChannel labels, ids, properties).
3. Envelope schema (link to `chat-message.schema.json`).
4. Normalization (NFKC, code-point strip list).
5. Sanitization (plain-text only; no markdown; URL policy).
6. Rate limit (token bucket constants).
7. Mute / Block (commands, scope, persistence rules).
8. Report (command, bundle schema, intake).
9. Retention (in-memory only in MVP; "forget me" hook).
10. Trust-model disclosure (banner copy + dismiss persistence).
11. Reserved fields for Plan 24 (signing) and Plan 21 (UGC intake
    routing).

**Files to Update:**
- [docs/architecture/README.md](../../architecture/README.md) — add link.
- [CLAUDE.md](../../../CLAUDE.md) — append `chat-safety.md` to the
  "Read first" list **only if** the maintainer agrees; otherwise leave
  as a sibling reference (default: no edit, since CLAUDE.md is curated).
- [docs/architecture/wiki/README.md](../../architecture/wiki/README.md)
  — UI evolution policy: cite `chat-safety.md` for chat-related
  screen edits.

**New Files (if needed):**
- [docs/architecture/chat-safety.md](../../architecture/chat-safety.md).

**Complexity:** M

---

#### Issue: `senderId` is not cryptographically bound

**Source:** Q334 (❌); Risks bullet "Identity spoofing".

**Problem:**
Chat envelope `senderId` is whatever the sending peer claims it to be.
WebRTC DTLS protects the wire but not the application-level claim.

**Impact:**
- A peer can forge messages from another player or "host".

**Solution (additive-first):**
- v1: receive-side validator **rewrites** `senderId` to the transport
  peer's canonical id at ingress. The field becomes effectively
  authoritative because peers cannot inject envelopes for other
  transport peers.
- v2 (Plan 24): `sig` field becomes mandatory and signed under the
  long-lived peer key. Schema's `sig` is already reserved.

**Files to Update:**
- [docs/architecture/chat-safety.md](../../architecture/chat-safety.md)
  § "Envelope".
- [docs/archive/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](../readiness-audit/24-tls-enforcement-and-webrtc-authentication.md)
  is **not** edited; Plan 24 references this contract.

**Complexity:** S

---

### Tasks

Three new task files under
[`tasks/phase-3/01-multiplayer/`](../../../tasks/phase-3/01-multiplayer/),
plus edits to two existing tasks.

#### New: `09-chat-envelope-channel-and-rate-limit.md`

- **Owns:** `chat-message.schema.json`, `chat-safety.md`,
  `state.net.lobby.chat` validator, `normalizeChatText`,
  per-peer token bucket.
- **Depends on:** task 02 (DataChannel split additive contract).
- **Verify commands:** `npm run validate`, schema unit tests,
  rate-limit tests.

#### New: `10-mute-block-and-trust-banner.md`

- **Owns:** `MUTE_PEER`, `BLOCK_PEER`, `state.net.lobby.muted`,
  `state.net.lobby.blocked`, `ChatTrustBanner`.
- **Depends on:** task 09; Plan 18 for `peerId` shape; persistent
  variant gated on Plan 24.

#### New: `11-report-bundle-and-export.md`

- **Owns:** `REPORT_PEER`, `EXPORT_CHAT_LOG`, `ReportPeerDialog`,
  `report-bundle.schema.json`.
- **Depends on:** task 09 (envelope), task 10 (peer roster menu host).

#### Edits: `02-webrtc-peer-connection-plus-datachannel-setup.md`

- Add `Owned Paths (shared)` for the `chat` DataChannel reservation.
- Acceptance test: two channels, no cross-traffic.

#### Edits: `08-multiplayer-ui-lobby-invite-link-in-game-status.md`

- Add bindings for `MUTE_PEER`, `BLOCK_PEER`, `REPORT_PEER`,
  `EXPORT_CHAT_LOG` to the lobby-UI surface.

---

## 4. Suggested Task Breakdown

- [ ] **T-19.1** Reserve a second WebRTC DataChannel (`chat`, id=2) and
      enforce no cross-channel traffic. *Edits task 02.*
- [ ] **T-19.2** Author
      [`content-schema/schemas/chat-message.schema.json`](../../../content-schema/schemas/chat-message.schema.json)
      + canonical example + oversize negative example; register in
      schema-matrix.
- [ ] **T-19.3** Author
      [`docs/architecture/chat-safety.md`](../../architecture/chat-safety.md)
      with all 11 sections.
- [ ] **T-19.4** Implement `normalizeChatText` (NFKC + control/bidi
      strip + length cap) with unit tests.
- [ ] **T-19.5** Implement send-side and receive-side validators on
      `state.net.lobby.chat`; receive-side rewrites `senderId` to
      transport peer.
- [ ] **T-19.6** Implement per-peer token bucket (5 cap, 1/s refill,
      10 s soft-mute, 3-strikes session-mute).
- [ ] **T-19.7** Add plain-text-only `ChatPanel` rendering contract
      and CI rule banning `dangerouslySetInnerHTML` in lobby UI.
- [ ] **T-19.8** Add `ChatTrustBanner` component + dismiss persistence.
- [ ] **T-19.9** Add `MUTE_PEER` + `BLOCK_PEER` commands, reducer
      slices, roster overflow menu, and `MutedBadge`.
- [ ] **T-19.10** Author
      [`content-schema/schemas/report-bundle.schema.json`](../../../content-schema/schemas/report-bundle.schema.json)
      + 2 canonical examples; register in schema-matrix.
- [ ] **T-19.11** Add `REPORT_PEER` command + `ReportPeerDialog`;
      generate bundle in-memory; trigger local download via blob URL.
- [ ] **T-19.12** Add `EXPORT_CHAT_LOG` command and "Save chat log"
      menu entry.
- [ ] **T-19.13** Update
      [docs/architecture/screen-command-coverage.json](../../architecture/screen-command-coverage.json)
      to register `MUTE_PEER`, `BLOCK_PEER`, `REPORT_PEER`,
      `EXPORT_CHAT_LOG`.
- [ ] **T-19.14** Update
      [64-network-lobby](../../architecture/wiki/screens/64-network-lobby/)
      package: spec, interactions, data-contracts, mockup, architecture.
- [ ] **T-19.15** Add reducer cleanup on `LEAVE_NETWORK_LOBBY` and
      `SESSION_ENDED`; document "forget me" hook (Plan 21 dependency).
- [ ] **T-19.16** Cross-reference Plan 24 in `chat-safety.md` for
      future `sig` activation; cross-reference Plan 29 for rate-limit
      registry.
- [ ] **T-19.17** Run `npm run validate:tasks` + `npm run validate` and
      regenerate the task registry.

---

## 5. Execution Order

Dependencies determine the ordering. Steps in the same row are
parallelizable.

1. **T-19.3** (chat-safety.md skeleton) — establishes the contract
   surface other tasks reference.
2. **T-19.2** + **T-19.1** in parallel — schema and channel
   reservation are independent.
3. **T-19.4** + **T-19.5** in parallel — normalization and validator
   plumbing.
4. **T-19.6** + **T-19.7** in parallel — rate limit and rendering
   contract.
5. **T-19.8** — trust banner.
6. **T-19.9** — mute/block (depends on roster surface from earlier
   lobby package edits).
7. **T-19.10** — report-bundle schema.
8. **T-19.11** + **T-19.12** in parallel — report dialog and
   export-chat command.
9. **T-19.13** + **T-19.14** + **T-19.15** in parallel — coverage
   JSON, screen-package edits, retention cleanup.
10. **T-19.16** — cross-plan references (Plan 24, 21, 22, 29).
11. **T-19.17** — validation gate; only flips tasks to `done` on
    success.

---

## 6. Risks if Not Implemented

| Risk | Source Q | Severity | Why it bites |
| --- | --- | --- | --- |
| DoS via oversized chat on shared command channel | Q335 | High | A single peer can stall lockstep input. |
| XSS through `ChatPanel` if a future markdown lib lands | Q337–338 | High | Implicit JSX escaping is not a contract. |
| Identity spoofing of `senderId` | Q334 | High | Compromises every other downstream "who said what" decision (mute, block, report). |
| Harassment with no recourse but to forfeit the match | Q340–341, Q349 | High | Compliance gap, retention risk. |
| Homoglyph / RTL / zero-width abuse | Q343 | Medium | Defeats any future filter trivially. |
| Report-flooding as harassment | Q354 | Medium | Even a future report system is unsafe without per-reporter caps. |
| App-store rejection | summary | High | Most stores require functional report + block for any P2P chat. |
| EU DSA exposure | summary | Medium | "Notice and action" requirements assume an intake exists. |
| Privacy regression on local report exports | Q345–346, Q406 | Medium | Local files outlive "forget me" if the hook is missing. |
| No way to evidence harassment to community admins | Q348, Q350 | Medium | Even without a backend, users need a savable bundle. |

---

## 7. AI Implementation Readiness

**Score: 8 / 10** (after this plan lands).

**Reasoning:**

- **+** Every ❌ UNKNOWN in the audit is converted to either a
  schema (`chat-message`, `report-bundle`), a constant block in
  `chat-safety.md` (rate limit, normalization, channel reservation),
  a command registered in
  [screen-command-coverage.json](../../architecture/screen-command-coverage.json),
  or a UI binding in the
  [64-network-lobby](../../architecture/wiki/screens/64-network-lobby/)
  package — all forms an autonomous implementer can consume.
- **+** Three new task files (09, 10, 11) carve the work into
  scopes small enough for `npm run tasks:start -- <id>` /
  `npm run tasks:done -- <id>` cycles.
- **+** Dependencies on sibling plans (Plan 18 for peer identity,
  Plan 24 for signing, Plan 21 for "forget me", Plan 22 for retention,
  Plan 29 for rate-limit registry) are made explicit and additive,
  so each piece can land independently.
- **−2** points withheld because:
  - There is **no moderation backend** in MVP — the report flow
    intentionally produces a local bundle only. A real triage service,
    appeals workflow, and repeat-offender tracking (Q356, Q359) remain
    deferred to **M7 polish** with a separate RFC.
  - Persistent mute/block depends on stable peer identity from
    Plan 24; until that lands, only session-scoped variants ship.

The strongest remaining foothold for an AI agent picking this work
up is: start with **T-19.3** (`chat-safety.md`), then proceed through
the execution order above. Every later step pulls its constants from
that one document.
