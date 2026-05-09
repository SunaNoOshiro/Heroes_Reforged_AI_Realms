# Implementation Plan: 24 — TLS/WSS Enforcement & WebRTC Authentication

> Source audit: [docs/archive/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](../readiness-audit/24-tls-enforcement-and-webrtc-authentication.md)
> Audit AI-Readiness score at time of writing: **1 / 10** — target after this plan: **8 / 10**.
> The original audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic, and Risk item from Q461–Q487 into
> concrete, executable work items grounded in existing artifacts:
> [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md),
> [`tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md`](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md),
> [`tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md`](../../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md),
> [`tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md`](../../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md),
> [`tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`](../../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md),
> [`tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md`](../../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md),
> [`docs/architecture/wiki/screens/64-network-lobby/`](../../architecture/wiki/screens/64-network-lobby/),
> [`docs/architecture/wiki/screens/62-multiplayer-setup/`](../../architecture/wiki/screens/62-multiplayer-setup/),
> [`docs/architecture/ai-integration.md`](../../architecture/ai-integration.md),
> [`docs/architecture/ai-generation-pipeline.md`](../../architecture/ai-generation-pipeline.md),
> [`docs/architecture/command-schema.md`](../../architecture/command-schema.md),
> [`services/signaling/README.md`](../../../services/signaling/README.md),
> [`services/ai-gateway/README.md`](../../../services/ai-gateway/README.md),
> and adjacent plans **07** (multiplayer), **18** (room codes), **19**
> (chat safety), **22** (privacy / retention / error leaks), **26**
> (replay tampering), **29** (rate limiting / secret management), **31**
> (trust boundaries / logging / monitoring).

---

## 1. Overview

Audit 24 evaluated 27 questions across two themes — **web-tier
transport hardening** (Q461–Q474) and **WebRTC peer authentication**
(Q475–Q487). **26 of 27 resolved to ❌ UNKNOWN or ⚠ Partial; only Q484
is "✔ Defined", and that answer is itself an admission that channels
are separated by label string only.**

The repository today specifies *what* the multiplayer stack does
(input-only lockstep, per-turn hash exchange, log-range reconnect,
heartbeat host migration) but says **nothing** about:

1. **Transport-layer hardening** — no `wss://`-only listener, no
   `https://`-only edge, no HSTS, no CSP, no SRI, no CORS allowlist,
   no certificate-lifecycle policy, no TLS-error logging.
2. **Peer-identity primitives** — no keypair, no session token, no
   challenge/response, no signed SDP / ICE / `HOST_CHANGED` /
   `PEER_DISCONNECTED`, no DTLS-fingerprint pinning.
3. **Application-layer integrity** — commands rely on DTLS only; no
   HMAC over `{seq, playerId, turn, command}`; no anti-replay nonce on
   signaling messages.
4. **Channel discipline** — no DataChannel label allowlist; arbitrary
   labels accepted by `ondatachannel`.
5. **Abandon-fraud contract** — no quorum / signature on
   `PEER_DISCONNECTED` so the surviving peer cannot distinguish a real
   disconnect from a forged one.

A naive autonomous implementer following the current task spec ships a
plain-`ws://` signaling server with no auth, no rate limits, no header
policy, and forwards SDP/ICE blobs verbatim — a textbook MITM target.
This plan formalizes:

1. A **canonical transport-security doctrine**
   (`docs/architecture/transport-security.md`) — HTTPS/WSS-only, HSTS,
   anti-downgrade, mixed-content rule, hosting/cert-rotation policy.
2. A **canonical web-tier headers contract**
   (`docs/architecture/web-headers.md`) — CSP baseline, SRI rule, CORS
   allowlist, `Referrer-Policy`, `upgrade-insecure-requests`.
3. A **peer-identity schema**
   (`content-schema/schemas/peer-identity.schema.json`) and a
   `state.profile.peerKeypair` slice — an Ed25519 keypair persisted in
   the user profile, used to sign every outbound signaling/handshake
   message.
4. A **session-token contract** issued by the host on `JOIN_ROOM` and
   replayed by the joiner on every signaling frame; the signaling
   server validates the token before relaying SDP/ICE.
5. An **end-to-end signaling-message envelope**
   (`signaling-envelope.schema.json`) — `{ payload, signerId, sig,
   nonce, iat }` wrapping every `OFFER` / `ANSWER` / `ICE_CANDIDATE` /
   `HOST_CHANGED` / `PEER_DISCONNECTED` so a malicious signaling host
   cannot impersonate, swap fingerprints, or inject candidates.
6. A **DTLS-fingerprint pinning store** (`state.net.peers[*].dtlsFp`)
   with abort-on-mismatch on reconnect, surfacing
   `Connection identity changed` to the user.
7. An **HMAC'd command stream** — derive a per-session key from the
   DTLS exporter (`exportKeyingMaterial`) and HMAC every `{seq,
   playerId, turn, command}` envelope; mismatched HMAC = drop +
   forfeit.
8. A **DataChannel label allowlist** (`commands`, `heartbeat`, plus
   future `chat` if added) enforced in `ondatachannel`; any
   non-allowlisted label is closed immediately and surfaces a
   trust-violation event.
9. A **quorum-attested disconnect contract** so the forfeit/abandon
   path triggers only when ≥1 peer's heartbeat-loss observation is
   corroborated by the signaling server *and* signed with the elected
   host's keypair.
10. A **TLS-error log channel** with PII-redacted fields (no IP, no UA
    tail; `/24` bucket for IPv4, `/64` for IPv6) wired through the
    signaling server's structured logger.
11. **CI gates** rejecting (a) `ws://` URLs in `services/signaling/`,
    (b) `http://` URLs in `services/ai-gateway/` or web-shell config,
    (c) commits touching the signaling/AI services without an HSTS or
    CSP entry in their respective config.

This plan **only formalizes missing artifacts** — no gameplay rules
are invented. Where audits 07 / 18 / 22 / 26 / 29 / 31 already
produced plans, this plan **defers** to those artifacts and adds only
the transport-security and peer-authentication surface that connects
them.

