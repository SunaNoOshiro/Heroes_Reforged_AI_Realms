# 24. TLS/WSS ENFORCEMENT & WEBRTC AUTHENTICATION

### Q: 461. Is the application served only over HTTPS, with HTTP redirects to HTTPS at the edge?

**Status:** ❌ UNKNOWN

**Answer:**
No deployment / hosting / edge contract for the web client is documented. The signaling task names "any stateless container (Fly.io, Railway)" as a deploy target, but no policy mandates HTTPS-only service of the game client, no HTTP→HTTPS redirect rule, and no edge / CDN configuration is specified. WebRTC `getUserMedia`-style restrictions don't apply (no media capture), but DataChannels still require a secure context for production browsers.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (deploy targets only; no scheme rule)
- No HTTPS / redirect policy in `docs/architecture/` or any task
- No `services/web/` or hosting config in repo

---

### Q: 462. Is HSTS (`Strict-Transport-Security`) set with a sensible `max-age` and `includeSubDomains`?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No HTTP response-header policy is defined for either the web client or the signaling server. There is no documented `max-age`, no `includeSubDomains`, and no `preload` decision.

**Evidence:**
- No security-headers contract in `docs/architecture/`
- No header config in `services/signaling/` (path not yet created)

---

### Q: 463. Is the signaling WebSocket served exclusively over WSS, with plain WS rejected at the listener?

**Status:** ❌ UNKNOWN

**Answer:**
**Not mandated.** The signaling task uses Node 20 + the `ws` library and does not specify TLS termination, `wss://` URL scheme, or rejection of plain `ws://` upgrades. The cross-cutting audit `docs/readiness-audit/07-multiplayer.md` Q144 already flags this: *"TLS (`wss://`) is not explicitly required in the task spec."*

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (no TLS clause)
- `docs/readiness-audit/07-multiplayer.md` Q144 (transport-level encryption only, signaling TLS not required)

---

### Q: 464. Is the AI gateway endpoint reachable only over HTTPS, with TLS 1.2+ enforced and weak ciphers disabled?

**Status:** ❌ UNKNOWN

**Answer:**
No transport / cipher contract for the AI gateway is documented. `docs/architecture/ai-integration.md` and the AI-generation pipeline doc describe a content-generation adapter but do not pin the URL scheme, minimum TLS version, or cipher allowlist. Since the gateway typically fronts third-party LLM APIs (which themselves enforce TLS 1.2+), HTTPS is implicit but not explicit in this repo's contract.

**Evidence:**
- `docs/architecture/ai-integration.md` (no TLS clause)
- `docs/architecture/ai-generation-pipeline.md` (no transport clause)
- `services/` has no AI-gateway implementation yet

---

### Q: 465. Are TURN credentials, lobby tokens, and peer descriptors only ever transmitted over WSS/HTTPS?

**Status:** ❌ UNKNOWN

**Answer:**
**No TURN credentials, lobby tokens, or peer descriptors are even defined yet** — TURN is "optional" and unprovisioned (Q130 in audit 07), and there is no peer-token / per-session token concept in any task or screen package. Without those primitives, the transport rule for them cannot exist. SDP/ICE traverses the signaling WebSocket, whose transport scheme (WS vs WSS) is itself unspecified (Q463).

