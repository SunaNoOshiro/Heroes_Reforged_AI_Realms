# Implementation Plan: 25 — TURN Credentials & Signaling Server Abuse Protection

> Source audit: [docs/archive/readiness-audit/25-turn-credentials-and-signaling-server-abuse.md](../readiness-audit/25-turn-credentials-and-signaling-server-abuse.md)
> Audit AI-Readiness score at time of writing: **1 / 10** — target after this plan: **8 / 10**.
> The original audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic, and Risk item from Q488–Q513 into
> concrete, executable work items grounded in existing artifacts:
> [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md),
> [`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md),
> [`tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md`](../../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md),
> [`tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`](../../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md),
> [`tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md`](../../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md),
> [`docs/architecture/wiki/screens/64-network-lobby/`](../../architecture/wiki/screens/64-network-lobby/),
> [`docs/architecture/wiki/screens/62-multiplayer-setup/`](../../architecture/wiki/screens/62-multiplayer-setup/),
> [`services/signaling/README.md`](../../../services/signaling/README.md),
> [`docs/architecture/command-schema.md`](../../architecture/command-schema.md),
> [`docs/architecture/schema-matrix.md`](../../architecture/schema-matrix.md),
> and adjacent plans **07** (multiplayer), **18** (room codes), **22**
> (privacy / retention / error leaks), **24** (TLS/WSS + WebRTC auth),
> **29** (rate limiting / secret management), **31** (trust boundaries /
> logging / monitoring).

---

## 1. Overview

Audit 25 evaluated 26 questions across two themes — **TURN credential
provisioning** (Q488–Q499) and **signaling-server abuse protection**
(Q500–Q513). **Of the 26, only Q498 (✔ N/A by omission of public
lobby) is fully resolved; Q502, Q511, and Q512 are ⚠ Partial; the
remaining 22 are ❌ UNKNOWN.**

The repository today specifies *what* the signaling server forwards
(`CREATE_ROOM`, `JOIN_ROOM`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`,
`PEER_CONNECTED`, `PEER_DISCONNECTED`) and a global memory ceiling of
100 concurrent rooms — but says **nothing** about:

1. **TURN provisioning end-to-end** — no provider selection
   (Cloudflare / Twilio / coturn self-host), no credential type
   (REST-API ephemeral vs. long-term-credential vs. baked-in static),
   no TTL, no scope, no rotation, no revocation, no per-credential
   bandwidth quota, no open-relay hardening, no fallback policy.
2. **Signaling-message validation** — the task lists message names
   only; no JSON Schema, no AJV gate, no `additionalProperties: false`,
   no length caps on `roomId` / `sdp` / candidate strings.
3. **Payload-size and message-rate caps** — `ws` defaults
   (`maxPayload: 100 MiB`, no per-frame deadline) are inherited as-is.
4. **Rate-limit matrix** — no per-IP, per-connection, per-room, or
   global throttle on `CREATE_ROOM` / `JOIN_ROOM` / `OFFER` /
   `ANSWER` / `ICE_CANDIDATE`.
5. **Per-room participant cap** — implicit "2 seats" lives in the
   client UI ([`64-network-lobby`](../../architecture/wiki/screens/64-network-lobby/)),
   but the server does not reject a third `JOIN_ROOM`.
6. **Slowloris / hoarding hardening** — no `pingTimeout` /
   `pingInterval`, no idle disconnect, no per-frame deadline, no
   upgrade-handshake timeout.
7. **Edge-tier defenses** — no reverse-proxy / WAF / CONNECT-flood
   contract; no CAPTCHA escalation under sustained load; no
   time-bound blocklist.
8. **Health-endpoint segregation** — no `/healthz`, `/metrics`, or
   admin-port boundary.

A naive autonomous implementer following the current task spec ships a
~60-line `ws`-based forwarder with no schema validator, no payload
limit, no rate limit, no TURN integration, and no per-room cap —
trivially DoSable in seconds and trivially abusable as an open relay
the moment TURN is bolted on. This plan formalizes:

1. A **canonical TURN-credential doctrine**
   (`docs/architecture/turn-credentials.md`) — REST-API ephemeral
   credentials per RFC 7635, HMAC-SHA1 long-term-credential mechanism,
   ≤ 5-minute TTL, per-`(roomCode, peerId)` scope, rotation cadence,
   issuance only after admission.
2. A **canonical signaling-message schema**
   (`content-schema/schemas/signaling-message.schema.json`) — strict
   `additionalProperties: false` shapes for every message type, length
   caps on `roomId` / `peerId` / `sdp` / `candidate`, ICE-candidate
   list-length cap.
3. A **canonical signaling rate-limit matrix**
   (`docs/architecture/signaling-rate-limits.md`) — per-IP / per-IP-prefix /
   per-connection / per-room / global token buckets with explicit
   thresholds and exhaustion responses.
4. A **TURN-credential schema**
   (`content-schema/schemas/turn-credential.schema.json`) and an
   issuance message (`TURN_CREDENTIALS`) added to the signaling
   protocol — emitted only after a successful `JOIN_ROOM` admit.
5. A **coturn / TURN-server hardening config**
   (`services/turn/config/turnserver.example.conf`) — `--no-tcp-relay`,
   `--no-loopback-peers`, `--denied-peer-ip` allowlist, realm
   restriction, port allowlist, `--max-bps`, `--total-quota`.
6. A **WebSocket hardening contract** on the signaling server —
   `maxPayload: 64 KiB`, `pingInterval: 25 s`, `pingTimeout: 30 s`,
   per-frame 5 s deadline, upgrade-handshake 10 s deadline, idle
   disconnect on missed pings.
7. A **per-room participant cap** enforced on the server-side `room →
   peer` map — `maxPeers: 2` (configurable) with explicit
   `ROOM_FULL` rejection.
8. An **edge-tier abuse-defense contract**
   (`services/signaling/config/edge.example.toml` — extending Plan 24's
   transport-security config) — CONNECT-flood limits, per-IP-prefix
   socket caps, CAPTCHA escalation hook, time-bound blocklist
   semantics.
9. A **health-endpoint segregation contract** — `/healthz` and
   `/metrics` bound to a private admin path/port with shared-secret
   auth, build SHA / dep-version redaction on public 4xx/5xx.
10. A **TURN-down fallback policy** — explicit "STUN-only attempt; if
    ICE fails, surface 'Direct connection blocked' UI; never silently
    fail-open" — wired into [`64-network-lobby`](../../architecture/wiki/screens/64-network-lobby/)
    interactions.
11. **CI gates** rejecting (a) committed TURN URLs without
    placeholder secrets, (b) the signaling server bootstrap missing
    `maxPayload` / ping / schema-validator wiring, (c) signaling task
    spec missing the rate-limit matrix block.

This plan **only formalizes missing artifacts** — no gameplay rules
are invented. Where audits 18 / 22 / 24 / 29 / 31 already produced
plans, this plan **defers** to those artifacts and adds only the
relay-credential, payload-validation, and abuse-defense surface that
connects them.

**Overall readiness state:** 1 / 10 (per audit). Closing the items
below lifts this to 8 / 10, which is the threshold for letting agents
ship a public-facing M5 multiplayer build that can survive a single
script-kiddie load test or a casual NAT-traversal failure without
silent regression.

