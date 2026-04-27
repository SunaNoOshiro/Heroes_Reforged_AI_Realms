# 18. ROOM CODES & LOBBY DISCOVERY

### Q: 301. How are room codes generated, and what alphabet, length, and entropy are used?

**Status:** ⚠ Partial

**Answer:**
The signaling task specifies a **6-character alphanumeric** room ID (length = 6). Neither the alphabet (digits-only? `[0-9A-Z]`? `[0-9A-Za-z]`?), the case policy, nor the generation algorithm is documented. Assuming a `[0-9A-Z]` (36-symbol) alphabet, the keyspace is `36⁶ ≈ 2.18 × 10⁹` (~31 bits of entropy); for `[0-9A-Za-z]` (62 symbols) it would be `~35.7` bits. With ambiguous-character exclusion, entropy drops further (see Q305). No collision-handling rule (regenerate vs. reject) is specified.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` ("Room ID: 6-character alphanumeric code")
- `tasks/task-registry.json` (mirrors the 6-character spec)
- No alphabet, RNG, or collision policy in `services/signaling/` (path not yet created)

---

### Q: 302. Are room codes produced by a cryptographically secure RNG (CSPRNG), or by a non-secure PRNG?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. The signaling task does not mandate `crypto.randomBytes` / `crypto.getRandomValues`. Because the determinism doctrine of the project explicitly **forbids** non-deterministic RNGs in gameplay paths and prefers seeded PCG32, an implementer could naïvely import a deterministic PRNG into the signaling server — which would be wrong here (predictable codes) but is not currently ruled out by the spec.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (silent on RNG)
- `docs/architecture/determinism.md` (rules apply to gameplay, not signaling — boundary not stated for signaling)

---

### Q: 303. What is the effective keyspace, and how long would a brute-force enumeration take at the signaling server's accepted request rate?

**Status:** ❌ UNKNOWN

**Answer:**
Effective keyspace is at most `~2.18 × 10⁹` (`36⁶`) — likely smaller after ambiguous-character exclusion. **No accepted request rate is defined**; the WebSocket signaling server has no documented per-connection or global throttle. With a typical commodity WebSocket able to sustain 1k–10k JOIN/sec, a single attacker could enumerate the whole 36⁶ space in `~60 hours – 25 days`, and the *active* subset (≤100 concurrent rooms per the size target) in **seconds**.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` ("up to 100 concurrent rooms"; no throttle specified)
- No rate-limit middleware in any phase-3 task

---

### Q: 304. Are room codes case-sensitive, and is the entropy estimate adjusted accordingly?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. "Alphanumeric" is ambiguous between `[0-9A-Z]` (case-insensitive, 36 symbols) and `[0-9A-Za-z]` (case-sensitive, 62 symbols). Because the code is shown in invite UI / QR codes / pasted by humans, case-insensitive matching is the conventional choice but is not documented. No entropy estimate appears in any spec.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`
- `docs/architecture/wiki/screens/62-multiplayer-setup/spec.md` (no case-sensitivity rule)

---

### Q: 305. Are visually ambiguous characters (`O/0`, `I/l/1`) excluded, and does that exclusion reduce entropy below acceptable bounds?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. If a Crockford-style filter is applied (drop `0,1,I,L,O,U`), the alphabet shrinks to **30 symbols** → `30⁶ ≈ 7.29 × 10⁸` (~29.4 bits). At 1k joins/sec, exhaustive enumeration of the active set still takes seconds; it is **not acceptable** as the sole access control without rate limiting (Q310–Q313).

**Evidence:**
- No exclusion rule documented in `tasks/phase-3/01-multiplayer/` or screen packages.

---

### Q: 306. Are room codes single-use, time-limited, or reusable across sessions?

**Status:** ⚠ Partial