**Evidence:**
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md` ("Optional TURN server config" — no credentials defined)
- `docs/readiness-audit/07-multiplayer.md` Q130, Q144
- No lobby-token concept in `docs/architecture/wiki/screens/64-network-lobby/`

---

### Q: 466. Are TLS certificates rotated on a documented schedule, and is automatic renewal monitored?

**Status:** ❌ UNKNOWN

**Answer:**
No certificate-lifecycle policy is documented. The named hosting providers (Fly.io / Railway) typically issue / rotate Let's Encrypt certificates automatically, but the project does not commit to a renewal cadence, monitoring, or alerting rule.

**Evidence:**
- No cert-management entry in `docs/architecture/` or `services/signaling/`
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (deploy targets only)

---

### Q: 467. Is certificate pinning used for the signaling and AI gateway endpoints in shipped builds?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. Browser-hosted SPA builds cannot perform classic certificate pinning anyway; the closest mechanisms (Expect-CT, deprecated; or pinning at native-shell level) are not documented. The repo has no native shell yet, so pinning is effectively N/A but is not stated as such.

**Evidence:**
- No pinning policy in any task or architecture doc

---

### Q: 468. Is mixed-content blocking enabled so that HTTP subresources cannot be loaded into an HTTPS page?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No CSP or `upgrade-insecure-requests` directive is documented. Browsers block active mixed content by default, but the project has no formal stance and no header policy.

**Evidence:**
- No CSP / mixed-content rule anywhere in the repo
- Asset and pack contracts (`docs/architecture/pack-contract.md`) do not constrain URL schemes for external assets

---

### Q: 469. Is `Content-Security-Policy` configured to forbid `http:` schemes for `connect-src`, `img-src`, `media-src`, etc.?

**Status:** ❌ UNKNOWN

**Answer:**
**No CSP is defined at all.** The cross-referenced audit `docs/readiness-audit/28-asset-loading-and-sandboxing.md` covers asset-pipeline trust but no CSP directive list exists. Without a CSP, `connect-src`, `img-src`, `media-src`, `frame-ancestors`, `script-src`, etc. are all effectively unrestricted.

**Evidence:**
- No CSP file / header config in repo
- `docs/readiness-audit/28-asset-loading-and-sandboxing.md` (asset trust covered separately, but CSP not specified)

---

### Q: 470. Are downgrade attacks prevented (no fallback from WSS to WS, from HTTPS to HTTP)?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. Because neither WSS-only nor HTTPS-only is mandated (Q461, Q463), there is no documented fallback policy *and* no documented prohibition of fallback. In a public deployment, the absence of HSTS (Q462) plus the absence of an explicit "WSS-required" listener config means a downgrade is implicitly possible.

**Evidence:**
- See Q461, Q462, Q463
- No anti-downgrade clause in `tasks/phase-3/01-multiplayer/`

---

### Q: 471. Are TLS handshake errors logged in a way that helps detect MITM attempts without leaking client identity?

**Status:** ❌ UNKNOWN

**Answer:**
No logging contract is specified for the signaling server (audit 22 Q414–Q418, audit 31 trust-boundary questions). TLS handshake errors are surfaced by the load balancer / hosting platform's default access log, which the project neither configures nor scrubs. There is no PII-redaction rule on top.

**Evidence:**
- `docs/readiness-audit/22-privacy-retention-and-error-leaks.md` (no log-retention / redaction TTL)
- No observability / log-policy doc

---

### Q: 472. Are self-signed or development certificates explicitly rejected in production builds?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. Browsers reject self-signed certificates by default (no `NODE_TLS_REJECT_UNAUTHORIZED=0` is documented), but the project has no production-build certificate-validation contract, no environment-separation rule, and no CI gate that fails if a dev cert leaks into a release.

**Evidence:**
- No build / release / environment doc
- No `services/signaling/` config files yet

---

### Q: 473. Is `Subresource Integrity` (SRI) set on every externally hosted script and stylesheet?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. The wiki HTML viewer (`docs/architecture/architecture-wiki.html`) is generated locally; no production SPA shell exists yet. There is no rule in `docs/architecture/pack-contract.md` or asset contracts requiring SRI hashes on externally hosted scripts/styles. CDNs for fonts, mermaid, etc., are not pinned.

**Evidence:**
- No SRI policy in repo
- `docs/architecture/architecture-wiki.html` (generated viewer; no SRI on imports)

---

### Q: 474. Are CORS allowlists tight enough that only the official origin can call the signaling/AI endpoints from a browser?

**Status:** ❌ UNKNOWN

**Answer:**
No CORS / `Access-Control-Allow-Origin` rule is specified for either the signaling WebSocket (which uses the `ws` library; cross-origin checks are advisory) or the AI gateway. The signaling task does not list `Origin`-header validation as a step, and `docs/readiness-audit/29-rate-limiting-and-secret-management.md` does not pin a CORS contract.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (no Origin / CORS validation)
- No CORS clause in `services/` or `docs/architecture/ai-integration.md`

---

### Q: 475. How does a peer prove they are the legitimate participant for a given room code, beyond presenting the code?

**Status:** ❌ UNKNOWN

**Answer:**
**They don't.** The room code is the *only* admission credential. There is no per-peer keypair, no host-issued token, no signed nickname, and no challenge/response. Audit 18 Q314 explicitly confirms: *"the first peer to present a valid `JOIN_ROOM` for a code is accepted into WebRTC negotiation."* Audit 07 Q144: *"No application-level authentication."*

**Evidence:**
- `docs/readiness-audit/07-multiplayer.md` Q144
- `docs/readiness-audit/18-room-codes-and-lobby-discovery.md` Q314
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`