---

## 2. Critical Fixes (Must Do First)

These five items are the *active risk surface* (trivial DoS, open
relay, schema-injection of in-memory state, missing TURN deployment,
join-storm room exhaustion) and must land before any public-facing M5
build.

### Critical Fix 1 — Strict Signaling-Message Schema + WebSocket Payload & Slowloris Hardening

**Source:** Q503, Q504, Q505, Q506, Q507. Risks "DoS surface trivially
open", "Slowloris and flood unaddressed", "No schema validation".

**Problem:** [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
lists message **names** but commits no JSON Schema, no AJV gate, no
`additionalProperties: false`, and no length caps. The `ws` library is
inherited at defaults (`maxPayload: 100 MiB`, no `pingTimeout`, no
upgrade-handshake deadline, no per-frame deadline), so a single
oversized SDP or one slow-write client can stall the event loop or
hold a socket indefinitely.

**Impact:** Malformed `roomId` / `offer` payloads can corrupt the
in-memory `room → peer` map. A 50 MiB SDP blob blocks every other
client. A botnet of 100 hosts holding open WS connections without
sending any frame exhausts the socket pool. Default behavior makes the
server trivially DoSable with off-the-shelf tooling.

**Solution:** Author one canonical message-schema doc, add the four
message schemas, wire AJV at the message-router boundary, and pin
`ws`-library hardening options in the bootstrap.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) — add **Message Validation**, **Payload Limits**, **Liveness**, and **Slowloris Hardening** sections; reference the new doctrine doc and the new schemas; extend `Verify` to run `npm run validate:signaling`
- [services/signaling/README.md](../../../services/signaling/README.md) — list the hardening invariants (maxPayload, ping interval, schema gate); link to the doctrine doc
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md) — register `signaling-message.schema.json` row with owning task
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — register `SIGNALING_VALIDATION_FAILED` (UI-side trust event) and `SIGNALING_PAYLOAD_REJECTED` (server-side metric)

**New Files:**
- `content-schema/schemas/signaling-message.schema.json` — discriminated-union root keyed by `type` (`CREATE_ROOM`, `JOIN_ROOM`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `PEER_CONNECTED`, `PEER_DISCONNECTED`, `TURN_CREDENTIALS`, `ROOM_FULL`, `ERROR`); per-variant `additionalProperties: false`; explicit length caps:
  - `roomId`: `^[A-Z0-9]{6}$`
  - `peerId`: UUID v4
  - `sdp`: max 16 KiB
  - `candidate`: max 1 KiB
  - `iceCandidates` array: max 32 entries per `OFFER` / `ANSWER`, max 64 cumulative per session
- `content-schema/examples/signaling-message/*.json` — at least one canonical example per `type`
- `docs/architecture/signaling-message-schema.md` — canonical doctrine: discriminator rule, length caps, why `additionalProperties: false`, rejection behavior (close socket with code `1008` Policy Violation; do **not** echo the offending payload in logs)
- `tasks/phase-3/01-multiplayer/09-signaling-message-schema-and-validation.md` — owning task; `ownedPaths` covers `content-schema/schemas/signaling-message.schema.json`, `services/signaling/src/validation/`, the schema-matrix row
- `services/signaling/src/validation/ajv.ts` — compiled AJV instance with `strict: true`, `allErrors: false`, schema preloaded at startup; exported `validateSignalingMessage(raw): { ok: true; msg: SignalingMessage } | { ok: false; reason: string }`

**Implementation Steps:**
1. Author `docs/architecture/signaling-message-schema.md` with the
   discriminator rule and length-cap table; link from
   [`CLAUDE.md`](../../../CLAUDE.md) "Protect These Rules".
2. Define `signaling-message.schema.json` with the seven existing
   message variants plus the new ones (`TURN_CREDENTIALS`,
   `ROOM_FULL`, `ERROR`). Each variant's schema sets
   `additionalProperties: false` and pins `type`/`maxLength`/`pattern`
   exactly as listed above.
3. Author canonical example fixtures for every variant under
   `content-schema/examples/signaling-message/`.
4. Implement `services/signaling/src/validation/ajv.ts`. The validator
   is the only allowed entry point into the message-router; raw
   strings never reach the room-state mutation layer.
5. Update `services/signaling/src/server.ts` bootstrap with these
   hardening defaults (committed as named constants in
   `services/signaling/src/config.ts`):
   - `maxPayload: 64 * 1024` (64 KiB ceiling on a single frame)
   - `pingInterval: 25_000` and `pingTimeout: 30_000`; missed pong
     ⇒ `terminate()`
   - upgrade-handshake deadline: 10 s; uncompleted handshakes are
     destroyed
   - per-frame deadline: 5 s between first and final frame of a
     fragmented message; exceeded ⇒ `close(1009)` (Message Too Big)
   - reject binary frames (text-only protocol)
   - on validation failure: `close(1008)` with reason
     `"signaling-validation"` and increment a per-IP counter (feeds
     Critical Fix 5)
6. Add CI gate `npm run validate:signaling`:
   - asserts `signaling-message.schema.json` exists and validates
     every `content-schema/examples/signaling-message/*.json`
   - greps `services/signaling/src/server.ts` for the named constants
     (`MAX_PAYLOAD_BYTES`, `PING_INTERVAL_MS`, `PING_TIMEOUT_MS`,
     `UPGRADE_DEADLINE_MS`, `FRAME_DEADLINE_MS`); fails if any is
     missing
   - asserts the message router routes through
     `validateSignalingMessage` (greps for the call site)
7. Wire `validate:signaling` into `npm run validate`.
8. Add unit tests under `services/signaling/test/`: oversized SDP
   rejected, malformed `roomId` rejected, additional property
   rejected, binary frame rejected, idle ping-miss closes, slow
   handshake terminated, slow fragmented frame terminated.

**Dependencies:** None (extends existing task; doctrine doc and
schema are new).

**Complexity:** **L**

---

### Critical Fix 2 — Signaling Rate-Limit Matrix + Per-Room Participant Cap

**Source:** Q500, Q501, Q502, Q511. Risks "DoS surface trivially
open", "Per-room join-storm".

**Problem:** [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
sets a single global ceiling — "up to 100 concurrent rooms" — and
nothing else. There is no per-IP throttle, no per-connection message
rate, no per-room cap on `JOIN_ROOM`, no per-origin sub-ceiling, no
exhaustion-handling rule. A single attacker scripting `CREATE_ROOM`
fills the 100-slot ceiling in milliseconds; a join-storm against a
known room code drains per-room memory before the client UI's 2-seat
check fires. There is also no account/token axis (Q501 — no peer
identity until Plan 24 ships), so per-IP is the only available throttle
key.

**Impact:** A single low-bandwidth attacker DoSes legitimate room
creation. A targeted attacker against a public invite link join-storms
the room before the legitimate guest connects.

**Solution:** Author a canonical rate-limit doctrine, add a
per-IP / per-IP-prefix / per-connection token-bucket implementation,
add a server-side `maxPeers` per room, and surface counters at a
private metrics endpoint.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) — add **Rate-Limit Matrix** and **Room Capacity** sections referencing the new doctrine doc; extend acceptance criteria with "third `JOIN_ROOM` for a 2-peer room receives `ROOM_FULL`"
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../../architecture/wiki/screens/64-network-lobby/data-contracts.md) — list the `ROOM_FULL` and `ERROR` server frames the lobby must handle
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md) — add `OnRoomFull` and `OnRateLimited` handlers (toast + back-to-setup, no retry storm)
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — register `SIGNALING_RATE_LIMITED`, `SIGNALING_ROOM_FULL`
- [docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md](../readiness-audit/29-rate-limiting-and-secret-management.md) — cross-link from this plan; the secret-storage half stays in Plan 29