**Answer:**
Codes are **room-scoped, in-memory only**: the signaling server keeps a `room → peer` mapping and "clears [it] when room is empty." That implies the code becomes invalid the moment all peers leave, but the spec does **not** define:
- Whether the same code can be re-issued to a future, unrelated room.
- Whether codes have an upper TTL while occupied.
- Whether a code persists across server restarts (it does not — server is stateless).
There is no rule against re-binding a freed code to a new host.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` ("only room → peer mapping; cleared when room is empty")

---

### Q: 307. When a host disconnects, is the code invalidated immediately, or can a stale code re-bind to a new host?

**Status:** ⚠ Partial

**Answer:**
**Host disconnect ≠ room destruction.** Host migration (Task 7) elects a new host within ~8 s using the existing peer set; the signaling server is then "updated with the new host's peer ID" — so the code remains valid and bound to the new host. If **all** peers disconnect, the room mapping is cleared. There is no documented rule preventing the now-free code from being re-issued to an unrelated future host.

**Evidence:**
- `tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`

---

### Q: 308. Can a malicious peer claim an unused room code in advance to squat or impersonate a future host?

**Status:** ❌ UNKNOWN

**Answer:**
Not addressed. Because the signaling server has no authentication and `CREATE_ROOM` does not require any token, an attacker can issue many `CREATE_ROOM` requests (subject to memory limits but no documented rate limit) to **squat codes**. Whether the server allocates random codes or accepts client-requested codes is not specified — if random, squatting a *specific* future code requires brute-luck; if client-chosen, squatting is trivial.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (no auth on `CREATE_ROOM`)

---

### Q: 309. Are expired or completed-game room codes purged from the signaling server's lookup table?

**Status:** ⚠ Partial

**Answer:**
Yes, but only on the implicit "all peers gone" condition: "cleared when room is empty." There is **no explicit TTL**, no idle-timeout, no completed-game purge hook (the signaling server is unaware of game state — it only routes SDP/ICE), and no scheduled sweep for orphaned rooms.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`

---

### Q: 310. Is there per-IP rate limiting on join attempts to defeat enumeration of active codes?

**Status:** ❌ UNKNOWN

**Answer:**
No rate limiting of any kind is documented for the signaling server (per-IP, per-code, or global). The only stated limit is "up to 100 concurrent rooms" — which constrains memory, not request rate.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`

---

### Q: 311. Is there per-code rate limiting on failed joins to detect targeted brute force against a known code?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (no per-code throttle)

---

### Q: 312. Is there a global cap on concurrent failed joins to prevent distributed enumeration?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`

---

### Q: 313. Are failed join attempts logged with enough fidelity to detect enumeration patterns without storing PII?

**Status:** ❌ UNKNOWN

**Answer:**
No logging policy is defined for the signaling server. There is no stated stance on whether request logs are kept, what fields they contain, retention, or PII redaction (IP, User-Agent, attempted code).

**Evidence:**
- No logging contract in `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`
- No reference in `docs/architecture/`

---

### Q: 314. Can a third party guess a room code and inject themselves as a peer before the legitimate guest connects?

**Status:** ⚠ Partial (implicit yes — design weakness)

**Answer:**
**Yes, by design omission.** With no authentication beyond presenting the code (Q302–Q303 entropy is enumerable, Q310–Q312 rate limits are absent, Q318 host approval is not specified), the first peer to present a valid `JOIN_ROOM` for a code is accepted into WebRTC negotiation. The architecture acknowledges this in `docs/readiness-audit/07-multiplayer.md` ("Room-code only access control … No authentication = trivial griefing.").

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`
- `docs/readiness-audit/07-multiplayer.md` Risks section
- `docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md` Q475 (acknowledges the gap)

---

### Q: 315. Is the room code transmitted out-of-band (copy/paste) only, or also embedded in URLs, QR codes, or deep links?

**Status:** ✔ Defined

**Answer:**
**Both.** Task 8 mandates the lobby UI offer "invite link (copy button) + QR code." So the code is conveyed via:
- Copy/paste of the bare code,
- A copyable invite **URL** (link),
- A scannable **QR code** encoding the URL.
No deep-link / mobile URI scheme is mentioned.

**Evidence:**
- `tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md` ("Create room → show invite link (copy button) + QR code")

---

### Q: 316. If embedded in URLs, are referrer headers, browser history, and clipboard managers considered as leak vectors?

**Status:** ❌ UNKNOWN

**Answer:**
No mitigation policy is documented. The invite-URL spec does not address:
- Whether the code is in the path (`/room/ABC123`), query string (`?code=ABC123`), or **fragment** (`#code=ABC123` — the only form not sent in `Referer` headers).
- Whether `Referrer-Policy: no-referrer` headers are set on the lobby page.
- Whether codes are scrubbed from browser history once consumed.
- Whether clipboard managers / OS-level clipboard sync are warned about.

**Evidence:**
- `tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md` (no URL-shape rule)

---

### Q: 317. Is the host notified when an unexpected peer attempts to join their code?

**Status:** ❌ UNKNOWN

