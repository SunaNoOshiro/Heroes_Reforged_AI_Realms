# 19. CHAT SAFETY & USER REPORTING

> **Scope note.** Only **lobby chat** is specified anywhere in the repo (`state.net.lobby.chat` + `SEND_LOBBY_CHAT` in screen `64-network-lobby`). **In-game chat does not exist** as a screen, command, state slice, or transport reservation (see audit 07, Q147). No moderation, mute, block, report, profanity filter, sanitization policy, rate-limit, or appeals flow is documented anywhere. Almost every question in this audit therefore resolves to ❌ UNKNOWN by design — the planning phase has not yet specified a chat-safety or user-reporting model.

---

### Q: 333. Is there an in-game chat channel, and over what transport (WebRTC DataChannel, signaling, neither)?

**Status:** ⚠ Partial

**Answer:**
**No in-game chat exists** — only **lobby chat**, scoped to screen `64-network-lobby`. Lobby chat sends `SEND_LOBBY_CHAT` and writes to `state.net.lobby.chat`. The transport is **not separately reserved**: the multiplayer architecture only specifies a single deterministic command DataChannel (input-only lockstep, Task `phase-3/01-multiplayer/02`). Audit 07/Q147 explicitly notes that "in-game chat is not specified at all" and warns that lobby chat currently rides the same DataChannel as commands, with separation by *namespace* only.

**Evidence:**
- `docs/architecture/wiki/screens/64-network-lobby/spec.md` (`ChatPanel`, `state.net.lobby.chat`)
- `docs/architecture/wiki/screens/64-network-lobby/interactions.md` (`Send chat → SEND_LOBBY_CHAT`)
- `docs/readiness-audit/07-multiplayer.md` Q147 ("in-game chat is not specified at all"; mitigation note: "Add an in-game chat channel — separate DataChannel, not on commands path")
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md` (no chat channel reservation)

---

### Q: 334. Is chat content signed, encrypted, or sent in clear over the established peer connection?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. WebRTC DataChannel traffic is DTLS-encrypted on the wire by default, but **no application-level signing, MAC, or sender-attribution scheme** is documented for chat payloads. There is no chat envelope schema in `content-schema/` and no integrity field on `state.net.lobby.chat` entries. A peer can spoof the `senderId` of a chat message because the messages are not cryptographically bound to a peer key.

**Evidence:**
- No chat schema under `content-schema/`
- `docs/architecture/wiki/screens/64-network-lobby/data-contracts.md` (no signature/integrity fields documented for `chatMessages`)
- `docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md` (peer-key/identity binding marked as gaps)

---

### Q: 335. Can a peer send oversized chat payloads to exhaust opponent memory or trigger UI freezes?

**Status:** ❌ UNKNOWN

**Answer:**
**Yes, in principle** — no length cap, frame cap, or backpressure policy is documented for `SEND_LOBBY_CHAT`. The DataChannel is also shared with command traffic (Q333), so an oversized chat payload can stall lockstep input flow. There is no documented chunking or quota.

**Evidence:**
- `docs/architecture/wiki/screens/64-network-lobby/spec.md` (no message-size limit)
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md` (no payload caps)
- `docs/readiness-audit/29-rate-limiting-and-secret-management.md` Q602 (chat rate-limit policy unfilled)

---

### Q: 336. Is chat input length-capped client-side AND validated on receive to prevent oversized message exploits?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. Neither a client-side `maxLength` nor a receive-side validator is defined. Validation strategy in general is mentioned only for content packs (`src/content-schema/`), not for transient chat messages.

**Evidence:**
- No validator referenced in `docs/architecture/wiki/screens/64-network-lobby/`
- `docs/architecture/schema-matrix.md` lists no chat-message schema

---

### Q: 337. Are chat messages escaped before rendering to prevent XSS through markdown, HTML, or rich-text parsing?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. The `ChatPanel` component is named in the screen package but no rendering-safety contract (text-only, escaped HTML, sanitized markdown) is documented. Because the runtime UI is React (per `CLAUDE.md` engineering guide), default text-binding via JSX would escape strings — but this is implicit, not contractually required, and no explicit policy exists for if/when rich text is ever introduced.

