# Implementation Plan: 18 — Room Codes & Lobby Discovery

> Source audit: [docs/archive/readiness-audit/18-room-codes-and-lobby-discovery.md](../readiness-audit/18-room-codes-and-lobby-discovery.md)
> Audit AI-Readiness score at time of writing: **2 / 10** — target after this plan: **8 / 10**.
> Original audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic and Risk item from Q301–Q332
> into concrete work items grounded in the existing M5 task tree
> ([tasks/phase-3/01-multiplayer/](../../../tasks/phase-3/01-multiplayer/))
> and the lobby screen packages
> ([62-multiplayer-setup](../../architecture/wiki/screens/62-multiplayer-setup/),
> [64-network-lobby](../../architecture/wiki/screens/64-network-lobby/)).

---

## 1. Overview

The audit found that the signaling/lobby layer is currently a 6-character
code on a stateless WebSocket — and almost nothing else. There is no
RNG mandate, no rate limiting, no host approval, no kick/ban surface,
no display-name validator, no URL-shape rule, no ICE filter, no room
TTL, and no spectator scope statement. An autonomous implementer would
have to invent each of these, all of which are security-relevant.

**Sibling plan boundary.** Plan 07 ([07-multiplayer-plan.md](./07-multiplayer-plan.md))
already owns transport-level concerns: TURN provider, signaling-TLS,
desync recovery, host-migration mechanics, and the multiplayer chaos
matrix. This plan owns **lobby and identity** concerns: code generation,
abuse prevention, moderation primitives, invite-URL hygiene, ICE
disclosure policy, display-name hygiene, peer-identity model, and the
spectator scope statement. Where the two overlap (e.g. room-auth token,
ICE filter), this plan defines the contract and Plan 07 is updated to
reference it.

**In scope:**

- New operational contracts under [`docs/architecture/`](../../architecture/)
  governing the signaling server and lobby UX.
- Extensions to `tasks/phase-3/01-multiplayer/01` and `08`, plus three
  new task files under [`tasks/phase-3/01-multiplayer/`](../../../tasks/phase-3/01-multiplayer/).
- Extensions to the [64-network-lobby](../../architecture/wiki/screens/64-network-lobby/)
  screen package for moderation commands and host-side notifications.

**Explicitly out of scope (deferred / owned elsewhere):**

- TLS termination on the signaling server — owned by
  [docs/archive/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](../readiness-audit/24-tls-enforcement-and-webrtc-authentication.md)
  and Plan 07.
- Spectator runtime mechanics (slots, hide-from-host) — formally
  deferred to **M7 polish** in this plan; we add only the scope
  statement (Q331).
- Public lobby browser, friends list, presence — confirmed out-of-scope
  by Q321/Q329. Not added by this plan.
- Tournament/observer/reporting workflow UI — deferred to M7.

---

## 2. Critical Fixes (Must Do First)

These five items unblock invite-only matches and must land before
M5 can be exposed to non-internal users.

### Issue: Room-code generation contract is undefined

**Source:** Q301 (⚠), Q302 (❌), Q303 (❌), Q304 (❌), Q305 (❌); Missing-Logic
bullet 1; Risk "Trivial enumeration".