**Overall readiness state:** 1 / 10 (per audit). Closing the items
below lifts this to 8 / 10, which is the threshold for letting agents
ship a public-facing M5 multiplayer build without inventing
trust-boundary decisions.

---

## 2. Critical Fixes (Must Do First)

These five items are the *active risk surface* (signaling-server MITM,
silent IP/cert downgrade, host impersonation, command replay, forged
disconnect) and must land before any public-facing M5 build.

### Critical Fix 1 — Mandate WSS-Only Signaling, HTTPS-Only AI Gateway, HSTS at the Edge

**Source:** Q461, Q462, Q463, Q464, Q466, Q470, Q472. Risks "Trivial
signaling-server MITM", "No HSTS / no anti-downgrade".

**Problem:** [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
names "any stateless container (Fly.io, Railway)" but never pins the
URL scheme; plain `ws://` is implicitly allowed. The AI gateway and
the web shell have no equivalent transport contract. There is no HSTS
clause, no anti-downgrade clause, and no production / dev cert
separation.

**Impact:** A first-visit user can be served plain HTTP and silently
upgraded to a captive-portal MITM; the signaling server can be hosted
on `ws://`, and the AI gateway on `http://`, by an autonomous
implementer following the literal task spec. DTLS protects only the
*negotiated* peers — not whether the signaling layer is trustworthy.

**Solution:** Author one canonical doctrine doc + extend three task
specs + add a CI gate.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) — add **Transport** section: WSS-only, plain WS rejected at the listener, TLS 1.2+, ECDHE cipher allowlist, HSTS at the edge
- [services/signaling/README.md](../../../services/signaling/README.md) — pin `wss://` URL scheme + reverse-proxy/edge requirements
- [services/ai-gateway/README.md](../../../services/ai-gateway/README.md) — pin `https://` only, TLS 1.2+, reject `http://` upstream
- [docs/architecture/ai-integration.md](../../architecture/ai-integration.md) — add **Transport** clause referencing the new doctrine doc
- [docs/architecture/ai-generation-pipeline.md](../../architecture/ai-generation-pipeline.md) — same transport clause
- [tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md](../../../tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md) — invite links use `https://` only; deep-link parser rejects `http://`

**New Files:**
- `docs/architecture/transport-security.md` — canonical doctrine: HTTPS-only, WSS-only, HSTS `max-age=63072000; includeSubDomains; preload`, TLS 1.2+ floor, weak-cipher exclusion, anti-downgrade rule, dev-cert exclusion in production builds, hosting/cert-rotation policy (Let's Encrypt + auto-renew + alert if expiry < 14 days)
- `services/signaling/config/edge.example.toml` — example reverse-proxy config (Caddy/Nginx/Fly.io edge) demonstrating the WSS listener, plain-WS rejection, HSTS header, cipher allowlist
- `services/ai-gateway/config/edge.example.toml` — same shape, HTTPS-only
- `tasks/phase-3/01-multiplayer/09-transport-security-edge-config.md` — owning task for edge config + CI gate

**Implementation Steps:**
1. Author `docs/architecture/transport-security.md` with explicit
   rules, link from `docs/architecture/README.md` and the `Protect
   These Rules` block in [`CLAUDE.md`](../../../CLAUDE.md).
2. Add a **Transport** section to the signaling task with these
   subsections: `Listener`, `TLS`, `Cipher Allowlist`, `Cert
   Lifecycle`, `Anti-Downgrade`, `Dev vs Prod`. Each subsection cites
   the new doctrine doc.
3. Update `services/signaling/README.md` and
   `services/ai-gateway/README.md` to require `wss://` / `https://`
   and link the doctrine doc.
4. Add CI gate `npm run validate:transport`:
   - greps `services/signaling/` and `services/ai-gateway/` for any
     `ws://` or `http://` URL literal (excluding test fixtures
     marked with a sentinel comment); fails on hit
   - asserts the edge config exposes HSTS with `max-age >=
     31536000` and `includeSubDomains`
   - asserts no `NODE_TLS_REJECT_UNAUTHORIZED=0` in production env
     files
5. Wire `validate:transport` into `npm run validate`.
6. Add a startup assertion in the signaling server bootstrap: refuse
   to bind on `ws://` unless `process.env.NODE_ENV === 'test'`.

**Dependencies:** None (extends existing task; doctrine doc is new).

**Complexity:** **M**

---

### Critical Fix 2 — Peer Keypair + Session Token + Signed Signaling Envelope

**Source:** Q475, Q476, Q477, Q481, Q482, Q485, Q487. Risks "Trivial
signaling-server MITM", "Host-claim impersonation", "Disconnect spoof
+ forfeit exploit", "No identity persistence".

**Problem:** Today the room code is the *only* admission credential.
The signaling server forwards `OFFER` / `ANSWER` / `ICE_CANDIDATE` /
`HOST_CHANGED` / `PEER_DISCONNECTED` verbatim with no signature. There
is no per-peer keypair, no host-issued session token, and no
identity binding that survives reconnect. A compromised signaling
server is a transparent MITM to both peers; a malicious peer can
forge `HOST_CHANGED` or `PEER_DISCONNECTED`.

**Impact:** Every multi-peer guarantee in audits 07 / 18 / 26 / 31
silently degrades: host migration is unauthenticated, log-range
replies are unauthenticated, opponent-disconnect events are forgeable,
and SDP/ICE swap by the signaling host is undetectable.

**Solution:** Introduce three contracts that compose into an
end-to-end signed signaling envelope.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) — message list extended with `signerId`, `sig`, `nonce`, `iat`, `sessionToken` fields; server validates token + nonce freshness; relay path verifies *envelope shape* but not the inner signature (peers verify)
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) — peers verify envelope signatures before consuming SDP/ICE
- [tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md](../../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md) — `HOST_CHANGED` is signed by the elected host's keypair; receivers verify against the candidate-host pool snapshot at the last consistent turn
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../../architecture/wiki/screens/64-network-lobby/data-contracts.md) — display name carries `peerId` + signature; reconnect proves continuity by signing the host's challenge
- [docs/architecture/wiki/screens/62-multiplayer-setup/data-contracts.md](../../architecture/wiki/screens/62-multiplayer-setup/data-contracts.md) — first-host action mints `sessionToken` and persists keypair
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — register `MINT_SESSION_TOKEN`, `VERIFY_SIGNALING_ENVELOPE`, `ROTATE_PEER_KEYPAIR`