**Evidence:**
- `docs/architecture/wiki/screens/64-network-lobby/spec.md` (`ChatPanel` listed; rendering policy absent)
- No "sanitize / escape" rule in `docs/architecture/`
- `CLAUDE.md` (React stack implies default JSX escaping, but not formalized for chat)

---

### Q: 338. Can chat embed clickable links, images, or embeds, and what is the sanitization policy?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No link auto-linker, image embed, or oEmbed pipeline is documented. No allow/deny scheme list (`https:` only, no `javascript:` / `data:`), no domain allowlist, and no SSRF posture is defined.

**Evidence:**
- No reference to "link", "embed", "image", "url" in `docs/architecture/wiki/screens/64-network-lobby/`

---

### Q: 339. Is there a profanity / hate-speech filter, and is it client-side, server-side, or both?

**Status:** ❌ UNKNOWN

**Answer:**
**No filter is documented.** The repo has no wordlist, classifier, or moderation hook for chat. There is also no signaling-server moderation surface — the signaling server is documented only as a thin lobby/relay (Task `phase-3/01-multiplayer/01`).

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (no moderation responsibilities listed)
- No `moderation/`, `filters/`, or wordlist resources in `resources/` or `services/`

---

### Q: 340. Can a player mute, block, or ignore another player at the chat layer without leaving the match?

**Status:** ❌ UNKNOWN

**Answer:**
No. There is no `MUTE_PEER`, `BLOCK_PEER`, or `IGNORE_PEER` command in any screen package, no per-peer mute state slice, and no UI surface for it. The only lobby commands are `SET_LOBBY_READY`, `SEND_LOBBY_CHAT`, `REQUEST_LOBBY_SLOT_CHANGE`, `LAUNCH_NETWORK_GAME`, `LEAVE_NETWORK_LOBBY` (per audit 18, Q320).

**Evidence:**
- `docs/readiness-audit/18-room-codes-and-lobby-discovery.md` Q320 (lobby command list — no mute/block)
- `docs/architecture/screen-command-coverage.json` (no `*MUTE*` / `*BLOCK*` commands)

---

### Q: 341. Does a mute persist across matches, or only for the current session?

**Status:** ❌ UNKNOWN

**Answer:**
N/A — mute does not exist (Q340). Persistence policy is undefined because the feature is undefined. There is also no stable peer identity to anchor a persistent mute to (audit 18 Q314: identity == "whoever holds the room code").

**Evidence:**
- `docs/readiness-audit/18-room-codes-and-lobby-discovery.md` Q314 (no peer identity)

---

### Q: 342. Is there a chat-flooding rate limit, and what is the per-peer cap?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. Audit 29 (rate-limiting & secret management) explicitly lists this as an open question (Q602: "Are chat messages rate-limited per peer, with exponential mute on sustained violation?"). No token-bucket, sliding window, or per-peer counter is documented.

**Evidence:**
- `docs/readiness-audit/29-rate-limiting-and-secret-management.md` Q602
- No rate-limit middleware listed in `tasks/phase-3/01-multiplayer/`

---

### Q: 343. Is unicode normalized (NFKC) before filtering to prevent obfuscated slurs via combining marks?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No unicode normalization policy is defined for chat or for display names (audit 18 Q324 already flagged the same gap for player display names: zero-width characters, RTL overrides, and homoglyphs are unhandled).

**Evidence:**
- `docs/readiness-audit/18-room-codes-and-lobby-discovery.md` Q324
- No reference to NFC/NFKC/normalization in `docs/architecture/`

---

### Q: 344. Are private/whisper channels supported, and are they hidden from spectators and replays?

**Status:** ❌ UNKNOWN

**Answer:**
No whispers are specified. Spectator mode itself is not documented as part of the MVP. Replays explicitly **exclude** transient UI state including chat-typing buffers (audit 07 Q147), but whether chat content is recorded into the replay artifact is not stated. The conservative reading is: chat is not in the replay because it is not in the deterministic command stream.