**Answer:**
The signaling server's `PEER_CONNECTED` message implies the host learns when a peer joins, but there is no spec for **failed** joins surfacing to the host, no "someone tried to join your room with a wrong nickname" notification, no UX for prospective-peer alerts.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (`PEER_CONNECTED` only on success)

---

### Q: 318. Can the host approve/reject incoming peers before WebRTC negotiation completes, or is acceptance automatic on first valid join?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified — defaults to **automatic acceptance** on first valid `JOIN_ROOM`. No "approve peer" interaction or command exists in the network-lobby screen package; the only lobby-management commands are `SET_LOBBY_READY`, `SEND_LOBBY_CHAT`, `REQUEST_LOBBY_SLOT_CHANGE`, `LAUNCH_NETWORK_GAME`, `LEAVE_NETWORK_LOBBY`. There is no `APPROVE_PEER` or `KICK_PEER`.

**Evidence:**
- `docs/architecture/wiki/screens/64-network-lobby/interactions.md`
- `docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`

---

### Q: 319. Is there a maximum room lifetime, after which the code is invalidated even if unused?

**Status:** ❌ UNKNOWN

**Answer:**
No max-lifetime / TTL is documented for rooms. The only auto-cleanup trigger is "all peers gone" (Q309).

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`

---

### Q: 320. How is a "kick" enforced — does the kicked peer lose the code, the connection, or both, and can they rejoin with the same code?

**Status:** ❌ UNKNOWN

**Answer:**
**Kick is not implemented.** No `KICK_PEER` command, no host-side moderation UI, no signaling-server message to evict a peer. The closest mechanism is `LEAVE_NETWORK_LOBBY`, which is voluntary and self-initiated. If kick were added later, the room code remains valid for surviving peers (per Q307), so a banned peer could trivially rejoin without per-peer denylisting.

**Evidence:**
- `docs/architecture/wiki/screens/64-network-lobby/interactions.md` (no kick action)
- `tasks/phase-3/01-multiplayer/` (no kick task)

---

### Q: 321. Is there a public lobby browser, or is joining strictly invite-by-code?

**Status:** ✔ Defined

**Answer:**
**Strictly invite-by-code.** The spec describes only "create room / share invite link / join via code or link." No `LIST_ROOMS` signaling message exists, no public-lobby screen exists in `docs/architecture/wiki/screens/`, and the screen-command coverage map contains no list/browse command for online matches.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (signaling messages: `CREATE_ROOM`, `JOIN_ROOM`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `PEER_CONNECTED`, `PEER_DISCONNECTED` — no list/browse)
- `docs/architecture/wiki/screens/` — no lobby-browser screen

---

### Q: 322. If a lobby browser exists, what fields are exposed publicly (player name, region, pack list, map name)?

**Status:** ✔ Defined (N/A)

**Answer:**
Not applicable — there is no lobby browser (Q321).

**Evidence:**
- See Q321.

---

### Q: 323. Can a player opt out of being listed publicly while still being joinable by code?

**Status:** ✔ Defined (N/A)

**Answer:**
Not applicable — every room is private by default (no public listing).

**Evidence:**
- See Q321.

---

### Q: 324. Are display names validated for impersonation (e.g., reserved names, homoglyphs, zero-width characters)?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. The lobby uses display names (chat, player slot rows) but no validator, length cap, allowlist, homoglyph filter, or zero-width / control-character stripper is documented.

**Evidence:**
- `docs/architecture/wiki/screens/64-network-lobby/data-contracts.md` (no display-name validator)
- `docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md`

---

### Q: 325. Can a peer enumerate online players by scraping the lobby list, and is that surface rate-limited?

**Status:** ✔ Defined (N/A)

**Answer:**
Not applicable — no public list to scrape (Q321). The signaling server exposes no peer-enumeration endpoint.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`

---

### Q: 326. Does the signaling server expose IP addresses of hosts to prospective joiners before consent?

**Status:** ⚠ Partial

**Answer:**
**Implicitly yes, via WebRTC ICE.** Once a `JOIN_ROOM` succeeds and ICE-candidate exchange begins (a documented signaling message), the joining peer receives the host's ICE candidates — which by default include the host's public IP (and, without filtering, LAN IPs / mDNS not handled — see Q327–Q328). The signaling server itself does not echo a separate IP field, but the SDP exchange routed through it leaks IPs to the joiner before any "consent" gate (because no consent gate exists; see Q318).

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (`ICE_CANDIDATE` is forwarded with no filtering)
- WebRTC defaults (browser exposes srflx/host candidates)