**New Files:**
- `content-schema/schemas/peer-identity.schema.json` — `peerId` (UUID), `publicKey` (Ed25519, base64url, 32 bytes), `createdAt` (ISO 8601), `displayName` (≤ 24 graphemes, validated per Plan 18)
- `content-schema/schemas/signaling-envelope.schema.json` — `payload` (opaque inner message), `payloadType` (enum: `OFFER` / `ANSWER` / `ICE_CANDIDATE` / `HOST_CHANGED` / `PEER_DISCONNECTED` / `JOIN_ROOM` / `CHALLENGE` / `CHALLENGE_RESPONSE`), `signerId` (UUID), `sig` (Ed25519 over canonicalized `payload || payloadType || nonce || iat || sessionTokenHash`), `nonce` (16-byte base64url), `iat` (ms epoch), `sessionTokenHash` (sha256 of host-issued token, base64url)
- `content-schema/schemas/session-token.schema.json` — `tokenId` (UUID), `roomCode`, `issuerPeerId`, `subjectPeerId`, `iat`, `exp` (≤ 24 h), `nonceWindow` (count of accepted nonces in last N seconds), `sig` (issuer-signed)
- `docs/architecture/peer-identity.md` — canonical identity doctrine: keypair generated on first run, persisted in `state.profile.peerKeypair`, never transmitted as private key, rotation path on user request
- `docs/architecture/signaling-envelope.md` — canonical envelope doctrine: canonicalization rule, replay-window length, clock-skew tolerance (±60 s), abort path on signature failure
- `tasks/phase-1/<schema>/peer-identity-schema.md` — owning task for the schema
- `tasks/phase-3/01-multiplayer/10-peer-keypair-and-session-token.md` — runtime task: keypair generation, session-token mint/verify, envelope sign/verify primitives (`src/net/identity/`)
- `tasks/phase-3/01-multiplayer/11-signed-signaling-envelope.md` — runtime task: wrap every signaling message; surface `Trust violation` on verification failure

**Implementation Steps:**
1. Define `peer-identity.schema.json` and `signaling-envelope.schema.json` per the field lists above; add to `docs/architecture/schema-matrix.md`.
2. Define `session-token.schema.json`; cross-link from `docs/archive/readiness-audit/29-rate-limiting-and-secret-management.md` (token rate-limit lives there).
3. Add `state.profile.peerKeypair: { publicKey, encryptedPrivateKey }` slice; private key encrypted at rest with a profile-bound passphrase derived from `crypto.subtle.deriveKey` over a stable per-install seed (see `docs/architecture/peer-identity.md`).
4. Implement `src/net/identity/keypair.ts` (generate, persist, load, rotate) and `src/net/identity/envelope.ts` (canonicalize, sign, verify). Use WebCrypto Ed25519 (browser), `node:crypto` (server).
5. Update signaling server: on `JOIN_ROOM`, the host mints a `session-token` and signs it with its keypair; the signaling server stores the token hash and validates `sessionTokenHash` + `nonce` freshness on every relayed envelope (rejects duplicates within the replay window).
6. Update peers: every outbound signaling message is wrapped in an envelope; every inbound envelope is verified before consumption. On verification failure, dispatch `TRUST_VIOLATION_DETECTED` (new command) and abort the session.
7. Update `64-network-lobby` to render the verified display name with a small key icon next to verified peers; reconnecting peers must complete the host's `CHALLENGE` round-trip before being readmitted (see Critical Fix 3).
8. Update `07-host-migration-heartbeat-election.md`: `HOST_CHANGED` is signed by the elected host's keypair; receivers verify against the candidate-host pool snapshot frozen at the last consistent turn.
9. Add unit tests for canonicalization (idempotent across implementations), signature roundtrip, replay rejection, clock-skew tolerance, and tampered-envelope rejection.
10. Add a registry-test fixture: a forged envelope (valid shape, wrong signature) is rejected at every relay-consumer touchpoint.

**Dependencies:** Plan 21 (`state.profile.*` namespace), Plan 18
(display-name validator), Plan 22 (audit-log shape for trust
violations), Plan 29 (session-token rate limits).

**Complexity:** **L**

---

### Critical Fix 3 — DTLS Fingerprint Pinning + Reconnect Continuity Challenge

**Source:** Q478, Q479, Q485. Risks "Disconnect spoof + forfeit
exploit", "No identity persistence".

**Problem:** On reconnect (`LOG_REQUEST` flow), peers re-signal and
re-establish a new WebRTC PeerConnection — producing fresh DTLS
fingerprints that are *not* compared to the original session's
fingerprints. Display names are user-supplied strings with no binding,
so a banned/reported peer can rejoin under a new name. There is no
nonce on signaling messages and no documented replay window.

**Impact:** A man-in-the-middle reconnect swap is undetectable; a
rage-quitting peer can rejoin with a different display name and evade
audit 19's report system; old SDP packets are conceptually replayable
inside the room's lifetime window.

**Solution:** Pin DTLS fingerprints per `peerId` in session state;
require a continuity-challenge handshake on every reconnect; cap
signaling-message freshness at ±60 s with a per-`(peerId, sessionId)`
nonce ring buffer.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) — extract DTLS fingerprint from local SDP at handshake; store on `state.net.peers[peerId].dtlsFp`
- [tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md](../../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md) — on reconnect, compare new DTLS fingerprint to stored value; on mismatch, abort with `Connection identity changed` and surface to UI; require `CHALLENGE` / `CHALLENGE_RESPONSE` round-trip signed with original keypair before readmission
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) — server enforces nonce freshness window (±60 s) and rejects duplicates within a 256-entry per-peer ring buffer
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md) — add **Trust** subsection documenting the verified-key icon, fingerprint mismatch banner, and reconnect challenge UI
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md) — `OnTrustViolation(peerId)` handler: render banner, dispatch `LEAVE_ROOM` after 5 s grace
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — register `PIN_DTLS_FINGERPRINT`, `VERIFY_DTLS_FINGERPRINT`, `RECORD_CONTINUITY_CHALLENGE`, `TRUST_VIOLATION_DETECTED`