**Evidence:**
- `docs/readiness-audit/07-multiplayer.md` Q147 ("transient UI state … chat-typing buffers" excluded from save/replay)
- No `WHISPER_*` or `PRIVATE_CHAT_*` command in `docs/architecture/screen-command-coverage.json`

---

### Q: 345. Are chat logs retained anywhere (client-side history, replay file, server) for moderation purposes?

**Status:** ⚠ Partial

**Answer:**
- **Client-side history:** Yes, in `state.net.lobby.chat`, but lifetime is undocumented — likely cleared on `LEAVE_NETWORK_LOBBY`. No durable disk persistence is specified.
- **Replay file:** No (chat is not in the deterministic command log; see Q344).
- **Server (signaling):** Not specified. The signaling-server task only describes lobby/SDP relay; no chat-log retention is mentioned. There is also no documented backend for moderation review.

**Evidence:**
- `docs/architecture/wiki/screens/64-network-lobby/data-contracts.md` (chat lives in transient `state.net.lobby.chat`)
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (no chat persistence)
- `docs/readiness-audit/21-user-generated-content-and-personal-data.md` Q406 ("Is multiplayer chat history persisted locally, and is it included in the 'forget me' flow?" — open)

---

### Q: 346. If logs are retained, who can access them, for how long, and under what data-retention policy?

**Status:** ❌ UNKNOWN

**Answer:**
No retention policy exists. There is no documented role-based access, retention TTL, deletion-on-request, or audit log governing chat data.

**Evidence:**
- `docs/readiness-audit/22-privacy-retention-and-error-leaks.md` (retention policy gaps)
- No `data-retention.md` or DPIA artifact in `docs/`

---

### Q: 347. Is the local user warned that chat is end-to-end-peer (no server moderation) so they understand the trust model?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No consent/warning copy, modal, or onboarding step explains that chat is peer-to-peer with no server moderation. Audit 23 (unsafe-actions UX) does not list a chat-trust disclosure either.

**Evidence:**
- `docs/architecture/wiki/screens/64-network-lobby/spec.md` (no warning text in mockup)
- `docs/readiness-audit/23-unsafe-actions-ux-and-consent.md` (no chat-trust disclosure question)

---

### Q: 348. Can a player export a chat transcript for evidence in a report?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. There is no `EXPORT_CHAT` / `COPY_CHAT_LOG` command in any screen, no clipboard handler, no JSON dump, and no UI button.

**Evidence:**
- `docs/architecture/screen-command-coverage.json` (no chat-export command)

---

### Q: 349. Is there an in-game report flow for harassment, cheating, or unsafe content?

**Status:** ❌ UNKNOWN

**Answer:**
**No.** The only "report" surface in the entire spec is the **desync diagnostic** flow (`tasks/phase-3/01-multiplayer/04` and `05`), which produces a human-readable bug report for filing a determinism issue — explicitly not a moderation/harassment report. There is no `REPORT_PEER` command, no report UI, no support endpoint, and no triage queue.

**Evidence:**
- `tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md` (desync report only)
- `tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md` (`{ commandIndex, command, preMismatchHash, postMismatchHash }` — diagnostic, not moderation)
- `docs/readiness-audit/18-room-codes-and-lobby-discovery.md` Q332 ("No `BAN_PEER` or `REPORT_PEER` command in any screen package")

---

### Q: 350. What evidence does a report capture (chat snippet, replay, save hash, peer ID, timestamp)?

**Status:** ❌ UNKNOWN

**Answer:**
N/A — no harassment-report flow exists (Q349). For comparison, the desync report captures `turn number, both hashes, last 10 commands, command index, pre/post hashes` — purely engine state, no peer-behavioral evidence.

**Evidence:**
- `tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md` (desync evidence schema only)

---