**Problem:**
[`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
specifies a "6-character alphanumeric" code and nothing else. Alphabet,
case rule, RNG source, ambiguous-character policy, collision rule, and
entropy target are all unspecified. Worst case: an implementer reuses
the project's seeded PCG32 (banned by determinism doctrine for gameplay
but unconstrained for signaling) and produces predictable codes.

**Impact:**
- Predictable codes → trivial impersonation of the legitimate guest.
- ~30-bit effective entropy is enumerable in seconds against the
  ≤100-room active set.
- No collision rule → two legitimate hosts can be issued the same
  code (silent room-merge or 500 error).

**Solution:**
Define a single canonical rule and pin it in `docs/architecture/`:

- **Alphabet:** Crockford Base32 minus ambiguous chars
  (`23456789ABCDEFGHJKMNPQRSTVWXYZ` → 30 symbols).
- **Length:** 8 characters (~39.2 bits of entropy, `30⁸ ≈ 6.56 × 10¹¹`).
- **Case:** generated upper-case, **input matched case-insensitively**
  with NFC + uppercase normalization.
- **RNG:** **CSPRNG only** (`crypto.randomBytes` server-side). Seeded
  PCG32 is **banned in signaling code paths**; explicit linter rule.
- **Collision policy:** allocate-then-check against the in-memory
  table; on hit, regenerate up to 5 times, then 503 with a
  documented `room.code.allocation_exhausted` error code.
- **Reuse policy:** a freed code enters a 10-minute "cool-down" before
  being eligible for re-allocation (closes Q306 reuse and Q307 stale
  re-bind in one rule).

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — replace "6-character alphanumeric" with a reference to the new
  contract doc; add the cool-down rule to the room-cleanup section.
- [docs/architecture/determinism.md](../../architecture/determinism.md)
  — add a one-line carve-out: "Signaling and lobby identifiers MUST
  use CSPRNG; PCG32 is forbidden in `services/signaling/`."

**New Files:**
- `docs/architecture/lobby-identifiers.md` — canonical room-code
  contract: alphabet table, length, case rule, RNG mandate, collision
  policy, cool-down window, worked-example code.

**Implementation Steps:**
1. Write `docs/architecture/lobby-identifiers.md` with the contract above.
2. Update Task 01 to cite the new doc as the single source of truth.
3. Add a determinism-doctrine carve-out paragraph.
4. Add a `validate:tasks` cross-ref so Task 01 is required to link the
   contract doc (extends the existing schema-citation rule).
5. Update the wiki sidebar generator to surface
   `docs/architecture/lobby-identifiers.md` under Architecture.

**Dependencies:** none (pure contract).

**Complexity:** S

---

### Issue: No rate limiting → trivial enumeration of active codes

**Source:** Q303 (❌), Q310 (❌), Q311 (❌), Q312 (❌); Missing-Logic bullet 2;
Risk "Trivial enumeration".

**Problem:**
The signaling server has zero throttle. With ~30 bits of entropy and
the ≤100 active-rooms cap, an attacker enumerates the **active subset
in seconds**. Per-IP, per-code, and global failure caps are all
undocumented.

**Impact:**
- Active room codes are effectively public to any LAN/cloud attacker.
- Combined with no host approval (Q318), the first valid `JOIN_ROOM`
  wins — strangers can become "the guest."

**Solution:**
Add a three-tier token-bucket throttle to the signaling server, owned
by Task 01:

| Tier | Bucket | Refill | Burst | On exceed |
|---|---|---|---|---|
| Per-IP | 10 `JOIN_ROOM` tokens | 1 / 10 s | 10 | 429 + 60 s ban |
| Per-code | 5 failed `JOIN_ROOM` | 1 / 30 s | 5 | code locked 60 s; host notified (Q317) |
| Global failure | 200 / minute | rolling | n/a | structured alert + temp accept-only-known-IPs |

`CREATE_ROOM` gets its own per-IP bucket: 3 / minute (closes Q308 squat).

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — add a "Rate limiting" section citing the new contract doc;
  expand the message-handler list with `RATE_LIMITED` reply.

**New Files:**
- `docs/architecture/signaling-rate-limits.md` — the canonical table
  above plus the bucket data structure (in-memory, no Redis), and the
  health-check counter exposed via `/healthz`.
- `tasks/phase-3/01-multiplayer/09-signaling-rate-limiting.md` — new
  task with `verifyCommands` that exercise per-IP, per-code, and global
  buckets via integration test.

**Implementation Steps:**
1. Write the rate-limit contract doc.
2. Author Task 09 with owned paths
   `services/signaling/rate-limit.ts`, `services/signaling/__tests__/rate-limit.test.ts`,
   shared with Task 01 on the request-handler entrypoint.
3. Add the `RATE_LIMITED` server→client message to Task 01's protocol
   table; document the client-side back-off (exponential, 1 s → 30 s).
4. Add a per-IP `CREATE_ROOM` cap to close Q308.
5. Acceptance test: 1 000-RPS join flood from one IP triggers the 60 s
   ban; per-code lock fires after 5 wrong codes against the same room.

**Dependencies:**
- Issue 1 (room-code contract) — the per-code bucket key needs the
  normalized code form.

**Complexity:** M

---

### Issue: No host approval gate before WebRTC negotiation

**Source:** Q318 (❌), Q317 (❌), Q314 (⚠), Q320 (❌); Missing-Logic bullets 6, 7.

**Problem:**
The first peer to present a valid `JOIN_ROOM` is auto-accepted into
WebRTC negotiation. There is no `APPROVE_PEER` / `REJECT_PEER` /
`KICK_PEER` command in
[`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../../architecture/wiki/screens/64-network-lobby/interactions.md).
Combined with low entropy and no rate limit, a stranger can become
"the guest" before the legitimate invitee.

**Impact:**
- Trivial griefing of public-link matches.
- ICE candidate exchange (and therefore IP disclosure — Q326) happens
  before the host has any agency.