**New Files:**
- `docs/architecture/dtls-fingerprint-pinning.md` — extraction rule (parse `a=fingerprint:` line from local SDP), storage shape, comparison rule (string-equals, case-insensitive), abort rule
- `docs/architecture/diagrams/31-reconnect-continuity-challenge.md` — Mermaid sequence: peer drop → host rebroadcasts `CHALLENGE(nonce)` → reconnecting peer signs nonce with original keypair → host verifies + readmits or rejects
- `tasks/phase-3/01-multiplayer/12-dtls-fingerprint-pinning.md` — owning task

**Implementation Steps:**
1. Author `docs/architecture/dtls-fingerprint-pinning.md` with extraction grammar and comparison rule.
2. Implement `src/net/dtls/fingerprint.ts`: `extractFromSdp(sdp: string): string`, `compare(a, b): boolean`.
3. Extend `state.net.peers[peerId]` with `dtlsFp: string | null` and `nonceRing: string[]` (ring buffer of last 256 nonces).
4. On initial handshake, populate `dtlsFp` from local SDP after `setLocalDescription` and from remote SDP after `setRemoteDescription`. Persist on host's authoritative state.
5. On reconnect (`LOG_REQUEST` flow): host re-signals; new SDP is parsed; if `dtlsFp` mismatches the stored value, dispatch `TRUST_VIOLATION_DETECTED({ kind: 'dtlsFingerprintMismatch', peerId })` and abort the rejoin.
6. Add the continuity challenge: on every rejoin, host emits `CHALLENGE(nonce)` (signed); reconnecting peer must reply `CHALLENGE_RESPONSE` signed with the *same* keypair as the original session. Mismatched signer = reject.
7. Update `64-network-lobby` UI to render the trust-violation banner and the 5-second grace toast (reuse undo/grace pattern from Plan 23).
8. Add CI test: simulate a DTLS-fingerprint swap mid-reconnect; assert `TRUST_VIOLATION_DETECTED` is dispatched and the rejoin is rejected.

**Dependencies:** Critical Fix 2 (envelope + keypair must exist
first).

**Complexity:** **M**

---

### Critical Fix 4 — HMAC'd Command Stream + Anti-Replay Sequence Discipline

**Source:** Q486 (⚠ Partial). Cross-ref [audit 26 Q517](../readiness-audit/26-replay-tampering-and-simulation-cheating.md), [audit 07 Q145](../readiness-audit/07-multiplayer.md).

**Problem:** Wire format is `{ seq, playerId, turn, command }` (JSON)
delivered over a reliable+ordered DataChannel. Integrity is
"assumed from DTLS alone." There is no HMAC, no per-session derived
key, and no documented duplicate-`seq` policy. A compromised peer
that gains DataChannel write access (post-DTLS) can replay or inject
commands; a desync-mode regression can accept duplicates silently.

**Impact:** The deterministic-lockstep invariant degrades from
"two peers compute identical state from identical inputs" to "two
peers compute identical state from *whatever inputs the channel
delivered*", removing the only application-layer integrity check.

**Solution:** Derive a per-session HMAC key from the DTLS exporter
and HMAC every command envelope. Define a strict duplicate-`seq`
policy.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md](../../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) — extend wire format to `{ seq, playerId, turn, command, mac }`; document key-derivation rule; document duplicate-`seq` policy
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) — derive session key via `RTCDtlsTransport.exportKeyingMaterial()` (where supported) or fallback to a host-issued key delivered through the signed envelope
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — extend command-envelope schema with `mac` field
- [docs/archive/readiness-audit/26-replay-tampering-and-simulation-cheating.md](../readiness-audit/26-replay-tampering-and-simulation-cheating.md) — cross-link this plan from Q517 (do not modify the audit; reference from this plan only)

**New Files:**
- `content-schema/schemas/command-envelope.schema.json` — `seq` (uint32), `playerId` (uint8), `turn` (uint32), `command` (Command), `mac` (sha256-hmac base64url, 32 bytes truncated to 16)
- `docs/architecture/command-stream-integrity.md` — canonical doctrine: key-derivation source (`exportKeyingMaterial('hr-cmd-mac', 32)`), HMAC-SHA256 algorithm, canonicalization rule (deterministic JSON: sorted keys, no whitespace), duplicate-`seq` policy (strict: drop + log; if drop count exceeds N=3 in 30 s, dispatch `TRUST_VIOLATION_DETECTED`), gap-`seq` policy (queue up to T=2 turns, then bisect)
- `tasks/phase-3/01-multiplayer/13-command-stream-hmac.md` — owning task

**Implementation Steps:**
1. Author `docs/architecture/command-stream-integrity.md`.
2. Define `command-envelope.schema.json`; add to `docs/architecture/schema-matrix.md`.
3. Implement `src/net/commands/mac.ts`: `deriveSessionKey(rtcDtls: RTCDtlsTransport): Promise<CryptoKey>`, `sign(envelope, key): Promise<string>`, `verify(envelope, key): Promise<boolean>`.
4. On DataChannel open, derive the per-session key; cache in `state.net.peers[peerId].cmdKey` (non-extractable `CryptoKey`).
5. Browsers without `exportKeyingMaterial` support: fallback to a host-minted 32-byte key delivered through the signed envelope (Critical Fix 2). Document the fallback's reduced-MITM-protection caveat.
6. On every outbound command, compute `mac` over the canonicalized envelope; on every inbound command, verify `mac` and the `(seq, playerId)` invariant. Verification failure or duplicate-`seq` overflow = `TRUST_VIOLATION_DETECTED`.
7. Update `04-per-turn-hash-exchange-plus-desync-detection.md` to include the `mac`-failure count in the desync-detection telemetry (without leaking peer identity per audit 22).
8. Add tests: tamper bit-by-bit on a captured envelope; assert verification fails. Replay an old envelope twice; assert second is dropped. Inject a `mac` from a different session; assert rejection.

**Dependencies:** Critical Fix 2 (signed envelope is the fallback
delivery path), Critical Fix 3 (DTLS pinning closes the swap window
that would otherwise let an attacker derive their own session key).