### Q: 351. Where are reports sent (email endpoint, support service, GitHub issue, none), and is that endpoint authenticated and rate-limited?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No support endpoint, email gateway, or issue-tracker integration is documented for moderation reports. Audit 29 lists "crash report" rate-limiting (Q593, Q603) as open questions but never names a destination service.

**Evidence:**
- `docs/readiness-audit/29-rate-limiting-and-secret-management.md` Q593, Q603
- `services/` directory mentions only "AI gateway or signaling" (`CLAUDE.md`)

---

### Q: 352. Is the reporter's identity protected from the reported player?

**Status:** ❌ UNKNOWN

**Answer:**
N/A — report flow does not exist (Q349). With no flow, no identity-protection model is possible.

**Evidence:**
- See Q349

---

### Q: 353. Can a reported player retaliate by reading the report through any client-visible state?

**Status:** ❌ UNKNOWN

**Answer:**
N/A. No report state slice exists. If a future implementation places report drafts in shared `state.net.*` it would leak; currently undefined.

**Evidence:**
- See Q349

---

### Q: 354. Is there a maximum report rate per reporter to prevent report-flooding as a harassment vector?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. Audit 29 Q593 lists rate-limit policy generally but no per-reporter cap exists for moderation reports (which themselves are unspecified).

**Evidence:**
- `docs/readiness-audit/29-rate-limiting-and-secret-management.md` Q593

---

### Q: 355. Does the report flow capture device identifiers or IP, and is the user warned about that data collection?

**Status:** ❌ UNKNOWN

**Answer:**
N/A. No report flow exists. Note: WebRTC peer-connection establishment leaks IP via ICE candidates regardless of any report flow (a related concern raised in audit 24/25), but that is not a moderation-report capture.

**Evidence:**
- `docs/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md` (ICE/IP exposure)

---

### Q: 356. Is there an appeals process, and how is it surfaced in the UI?

**Status:** ❌ UNKNOWN

**Answer:**
No. With no report or moderation system, there is no appeals workflow, no support-ticket linkage, and no UI surface for it.

**Evidence:**
- No `APPEAL_*` command or screen package

---

### Q: 357. Can a user delete their own submitted reports, and what is the retention policy for unresolved reports?

**Status:** ❌ UNKNOWN

**Answer:**
N/A — report flow does not exist. Retention/deletion policy is undefined.

**Evidence:**
- `docs/readiness-audit/22-privacy-retention-and-error-leaks.md` (retention policy unfilled)

---

### Q: 358. Is there a separate flow for reporting unsafe AI-generated content vs. unsafe player behavior?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. Audit 21/Q393 already flagged this gap ("Is there a take-down / report flow specifically for unsafe UGC, and is it routed differently from player-behavior reports?"). The AI-generation pipeline (audit 14, `docs/architecture/ai-generation-pipeline.md`) describes content moderation at *generation* time, not a downstream user-report path.

**Evidence:**
- `docs/readiness-audit/21-user-generated-content-and-personal-data.md` Q393
- `docs/architecture/ai-generation-pipeline.md`

---

### Q: 359. Are repeat reporters or repeat reportees flagged for moderator triage?

**Status:** ❌ UNKNOWN

**Answer:**
No. There is no moderator role, no triage backend, no reputation/strike model, and no peer-identity persistence to anchor repeat-offender tracking to.

**Evidence:**
- `docs/readiness-audit/18-room-codes-and-lobby-discovery.md` Q314 (no stable peer identity)

---

### Q: 360. Is there a block-list that prevents matchmaking with previously reported players?

**Status:** ❌ UNKNOWN

**Answer:**
No. No block-list, no "do not match with" set, no `BLOCKLIST_*` schema. Lobbies are joined by **room code only** (audit 18) — there is also no public matchmaking that a block-list would gate. Audit 18 Q332 notes a banned/reported player can rejoin trivially because identity is per-session.

**Evidence:**
- `docs/readiness-audit/18-room-codes-and-lobby-discovery.md` Q314, Q332
- No matchmaking service in `services/`

---

## 🔍 Summary