- A malicious peer cannot be evicted; if added later but the code
  stays valid, the same peer rejoins instantly (Q332).

**Solution:**
Insert a **pending-peer queue** between `JOIN_ROOM` and ICE-candidate
forwarding. The signaling server forwards a `PEER_PENDING` notice to
the host; ICE candidates are buffered (and only TURN-relay candidates
are forwarded — see Issue 4) until the host emits `APPROVE_PEER` or
`REJECT_PEER`. The lobby gains `KICK_PEER` and a per-room peer
denylist keyed on the peer's keypair (see Issue 9).

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md)
  — add `APPROVE_PEER`, `REJECT_PEER`, `KICK_PEER` commands with
  preconditions, side effects, and bindings.
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../../architecture/wiki/screens/64-network-lobby/data-contracts.md)
  — add `pendingPeers[]`, `peerApproval` UI binding, peer denylist
  shape.
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md)
  — add the host-approval modal/notification component.
- [docs/architecture/wiki/screens/64-network-lobby/architecture.md](../../architecture/wiki/screens/64-network-lobby/architecture.md)
  — diagram the pending-peer flow.
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — add the buffered-ICE state machine and the new protocol messages.

**New Files:**
- `tasks/phase-3/01-multiplayer/10-host-approval-and-moderation.md`
  — new task; owned paths
  `services/signaling/approval.ts`, `src/ui/network-lobby/PendingPeerModal.tsx`,
  shared with Task 01 (signaling protocol) and Task 08 (lobby UI).

**Implementation Steps:**
1. Add protocol messages: `PEER_PENDING`, `APPROVE_PEER`, `REJECT_PEER`,
   `PEER_REJECTED`, `KICK_PEER`, `PEER_KICKED`.
2. Specify the buffering rule: ICE candidates from the pending peer
   are queued, **TURN-relay candidates only** are forwarded after
   approval (covers Issue 4).
3. Define the 30 s pending timeout: unanswered `PEER_PENDING` auto-rejects.
4. Add the lobby UI modal + system-toast notification when a pending
   peer arrives.
5. Add `peerDenylist[]` to room state, keyed on peer keypair (Issue 9).
6. Acceptance: a kicked peer cannot rejoin the same code; an
   un-approved peer never sees the host's srflx ICE candidates.

**Dependencies:**
- Issue 4 (ICE filtering) — host candidates must already be filterable.
- Issue 9 (peer-identity keypair) — denylist needs a stable peer key.

**Complexity:** L

---

### Issue: Host IP leaks via unfiltered ICE before consent

**Source:** Q326 (⚠), Q327 (❌), Q328 (❌); Missing-Logic bullet 10;
Risk "IP leak via ICE".

**Problem:**
Once `JOIN_ROOM` succeeds and the signaling server forwards
`ICE_CANDIDATE` messages, the joining peer receives the host's srflx
(and possibly host) candidates — leaking the host's public IP to a
party that has not been consented (Q318). Browser mDNS masking is a
default but not a contract; Safari/older builds vary.

**Impact:**
- A stranger who guessed an active code (Issues 1+2) learns the host's
  public IP without ever joining the match.
- LAN IPs may leak on browsers without mDNS support.

**Solution:**
**Pre-consent ICE policy = relay-only.** Until the host emits
`APPROVE_PEER` (Issue 3), the signaling server filters
`ICE_CANDIDATE` messages destined for the pending peer to **TURN
relay candidates only** (`typ relay`). Post-approval, the full
candidate set flows. Document `iceTransportPolicy` and the mDNS
expectation per browser in the cross-browser matrix.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
  — add the pre-consent `iceTransportPolicy: 'relay'` clause and the
  per-browser mDNS expectation table.
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — add the candidate-filter pass on relay.

**New Files:**
- `docs/architecture/ice-disclosure-policy.md` — pre-consent vs.
  post-consent candidate matrix; mDNS browser table; explicit
  reference from Plan 07 for the TURN provider.

**Implementation Steps:**
1. Server-side: parse SDP `a=candidate:` lines, drop non-`typ relay`
   on outbound to a pending peer; let everything pass post-approval.
2. Client-side host: set `iceTransportPolicy: 'relay'` until the local
   `peerApproved` event fires, then renegotiate with full ICE.
3. Document the Safari 17 / Firefox 121 / Chrome 120 mDNS behaviors.
4. Acceptance: capture a pending-peer SDP exchange and assert that no
   `typ host` or `typ srflx` candidate ever appears in it.

**Dependencies:**
- Issue 3 (host approval gate) — needs the consent boundary.
- Plan 07 TURN-provider task — relay must be available pre-consent.