**Complexity:** **M**

---

### Critical Fix 5 — Quorum-Attested Disconnect & Abandon-Penalty Contract

**Source:** Q487 (⚠ Partial), Risk "Disconnect spoof + forfeit
exploit". Cross-ref [audit 07 Q148](../readiness-audit/07-multiplayer.md).

**Problem:** `PEER_DISCONNECTED` is a signaling-server message with no
per-peer authentication and no quorum requirement. A peer that
controls a tampered client (or a compromised signaling server) can
synthesize a `PEER_DISCONNECTED` for the opponent and trigger the
surviving peer's "30-second / 120-second forfeit-or-wait" path. There
is no abandon-penalty tracker.

**Impact:** Rage-quit / forfeit asymmetry is exploitable: a peer
about to lose can fake the *opponent's* disconnect, claim the win-on-
timeout outcome, and avoid any penalty.

**Solution:** Define a quorum-attested disconnect: the
`PEER_DISCONNECTED` event is consumed only when (a) the surviving
peer's heartbeat-loss observation is corroborated by the signaling
server's connection-close observation *and* (b) the resulting
`PEER_DISCONNECTED` envelope is signed by the elected host (Critical
Fix 2). Add an abandon-penalty record to `state.profile`.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) — `PEER_DISCONNECTED` is now wrapped in the signed envelope and includes both the host's observation and the signaling server's connection-close timestamp
- [tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md](../../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md) — forfeit path requires verified disconnect attestation + host-signed envelope
- [tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md](../../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md) — election rule extends: `HOST_CHANGED` quorum check uses the same envelope path
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md) — render `Awaiting disconnect attestation…` toast during the verification window; render `Forfeit confirmed` only after attestation passes
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — register `RECORD_ABANDON_PENALTY`, `INSPECT_ABANDON_HISTORY`

**New Files:**
- `content-schema/schemas/abandon-penalty.schema.json` — `peerId`, `sessionId`, `observedAt`, `kind` (`heartbeat-loss` / `forced-leave` / `verified-disconnect`), `quorumWitnessIds` (≥ 1 peer + signaling server), `penaltyTier` (`none` / `cooldown-15min` / `leaverboard-flag`)
- `docs/architecture/abandon-penalty.md` — canonical doctrine: 30 s heartbeat-loss window, 120 s grace window, quorum requirement, signaling-server attestation requirement, penalty tiers, decay rule (penalty tier decays one step per N clean sessions)
- `tasks/phase-3/01-multiplayer/14-abandon-penalty-and-quorum-disconnect.md` — owning task

**Implementation Steps:**
1. Author `docs/architecture/abandon-penalty.md`.
2. Define `abandon-penalty.schema.json`.
3. Add `state.profile.abandonHistory: AbandonPenaltyRecord[]` (ring-buffer, capped at 64 most-recent records).
4. On heartbeat loss: surviving peer enters `awaitingDisconnectAttestation` state; signaling server emits its connection-close timestamp; host wraps both into a signed `PEER_DISCONNECTED` envelope (Critical Fix 2).
5. Surviving peer verifies envelope; on success, transitions to forfeit path and dispatches `RECORD_ABANDON_PENALTY` for the dropped peer.
6. On envelope verification failure (or attestation timeout, default 30 s), surface `Disconnect attestation failed — match aborted` and refuse to record a penalty against either peer.
7. Add tests: simulate (a) genuine disconnect → both witnesses agree → penalty recorded; (b) forged `PEER_DISCONNECTED` from a non-host peer → envelope rejected, no penalty; (c) signaling-server attestation absent → timeout, no penalty.

**Dependencies:** Critical Fix 2 (signed envelope), Critical Fix 3
(continuity challenge for ambiguous-rejoin cases).

**Complexity:** **M**

---

## 3. System Improvements

Grouped by system; everything below is non-blocking for the M5 closed
beta but required for a public launch.

### Web Headers / CSP / SRI / CORS

#### Issue: No CSP / SRI / CORS / mixed-content rule

**Source:** Q468, Q469, Q473, Q474. Risk "No CSP / SRI / CORS".

**Problem:** No `Content-Security-Policy` header, no `Subresource
Integrity`, no `Access-Control-Allow-Origin` allowlist. Mixed-content
upgrade is browser-default only. CDN-hosted scripts/styles are not
pinned by hash.

**Impact:** A compromised CDN, a tampered service-worker upgrade, or
a stripped-SSL captive portal can inject scripts/subresources into
the SPA shell without detection.

**Solution:** Author a canonical headers contract; bake into the web
shell's edge config; require SRI on every external script/style; pin
CORS to the canonical origin.

**Files to Update:**
- [services/signaling/README.md](../../../services/signaling/README.md) — `Origin` allowlist on WebSocket upgrade
- [services/ai-gateway/README.md](../../../services/ai-gateway/README.md) — `Access-Control-Allow-Origin` pinned to canonical web origin
- [docs/architecture/pack-contract.md](../../architecture/pack-contract.md) — packs cannot embed external `<script>` / `<link rel="stylesheet">`; if they do, SRI is mandatory and validation rejects on missing/wrong hash

**New Files:**
- `docs/architecture/web-headers.md` — canonical baseline:
  ```
  Content-Security-Policy:
    default-src 'self';
    connect-src 'self' wss://signaling.example.com https://ai.example.com;
    img-src 'self' data:;
    media-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  ```
- `services/web/config/edge.example.toml` — example Caddy/Nginx/Fly.io edge config emitting the headers above
- `tasks/phase-3/<web-shell>/web-headers-edge-config.md` — owning task (lives wherever the web-shell task tree lands)

**Implementation Steps:**
1. Author `docs/architecture/web-headers.md`.
2. Add CI gate `npm run validate:headers`: parses the edge config and asserts every required header is present with conformant values.
3. SRI rule: any external `<script>` / `<link>` in generated HTML must carry `integrity` + `crossorigin` attributes. Add a build-time pre-commit check in the wiki-generator (`scripts/generate-wiki.ts` if present) and the future web-shell builder.
4. CORS rule: signaling server validates `Origin` header on WebSocket upgrade; rejects mismatch with `403`. AI gateway uses `Access-Control-Allow-Origin: <canonical>` (no wildcard).