### Missing Logic
- **In-game chat is entirely undefined** — only lobby chat exists, with no separate transport, no schema, no caps, no escaping policy.
- **No moderation primitives** — no profanity filter, no NFKC normalization, no XSS-escaping contract, no rich-text/link policy.
- **No mute / block / ignore / kick** — no commands, no state, no UI.
- **No user-report flow for harassment, cheating, or UGC** — only a *desync diagnostic* report exists, and that is for engine bugs, not behavior.
- **No moderation backend** — no support endpoint, no triage queue, no appeals process, no retention policy.
- **No persistent peer identity** — repeat-offender / block-list tracking is impossible because identity == "holder of the room code."
- **No chat-export, no chat retention policy, no "forget me" coverage** for chat history (audit 21/Q406 still open).
- **No trust-model disclosure** — players are not warned that chat is end-to-end peer with no server moderation.

### Risks
- **DoS via oversized chat** (Q335) — chat shares the deterministic command DataChannel; a flood can stall lockstep input flow, not just chat.
- **XSS through ChatPanel** (Q337–338) — implicit React JSX escaping is the only defense; any future markdown/embed feature without an explicit sanitization contract will reopen this hole.
- **Harassment with zero recourse** — without mute/block/report, victims must `LEAVE_NETWORK_LOBBY` and lose the match.
- **Identity spoofing** (Q334) — chat senderId is not cryptographically bound; a peer can forge messages from another player or from "host."
- **Homoglyph / RTL / zero-width abuse** (Q343) — no normalization, so slurs and impersonation pass.
- **Report-flooding as harassment** (Q354) — even a future report system has no rate-limit policy planned.
- **Compliance exposure** — App Store / Google Play / EU DSA require functional report + block flows for any P2P chat.

### Improvements
1. **Decide MVP scope.** If lobby chat ships, treat it as a player-safety surface and minimally specify: max length, rate limit, NFKC normalization, plain-text-only rendering, per-peer mute, and a "leave + report" affordance.
2. **Reserve a dedicated DataChannel** for chat (audit 07/Q147 mitigation) so it cannot stall command lockstep.
3. **Define a chat-message envelope** in `content-schema/` with `senderId`, `t`, `text` (capped), `nonce`, and an integrity/signature field — even if signing is deferred, the field reservation is additive-first.
4. **Add a `REPORT_PEER` command** with a clear evidence schema (peer ID, last-N chat, save hash, timestamp, reason code) and document its destination endpoint, retention TTL, and rate limit. Until a backend exists, route to a local "Save report bundle" with copy-to-clipboard so users can email it themselves.
5. **Add `MUTE_PEER` / `BLOCK_PEER`** with session-scoped state at minimum; persist to `localStorage` for cross-session block once stable peer identity (e.g., long-lived peer key) lands per audit 24.
6. **Add a trust-model disclosure** to the lobby (audit 23 alignment): one-line "chat is peer-to-peer; no server moderation."
7. **Separate UGC reporting** (audit 21/Q393) from behavior reporting; route AI-generated unsafe content to a distinct intake.
8. **Cover chat history in the "forget me" flow** (audit 21/Q406).
9. **Specify rate limits** (audit 29/Q602): e.g., 5 msgs / 5 s with exponential mute on sustained violation; per-IP rate limit on the report endpoint (audit 29/Q593).

### AI-Readiness
**Score: 1/10**
**Reason:** Of 28 questions, 25 are ❌ UNKNOWN, 2 ⚠ Partial, 1 ✔/⚠ on the lobby-chat existence fact. The chat-safety and reporting domain is essentially unspecified. An autonomous implementer cannot produce safe, compliant code from the current spec — there are no schemas, no commands, no UI bindings, no endpoints, no rate-limit constants, and no policies to derive code from. Before this audit area is AI-executable, a minimum viable safety spec must be authored (commands, message schema, rate limits, mute/block, report envelope, trust-model disclosure). The strongest available foothold is the existing lobby-chat plumbing in screen `64-network-lobby`, which gives a known integration point for adding caps, escaping, mute, and report.