**New Files:**
- `docs/architecture/signaling-rate-limits.md` — canonical matrix:
  | Scope | Action | Rate | Burst | Exhaustion |
  | --- | --- | --- | --- | --- |
  | per IP | `CREATE_ROOM` | 5 / min | 10 | `ERROR{code:"rateLimited", action:"createRoom"}` + 60 s cooldown |
  | per IP | `JOIN_ROOM` | 10 / min | 15 | `ERROR{code:"rateLimited", action:"joinRoom"}` + 30 s cooldown |
  | per IP-prefix (`/24` v4, `/64` v6) | concurrent open sockets | 8 | — | refuse upgrade with HTTP 429 |
  | per connection | any message | 60 / min | 30 | `close(1008, "rate")` |
  | per room code | failed `JOIN_ROOM` | 5 / min | — | code locked 5 min, returns `ERROR{code:"codeLocked"}` |
  | global | `CREATE_ROOM` | 50 / min | 100 | newest creator gets `ERROR{code:"globalLimit"}`, existing rooms unaffected |
  | global | concurrent rooms | 100 | — | `ERROR{code:"capacity"}`; idle rooms (no peers ≥ 5 min) evicted first |
  | per room | concurrent peers | `maxPeers` (default 2) | — | `ROOM_FULL` |
- `services/signaling/src/rate/token-bucket.ts` — pure token-bucket implementation, deterministic in tests via injectable clock
- `services/signaling/src/rate/limiter.ts` — composed limiter that owns the keyed buckets; exposes `check(scope, key): { allowed: boolean; retryAfterMs: number }` and `report(): MetricsSnapshot`
- `tasks/phase-3/01-multiplayer/10-signaling-rate-limits-and-room-cap.md` — owning task; `ownedPaths` covers `services/signaling/src/rate/`, the new doctrine doc, the room-cap enforcement in `services/signaling/src/server.ts`

**Implementation Steps:**
1. Author `docs/architecture/signaling-rate-limits.md` with the table
   above. Justify each number against the cooldown / replay model and
   reference Plan 18 (room-code entropy) so the per-code lock cannot
   be bypassed by code-grinding.
2. Implement `token-bucket.ts` and `limiter.ts`. All buckets keyed by
   stable hashes (`/24` for IPv4, `/64` for IPv6) so legitimate
   shared-NAT cohorts share quota fairly; never key by raw IP alone.
3. Wire the limiter into `services/signaling/src/server.ts`:
   - upgrade-handler checks `perPrefixSockets`
   - message router checks `perConnectionMessages` and
     `perIpAction[type]` before dispatch
   - room creator checks `globalCreate` and reserves a slot before
     mutating `room → peer`
4. Implement `maxPeers` enforcement in the `JOIN_ROOM` handler: if
   `room.peers.length >= room.maxPeers`, reply `ROOM_FULL`; do **not**
   add to `room.peers`. `maxPeers` defaults to 2 and is set at
   `CREATE_ROOM`.
5. Add idle-room eviction: `setInterval(60_000, evictIdleRooms)`;
   rooms with `peers.length === 0` for ≥ 5 min are deleted (already
   the spirit of "cleared when room is empty", now formalized with a
   timer).
6. Surface metrics on a private endpoint (see Critical Fix 5):
   `/admin/metrics` returns the `MetricsSnapshot` JSON.
7. Update `64-network-lobby/interactions.md` so `ROOM_FULL` returns
   the user to [`62-multiplayer-setup`](../../architecture/wiki/screens/62-multiplayer-setup/)
   with a non-blocking toast; `rateLimited` shows a cooldown timer
   matching `retryAfterMs`.
8. Add unit + integration tests:
   - 6th `CREATE_ROOM` from the same `/24` within 60 s is rejected
   - third `JOIN_ROOM` to a 2-peer room is rejected with `ROOM_FULL`
   - 5 wrong-code `JOIN_ROOM` calls within 60 s lock the room code
   - 100 idle-room scenario evicts the oldest before allowing new
     creation
9. Extend `npm run validate:signaling` with a static check that the
   limiter is invoked on every public message handler.

**Dependencies:** Critical Fix 1 (validated message envelope must
exist before rate-limiting can dispatch on `type`).

**Complexity:** **L**

---

### Critical Fix 3 — TURN Provisioning: REST-API Ephemeral Credentials, Server-Issued, Scoped per Session

**Source:** Q488, Q489, Q490, Q491, Q492, Q493, Q495, Q497. Risks
"Bandwidth abuse", "Long-lived shared TURN secrets in client bundle".