---

### Q: 327. Are ICE candidates filtered to avoid leaking internal/LAN IPs to untrusted peers prior to connection consent?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. Default browser behavior (post-Chrome 78) limits LAN IP exposure unless mDNS is unavailable, but the spec does not mandate `iceTransportPolicy: 'relay'` (TURN-only) or any pre-consent filter. No consent step exists (Q318).

**Evidence:**
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md` (relies on browser defaults; no filter policy)

---

### Q: 328. Is mDNS used for local candidates to mask host IP from the remote peer where supported?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. mDNS-host-candidate masking is a browser default for unfiltered local candidates, but the project does not formally require/verify it, nor does it specify behavior on Safari/older browsers where support varies. The cross-browser matrix (Chrome 120+, Firefox 121+, Safari 17+) does not call out mDNS.

**Evidence:**
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md` (no mDNS clause)

---

### Q: 329. Is there a "friends only" or allowlist mode that hides the lobby from strangers?

**Status:** ✔ Defined (N/A)

**Answer:**
Effectively yes by default, but **not as a configurable mode** — every room is invite-only because no public discovery surface exists (Q321). There is no friends list, no allowlist, no per-peer denylist, and no concept of "friend" in any screen package.

**Evidence:**
- `docs/architecture/wiki/screens/` (no friends/allowlist screens)

---

### Q: 330. Does the signaling protocol leak metadata (pack hash, save hash) that could be used to fingerprint players?

**Status:** ⚠ Partial

**Answer:**
**Likely yes, but not formally specified.** Lobby compatibility relies on `selectors.net.lobbyCompatibility` (hash/version/ruleset match) and `state.ui.multiplayer.contentCompatibilityHash`, which means **content hashes are exchanged before launch**. If that exchange traverses the signaling server (rather than the post-handshake DataChannel), the server sees them. The signaling task lists messages `CREATE_ROOM, JOIN_ROOM, OFFER, ANSWER, ICE_CANDIDATE, PEER_CONNECTED, PEER_DISCONNECTED` only — no `CONTENT_HASH` message — so hash exchange likely happens post-WebRTC (peer-to-peer), reducing the leak. This is not documented explicitly.

**Evidence:**
- `docs/architecture/wiki/screens/62-multiplayer-setup/spec.md` (`contentCompatibilityHash` binding)
- `docs/architecture/wiki/screens/64-network-lobby/spec.md` (`selectors.net.lobbyCompatibility`)
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (signaling message list excludes hash)

---

### Q: 331. Are spectator slots distinguishable from player slots in the discovery surface, and can spectators be hidden from the host?

**Status:** ✔ Defined (N/A)

**Answer:**
Not applicable — **spectators are not in scope** for M5 multiplayer (per Q140 in `docs/readiness-audit/07-multiplayer.md`). No spectator screen, command, or slot type exists.

**Evidence:**
- `docs/readiness-audit/07-multiplayer.md` Q140
- `docs/architecture/glossary.md` (spectator/tournament features deferred to "M7 polish")

---

### Q: 332. Can a banned or reported player rejoin a public lobby simply by changing display name?

**Status:** ❌ UNKNOWN

**Answer:**
**Yes, trivially**, in the current spec — there is no ban list, no peer-identity persistence, no reporting workflow, no display-name validation, and no public lobby anyway (so "rejoin a public lobby" reduces to "rejoin via the room code if it remains valid"). Identity == "whoever holds the code," which is the same identity model exposed in Q314.

**Evidence:**
- No ban / report task in `tasks/phase-3/01-multiplayer/`
- No `BAN_PEER` or `REPORT_PEER` command in any screen package
- `docs/architecture/wiki/screens/64-network-lobby/interactions.md`

---

## 🔍 Summary