**Dependencies:** Critical Fix 1 (HSTS / transport doctrine).

**Complexity:** **S**

---

### DataChannel Discipline

#### Issue: No DataChannel label allowlist

**Source:** Q483, Q484. Risk "DataChannel label sprawl".

**Problem:** `ondatachannel` accepts arbitrary labels; only `commands`
and `heartbeat` are documented but no policy rejects other labels.

**Impact:** A tampered peer can carve covert side-channels (e.g.,
`chat-secret`) and exfiltrate or inject data outside the audited
command surface.

**Solution:** Hardcode an allowlist in the WebRTC adapter.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) — add **Channel Allowlist** section: `commands` (ordered/reliable), `heartbeat` (unordered/no-retransmit). Any other label closes the channel and dispatches `TRUST_VIOLATION_DETECTED`.
- [docs/architecture/command-schema.md](../../architecture/command-schema.md) — extend `TRUST_VIOLATION_DETECTED` payload with `kind: 'unexpectedDataChannel'`

**New Files:** None.

**Implementation Steps:**
1. In `src/net/webrtc/peer.ts`, define `const ALLOWED_DC_LABELS = ['commands', 'heartbeat'] as const;`.
2. `pc.ondatachannel = (e) => { if (!ALLOWED_DC_LABELS.includes(e.channel.label)) { e.channel.close(); dispatchTrustViolation('unexpectedDataChannel', e.channel.label); return; } /* … */ };`
3. Test: open a third channel `chat-secret` from a tampered peer; assert receiver closes the channel and dispatches a trust violation.

**Dependencies:** Critical Fix 2 (`TRUST_VIOLATION_DETECTED`).

**Complexity:** **S**

---

### Observability

#### Issue: No TLS-error log channel with PII redaction

**Source:** Q471. Risk "No TLS-error observability".

**Problem:** TLS handshake errors are surfaced only by the hosting
platform's default access log; there is no PII-redaction rule.

**Impact:** MITM / cert-substitution attempts go unmonitored; logs
that *do* exist may carry IPs / UA tails that violate audit 22's
privacy contract.

**Solution:** Define a structured TLS-error log shape with PII
redaction and wire it through the signaling server's logger.

**Files to Update:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) — add **Observability** section
- Cross-link from [docs/archive/readiness-audit/22-privacy-retention-and-error-leaks.md](../readiness-audit/22-privacy-retention-and-error-leaks.md) (do not modify the audit)
- Cross-link from [docs/archive/readiness-audit/31-trust-boundaries-and-logging-monitoring.md](../readiness-audit/31-trust-boundaries-and-logging-monitoring.md) (do not modify the audit)

**New Files:**
- `docs/architecture/tls-observability.md` — canonical log shape:
  `{ ts, kind: 'tls-handshake-failure' | 'cert-mismatch' | 'cipher-rejected', tlsVersion, cipher, ipBucket /* /24 IPv4, /64 IPv6 */, errorCode }`. No raw IP, no UA tail.
- `tasks/phase-3/01-multiplayer/15-tls-observability.md` — owning task

**Implementation Steps:**
1. Author `docs/architecture/tls-observability.md`.
2. Implement `src/services/signaling/observability/tls.ts` emitting the redacted shape.
3. Add CI test: feed a known IPv4 → assert `/24` bucket; feed an IPv6 → assert `/64` bucket; assert no raw IP / UA in output.

**Dependencies:** Plan 22 (privacy log retention TTL).

**Complexity:** **S**

---

### Certificate Lifecycle

#### Issue: No cert-rotation cadence / dev-cert exclusion

**Source:** Q466, Q472.

**Problem:** No rotation cadence, no auto-renewal monitor, no CI gate
preventing dev certs from leaking into a release build.

**Impact:** Silent cert expiry → outage; or a dev cert in production
is browser-rejected and the site is unreachable; or
`NODE_TLS_REJECT_UNAUTHORIZED=0` slips into a release tag and
disables verification.

**Solution:** Document the rotation cadence and add CI gates.

**Files to Update:**
- [docs/architecture/transport-security.md](../../architecture/transport-security.md) (created in Critical Fix 1) — add **Cert Lifecycle** section: Let's Encrypt + auto-renew + alert on expiry < 14 days
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) — link the new section

**New Files:** None (lives in the doctrine doc).

**Implementation Steps:**
1. Add **Cert Lifecycle** subsection to `transport-security.md`.
2. CI gate `npm run validate:transport` (extend Critical Fix 1):
   - assert no `NODE_TLS_REJECT_UNAUTHORIZED` env var anywhere outside `*.test.*` files
   - assert no `*.dev.crt` / `localhost.crt` references in production env files
3. Operations runbook: monitor expiry; alert on `< 14 days` to a documented channel (defer the alerting infra to Plan 31 / observability work).

**Dependencies:** Critical Fix 1.

**Complexity:** **S**

---

### Cert Pinning (Documented N/A)

#### Issue: Cert pinning not specified

**Source:** Q467.

**Problem:** Browser-hosted SPAs cannot perform classic cert pinning;
the closest mechanisms (Expect-CT, deprecated; or pinning at native-
shell level) are not documented. The repo has no native shell.

**Impact:** None today (no native shell); future risk if a native
shell is added without re-evaluating.

**Solution:** Document this explicitly as N/A-for-now in the doctrine
doc, with a re-evaluation trigger.

**Files to Update:**
- [docs/architecture/transport-security.md](../../architecture/transport-security.md) — add **Cert Pinning** section: "N/A while the only client surface is a browser SPA. Re-evaluate on first native-shell task entering the registry."

**New Files:** None.

**Implementation Steps:**
1. Add the section above to the doctrine doc.
2. Add a reminder to `tasks/task-registry.json` lint: any new task whose `ownedPaths` include a native-shell directory must reference `docs/architecture/transport-security.md#cert-pinning`.

**Dependencies:** Critical Fix 1.

**Complexity:** **S**

---

### Identity Persistence in UI

#### Issue: Display name spoofable across reconnect

**Source:** Q485. Cross-ref Plan 18 / Plan 19.

**Problem:** Display names are user-supplied with no peerId binding;
a banned/reported peer can rejoin under a different name.