**Problem:** TURN is named in
[`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md)
as "Optional TURN server config" with no provider, no credential
type, no TTL, no scope, no issuance protocol. There is no
`TURN_CREDENTIALS` message in the signaling protocol. There is no
shared-secret store, no rotation cadence, no revocation primitive, no
per-session/per-room scope. If the project later adopts a static
`username:password` pair embedded in the client bundle (the easiest
implementer default), any compromised client burns relay bandwidth
indefinitely and the secret cannot be rotated without redeploying
every client.

**Impact:** No NAT-traversal fallback for the ~10–20 % of public
networks where STUN-only fails (corporate, symmetric NAT, mobile CG-NAT
on certain carriers). When TURN is later bolted on under deadline
pressure, the cheapest implementation is also the worst-trust one.

**Solution:** Commit a TURN provider, mandate the **REST-API
ephemeral-credential mechanism** (RFC 7635 + the Twilio/Cloudflare
HMAC-SHA1 long-term-credential variant), make the **signaling server
the only issuer**, scope credentials per `(roomCode, peerId, exp)`,
issue only after admission, and rotate the shared secret out-of-band.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) — extend message list with `TURN_CREDENTIALS` (server → client only, sent right after a successful `JOIN_ROOM` admit and a successful `CREATE_ROOM`); add **TURN Issuance** section
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) — replace "Optional TURN server config" with "TURN URLs + ephemeral credentials received via `TURN_CREDENTIALS`; never read from build-time config"; add **`iceServers` Construction** subsection
- [services/signaling/README.md](../../../services/signaling/README.md) — add **TURN Secret** section: env var `TURN_SHARED_SECRET`, never logged, rotated via secret manager (cross-link Plan 29)
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md) — register `turn-credential.schema.json`
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — register `RECEIVE_TURN_CREDENTIALS`, `TURN_CREDENTIALS_EXPIRED`, `REQUEST_TURN_REFRESH`

**New Files:**
- `content-schema/schemas/turn-credential.schema.json` — `username` (`<exp>:<roomCode>:<peerId>` per RFC), `credential` (base64url HMAC-SHA1 of `username` with shared secret, 28 chars), `urls` (array of `turn:` / `turns:` URLs), `expiresAt` (ms epoch, ≤ now + 5 min), `scope` (`{ roomCode, peerId }` for client-side assertion)
- `docs/architecture/turn-credentials.md` — canonical doctrine:
  - **Provider:** one of `cloudflare-calls` / `twilio-network-traversal` / `coturn-self-host`; the chosen provider is committed in `services/signaling/.env.example` (Cloudflare default for prod, coturn for dev)
  - **Mechanism:** RFC-style long-term-credential with HMAC-SHA1, `username = "<expEpochSeconds>:<roomCode>:<peerId>"`, `credential = base64(hmacSHA1(secret, username))`
  - **TTL:** 300 s (5 min) hard ceiling; refresh path on long matches
  - **Scope:** per `(roomCode, peerId)`; signaling server signs with the active secret, never the previous one
  - **Issuance:** signaling server sends `TURN_CREDENTIALS` immediately after `CREATE_ROOM` succeeds and immediately after `JOIN_ROOM` admits; never on lobby browse (no public lobby per Plan 18) and never in static client bundle (Q492)
  - **Transport:** WSS only (Plan 24 prereq); never Email/SMS/HTTP plain
  - **Rotation:** shared secret rotated out-of-band on a 7-day cadence (cross-link Plan 29 secret-management); the server tracks the **current** and **previous** secrets so credentials issued in the last 5 min before rotation remain valid for their TTL but no new credentials use the previous secret
  - **Revocation-on-end:** when a peer's `room → peer` mapping is removed (DC, kick, room evicted), the signaling server records the `(roomCode, peerId, exp)` triple in a short-lived deny-list; coturn's `--user-quota` 0 hook honors the deny-list (see Critical Fix 4)
  - **Logging:** `turn.issued` event carries `roomCode`, `peerId`, `exp`, **never** the credential or username; PII-scrubbing per Plan 22
- `services/signaling/src/turn/issue.ts` — pure function `issueTurnCredential({ roomCode, peerId, secret, ttlSec, urls, now }): TurnCredential`; no side effects, fully unit-testable
- `services/signaling/src/turn/refresh.ts` — handler for `REQUEST_TURN_REFRESH` (ratelimited per Critical Fix 2)
- `services/signaling/.env.example` — `TURN_PROVIDER`, `TURN_URLS`, `TURN_SHARED_SECRET` placeholders
- `tasks/phase-3/01-multiplayer/11-turn-credentials-issuance.md` — owning task; `ownedPaths` covers `content-schema/schemas/turn-credential.schema.json`, `services/signaling/src/turn/`, `docs/architecture/turn-credentials.md`

**Implementation Steps:**
1. Author `docs/architecture/turn-credentials.md`; link from
   [`CLAUDE.md`](../../../CLAUDE.md) "Protect These Rules" (a future
   implementer must not embed static credentials).
2. Define `turn-credential.schema.json`; add canonical example.
3. Implement `services/signaling/src/turn/issue.ts` with HMAC-SHA1
   over `node:crypto`. Inject the clock for testability.
4. Update `services/signaling/src/server.ts`:
   - on `CREATE_ROOM` success: issue + send `TURN_CREDENTIALS` to the
     creator
   - on `JOIN_ROOM` admit: issue + send `TURN_CREDENTIALS` to the
     joiner (and refresh the host's, since the host's may be stale)
   - on `REQUEST_TURN_REFRESH`: re-issue if the active session is
     still admitted; rate-limit per Critical Fix 2
   - on peer drop / room evict: append `(roomCode, peerId, exp)` to
     the deny-list (TTL = exp + 60 s); push to coturn over its admin
     channel (see Critical Fix 4)
5. Update [`02-webrtc-peer-connection-plus-datachannel-setup.md`](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md):
   `iceServers` is built from the `TURN_CREDENTIALS` payload at
   handshake time; the build never imports a TURN URL/credential
   constant.
6. Add the refresh path: `RTCPeerConnection.iceconnectionstate ===
   'failed'` or `expiresAt - now < 30_000` triggers a single
   `REQUEST_TURN_REFRESH`.
7. Add unit tests:
   - `issueTurnCredential` is deterministic given fixed inputs
   - `username` parses back to `{ exp, roomCode, peerId }`
   - tampered `credential` fails coturn-side HMAC check (assertion
     against a vector)
   - issuing during the rotation window with the previous secret is
     rejected by the active secret store
   - a refresh request from a peer no longer in `room → peer` is
     denied
8. Add CI gate `npm run validate:turn`:
   - greps `src/`, `services/`, `resources/` for any `turn:` /
     `turns:` URL literal — fails (the only allowed source is the
     env var)
   - greps for any hardcoded `username` / `credential` field on an
     `iceServers` object — fails

**Dependencies:** Critical Fix 1 (`TURN_CREDENTIALS` is a new
schema-validated message). Plan 24 (WSS-only transport must be
mandated before TURN credentials traverse it).

**Complexity:** **L**

---

### Critical Fix 4 — TURN-Server Hardening (No Open Relay) + Bandwidth Quotas + Attribution Logs

**Source:** Q494, Q495, Q496. Risks "Open-relay risk".

**Problem:** Q496 — without a hardened coturn / Cloudflare-TURN
config, a deployed TURN instance becomes an open internet relay for
arbitrary traffic the moment it goes live. There is no `--no-tcp-relay`,
no `--denied-peer-ip` allowlist, no realm restriction, no port
allowlist, no per-credential bandwidth cap, and no
`(roomId, peerId)`-keyed access log to correlate abuse.

**Impact:** A single deployed TURN instance with default coturn flags
relays SMTP, SSH, internal-IP probes, etc., for any anonymous client —
a free CDN for botnets, a reputational liability, and a bandwidth
sinkhole that scales linearly with abuse.

**Solution:** Commit a hardened coturn (or Cloudflare Calls /
Twilio-equivalent) configuration, pin the realm + port allowlist,
enforce per-credential bandwidth + concurrent-allocation quotas, and
emit an attribution log keyed by `(roomCode, peerId, exp)`.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) — add **TURN Hardening** section referencing the new config + doctrine
- [services/signaling/README.md](../../../services/signaling/README.md) — note that the TURN service is operationally separate (`services/turn/`) and link
- [docs/architecture/turn-credentials.md](../../architecture/turn-credentials.md) — cross-link the deny-list flow from Critical Fix 3 to coturn's admin channel

**New Files:**
- `services/turn/README.md` — operator-level overview: provider choice, deploy targets, env vars, deny-list integration
- `services/turn/config/turnserver.example.conf` — pinned coturn config:
  - `lt-cred-mech` (long-term-credential mechanism, paired with HMAC issuance from Critical Fix 3)
  - `use-auth-secret` + `static-auth-secret-file` (env-injected; never committed)
  - `realm=heroes-reforged.example` (placeholder)
  - `no-tcp-relay`
  - `no-loopback-peers`
  - `no-multicast-peers`
  - `no-cli` (admin via redis channel only)
  - `denied-peer-ip` ranges: `0.0.0.0-0.255.255.255`, `10.0.0.0-10.255.255.255`, `100.64.0.0-100.127.255.255`, `127.0.0.0-127.255.255.255`, `169.254.0.0-169.254.255.255`, `172.16.0.0-172.31.255.255`, `192.0.0.0-192.0.0.255`, `192.0.2.0-192.0.2.255`, `192.168.0.0-192.168.255.255`, `198.18.0.0-198.19.255.255`, `198.51.100.0-198.51.100.255`, `203.0.113.0-203.0.113.255`, `224.0.0.0-239.255.255.255`, `240.0.0.0-255.255.255.255`, plus IPv6 equivalents (`::1/128`, `fc00::/7`, `fe80::/10`, `ff00::/8`)
  - `min-port=49160`, `max-port=49200` (40 ports, behind a firewall allowlist)
  - `listening-port=3478`, `tls-listening-port=5349`, `alt-listening-port=0`, `alt-tls-listening-port=0`
  - `total-quota=200` (concurrent allocations, tuned to 100 rooms × 2 peers)
  - `user-quota=4` (per-credential concurrent allocations)
  - `max-bps=1500000` (per-allocation; ≈ 1.5 Mbps, sufficient for one match)
  - `bps-capacity=300000000` (300 Mbps total instance ceiling)
  - `stale-nonce=600`
  - `cipher-list="ECDHE+AESGCM:ECDHE+CHACHA20:!aNULL:!eNULL:!RC4:!MD5:!DES:!3DES"`
- `services/turn/scripts/sync-deny-list.ts` — subscribes to the signaling server's deny-list channel; pushes to coturn's redis admin channel; closes active allocations matching `(roomCode, peerId)`
- `services/turn/log/schema.json` — attribution log shape: `{ ts, event, roomCode, peerId, expEpochSeconds, allocId, bytesIn, bytesOut, peerAddr (`/24`-bucketed) }`; **never** logs the credential, username, or full peer IP
- `tasks/phase-3/01-multiplayer/12-turn-server-hardening.md` — owning task; `ownedPaths` covers `services/turn/`

**Implementation Steps:**
1. Choose provider for prod (Cloudflare Calls = managed, no
   open-relay risk; coturn = self-host with the hardened config).
   Commit the choice in `services/turn/README.md`.
2. Author `services/turn/config/turnserver.example.conf` per the
   block above. Annotate every flag with a one-line rationale.
3. Implement `services/turn/scripts/sync-deny-list.ts`. Use Redis
   pub/sub (or coturn's HTTP admin if Cloudflare-managed) to push
   `(roomCode, peerId)` revocations.
4. Define the attribution log schema; ensure the structured logger
   redacts `username` / `credential` / full peer IP per Plan 22.
5. Add a smoke test: `coturn -c turnserver.example.conf` boots,
   accepts a valid HMAC credential, and **rejects** an allocation
   request whose `peer-address` is in `192.168.0.0/16`.
6. Add a load-test fixture: 4 concurrent allocations under one
   credential succeed; the 5th is rejected with `486 Allocation
   Quota Reached` (matches `user-quota=4`).
7. Document the runbook for rotating `static-auth-secret-file`
   without dropping in-flight allocations (cross-link Plan 29).
8. Add CI gate `npm run validate:turn-config`:
   - asserts the example config sets `no-tcp-relay`,
     `no-loopback-peers`, `no-multicast-peers`, `lt-cred-mech`,
     `realm`, `min-port`, `max-port`, `user-quota`, `max-bps`,
     `total-quota`
   - asserts every IPv4 + IPv6 private/loopback/multicast range is
     in `denied-peer-ip`
   - rejects any commit that adds `cli-password` (admin via Redis
     only)

**Dependencies:** Critical Fix 3 (HMAC issuance must use the same
`static-auth-secret-file` that coturn validates against). Plan 29
(secret rotation flow).

**Complexity:** **L**

---

### Critical Fix 5 — Edge-Tier Defense + Health-Endpoint Segregation + TURN-Down Fallback

**Source:** Q499, Q505 (idle), Q508, Q509, Q510, Q513.

**Problem:** No reverse-proxy / WAF / CONNECT-flood contract
([`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
names "Fly.io / Railway" only). No CAPTCHA escalation. No time-bound
blocklist (a future bare-IP ban becomes permanent collateral on
shared NAT). No `/healthz` / `/metrics` segregation — once the hosting
platform's probe fires, default `/healthz` reveals Node version and
build SHA, fingerprinting the deploy for targeted CVE chaining. No
explicit policy when TURN itself is down — the WebRTC task says TURN
is optional but does not say what the user sees on a hard relay
failure.