### Missing Logic
- **Room-code generation contract**: alphabet, case rule, RNG (CSPRNG mandate), collision policy (Q301, Q302, Q304, Q305).
- **Server-side rate limiting**: per-IP, per-code, and global throttles (Q303, Q310, Q311, Q312).
- **Audit/log policy** for failed joins, with PII-aware retention (Q313).
- **Squatting / pre-claim defenses**: who controls code allocation, can clients propose codes (Q308).
- **Room TTL / max lifetime** independent of "all peers gone" (Q319).
- **Host approval gate** before WebRTC negotiation; "unexpected join" notification (Q317, Q318).
- **Kick / ban / report** moderation surface — no `KICK_PEER`, `BAN_PEER`, or `REPORT_PEER` exists (Q320, Q332).
- **Display-name validation**: length, character set, homoglyph/zero-width filter, reserved-name policy (Q324).
- **URL-shape policy for invite links**: fragment vs query, `Referrer-Policy`, history scrubbing (Q316).
- **ICE candidate filtering / mDNS / relay-only mode** as a privacy fallback (Q327, Q328).
- **Signaling-channel metadata policy**: explicit statement that pack/save hashes never traverse the signaling server (Q330).
- **Spectator model entirely undefined** (Q331; cross-ref Q140).

### Risks
- **Trivial enumeration**: ~30 bits of entropy + zero rate limiting = active rooms enumerable in seconds. Combined with no host approval (Q318), a stranger can become "the guest" before the legitimate invitee.
- **No moderation primitives**: a malicious peer cannot be evicted; if a kick is added later but the code stays valid, the same peer rejoins instantly (Q320, Q332).
- **Display-name impersonation**: zero-width characters, RTL overrides, and homoglyphs let attackers spoof the host's name in lobby chat / slot list (Q324).
- **IP leak via ICE**: with no relay-only or pre-consent filter, a malicious joiner learns the host's public IP just by completing `JOIN_ROOM` (Q326, Q327, Q328).
- **Squatting**: an attacker that can call `CREATE_ROOM` repeatedly with no throttle exhausts the 100-room cap or holds specific codes if client-chosen IDs are accepted (Q308).
- **Invite-link leakage**: codes pasted into URL paths/queries leak via `Referer`, browser history, and OS clipboard sync (Q316).
- **No purge guarantee**: orphaned/idle rooms have no TTL; only "all peers gone" clears them (Q309, Q319).

### Improvements
- **Mandate CSPRNG** (`crypto.randomBytes`) for code generation, with an explicit alphabet (e.g., Crockford Base32 minus ambiguous chars), length 8 (~40 bits), and case-insensitive comparison.
- **Add per-IP and per-code token-bucket throttles** to the signaling server, and a global `JOIN_ROOM`-failure cap; emit structured (PII-redacted) logs on threshold breach.
- **Pair the room code with a short-lived host-issued join token** (HMAC over `roomId | issuedAt | hostPubKey`) so the code alone is insufficient to join.
- **Add an explicit room TTL** (e.g., 30 min idle, 4 h max) and a host-driven "close room" command that invalidates the code immediately.
- **Add `APPROVE_PEER` / `REJECT_PEER` / `KICK_PEER`** commands to the network-lobby screen package, and a per-room peer denylist that survives the rejected peer's reconnect attempt.
- **Validate display names**: NFC normalization, length 1–24, reject zero-width / control / RTL-override characters, optional homoglyph collapse vs. host's own name.
- **Specify invite-URL shape**: room code in **URL fragment** (`#r=ABC123`), `Referrer-Policy: no-referrer` on lobby pages, no codes written to address-bar history beyond the lobby session.
- **Filter ICE candidates pre-consent**: until the host approves the joiner, only relay (TURN) candidates are exchanged; host candidates are gated.
- **Document explicitly** that pack hash, save hash, display name, and any user content traverse only the encrypted DataChannel (post-WebRTC), never the signaling server.
- **Define a banned-peer model**: the persistent unit is a peer keypair (generated client-side, stored in profile), not a display name — bans are issued against keys.
- **Spectator scope**: either commit a minimal spectator slot type with hide-from-host opt-in, or formally defer to M7 with a written exclusion in `tasks/phase-3/01-multiplayer.md`.

### AI-Readiness
Score: **2/10**

Reason: Of 32 questions, only **5** are clearly defined (Q315 invite delivery, Q321/Q322/Q323/Q325 lobby-browser absence, Q331 spectator absence as deferred). The rest are unknown or partial. The current spec gives an AI implementer a 6-character code and a stateless WebSocket — and almost no security, moderation, or privacy contract on top. An autonomous implementer would have to invent: RNG choice, alphabet, rate-limit thresholds, kick/ban primitives, display-name validation, ICE filter policy, invite-URL shape, room TTL, and audit logging. Each of those is a security-relevant decision that should be specified in the contract, not invented during coding. Closing the **Improvements** list would lift this to 7–8/10; until then, this dimension is the weakest in the multiplayer audit set.