**Impact:** Audit 19's report system is bypassable.

**Solution:** Bind display name to `peerId.publicKey` in the lobby
chat row; render a verified-key icon next to the name. Rejoining
peers must complete the continuity challenge (Critical Fix 3) before
their messages appear without a `(unverified)` suffix.

**Files to Update:**
- [docs/architecture/wiki/screens/64-network-lobby/spec.md](../../architecture/wiki/screens/64-network-lobby/spec.md) — render verified-key icon
- [docs/architecture/wiki/screens/64-network-lobby/data-contracts.md](../../architecture/wiki/screens/64-network-lobby/data-contracts.md) — chat row carries `signerId` + verification result
- [docs/architecture/wiki/screens/64-network-lobby/interactions.md](../../architecture/wiki/screens/64-network-lobby/interactions.md) — `(unverified)` suffix until continuity challenge resolves

**New Files:** None (extends existing screen).

**Implementation Steps:**
1. Update screen-package data-contracts to carry `signerId` and verification flag on every chat row.
2. Update mockups (text-only edits, no binary assets).
3. Coordinate with Plan 19's `state.profile.knownPeers` ring buffer (a known-peer label survives across sessions because the keypair survives).

**Dependencies:** Critical Fix 2, Plan 19.

**Complexity:** **S**

---

### Tasks System Hygiene

#### Issue: New task entries must respect owned-paths invariants

**Source:** N/A (process). Required by [`CLAUDE.md`](../../../CLAUDE.md)
"Owned Paths" / "Owned Paths (shared)" rule.

**Problem:** This plan introduces ~7 new tasks under
`tasks/phase-3/01-multiplayer/` and ~2 under `tasks/phase-1/`. They
must not collide with existing tasks' `Owned Paths`.

**Impact:** Without coordination, `npm run validate:tasks` fails on
shared-path conflicts.

**Solution:** Pre-register `Owned Paths` and `Owned Paths (shared)`
in each new task; explicitly mark `services/signaling/`,
`src/net/identity/`, `src/net/webrtc/`, `src/net/commands/` as the
new owners.

**Files to Update:**
- All new task files listed under §4 — populate the standard task
  template (Status, Goal, Owned Paths, Dependencies, Verify Commands)
- [tasks/task-registry.json](../../../tasks/task-registry.json) — regenerate via `npm run generate:task-registry`

**New Files:** Listed under §4.

**Implementation Steps:**
1. Author each task per the standard template.
2. Run `npm run generate:task-registry` after each batch.
3. Run `npm run validate:tasks` and fix any cross-references.
4. Run full `npm run validate` before handoff.

**Dependencies:** None (process-only).

**Complexity:** **S**

---

## 4. Suggested Task Breakdown

New owning tasks (one per major contract):

- [ ] **`tasks/phase-1/<schema>/peer-identity-schema.md`** — author `peer-identity.schema.json`, `signaling-envelope.schema.json`, `session-token.schema.json`, `command-envelope.schema.json`, `abandon-penalty.schema.json`. Update `docs/architecture/schema-matrix.md`.
- [ ] **`tasks/phase-3/01-multiplayer/09-transport-security-edge-config.md`** — WSS-only listener, HTTPS-only AI gateway, HSTS, CSP/SRI/CORS, edge config examples; CI gate `npm run validate:transport` and `npm run validate:headers`.
- [ ] **`tasks/phase-3/01-multiplayer/10-peer-keypair-and-session-token.md`** — keypair gen / persist / load / rotate; session-token mint / verify; envelope sign / verify primitives in `src/net/identity/`.
- [ ] **`tasks/phase-3/01-multiplayer/11-signed-signaling-envelope.md`** — wrap every signaling message; verify on consumption; surface `TRUST_VIOLATION_DETECTED`; update tasks 01, 02, 06, 07, 08.
- [ ] **`tasks/phase-3/01-multiplayer/12-dtls-fingerprint-pinning.md`** — extract / pin / verify DTLS fingerprints; reconnect continuity challenge; UI banner.
- [ ] **`tasks/phase-3/01-multiplayer/13-command-stream-hmac.md`** — derive session key from DTLS exporter; HMAC every command envelope; duplicate-`seq` policy; trust-violation escalation.
- [ ] **`tasks/phase-3/01-multiplayer/14-abandon-penalty-and-quorum-disconnect.md`** — quorum-attested `PEER_DISCONNECTED`; `state.profile.abandonHistory`; UI grace toast.
- [ ] **`tasks/phase-3/01-multiplayer/15-tls-observability.md`** — redacted TLS-error log shape; per-peer rate aggregation by IP bucket.

New canonical doctrine docs:

- [ ] `docs/architecture/transport-security.md`
- [ ] `docs/architecture/web-headers.md`
- [ ] `docs/architecture/peer-identity.md`
- [ ] `docs/architecture/signaling-envelope.md`
- [ ] `docs/architecture/dtls-fingerprint-pinning.md`
- [ ] `docs/architecture/command-stream-integrity.md`
- [ ] `docs/architecture/abandon-penalty.md`
- [ ] `docs/architecture/tls-observability.md`
- [ ] `docs/architecture/diagrams/31-reconnect-continuity-challenge.md`

Extensions (not rewrites) to existing artifacts:

- [ ] Extend `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` with **Transport**, **Origin Allowlist**, **Observability** sections.
- [ ] Extend `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md` with **Channel Allowlist**, **DTLS Fingerprint Capture**, **Session-Key Derivation** sections.
- [ ] Extend `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md` with `mac` field + duplicate-`seq` policy.
- [ ] Extend `tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md` with continuity challenge + DTLS-fingerprint check.
- [ ] Extend `tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md` with signed `HOST_CHANGED` + quorum verification.
- [ ] Extend `tasks/phase-3/01-multiplayer/08-multiplayer-ui-lobby-invite-link-in-game-status.md` with `https://`-only invite-link constraint.
- [ ] Extend `services/signaling/README.md` and `services/ai-gateway/README.md` with transport requirements.
- [ ] Extend `docs/architecture/command-schema.md` with `MINT_SESSION_TOKEN`, `VERIFY_SIGNALING_ENVELOPE`, `ROTATE_PEER_KEYPAIR`, `PIN_DTLS_FINGERPRINT`, `VERIFY_DTLS_FINGERPRINT`, `RECORD_CONTINUITY_CHALLENGE`, `TRUST_VIOLATION_DETECTED`, `RECORD_ABANDON_PENALTY`, `INSPECT_ABANDON_HISTORY`.