**Complexity:** M

---

### Issue: Invite-URL shape leaks codes via Referer / history / clipboard

**Source:** Q315 (✔ for transport, ⚠ for hygiene), Q316 (❌); Missing-Logic
bullet 9; Risk "Invite-link leakage".

**Problem:**
Task 08 mandates an invite **URL** + QR code but does not specify
where the code lives in the URL. If the code is in the path or query
(`/room/ABC123` / `?code=ABC123`), it leaks via `Referer`, browser
history, and OS clipboard sync.

**Impact:**
- Codes pasted into the address bar end up in browser history,
  password managers, and clipboard-sync surfaces (iCloud, KDE Connect,
  Google clipboard).
- Any third-party script on the lobby page sees the code in
  `document.referrer` of outbound links.

**Solution:**
- Place the code in the **URL fragment**: `https://heroes.example/lobby#r=<code>`.
- Set `Referrer-Policy: no-referrer` on the lobby page response.
- After the code is consumed, replace the URL via
  `history.replaceState` to scrub it from history within the lobby
  session.
- Show a one-line clipboard-warning in the share dialog ("This code
  may sync via your OS clipboard — share only with intended players").

**Files to Update:**
- [tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md](../../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md)
  — pin the URL shape, the response header, the `replaceState` step,
  and the clipboard-warning copy.
- [docs/architecture/wiki/screens/62-multiplayer-setup/spec.md](../../architecture/wiki/screens/62-multiplayer-setup/spec.md)
  — add the share-dialog copy and the QR encoding rule (encode the
  full URL, fragment included, since QR is not subject to Referer).

**New Files:** none.

**Implementation Steps:**
1. Update Task 08 to specify `#r=<code>`.
2. Add the response-header rule to Task 08's verify commands.
3. Add a UI test: opening the lobby with `#r=...`, joining, and
   asserting `location.hash === ''` and `history.length` did not
   grow.
4. Localize the clipboard warning via the existing localization
   pipeline.

**Dependencies:** Issue 1 (code shape stable for the regex matcher).

**Complexity:** S

---

## 3. System Improvements

Grouped by system. Each item still uses the standard issue template.

### UI / Screens

#### Issue: No moderation surface in network-lobby

**Source:** Q318, Q320, Q332; Risk "No moderation primitives".

**Problem:**
[`docs/architecture/wiki/screens/64-network-lobby/interactions.md`](../../architecture/wiki/screens/64-network-lobby/interactions.md)
exposes only `SET_LOBBY_READY`, `SEND_LOBBY_CHAT`,
`REQUEST_LOBBY_SLOT_CHANGE`, `LAUNCH_NETWORK_GAME`,
`LEAVE_NETWORK_LOBBY`. There is no host-side ability to approve,
reject, kick, mute, or report a peer.

**Impact:** A griefer in a lobby cannot be removed; reporting workflow
is impossible.

**Solution:**
Add `APPROVE_PEER`, `REJECT_PEER`, `KICK_PEER`, `MUTE_PEER`,
`REPORT_PEER` commands. `MUTE_PEER` is local-only (suppresses chat
client-side); `REPORT_PEER` writes a structured record to a per-host
report log (no central server in M5; see Plan 07 for transport).
`KICK_PEER` is wired through the new `peerDenylist[]` (Issue 3 +
Issue 9).

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md)
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../../architecture/wiki/screens/64-network-lobby/data-contracts.md)
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md)
- [docs/architecture/wiki/screens/64-network-lobby/mockup.html](../../architecture/wiki/screens/64-network-lobby/mockup.html) — add the per-row "..." menu.

**New Files:** none beyond Issue 3's task file.

**Implementation Steps:** see Issue 3 steps; this entry is the
screen-package-side ledger.

**Dependencies:** Issue 3, Issue 9.

**Complexity:** M

---

#### Issue: Host is not notified of unexpected join attempts

**Source:** Q317 (❌); Missing-Logic bullet 6.

**Problem:**
Only `PEER_CONNECTED` is forwarded to the host (success only). Failed
joins (wrong code, banned peer, rate-limited) are invisible.

**Impact:** A targeted brute-force attempt against a known code is
silent to the host; no signal to leave the lobby.

**Solution:**
Add a `JOIN_ATTEMPT_REJECTED` server→host signaling message (rate-
limited to 1/30 s per pending peer, batched as a count). Surface as a
non-modal toast: "3 join attempts rejected in the last minute."

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md)
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md)
  — add the toast component.

**New Files:** none.