---

### Q: 476. Is there a per-session token bound to the peer's identity that the signaling server validates before relaying SDP/ICE?

**Status:** ❌ UNKNOWN

**Answer:**
**No.** No session-token concept exists. `CREATE_ROOM` / `JOIN_ROOM` carry only the room code (and implicitly the WebSocket connection identity assigned by the server). The server does not authenticate the peer's identity before forwarding `OFFER` / `ANSWER` / `ICE_CANDIDATE`.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (message list excludes any auth/token)
- `docs/readiness-audit/18-room-codes-and-lobby-discovery.md` Q318

---

### Q: 477. Are SDP offers/answers authenticated end-to-end so a malicious signaling server cannot inject a third party as a peer?

**Status:** ❌ UNKNOWN

**Answer:**
**No.** SDP offers/answers are forwarded verbatim by the signaling server with no end-to-end signature, no HMAC, and no out-of-band fingerprint check between peers. A compromised or malicious signaling server can substitute its own SDP / DTLS fingerprints and become a man-in-the-middle to both peers transparently. DTLS protects the channel between whatever peers ultimately complete the handshake — but the signaling server picks who those peers are.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (server forwards SDP unchanged; no signature)
- `docs/readiness-audit/31-trust-boundaries-and-logging-monitoring.md` Q647 (treats signaling as untrusted in principle, but no E2E auth wired in)

---

### Q: 478. Is DTLS fingerprint pinning used between peers across reconnect attempts to prevent MITM swap?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. On reconnect, the peer re-signals (`LOG_REQUEST` flow) and re-establishes a new WebRTC PeerConnection — which produces fresh DTLS fingerprints that are not compared to the original session's fingerprints. There is no documented pinning store, no fingerprint-equality check on rejoin, and no abort-on-mismatch.