CI gates:

- [ ] `npm run validate:transport` — no `ws://` / `http://` in services; HSTS configured; no `NODE_TLS_REJECT_UNAUTHORIZED` in production env.
- [ ] `npm run validate:headers` — CSP / SRI / CORS / HSTS present in edge config.
- [ ] `npm run validate:tasks` — new tasks own non-overlapping paths; ui/editor tasks cite screen packages; every schema has a canonical task reference.
- [ ] `npm run validate` — full repo validation passes.

---

## 5. Execution Order

Land in dependency order. Each step's exit criterion is the
specified `validate` invocation passing.

1. **Doctrine docs first.** Author `transport-security.md`,
   `web-headers.md`, `peer-identity.md`, `signaling-envelope.md`,
   `dtls-fingerprint-pinning.md`, `command-stream-integrity.md`,
   `abandon-penalty.md`, `tls-observability.md`, and the
   reconnect-continuity Mermaid diagram. Run `npm run generate:wiki`.
2. **Schemas next.** Author `peer-identity.schema.json`,
   `signaling-envelope.schema.json`, `session-token.schema.json`,
   `command-envelope.schema.json`, `abandon-penalty.schema.json`.
   Update `docs/architecture/schema-matrix.md`. Run
   `npm run validate:contracts`.
3. **Critical Fix 1 (transport).** Extend signaling task, AI-gateway
   doc, web-shell edge config; add `validate:transport` and
   `validate:headers` CI gates; assert green.
4. **Critical Fix 2 (keypair + envelope).** Implement
   `src/net/identity/`; wrap every existing signaling message; wire
   `TRUST_VIOLATION_DETECTED` to UI banners. Land tasks 10 + 11.
5. **Critical Fix 3 (DTLS pinning + continuity challenge).** Extend
   tasks 02 + 06; implement `src/net/dtls/`; add the reconnect UI
   path. Land task 12.
6. **Critical Fix 4 (command HMAC).** Extend task 03; implement
   `src/net/commands/mac.ts`; wire duplicate-`seq` policy. Land task 13.
7. **Critical Fix 5 (quorum disconnect).** Extend tasks 06 + 07;
   implement `state.profile.abandonHistory`; wire UI grace toast.
   Land task 14.
8. **System Improvements.** DataChannel allowlist (~hours), TLS
   observability (task 15), cert-lifecycle CI gates, identity-
   persistence UI polish, cert-pinning N/A note.
9. **Final validation.** Run `npm run validate` end-to-end. Run
   `npm run generate:task-system-report` and confirm the readiness
   delta lifts audit 24 to ≥ 8 / 10.

---

## 6. Risks if Not Implemented

- **Trivial signaling-server MITM** — anyone with control of the
  signaling host becomes a transparent man-in-the-middle to both
  peers; DTLS does not save you when the signaling layer chooses
  *which* peers complete the handshake (Q477, Q482).
- **Host-claim impersonation** — `HOST_CHANGED` and `LOG_RESPONSE`
  unsigned; a malicious peer races the legitimate election and feeds
  forged log ranges to a reconnecting peer (Q480, Q481).
- **Disconnect spoof + forfeit exploit** — a peer about to lose can
  fake the opponent's disconnect and claim a forfeit win without any
  abandon penalty (Q487).
- **No identity persistence** — bans, reports, and trust-tier display
  are impossible because display names are user-supplied strings with
  no peerId binding (Q485, Plan 18, Plan 19).
- **First-visit downgrade** — without HSTS, a captive-portal MITM
  serves plain HTTP and downgrades the upgrade-to-WSS round-trip
  (Q462, Q470).
- **CDN compromise → SPA compromise** — without CSP / SRI, a tampered
  CDN script executes inside the SPA shell with the same origin as
  legitimate code (Q468, Q469, Q473).
- **Cross-origin call abuse** — without CORS allowlists, any web
  origin can reach the signaling WebSocket / AI gateway from a
  browser; rate-limit dodging and credential reuse become trivial
  (Q474).
- **Covert side-channels** — without a DataChannel label allowlist, a
  tampered peer carves arbitrary channels for exfiltration / OOB
  control (Q483).
- **Silent command replay / injection** — without HMAC over the
  command stream, a desync-mode regression accepts duplicates and
  the determinism gate is bypassable at the wire layer (Q486).
- **MITM goes unmonitored** — without redacted TLS-error logging,
  cert-substitution attempts produce no signal in metrics (Q471).

---

## 7. AI Implementation Readiness

**Score: 8 / 10**

This plan turns 26 unknown / partial answers into 8 owning tasks, 8
canonical doctrine docs, 5 new schemas, and 2 CI gates — all with
explicit file paths, owned-paths boundaries, and step-by-step
implementation orders. An autonomous agent following the plan in §5
order has:

- A pinned transport contract (WSS / HTTPS / HSTS / CSP / SRI / CORS).
- A peer-identity primitive (Ed25519 keypair, persisted, signing every
  outbound signaling message).
- An end-to-end signed signaling envelope with replay protection.
- DTLS-fingerprint pinning with a reconnect continuity challenge.
- An HMAC'd command stream keyed off the DTLS exporter.
- A quorum-attested disconnect path that closes the forfeit-fraud
  window.
- Redacted TLS-error logging.
- CI gates that fail any regression on transport scheme, headers, or
  task-system invariants.

The remaining 2 points reflect (a) operational details deferred to
Plan 29 (rate-limit + secret-management) and Plan 31 (alerting infra
for cert-expiry / TLS-error metrics), and (b) the inherent residual
risk of cert pinning being N/A in browser SPAs — to be re-evaluated
on first native-shell task. Closing both lifts this to 9 / 10; the
final point is reserved for post-public-launch operational maturity
(monitored cert rotation actually firing, quorum disconnect
empirically catching forged events).