**Implementation Steps:**
1. Server: emit `JOIN_ATTEMPT_REJECTED { count, sinceMs }` per host
   every 30 s when count > 0.
2. UI: subscribe; show a toast at thresholds 1, 5, 20.
3. Wire to localization.

**Dependencies:** Issue 2 (rate limiting produces the signal).

**Complexity:** S

---

#### Issue: Spectator scope statement missing

**Source:** Q331 (✔ N/A in audit, but cross-ref Q140 in
[docs/archive/readiness-audit/07-multiplayer.md](../readiness-audit/07-multiplayer.md));
Improvements bullet 11.

**Problem:**
The audit treats spectators as out-of-scope but no canonical
*written* exclusion exists in the M5 task tree. An AI implementer
reading
[`docs/architecture/wiki/screens/64-network-lobby/`](../../architecture/wiki/screens/64-network-lobby/)
might invent spectator slots.

**Impact:** Scope creep; potential conflicting screen-package additions.

**Solution:**
Add a one-paragraph "Out of M5 scope" block to the network-lobby
screen package and to the multiplayer task index, deferring spectator
slots to M7. Mirror in this plan's §1.

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md)
  — add "Out of scope" section.
- `tasks/phase-3/01-multiplayer.md` (or the existing multiplayer
  index file) — add an explicit "spectators deferred to M7" line.
- [docs/planning/deferred.md](../../planning/deferred.md) (introduced by
  Plan 17) — register the deferral entry.

**New Files:** none.

**Implementation Steps:**
1. Add the scope statement to spec.md.
2. Cross-link to `docs/planning/deferred.md`.
3. Verify via `npm run validate:tasks` cross-reference.

**Dependencies:** Plan 17 (`docs/planning/deferred.md` exists).

**Complexity:** S

---

### Data Contracts

#### Issue: Display names are unvalidated (impersonation surface)

**Source:** Q324 (❌); Missing-Logic bullet 8; Risk "Display-name
impersonation".

**Problem:**
[`docs/architecture/wiki/screens/64-network-lobby/data-contracts.md`](../../architecture/wiki/screens/64-network-lobby/data-contracts.md)
and [62-multiplayer-setup](../../architecture/wiki/screens/62-multiplayer-setup/data-contracts.md)
define `displayName` but no validator. Zero-width characters, RTL
overrides, homoglyphs, and reserved names ("[host]", "system") are
all accepted.

**Impact:** Trivial host-spoofing in chat ("Host: kick yourselves lol"
posted by a peer whose display name visually matches the host).

**Solution:**
A canonical display-name validator:
- NFC normalize on input.
- Length 1–24 grapheme clusters.
- Reject category `Cf` (format), `Cc` (control), `Co` (private use),
  zero-width (`U+200B–U+200D`, `U+FEFF`), bidi overrides
  (`U+202A–U+202E`, `U+2066–U+2069`).
- Reserved-name list: `host`, `system`, `server`, `admin`,
  `<empty>`, `[banned]` (case-insensitive after NFKC fold).
- Optional homoglyph collision check vs. **other peers in the same
  room** (UTS #39 confusable detector); on collision, append a
  `#NN` discriminator client-side.

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../../architecture/wiki/screens/64-network-lobby/data-contracts.md)
- [docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md](../../architecture/wiki/screens/62-multiplayer-setup/data-contracts.md)
- `content-schema/profile.json` (or wherever the player profile
  schema lives) — add the `displayName` validator block.

**New Files:**
- `docs/architecture/display-name-policy.md` — canonical validator
  pseudocode + reserved-name list + worked examples + test vectors.
- `tasks/phase-3/01-multiplayer/11-display-name-validation.md`
  — implementation task; owned paths `src/profile/displayName.ts`,
  `src/profile/__tests__/displayName.test.ts`.