**Evidence:**
- `tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md` (re-signal + replay; no fingerprint pinning)
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md` (no fingerprint store)

---

### Q: 479. Can a peer who joined and left replay their old offer/answer to re-enter the session?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. There is no nonce, no per-handshake `iat`/`exp`, and no replay-protection layer on signaling messages. If the room is still alive (host-migration kept it open) and the code is still valid (Q307), an old SDP packet from the dropped peer is conceptually replayable — though browser WebRTC implementations would reject ICE creds reuse at the ICE layer in practice. The contract does not write this guarantee down.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (no nonce / freshness clause)
- No anti-replay rule in any signaling task

---

### Q: 480. Is the soft-host role authenticated, so a non-host peer cannot claim to be the canonical command-log publisher?

**Status:** ❌ UNKNOWN

**Answer:**
**No.** Host identity is a label kept at the signaling server (and replicated in peers' state) — it is not bound to a peer keypair or a signature. A peer that disagrees with the elected host could send `LOG_RESPONSE` blobs and rely on receivers' trust that those blobs come from "the host." Receivers have no cryptographic way to distinguish authentic host messages from impostor messages on the same DataChannel mesh.

**Evidence:**
- `tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md` (no auth on `LOG_RESPONSE`)
- `tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md` (election by peer ID priority, not by signed proof)

---

### Q: 481. On host migration, how is the new host authenticated to the remaining peers, and against what shared secret?

**Status:** ❌ UNKNOWN

**Answer:**
**There is no shared secret and no authentication.** Election rule: *"non-host peers elect new host by highest-priority peer ID"* (deterministic tie-break). Peers trust each other's local view of "who has the highest peer ID" because they share a deterministic peer-ID table — but there is no signed `HOST_CHANGED` message, no quorum proof, and no rejection rule for an `HOST_CHANGED` from a peer that is not next in priority. A misbehaving peer can claim host on the heartbeat-loss boundary.

**Evidence:**
- `tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md` (no signature on `HOST_CHANGED`)

---

### Q: 482. Are ICE candidates authenticated to prevent injection of attacker-controlled candidates that route traffic through the attacker?

**Status:** ❌ UNKNOWN

**Answer:**
**No.** ICE candidates are forwarded by the signaling server without signature, MAC, or origin check. A compromised signaling server can inject attacker-controlled candidates into `ICE_CANDIDATE` messages; the receiving peer adds them to its candidate pool with no way to distinguish them from genuine ones. ICE consent checks (STUN bind w/ ICE creds) protect liveness but not origin authenticity at the signaling layer.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (`ICE_CANDIDATE` forwarded as opaque blob)

---

### Q: 483. Is the data-channel label namespace authenticated so a peer cannot open an unexpected channel after handshake?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. Two channels are defined at handshake: `commands` (ordered/reliable) and `heartbeat` (unordered, no retransmits). There is no policy stating that additional channels are forbidden, no allowlist enforcement on `RTCDataChannel` `label`, and no schema gate on label strings. A misbehaving peer that opens a third channel labeled e.g. `chat-secret` would be accepted by the receiver's `ondatachannel` callback by default.

**Evidence:**
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md` (defines two channels; no allowlist)

---

### Q: 484. Are heartbeat / commands channels distinguished cryptographically, or only by label string?

**Status:** ✔ Defined

**Answer:**
**Only by label string** (`commands` vs. `heartbeat`) and by their reliability profile (`ordered:true,maxRetransmits:null` vs. `ordered:false,maxRetransmits:0`). There is no cryptographic separation, no per-channel key, and no MAC-domain separation between heartbeat and command payloads. A peer with access to one DataChannel has access to the other (same DTLS session).

**Evidence:**
- `tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md` (channels distinguished by label + reliability config only)

---

### Q: 485. Is there a peer-identity assertion (display name binding) that survives reconnect, and is it spoofable?

**Status:** ❌ UNKNOWN

**Answer:**
**No identity binding; trivially spoofable.** Display names live in `state.net.lobby.chat` / player slot rows and are user-supplied strings with no validator (audit 18 Q324). On reconnect, the rejoining peer sends a fresh `JOIN_ROOM` carrying whatever display name it chooses — there is no peer keypair to bind the name to, no server-stored profile, and no challenge proving "this peer is the same one that left." Audit 18 Q332 confirms: *"a banned or reported player can rejoin by changing display name."*

**Evidence:**
- `docs/readiness-audit/18-room-codes-and-lobby-discovery.md` Q324, Q332
- `docs/architecture/wiki/screens/64-network-lobby/data-contracts.md` (no display-name validator)

---

### Q: 486. Is replay protection on commands handled by sequence numbers, nonces, or HMAC, and where is the secret derived?

**Status:** ⚠ Partial

**Answer:**
**Sequence numbers only — no nonces, no HMAC, no derived secret.** Wire format: `{ seq: number, playerId: number, turn: number, command: Command }` (JSON). The reliable+ordered DataChannel is expected to keep `seq` monotonic per peer; out-of-order is queued. Cryptographic replay protection (e.g., per-session HMAC with a key derived from the DTLS exporter or from a host-issued token) is **not specified**; integrity is "assumed from DTLS alone" (cross-ref audit 26 Q517). Duplicate-`seq` policy is also undefined (audit 07 Q145).