**Impact:** A 100-host botnet exhausts sockets in seconds; a single
attacker's repeated abuse triggers a manual IP ban that punishes a
whole CG-NAT cohort indefinitely; a Node version gets chained to a
public CVE within the first week of M5; a real corporate-NAT user sees
"Connecting…" forever with no actionable message when TURN is down.

**Solution:** Author one canonical edge-defense doc, extend the
existing edge.example.toml from Plan 24 with the new clauses, segregate
health/metrics on a private path with shared-secret auth, wire CAPTCHA
escalation hooks (off by default; activated when limiter counters
breach a threshold), and surface an explicit TURN-down UI.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) — add **Edge Tier**, **Health & Metrics**, **CAPTCHA Escalation**, and **Blocklist** sections referencing the new doctrine; extend `Verify` with `npm run validate:edge`
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) — add **TURN-Down Fallback** clause; `iceTransportPolicy` defaults to `'all'`; on `iceconnectionstate === 'failed'` after a single TURN refresh attempt, surface explicit failure
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md) — add **Connection-Failure States** subsection: `relayUnavailable`, `rateLimited`, `roomFull`, `codeLocked`, each with copy and an action (retry / change network / new code)
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md) — add `OnRelayUnavailable`, `OnCaptchaRequired` handlers
- [services/signaling/config/edge.example.toml](../../../services/signaling/config/edge.example.toml) — extend Plan 24's transport-only config with: per-prefix CONNECT cap (`8 sockets / /24`), upgrade-flood limit (`30 upgrades / min / /24`), health path block (`/healthz` + `/metrics` only via internal port 9091 with shared-secret header), `Server` header redaction
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — register `CONNECTION_FAILED_RELAY_UNAVAILABLE`, `CAPTCHA_REQUIRED`, `CAPTCHA_VERIFIED`, `IP_BLOCKLISTED`