**Implementation Steps:**
1. Author the policy doc with test vectors.
2. Implement the validator with `Intl.Segmenter` for grapheme counts.
3. Add an `unicode-confusables` dependency (UTS #39 data).
4. Wire into the multiplayer-setup form and lobby chat send path.
5. Acceptance: a peer cannot submit a name that, after NFC, matches
   the host's name confusable-equivalent.

**Dependencies:** none.

**Complexity:** M

---

#### Issue: Signaling-channel metadata policy is implicit

**Source:** Q330 (⚠); Missing-Logic bullet 11.

**Problem:**
Pack-hash and save-hash exchange currently happens — somewhere — but
the audit cannot prove it never traverses the signaling server. An
implementer might naïvely add a `CONTENT_HASH` signaling message.

**Impact:** Player fingerprinting via the signaling host (which may be
a third-party deployment).

**Solution:**
Pin the rule in writing: **only the protocol messages enumerated in
Task 01 traverse the signaling server.** Pack hash, save hash,
display names, chat, and ICE candidates that are not `typ relay` are
**peer-to-peer post-WebRTC only**. Add a `services/signaling/` lint
rule that fails CI if the server module references content hashes,
display names, or chat payloads.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — add an "Allowed payloads" allowlist and a "Never traverses
  signaling" denylist.
- [docs/architecture/wiki/screens/62-multiplayer-setup/spec.md](../../architecture/wiki/screens/62-multiplayer-setup/spec.md)
  — clarify that `contentCompatibilityHash` is exchanged on the
  DataChannel after the peer is approved.

**New Files:**
- `docs/architecture/signaling-payload-policy.md` — allowlist /
  denylist + lint rule pointer.

**Implementation Steps:**
1. Write the policy doc.
2. Add the lint rule (eslint custom rule or import-restrictor).
3. Update Task 01 + Setup spec.
4. Verify by grep over `services/signaling/`.

**Dependencies:** none.

**Complexity:** S

---

### Schemas

#### Issue: No peer-identity keypair schema

**Source:** Q332 (❌); Improvements bullet 9.

**Problem:**
"Identity == whoever holds the code." There is no peer identity
beyond display name. Bans, denylists, host-trust, and report logs
all need a stable identifier.

**Impact:** Bans cannot be enforced across reconnects; a banned peer
changes display name and rejoins. Denylist (Issue 3) cannot exist
without a stable key.

**Solution:**
Add a client-generated **Ed25519 keypair** stored in the local profile.
The public key is the canonical peer ID for the lifetime of that
profile. Lobby messages embed `peerPubKey`; the denylist keys on it.
The signaling server **does not** persist these — bans are per-host,
local.

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../../architecture/wiki/screens/64-network-lobby/data-contracts.md)
  — add `peerPubKey` to the peer slot row.
- `content-schema/profile.json` — add `peerKeypair` block (private
  half stored locally only).

**New Files:**
- `docs/architecture/peer-identity.md` — keypair lifecycle, rotation
  rule (no rotation in M5; user-resettable in M7), storage location,
  privacy posture.
- `tasks/phase-3/01-multiplayer/12-peer-keypair-and-denylist.md`
  — task; owned paths `src/profile/peerKeypair.ts`,
  `src/multiplayer/peerDenylist.ts`.

**Implementation Steps:**
1. Generate Ed25519 keypair on first profile creation; persist in
   IndexedDB with a clear "this is local-only" UI hint.
2. Sign the `JOIN_ROOM` payload with the private key; the host
   verifies on `APPROVE_PEER`.
3. Per-room `peerDenylist[]` stores public keys.
4. Verify: a kicked peer with the same key cannot rejoin even with a
   new display name.

**Dependencies:** Issue 3 (host approval) consumes the key.

**Complexity:** M

---

### Architecture

#### Issue: No room TTL or maximum lifetime

**Source:** Q319 (❌), Q309 (⚠); Missing-Logic bullet 5; Risk "No purge
guarantee".

**Problem:**
The only auto-cleanup trigger is "all peers gone." Idle/orphaned
rooms persist until process restart.

**Impact:**
- Memory pressure on a single signaling-server pod.
- Long-stale codes still accept joiners.

**Solution:**
Define two TTL bounds in the room-code contract:
- **Idle TTL:** 30 minutes since last protocol message → server-initiated
  `ROOM_EXPIRED`.
- **Max lifetime:** 4 hours wall clock → forced expiry.

Add a host command `CLOSE_ROOM` that invalidates the code immediately
without a 10-minute cool-down (host-initiated cool-down = 0 s; closes
the host-resignation gap).

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — add the TTL sweep loop and `CLOSE_ROOM` command.
- `docs/architecture/lobby-identifiers.md` (introduced by Issue 1)
  — add the TTL section.
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md)
  — add `CLOSE_ROOM` host action.

**New Files:** none.

**Implementation Steps:**
1. Add a 60 s sweep loop to the signaling server; emit `ROOM_EXPIRED`
   to all peers, then drop the room.
2. Add `lastActivityMs` per room; reset on every protocol message.
3. Add `CLOSE_ROOM` command; reject from non-host peers.
4. Acceptance: a room with no activity for 31 minutes is removed; a
   `CLOSE_ROOM` removes it within 1 s.

**Dependencies:** Issue 1.

**Complexity:** S

---

#### Issue: No audit-log policy for the signaling server

**Source:** Q313 (❌); Missing-Logic bullet 3.