**Evidence:**
- `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md` (wire format)
- `docs/readiness-audit/26-replay-tampering-and-simulation-cheating.md` Q517
- `docs/readiness-audit/07-multiplayer.md` Q145

---

### Q: 487. Can a peer cause the other side to accept a forged "peer-disconnected" event to escape penalty for rage-quit?

**Status:** ⚠ Partial

**Answer:**
**Likely yes, in the current spec.** `PEER_DISCONNECTED` is a signaling-server message documented in the signaling task. Because there is no per-peer authentication (Q475–Q477) and no signed disconnect attestation, a peer that controls a tampered client (or a compromised signaling server) can synthesize a `PEER_DISCONNECTED` for the opponent and trigger the surviving-peer's "30-second / 120-second forfeit-or-wait" path (Q148 in audit 07). Whether that produces a penalty asymmetry depends on a forfeit/penalty policy — which is also not defined. There is no rage-quit detection, no abandon-penalty tracker, and no leaverboard.

**Evidence:**
- `tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md` (`PEER_DISCONNECTED` is unauthenticated)
- `tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md` (forfeit-or-wait UI; no anti-fraud gate)
- No abandon-penalty / leaverboard task in `tasks/phase-3/01-multiplayer/`

---

## 🔍 Summary

### Missing Logic
- **Web-client transport contract** — HTTPS-only serving, HTTP→HTTPS redirect, HSTS (Q461, Q462, Q470).
- **Signaling transport contract** — `wss://`-only listener, plain-`ws://` rejection, TLS version / cipher pin (Q463, Q470).
- **AI-gateway transport contract** — HTTPS-only, TLS 1.2+, cipher allowlist (Q464).
- **Certificate lifecycle** — rotation cadence, automatic-renewal monitoring, dev-cert exclusion in prod (Q466, Q472).
- **Header policy** — CSP (`connect-src`, `img-src`, `media-src`, `script-src`, `frame-ancestors`), `Referrer-Policy`, `upgrade-insecure-requests` (Q468, Q469).
- **CORS allowlist** for signaling and AI gateway (Q474).
- **SRI** for any externally hosted script/style (Q473).
- **TLS-error logging policy** with PII redaction (Q471).
- **Peer-identity primitive** — per-peer keypair, host-issued session token, or DTLS-exporter-bound shared secret (Q475, Q476, Q485).
- **End-to-end signaling authentication** — signed SDP / signed `HOST_CHANGED` / signed `PEER_DISCONNECTED` so a malicious signaling server or peer cannot impersonate (Q477, Q481, Q482, Q487).
- **DTLS-fingerprint pinning** across reconnect, with abort-on-mismatch (Q478).
- **Replay protection** for signaling messages and lobby tokens (nonce + freshness window) (Q479).
- **Soft-host authentication** — signed `LOG_RESPONSE` and elected-host attestation (Q480, Q481).
- **DataChannel label allowlist** — reject any non-allowlisted label after handshake (Q483, Q484).
- **Cryptographic command replay protection** — HMAC over `{seq, playerId, turn, command}` with a session key derived from the DTLS exporter (Q486).
- **Abandon-penalty contract** so forged disconnects cannot exploit rage-quit asymmetry (Q487).