**New Files:**
- `docs/architecture/signaling-edge-defense.md` — canonical doctrine: per-prefix socket cap, upgrade-flood threshold, CAPTCHA escalation rule (Cloudflare Turnstile or hCaptcha; only triggered when limiter counters breach `2× burst` for ≥ 60 s), time-bound blocklist (15 min auto / 24 h escalated / 7 d max; `/24` v4 + `/64` v6; in-memory with optional Redis persistence)
- `docs/architecture/signaling-health-endpoints.md` — health/metrics segregation rule: public port serves only WebSocket upgrade + the bare `200 OK` for the platform LB liveness probe (no version, no build SHA, no headers beyond `Server: signaling`); admin port `9091` on a private interface serves `/healthz` / `/metrics` with `Authorization: Bearer ${ADMIN_TOKEN}` required
- `docs/architecture/turn-fallback-policy.md` — canonical fallback: try `iceServers: [stun, turn]` first; on `iceconnectionstate === 'failed'`, request one `REQUEST_TURN_REFRESH`; on second failure within 10 s, dispatch `CONNECTION_FAILED_RELAY_UNAVAILABLE` with copy "Direct connection blocked — try a different network or wait a moment and retry." Never silently continue with `iceTransportPolicy: 'relay'` only (privacy regression) and never auto-retry beyond once (DoS amplification risk)
- `services/signaling/src/admin/health.ts` — admin server bound to `127.0.0.1:9091`, requires shared-secret header, returns minimal JSON
- `services/signaling/src/blocklist/store.ts` — time-bound blocklist with `/24` + `/64` keying; in-memory map keyed by prefix → `expiresAt`; CRUD API `add`, `check`, `evict`
- `services/signaling/src/captcha/turnstile.ts` — Turnstile verify wrapper; only loaded when `CAPTCHA_PROVIDER` env var is set
- `tasks/phase-3/01-multiplayer/13-edge-defense-and-health-segregation.md` — owning task

**Implementation Steps:**
1. Author the three new doctrine docs:
   `signaling-edge-defense.md`, `signaling-health-endpoints.md`,
   `turn-fallback-policy.md`. Cross-link from
   [`CLAUDE.md`](../../../CLAUDE.md) and from the multiplayer module
   page.
2. Extend `services/signaling/config/edge.example.toml` (created by
   Plan 24) with the new clauses. Annotate per directive.
3. Implement `services/signaling/src/blocklist/store.ts`. Wire it
   into the upgrade-handler: blocklisted prefix ⇒ HTTP 403 with no
   body. Auto-add a prefix when its limiter counter breaches the
   `1× burst` threshold for ≥ 60 s; auto-remove on TTL expiry.
4. Implement `services/signaling/src/admin/health.ts` bound to
   `127.0.0.1:9091`. Public listener serves only the upgrade path
   plus a single empty `200 OK` to platform-LB requests; the public
   `Server` header is set to `Server: signaling` (no version).
5. Add CAPTCHA escalation hook: when per-prefix
   `CREATE_ROOM` rate breaches `2× burst` for ≥ 60 s, the next
   `CREATE_ROOM` returns `ERROR{code:"captchaRequired", token}`; the
   client (lobby) renders a Turnstile widget; the verified token is
   replayed on the retry. Stub provider in dev (env-controlled
   bypass).
6. Implement the TURN-down fallback in
   `src/net/webrtc/peer-connection.ts`: on
   `iceconnectionstate === 'failed'`, dispatch
   `REQUEST_TURN_REFRESH` once; if the next state is again `failed`
   within 10 s, dispatch `CONNECTION_FAILED_RELAY_UNAVAILABLE` and
   close the connection.
7. Update [`64-network-lobby`](../../architecture/wiki/screens/64-network-lobby/)
   to render the four failure states from the spec block. Reuse the
   toast / banner pattern established by Plan 23.
8. Add CI gate `npm run validate:edge`:
   - asserts `services/signaling/config/edge.example.toml` defines
     the per-prefix CONNECT cap, upgrade-flood limit, and health-path
     block
   - asserts public listener never exposes `/healthz` or `/metrics`
     (greps the bootstrap)
   - asserts the bootstrap binds the admin server to `127.0.0.1` and
     requires `ADMIN_TOKEN`
9. Add tests:
   - blocklisted prefix: HTTP 403 on upgrade
   - prefix auto-added after sustained breach, auto-removed at TTL
   - admin endpoint requires the bearer header
   - public response headers contain no version string
   - TURN-failed → refresh-once → fail → `CONNECTION_FAILED_RELAY_UNAVAILABLE`
     (no third retry, no silent fallthrough)

**Dependencies:** Critical Fix 2 (limiter counters drive the
escalation rules). Critical Fix 3 (`REQUEST_TURN_REFRESH` exists).
Plan 22 (PII-scrub log shape for the admin endpoint).

**Complexity:** **M**

---

## 3. System Improvements

Items that are not on the active-attack path but materially improve
operability, observability, and future-proofing.

### UI / Screens

#### Issue: Lobby surfaces relay failure as a non-blocking, actionable toast

**Source:** Q499, Q511.

**Problem:** [`64-network-lobby/spec.md`](../../architecture/wiki/screens/64-network-lobby/spec.md)
does not enumerate the failure states `relayUnavailable`,
`rateLimited`, `roomFull`, `codeLocked`. Without explicit copy and an
action, the screen falls back to "Connecting…" indefinitely.

**Impact:** Users on symmetric NAT churn through the same code with no
guidance; rate-limited users believe the server is broken.

**Solution:** Add the four failure-state rows to `spec.md`, the
`On*` handlers to `interactions.md`, and an `errorState` field to
`data-contracts.md`.

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md)
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md)
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../../architecture/wiki/screens/64-network-lobby/data-contracts.md)

**Implementation Steps:**
1. Add **Connection-Failure States** subsection enumerating the four
   states with copy.
2. Add `OnRelayUnavailable`, `OnRateLimited`, `OnRoomFull`,
   `OnCodeLocked` handlers; each dispatches one of the new commands
   from Critical Fixes 2/5.
3. Add `state.lobby.errorState: { kind, retryAfterMs?, message }` to
   `data-contracts.md`.

**Dependencies:** Critical Fixes 2 + 5.

**Complexity:** **S**

#### Issue: Multiplayer-setup screen documents TURN provisioning expectation

**Source:** Q488, Q492.

**Problem:** [`62-multiplayer-setup`](../../architecture/wiki/screens/62-multiplayer-setup/)
does not state that TURN credentials are issued **after** room
creation, not at app launch.

**Impact:** A future redesign embeds TURN credentials in the static
client bundle "for convenience", reintroducing the long-lived-secret
risk.

**Solution:** Add a one-paragraph **TURN Provisioning** note to
`62-multiplayer-setup/architecture.md` referencing `turn-credentials.md`.

**Files to Update:**
- [docs/architecture/wiki/screens/62-multiplayer-setup/architecture.md](../../architecture/wiki/screens/62-multiplayer-setup/architecture.md)

**Complexity:** **S**

---

### Data Contracts

#### Issue: TURN credential schema registered in schema-matrix and example coverage

**Source:** Q488.

**Problem:** Schema-matrix has no row for TURN credentials.

**Solution:** Register `turn-credential.schema.json` and
`signaling-message.schema.json` in
[`docs/architecture/schema-matrix.md`](../../architecture/schema-matrix.md);
add canonical examples; ensure `npm run validate` covers them.

**Files to Update:**
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md)

**New Files:**
- `content-schema/examples/turn-credential/valid-issued.json`
- `content-schema/examples/turn-credential/expired.json`

**Complexity:** **S**

#### Issue: Command-schema entries for new trust / rate / TURN events

**Source:** Q495, Q499, Q509, Q510.

**Problem:** No commands exist for `SIGNALING_RATE_LIMITED`,
`CAPTCHA_REQUIRED`, `IP_BLOCKLISTED`, `TURN_CREDENTIALS_EXPIRED`,
`CONNECTION_FAILED_RELAY_UNAVAILABLE`.