**Problem:**
No statement on what the signaling server logs, retention, PII
handling, or what triggers escalation.

**Impact:**
- Enumeration patterns are invisible (cannot detect Issue 2 scenarios).
- Risk of inadvertently logging IPs / display names long-term.

**Solution:**
A minimal logging contract:
- **Always log (structured, JSON):** room creation/destruction,
  rate-limit triggers, `JOIN_ATTEMPT_REJECTED` counts.
- **Never log:** display names, chat content, full IP (log only
  truncated `/24` + sha256 of full IP with rolling daily salt).
- **Retention:** 7 days, then purge.
- **No request body logging** by default.
- Logs go to stdout for the operator's collector (no central service).

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  — add a "Logging" section.

**New Files:**
- `docs/architecture/signaling-audit-log.md` — fields, redaction
  rules, retention, sample log line.

**Implementation Steps:**
1. Write the policy doc.
2. Add a tiny structured logger (no extra deps; `console.log` with a
   schema validator in dev).
3. Add a unit test that asserts no `displayName`, no
   `Authorization`, no full IP, no chat payload appears in any log
   line.

**Dependencies:** Issue 2 (rate-limit signals are the primary log
producer).

**Complexity:** S

---

### Tasks

#### Issue: M5 task index does not enumerate the new lobby/security tasks

**Source:** synthesis of Issues 1–10.

**Problem:** Several new task files are introduced by this plan; they
must be discoverable via `npm run tasks:next` and validated by
`npm run validate:tasks`.

**Solution:**
Register the new tasks 09–12 in the task system, with explicit
`Owned Paths`, `Owned Paths (shared)`, `Dependencies`, and
`verifyCommands`.

| New task | Owns (primary) | Shared | Depends on |
|---|---|---|---|
| `09-signaling-rate-limiting.md` | `services/signaling/rate-limit.ts` | `services/signaling/index.ts` (with Task 01) | Task 01 |
| `10-host-approval-and-moderation.md` | `services/signaling/approval.ts`, `src/ui/network-lobby/PendingPeerModal.tsx` | Task 01 protocol, Task 08 lobby UI | Task 01, Task 08, Task 12 |
| `11-display-name-validation.md` | `src/profile/displayName.ts` | Task 08 setup form | none |
| `12-peer-keypair-and-denylist.md` | `src/profile/peerKeypair.ts`, `src/multiplayer/peerDenylist.ts` | Task 01 message envelope | none |

**Files to Update:**
- `tasks/phase-3/01-multiplayer.md` (index) — add the four entries.
- `tasks/task-registry.json` — regenerated by
  `npm run generate:task-registry`.

**Implementation Steps:**
1. Create each task file using the existing task template (Status:
   planned, ownedPaths, verifyCommands).
2. Run `npm run generate:task-registry`.
3. Run `npm run validate:tasks`; fix any cross-reference complaints.
4. Run `npm run validate`.

**Dependencies:** Issues 1–4 and 6–9 (each task formalizes one).

**Complexity:** S

---

## 4. Suggested Task Breakdown

- [ ] **T-LOBBY-01** — Author `docs/architecture/lobby-identifiers.md`;
      update Task 01 to reference it. (Issue 1)
- [ ] **T-LOBBY-02** — Author `docs/architecture/signaling-rate-limits.md`
      and Task 09 (`09-signaling-rate-limiting.md`). Implement
      per-IP / per-code / global buckets. (Issue 2)
- [ ] **T-LOBBY-03** — Add `APPROVE_PEER` / `REJECT_PEER` / `KICK_PEER`
      to network-lobby screen package + signaling protocol; author
      Task 10. (Issues 3, 6)
- [ ] **T-LOBBY-04** — Author `docs/architecture/ice-disclosure-policy.md`;
      implement pre-consent `iceTransportPolicy: 'relay'` filter on
      server and client. (Issue 4)
- [ ] **T-LOBBY-05** — Pin invite-URL fragment shape, `Referrer-Policy`,
      and history scrubbing in Task 08. (Issue 5)
- [ ] **T-LOBBY-06** — Add `JOIN_ATTEMPT_REJECTED` host notification +
      lobby toast. (Issue 7)
- [ ] **T-LOBBY-07** — Add spectator-out-of-scope statements to
      network-lobby spec + `docs/planning/deferred.md`. (Issue 8)
- [ ] **T-LOBBY-08** — Author `docs/architecture/display-name-policy.md`
      and Task 11 (`11-display-name-validation.md`). (Issue 9)
- [ ] **T-LOBBY-09** — Author `docs/architecture/signaling-payload-policy.md`;
      add the `services/signaling/` content-payload lint rule. (Issue 10)