### Risks
- **Trivial signaling-server MITM** — no E2E auth on SDP/ICE means anyone with control of the signaling host can become a transparent man-in-the-middle to both peers (Q477, Q482). DTLS only protects the *negotiated* peers, not "which peers got chosen."
- **Host-claim impersonation** — `HOST_CHANGED` and `LOG_RESPONSE` are unsigned (Q480, Q481); a malicious peer can race the legitimate election and feed forged log ranges to a reconnecting peer.
- **Disconnect spoof + forfeit exploit** — forging `PEER_DISCONNECTED` / dropping the heartbeat could be used to push the opponent into a forfeit path (Q487); compounds with no authenticated rage-quit penalty.
- **No identity persistence** — display names + room codes are the entire identity model. Bans, reports, and reputation are impossible without a peer keypair (Q485, cross-ref audit 18 Q332).
- **No CSP / SRI / CORS** — the web client has no header armor against extension/CDN compromise, mixed content, or cross-origin abuse (Q468, Q469, Q473, Q474).
- **No HSTS / no anti-downgrade** — first-visit downgrades and stripped-SSL captive portals are not blocked at the protocol layer (Q462, Q470).
- **No TLS-error observability** — MITM / cert-substitution attempts go unmonitored (Q471).
- **DataChannel label sprawl** — receivers accept arbitrary labels (Q483); a tampered peer can carve covert side-channels.

### Improvements
- **Mandate `wss://` and `https://`** in the signaling and AI-gateway task specs; reject plain `ws://` / `http://` at the listener; set HSTS (`max-age=63072000; includeSubDomains; preload`) at the edge.
- **Define a CSP baseline** in the web-client task (when authored): `default-src 'self'; connect-src 'self' wss://signaling.example.com https://ai.example.com; img-src 'self' data:; media-src 'self'; script-src 'self'; frame-ancestors 'none'; upgrade-insecure-requests`.
- **Add SRI** to every CDN-hosted dependency (or self-host them) and freeze versions.
- **Tighten CORS** on the signaling and AI endpoints to the canonical origin only; reject other `Origin` values at handshake.
- **Introduce a peer keypair**: client-side ECDH/Ed25519 keypair persisted in the user profile (audit 18 improvement). Display name + lobby messages are signed; reconnect proves continuity by signing a nonce.
- **Authenticate signaling messages end-to-end**: the host signs the room descriptor; joiners sign a challenge from the host; SDP offers/answers and ICE candidates are signed by the originating peer's keypair, not just trusted because the signaling server forwarded them.
- **Pin DTLS fingerprints** across reconnect — store the original fingerprint per peer-id in session state; abort and surface "Connection identity changed" on mismatch.
- **HMAC the command stream**: derive a per-session key from the DTLS exporter (`exportKeyingMaterial`) and HMAC `{seq, playerId, turn, command}` so duplicates / replays / impostor sends are catchable at the application layer.
- **Sign `HOST_CHANGED` and `LOG_RESPONSE`** with the elected host's keypair; receivers verify against the candidate-host pool snapshot at the time of last consistent turn.
- **Allowlist DataChannel labels** (`commands`, `heartbeat`, `chat` if added) and reject any unknown label in `ondatachannel`.
- **Sign or attest disconnects**: rage-quit penalty applies only to disconnects observed by a quorum of peers (not just by the signaling server's `PEER_DISCONNECTED`).
- **Define a TLS-error log channel** with PII-redacted fields (no IP, no UA tail; bucket by `/24` if needed) so MITM attempts are visible in metrics.
- **Document hosting / cert-rotation policy** (Let's Encrypt + auto-renew + monitor expiry < 14 days in observability stack) in the signaling task or a new operations doc.

### AI-Readiness
Score: **1/10**

Reason: Of 27 questions in this audit, only **1** is meaningfully defined (Q484, the channel separation is by label string + reliability profile only — and even that is more an admission of a gap than a positive contract). The remaining 26 are unknown or partial. The repo's transport-security and peer-authentication story is essentially "rely on browser DTLS defaults" — which protects an already-established peer pair but does **not** address (a) who is allowed to be the peer, (b) whether the signaling layer is trustworthy, (c) how identity persists across reconnect, or (d) any web-tier hardening (HSTS / CSP / SRI / CORS). An AI implementer following the current task spec would ship a signaling server on plain `ws://` with no auth, no rate limits (cross-ref audit 18 Q310), and no E2E signature on SDP — leaving the multiplayer surface trivially MITM-able. Closing the **Improvements** list (especially: WSS/HSTS mandate, peer keypair, signed signaling, DTLS-fingerprint pinning, command HMAC) would lift this to 7–8/10.