**Solution:** Register all of them in
[`docs/architecture/command-schema.md`](../../architecture/command-schema.md)
with payload shapes that align with
`content-schema/schemas/signaling-message.schema.json`.

**Files to Update:**
- [docs/architecture/command-schema.md](../../architecture/command-schema.md)

**Complexity:** **S**

---

### Schemas

Already covered exhaustively in Critical Fixes 1 and 3:
`signaling-message.schema.json` (Fix 1) and
`turn-credential.schema.json` (Fix 3). Listed here only as a pointer
for the schema-matrix / validate-tasks gate.

---

### Architecture

#### Issue: Stateless-by-design audit checklist

**Source:** Q512.

**Problem:** Audit Q512 marks the signaling server as ⚠ Partial:
stateless-by-design is written down, but there is no **mechanical**
gate that prevents a future contributor from adding a persistent
field. Audits 26 / 31 will rely on this property.

**Impact:** A "small caching addition" silently introduces session
history; a live-instance compromise then leaks more than the audit
assumed.

**Solution:** Add an explicit **Stateless Invariant** clause to the
signaling task spec + a CI gate.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)

**New Files:**
- `docs/architecture/signaling-stateless-invariant.md` — what is
  allowed in memory (current rooms, in-flight SDP/ICE, deny-list
  entries with TTL ≤ 1 h, rate-limit counters with TTL ≤ 1 h); what
  is forbidden (any disk write, any DB connection, any
  cross-restart cache, any user-correlated history beyond a single
  connection's lifetime)
- CI script `services/signaling/scripts/check-stateless.ts`:
  - greps the source for forbidden imports (`fs.write*`,
    `node:fs/promises`, `pg`, `mysql`, `mongodb`, `redis` *except*
    in `services/signaling/src/blocklist/`/`captcha/` where it is
    explicitly opt-in and TTL-bound)
  - asserts no `await` on file-system writes outside whitelisted
    modules

**Implementation Steps:**
1. Author the doctrine doc; cross-link from [`CLAUDE.md`](../../../CLAUDE.md).
2. Implement the gate; wire into `npm run validate`.
3. Add the **Stateless Invariant** subsection to the task spec.

**Dependencies:** None.

**Complexity:** **S**

#### Issue: TURN credential rotation runbook

**Source:** Q493.

**Problem:** No documented rotation cadence or runbook for
`TURN_SHARED_SECRET`. Plan 29 owns secret-management broadly, but the
TURN-specific dual-secret window (current + previous, 5-minute
overlap) is unique to this credential and belongs in this plan.

**Solution:** Add a **Rotation** subsection to
`docs/architecture/turn-credentials.md` describing the dual-secret
overlap window, the deploy order (signaling reads new env var; coturn
reloads), and the rollback path.

**Files to Update:**
- [docs/architecture/turn-credentials.md](../../architecture/turn-credentials.md)
  (created in Critical Fix 3)

**Complexity:** **S**

---

### Tasks

#### Issue: Owning tasks for the new doctrine + schema + service surfaces

**Source:** All ❌ items, plus the task-system invariant
(`validate:tasks`) that every schema and screen change has an
owning task.

**Problem:** The five Critical Fixes introduce ten new artifacts.
Without owning task files, `npm run validate:tasks` fails on the
unowned-path check.

**Solution:** Five new task files, one per Critical Fix, with
`Owned Paths`, `Dependencies`, `verifyCommands`, and `Read First`
filled per [`CLAUDE.md`](../../../CLAUDE.md):

- `tasks/phase-3/01-multiplayer/09-signaling-message-schema-and-validation.md` (Fix 1)
- `tasks/phase-3/01-multiplayer/10-signaling-rate-limits-and-room-cap.md` (Fix 2)
- `tasks/phase-3/01-multiplayer/11-turn-credentials-issuance.md` (Fix 3)
- `tasks/phase-3/01-multiplayer/12-turn-server-hardening.md` (Fix 4)
- `tasks/phase-3/01-multiplayer/13-edge-defense-and-health-segregation.md` (Fix 5)

Each task lists `phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby`
as a dependency; tasks 11/12 also depend on Plan 24's transport
task (`09-transport-security-edge-config`); tasks 12/13 depend on
their respective predecessors in this plan.

**Files to Update:**
- [tasks/task-registry.json](../../../tasks/task-registry.json) — regenerated by `npm run generate:task-registry`
- [docs/planning/implementation-log.md](../../planning/implementation-log.md) — add a one-line entry per task on completion

**Complexity:** **S** (mechanical, but five files)

---

## 4. Suggested Task Breakdown

- [ ] **T1** Author `docs/architecture/signaling-message-schema.md` and `content-schema/schemas/signaling-message.schema.json` with example fixtures (Fix 1)
- [ ] **T2** Implement `services/signaling/src/validation/ajv.ts` and wire into the message router (Fix 1)
- [ ] **T3** Pin `ws` hardening defaults in `services/signaling/src/config.ts` and bootstrap (Fix 1)
- [ ] **T4** Add CI gate `npm run validate:signaling` (Fix 1)
- [ ] **T5** Author `docs/architecture/signaling-rate-limits.md` (Fix 2)
- [ ] **T6** Implement `services/signaling/src/rate/{token-bucket,limiter}.ts` (Fix 2)
- [ ] **T7** Implement per-room `maxPeers` enforcement + idle-room eviction (Fix 2)
- [ ] **T8** Surface lobby failure states in `64-network-lobby` package (Fix 2 + Fix 5)
- [ ] **T9** Author `docs/architecture/turn-credentials.md` (Fix 3)
- [ ] **T10** Define `content-schema/schemas/turn-credential.schema.json` + examples (Fix 3)
- [ ] **T11** Implement `services/signaling/src/turn/{issue,refresh}.ts` (Fix 3)
- [ ] **T12** Wire `TURN_CREDENTIALS` issuance into `CREATE_ROOM` / `JOIN_ROOM` flows (Fix 3)
- [ ] **T13** Replace static TURN config in `02-webrtc-peer-connection-plus-datachannel-setup.md` with runtime `iceServers` from `TURN_CREDENTIALS` (Fix 3)
- [ ] **T14** Add CI gate `npm run validate:turn` (Fix 3)
- [ ] **T15** Author `services/turn/README.md` and pinned `turnserver.example.conf` (Fix 4)
- [ ] **T16** Implement `services/turn/scripts/sync-deny-list.ts` (Fix 4)
- [ ] **T17** Define TURN attribution log schema with PII-scrub (Fix 4)
- [ ] **T18** Add CI gate `npm run validate:turn-config` (Fix 4)
- [ ] **T19** Author the three edge-tier doctrine docs (Fix 5)
- [ ] **T20** Extend `services/signaling/config/edge.example.toml` with edge defenses (Fix 5)
- [ ] **T21** Implement `services/signaling/src/blocklist/store.ts` and upgrade-handler integration (Fix 5)
- [ ] **T22** Implement `services/signaling/src/admin/health.ts` on private port + bearer-auth (Fix 5)
- [ ] **T23** Implement CAPTCHA escalation (`captcha/turnstile.ts`) gated by env var (Fix 5)
- [ ] **T24** Implement TURN-down fallback in `src/net/webrtc/peer-connection.ts` and surface in lobby (Fix 5)
- [ ] **T25** Add CI gate `npm run validate:edge` (Fix 5)
- [ ] **T26** Author `docs/architecture/signaling-stateless-invariant.md` + `check-stateless.ts` gate (Improvement)
- [ ] **T27** Add TURN-credential rotation runbook subsection (Improvement)
- [ ] **T28** Register all new schemas / commands / screens in matrix + command-schema (Improvement)
- [ ] **T29** Author the five owning task files (`09`–`13`) and regenerate `tasks/task-registry.json` (Tasks)
- [ ] **T30** Wire all new validators into `npm run validate` and `npm run validate:tasks`

---

## 5. Execution Order

The order respects dependency direction (each step assumes its
predecessors landed) and front-loads the items that block the most
downstream surface.

1. **T29** — author the five new task files first so every later
   commit has a registered owner; regenerate the registry.
2. **T1, T2, T3, T4** — Critical Fix 1 (schema + AJV + payload caps +
   CI). Unblocks every later message-shape change in this plan.
3. **T26** — stateless-invariant gate; cheap, prevents drift while
   the rate-limit and blocklist code lands.
4. **T5, T6, T7, T8** — Critical Fix 2 (rate-limit matrix + room
   cap + lobby failure states). Depends on T1–T4.
5. **T9, T10, T11, T12, T14** — Critical Fix 3 server-side TURN
   issuance. Depends on T1–T4 (uses the validated message envelope).
   Plan 24's transport-security must also be present.
6. **T13** — wire TURN runtime on the WebRTC client. Depends on T12.
7. **T15, T16, T17, T18** — Critical Fix 4 coturn hardening. Depends
   on T11 (shares the HMAC secret).
8. **T19, T20, T21, T22, T25** — Critical Fix 5 edge defense + health
   segregation. Depends on T6 (limiter counters drive escalation).
9. **T23** — CAPTCHA escalation (env-gated; can ship dark).
10. **T24** — TURN-down fallback in WebRTC layer + lobby UI.
    Depends on T13.
11. **T27, T28** — rotation runbook + matrix/command-schema
    registration. Final cleanup before validation.
12. **T30** — wire every new validator into `npm run validate` and
    `npm run validate:tasks`; only then run the full validation.

---

## 6. Risks if Not Implemented

- **Trivial DoS on day one of M5 public.** No rate limit + no
  payload cap + 100-room global ceiling = a single attacker fills the
  ceiling in seconds and stalls the event loop with megabyte SDPs
  (Q500, Q502, Q503). Recovery requires manual restart per attacker
  burst.
- **Open relay if TURN bolted on without hardening.** A naïve
  coturn deploy without `--no-tcp-relay`, `--denied-peer-ip`, or
  static-auth-secret mode is reachable from the public internet for
  arbitrary protocols (Q496). Bandwidth bill, IP blocklisting, and
  reputational exposure all scale linearly with abuse.
- **Long-lived TURN secrets in client bundle.** The cheapest
  implementer default — embedding a `username:password` pair in the
  build — survives forever in HTTP archives and JS source maps; any
  user (or attacker who skimmed the bundle) burns relay bandwidth
  indefinitely (Q488, Q491, Q492, Q494).
- **In-memory map corruption from malformed messages.** Without
  schema validation, a crafted `roomId` (e.g., a 1 MiB string) or an
  unexpected field in `OFFER` is forwarded verbatim and used as a map
  key, compounding the SDP/ICE injection risk in Plan 24 (Q506).
- **Slowloris and CONNECT-flood unaddressed.** Default `ws` allows
  arbitrary-slow handshake and frame assembly; default platform
  edge has no per-prefix CONNECT cap (Q507, Q508). 100 botnet hosts
  = 100 sockets held = full pool exhausted.
- **Permanent collateral on shared NAT.** A future bare-IP ban with
  no time bound and no `/24` / `/64` keying punishes whole CG-NAT
  cohorts indefinitely (Q510, Q501).
- **Per-room join-storm room exhaustion.** Even with the 2-seat
  client UI, an attacker drains `room.peers` memory with rapid
  `JOIN_ROOM` from spoofed peer IDs before the host's UI realizes
  the room is full (Q511).
- **Fingerprinting via default health endpoints.** Once Fly.io /
  Railway probes are wired, a default `/healthz` reveals Node /
  build / dependency versions, enabling targeted CVE chaining in
  the first week of M5 (Q513).
- **Silent failure on TURN down.** Without an explicit
  `CONNECTION_FAILED_RELAY_UNAVAILABLE` UI, a real corporate-NAT
  user sees "Connecting…" forever — the worst of both worlds (no
  retry guidance, no actionable error). Inverse risk: silent
  fallthrough to `iceTransportPolicy: 'all'` after relay failure
  leaks the user's IP in a "we said we'd relay" build (Q499).

---

## 7. AI Implementation Readiness

**Score: 8 / 10**

After this plan lands:

- An autonomous implementer reading the signaling task spec finds a
  named **Message Validation** section pointing at
  `signaling-message.schema.json` and an AJV gate, a **Rate-Limit
  Matrix** with explicit thresholds and exhaustion responses, a
  **TURN Issuance** section with the HMAC formula, and a **Stateless
  Invariant** that mechanically rejects accidental persistence.
- The WebRTC task spec mandates `iceServers` from runtime
  `TURN_CREDENTIALS` only; a CI gate rejects any committed
  `turn:` URL.
- The TURN-server config is committed as a hardened example;
  every dangerous flag (`no-tcp-relay`, `denied-peer-ip`,
  `user-quota`) is checked in CI.
- Edge defenses (per-prefix CONNECT cap, upgrade-flood limit,
  CAPTCHA escalation hook, time-bound `/24` + `/64` blocklist) are
  pinned in `services/signaling/config/edge.example.toml` with a
  `validate:edge` gate.
- Health/metrics are bound to a private admin port with
  bearer-auth; the public listener redacts version and build info.
- Lobby UI surfaces every named failure state (`relayUnavailable`,
  `rateLimited`, `roomFull`, `codeLocked`) with copy and an action.
- TURN-down fallback policy is explicit: one refresh attempt, then
  a surfaced `CONNECTION_FAILED_RELAY_UNAVAILABLE`; never silent.

The remaining 2 / 10 reflects two genuinely-policy items that this
plan deliberately defers to operations:

1. **Long-term blocklist persistence beyond restart.** This plan
   keeps the blocklist in-memory by default (TTL ≤ 7 d) and notes
   Redis-backed persistence as opt-in. A managed-host operator may
   need a stronger policy for repeat offenders that survive across
   deploys; that is an operational rather than spec gap.
2. **Multi-region TURN failover.** The plan pins one provider per
   environment. Globally distributed TURN with health-aware
   selection is out of scope for M5 and is left to a future
   "multi-region multiplayer" plan.

Closing those last two would lift this to 10 / 10, but they are not
on the critical path for shipping a public M5 build that survives
casual abuse and casual symmetric-NAT users.