- [ ] **T-LOBBY-10** — Author `docs/architecture/peer-identity.md` and
      Task 12 (`12-peer-keypair-and-denylist.md`). (Issue 11)
- [ ] **T-LOBBY-11** — Add room TTL sweep + `CLOSE_ROOM` to Task 01
      and `lobby-identifiers.md`. (Issue 12)
- [ ] **T-LOBBY-12** — Author `docs/architecture/signaling-audit-log.md`;
      add structured logger to signaling server. (Issue 13)
- [ ] **T-LOBBY-13** — Register tasks 09–12 in `tasks/phase-3/01-multiplayer.md`
      index; regenerate registry; pass `npm run validate`. (Issue 14)

---

## 5. Execution Order

Strict order — later items consume contracts pinned by earlier items.

1. **T-LOBBY-01** — room-code contract is the dependency root.
2. **T-LOBBY-10** — peer keypair (denylist + signed `JOIN_ROOM`
   depend on it).
3. **T-LOBBY-08** — display-name validator (needed before chat /
   approval UI is wired).
4. **T-LOBBY-09** — signaling payload allow/denylist (constrains the
   protocol added in subsequent steps).
5. **T-LOBBY-02** — rate limiting (needed before exposing approval
   surface, and produces the log/notify signals).
6. **T-LOBBY-04** — pre-consent ICE filter (needed before approval
   gate is exercised).
7. **T-LOBBY-03** — host approval + moderation (consumes 1, 2, 4, 10).
8. **T-LOBBY-06** — `JOIN_ATTEMPT_REJECTED` toast (consumes 2 + 3).
9. **T-LOBBY-11** — room TTL + `CLOSE_ROOM` (consumes 1, 3).
10. **T-LOBBY-05** — invite-URL hygiene (independent of server work,
    schedule alongside 7–9).
11. **T-LOBBY-12** — signaling audit log (consumes 2 producers).
12. **T-LOBBY-07** — spectator scope statement (independent doc step).
13. **T-LOBBY-13** — task-registry registration + `npm run validate`
    (final).

---

## 6. Risks if Not Implemented

| Risk | Source | Severity | Trigger |
|---|---|---|---|
| Strangers join invite-only matches before the legitimate guest | Q314, Q318 | High | Enumeration of any ~30-bit code at >100 RPS |
| Host's public IP leaks to anyone who guesses an active code | Q326–Q328 | High | Default WebRTC ICE on a guessed code |
| Banned/griefer peer rejoins instantly via display-name change | Q320, Q332 | High | Any moderation attempt without peer-key denylist |
| Host-name spoofing via zero-width / homoglyph display name | Q324 | Medium | Adversarial display name in chat |
| Invite link in URL path/query leaks via `Referer`, history, OS clipboard | Q316 | Medium | Any user pastes the URL into a browser |
| Squatting exhausts the 100-room cap | Q308 | Medium | Unthrottled `CREATE_ROOM` floods |
| Orphaned rooms accumulate; memory growth | Q309, Q319 | Medium | Hosts crash without graceful close |
| Pack/save hash leaks via signaling server | Q330 | Medium | Naïve `CONTENT_HASH` signaling message |
| Operator cannot detect enumeration patterns | Q313 | Low | No structured logs |
| Spectator scope creep into M5 | Q331 | Low | New screen-package PRs add spectator slots |

---

## 7. AI Implementation Readiness

**Score after closing this plan: 8 / 10.**

Reasoning:

- All 24 ❌ items are converted into either a contract document, a
  task file, or a screen-package extension.
- All 5 ⚠ items get an explicit closing rule (cool-down for reuse,
  TTL for purge, host-approval gate for stale re-bind, allow/denylist
  for metadata, NFC + reserved-name list for display names).
- The 5 ✔ items (Q315, Q321–Q323, Q325, Q331) are kept as canonical
  "no public discovery" / "no spectator" statements and are preserved
  by adding them to `docs/planning/deferred.md` so they cannot drift.

What remains 0–2 points short of full readiness:

- **Operator deployment guidance** for the signaling server (TLS
  termination, log shipping, multi-region) is owned by Plan 07 and
  Plan 16; this plan does not cover it.
- **Reporting workflow** beyond local `REPORT_PEER` log is M7.
- **Friends list / presence** stays out of scope per Q321 and is not
  closed by this plan.

After T-LOBBY-13 lands and `npm run validate` passes, an autonomous
agent can implement Task 01 → Task 08 + Tasks 09–12 end-to-end without
inventing any security-relevant decision.
