# 25. TURN CREDENTIALS & SIGNALING SERVER ABUSE PROTECTION

### Q: 488. Are TURN credentials short-lived (REST-API style ephemeral credentials), or long-lived shared secrets?

**Status:** ❌ UNKNOWN

**Answer:**
**No TURN deployment exists.** TURN is acknowledged as an *optional* corporate-NAT fallback in [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) ("Optional TURN server config"), but no TURN provider, no credential type, no TTL, and no issuance protocol is documented. The cross-cutting audit `07-multiplayer.md` Q130 already flagged this gap. No `turn://` URL, `iceServers` config, or `credential` field is committed to any task or schema.

**Evidence:**
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) ("Optional TURN server config" — no credential model)
- [docs/readiness-audit/07-multiplayer.md](07-multiplayer.md) Q130 (TURN unprovisioned)
- No TURN credential definition in `services/signaling/` (only a 6-line README)

---

### Q: 489. Who issues TURN credentials — the signaling server, a separate auth service, or are they baked into the client?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. There is no credential-issuer in any task or service. The signaling server task lists messages `CREATE_ROOM`, `JOIN_ROOM`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `PEER_CONNECTED`, `PEER_DISCONNECTED` — none of which carry TURN credentials. There is no separate auth service, and no client-side credential bundle is described.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) (no `TURN_CREDENTIALS` message)
- [services/signaling/README.md](../../services/signaling/README.md) (no auth-service stub)

---

### Q: 490. Are credentials scoped to a single session/room, or reusable across sessions?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified — no credential exists to be scoped. Without an issuance contract (Q489), there is no scoping rule, no per-room binding, and no replay-prevention boundary.

**Evidence:**
- See Q488, Q489.

---

### Q: 491. What is the credential TTL, and is it short enough to limit relay-bandwidth abuse?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No TTL, no clock-skew tolerance, no `expires-at` field, and no relay-bandwidth abuse model is documented.

**Evidence:**
- See Q488. No TTL appears in any task, schema, or service stub.

---

### Q: 492. Are credentials transmitted only over WSS/HTTPS, never embedded in HTML or JS bundles?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified — and the prerequisite WSS/HTTPS contract itself is missing. [docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q463 confirms `wss://` is **not mandated** for signaling, and Q461 confirms HTTPS-only client serving is undocumented. Until those are fixed, even if credentials existed, there is no transport guarantee.

**Evidence:**
- [docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q461, Q463, Q465
- No bundle-exclusion rule in any build / deploy doc

---

### Q: 493. Is the TURN shared secret rotatable without redeploying the client?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. There is no shared-secret store, no rotation runbook, and no client-side fetch path that would allow rotation without a redeploy. (See cross-ref [docs/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q607, Q610 — secret storage and rotation cadence are also undefined.)

**Evidence:**
- [docs/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) (Q607, Q610 are part of the un-answered audit set)
- No rotation policy in any task

---

### Q: 494. Is there per-credential bandwidth quota and concurrent-allocation cap on the TURN server?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No per-credential quota, no per-room cap, no global bandwidth ceiling, and no concurrent-allocation limit is committed. (Without a TURN deployment at all, this is doubly undefined.)

**Evidence:**
- See Q488. No coturn config, no Cloudflare/Twilio quota plan in repo.

---

### Q: 495. Is TURN usage attributed to a specific room/peer in logs for abuse triage?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No logging contract for TURN exists; no `roomId`/`peerId` correlation field, no log-retention policy, no PII scrubbing rule. Cross-ref [docs/readiness-audit/22-privacy-retention-and-error-leaks.md](22-privacy-retention-and-error-leaks.md) and [docs/readiness-audit/31-trust-boundaries-and-logging-monitoring.md](31-trust-boundaries-and-logging-monitoring.md) — the broader logging policy is also unspecified.

**Evidence:**
- See Q488. No logging schema for relay sessions.

---

### Q: 496. Is the TURN server protected from being used as an open relay for non-game traffic?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No `--lt-cred-mech` / static-auth-secret mode is chosen, no `--no-tcp-relay` / `--no-loopback-peers` / `denied-peer-ip` allowlist is defined, no realm restriction, and no port allowlist (e.g., only 443/UDP for relay). Without these, a deployed TURN instance becomes an open relay for arbitrary internet traffic.

**Evidence:**
- See Q488. No coturn / Cloudflare-TURN config exists.

---

### Q: 497. Are credentials revoked when the issuing session ends or the peer is kicked?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No revocation mechanism is documented. Combined with [docs/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q320 (kick is **not implemented**), there is no peer-eviction primitive that could trigger revocation in the first place.

**Evidence:**
- [docs/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q320 (no kick)
- No revocation list / CRL / `expires` semantics in any task

---

### Q: 498. Are TURN credentials issued only after the joiner has been admitted to a room (not on lobby browse)?

**Status:** ✔ Defined (N/A by omission)

**Answer:**
There is **no public lobby browse** ([docs/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q321: "strictly invite-by-code"), so the "browse" leak vector does not exist. However, there is also no admission gate ([docs/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q318 — host approval is not specified; first valid `JOIN_ROOM` is auto-accepted), so any "issue after admission" rule would be effectively "issue after presenting a 6-character code." Since credentials don't exist anyway (Q488), the question is moot in this spec.

**Evidence:**
- [docs/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q318, Q321
- See Q488.

---

### Q: 499. Is there a fallback policy if the TURN provider is down (degrade gracefully vs. fail-closed) and is that policy explicit?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. The WebRTC task names STUN as mandatory and TURN as optional, but does not define behavior when TURN itself fails: graceful degrade to "STUN-only, may fail to connect on symmetric NAT" vs. fail-closed "abort match" is not chosen, surfaced in UI, or instrumented. No `iceTransportPolicy: 'relay'` switch is wired.

**Evidence:**
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) (no fallback policy)
- [docs/readiness-audit/07-multiplayer.md](07-multiplayer.md) Q130

---

### Q: 500. Is there per-IP rate limiting on room creation, room join, SDP exchange, and ICE relay?

**Status:** ❌ UNKNOWN

**Answer:**
**No rate limiting of any kind is documented** for the signaling server. [docs/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q310–Q312 explicitly confirm no per-IP, no per-code, and no global throttle. Cross-ref [docs/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q593–Q605 (the broader rate-limit audit) is also un-answered. The signaling task ([tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)) only sets a "100 concurrent rooms" memory ceiling, not a request rate.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) (no throttle)
- [docs/readiness-audit/18-room-codes-and-lobby-discovery.md](18-room-codes-and-lobby-discovery.md) Q310–Q312
- [docs/readiness-audit/29-rate-limiting-and-secret-management.md](29-rate-limiting-and-secret-management.md) Q593–Q605

---

### Q: 501. Is there a per-account / per-token rate limit beyond IP, to defeat shared-NAT and IPv6 evasion?

**Status:** ❌ UNKNOWN

**Answer:**
**No.** No accounts exist in the system at all (no user keypair, no profile token — see [docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q475, Q485), so there is no second axis on which to throttle. Behind a CG-NAT or IPv6 /64 a single attacker can present effectively unlimited "client identities" with no per-identity rate-limit countermeasure.

**Evidence:**
- [docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q475, Q485 (no peer identity)
- No account/token model in any task

---

### Q: 502. What is the maximum concurrent rooms per origin, and how is exhaustion handled?

**Status:** ⚠ Partial

**Answer:**
**Global ceiling = 100 concurrent rooms** (memory bound). There is no **per-origin** or **per-IP** sub-ceiling, no `Origin`-header binding ([docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q474 — CORS unspecified), and no exhaustion-handling policy: when the 100-room ceiling is hit, the spec does not say whether subsequent `CREATE_ROOM` returns an error code, evicts an idle room, queues, or silently fails. A single attacker that scripts `CREATE_ROOM` to the throttle-less server (Q500) can occupy all 100 slots and DoS legitimate creation.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) ("up to 100 concurrent rooms"; no exhaustion behavior)
- [docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q474

---

### Q: 503. Is there a maximum SDP/ICE message size to prevent oversized-payload DoS?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No `maxPayload` option on the `ws` library is documented, no SDP-size cap, no ICE-candidate-list-length cap, and no validation for binary vs. text frame. Default `ws` `maxPayload` is 100 MiB unless overridden — a single oversized SDP can stall the event loop.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) (no `maxPayload` clause)

---

### Q: 504. Is there a maximum WebSocket message rate per connection?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No per-connection message-per-second cap, no token bucket, no leaky-bucket configuration. Cross-ref Q500.

**Evidence:**
- See Q500.

---

### Q: 505. Are connections idle-timed-out, and is the idle threshold tuned to detect connection-hoarding abuse?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No `pingTimeout`/`pingInterval`, no idle-disconnect threshold, no abuse-pattern heuristic. The server's `room → peer` mapping is "cleared when room is empty" but the connection-level idle policy is undefined. An attacker can hold the WS connection open indefinitely without sending data, consuming a socket slot and a per-room handle.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) (no idle-timeout)

---

### Q: 506. Are signaling messages validated against a strict schema before any state mutation?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. The signaling task lists message **names** (`CREATE_ROOM`, `JOIN_ROOM`, `OFFER`, `ANSWER`, `ICE_CANDIDATE`, `PEER_CONNECTED`, `PEER_DISCONNECTED`) but commits no JSON Schema, no AJV validator, no `additionalProperties: false` rule, and no canonical type guard. Without validation, malformed `roomId`/`offer` payloads can corrupt the in-memory map or trigger unexpected forwarding paths.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) (message names only; no schema)
- No `content-schema/signaling/*.schema.json` exists
- No AJV gate referenced in the task's verify steps

---

### Q: 507. Is the server resilient to slowloris-style WebSocket attacks (slow-write, partial-frame)?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No per-frame timeout, no partial-frame deadline, no upgrade-handshake timeout, and no `clientTracking` watchdog is documented. Default `ws` library behavior allows arbitrarily slow CONNECT/UPGRADE and arbitrarily slow frame assembly.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) (no slowloris hardening)

---

### Q: 508. Are CONNECT/UPGRADE flood attacks rate-limited at the load balancer or reverse proxy?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No edge / WAF / reverse-proxy contract is committed. The named hosting providers (Fly.io / Railway, per [docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q461) provide some default DDoS protection, but no project-level configuration, no per-origin connection cap, no SYN-flood mitigation rule.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) (deploy targets only)
- No edge config in `services/signaling/`

---

### Q: 509. Is there a CAPTCHA or proof-of-work challenge for room creation under sustained load?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No CAPTCHA integration (hCaptcha / Cloudflare Turnstile / etc.), no proof-of-work scheme (Hashcash / Friendly Captcha), no adaptive challenge ladder. Combined with the absence of a rate-limiter (Q500), there is no escalation path for sustained abuse.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
- No challenge-response in `services/signaling/`

---

### Q: 510. Are abusive IPs auto-blocked, and is the blocklist time-bound to avoid permanent collateral?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No blocklist exists (no fail2ban-style policy, no in-memory ban map, no expiring-set TTL), and there is therefore no time-bound mitigation against permanent collateral on shared NAT/CG-NAT IPs.

**Evidence:**
- See Q500. No ban-store referenced anywhere.

---

### Q: 511. Is there a per-room participant cap to prevent join-storm exploits?

**Status:** ⚠ Partial

**Answer:**
**Implicitly 2.** The architecture targets two-player matches ([docs/readiness-audit/07-multiplayer.md](07-multiplayer.md) Q142 — M5 exit criteria explicitly two players), and the lobby slot UI surfaces two slots ([docs/architecture/wiki/screens/64-network-lobby/](../architecture/wiki/screens/64-network-lobby/)). However, the signaling server itself does **not document** a maxPeers cap on the `room → peer` map; nothing in the task spec rejects a third `JOIN_ROOM` for an already-full room. A join-storm against a single code can exhaust per-room memory before client-side seat checks fire.

**Evidence:**
- [docs/readiness-audit/07-multiplayer.md](07-multiplayer.md) Q142 (2-player target; >2 undefined)
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) (no per-room peer cap)

---

### Q: 512. Is the signaling server stateless enough that a compromised instance cannot leak historical data?

**Status:** ⚠ Partial

**Answer:**
**Mostly yes.** The signaling server is explicitly stateless: "Server does NOT store game state — it only forwards WebRTC signaling messages. Server memory: only room → peer mapping; cleared when room is empty." There are no databases, no disk-persisted artifacts, no audit logs by spec, and "Server restarts do not corrupt in-progress games (it's stateless — clients reconnect and re-handshake)." The remaining leakage surface is **transient in-memory** (current rooms, current SDP/ICE in flight) plus whatever the default access log of the hosting provider records (see [docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q471 — TLS-error logging unspecified). A live-instance compromise still exposes current rooms' descriptors but cannot leak history because no history is kept.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) ("stateless"; "cleared when room is empty"; "Server restarts do not corrupt in-progress games")
- [docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q471

---

### Q: 513. Are health-check endpoints separated from public endpoints so they cannot be used for fingerprinting?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. No `/health`, `/metrics`, `/version` route is defined; no admin-port separation; no auth on observability endpoints. Once a health endpoint is added (typical for Fly.io / Railway probes), without explicit segregation it would be reachable from the public origin and can fingerprint Node version, build SHA, dependency versions.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) (no health/admin endpoint)
- No reverse-proxy / port-segregation rule

---

## 🔍 Summary

### Missing Logic
- **TURN provisioning end-to-end** — provider selection, credential type (REST-API / static), issuer (signaling vs. dedicated), TTL, scope, transport, rotation, revocation, bandwidth quota, attribution, open-relay protection, fallback policy (Q488–Q499).
- **Signaling rate limiting** — per-IP, per-account, per-room, global ceilings on `CREATE_ROOM` / `JOIN_ROOM` / `OFFER` / `ANSWER` / `ICE_CANDIDATE` (Q500–Q502, Q504).
- **Payload-size and message-rate caps** on the WebSocket itself (`maxPayload`, per-frame deadline, slowloris timeouts) (Q503, Q504, Q507).
- **Connection-idle policy** with hoarding-detection threshold (Q505).
- **Signaling-message schema validation** — JSON Schema / AJV gate before any state mutation (Q506).
- **Edge / reverse-proxy / WAF contract** for CONNECT/UPGRADE flood control (Q508).
- **CAPTCHA / proof-of-work ladder** under sustained load (Q509).
- **Auto-block / time-bound blocklist** for repeat offenders (Q510).
- **Per-room participant cap** enforced server-side, not just client-side (Q511).
- **Health-check / observability endpoint segregation** with auth and version-redaction (Q513).
- **Fallback-on-TURN-down policy** — graceful vs. fail-closed; UI surfacing (Q499).

### Risks
- **Open-relay risk.** A future TURN deployment without `--no-tcp-relay`, `--denied-peer-ip`, or static-auth-secret mode becomes an open internet relay — bandwidth and reputation cost (Q496).
- **Bandwidth abuse.** Long-lived shared TURN secrets (the easiest implementer default) let any compromised client (or the attacker who skimmed the bundle, Q492) burn relay bytes indefinitely (Q488, Q491, Q494).
- **DoS surface trivially open.** No rate limit + no payload size cap + 100-room global ceiling means a single attacker can exhaust the server in seconds with `CREATE_ROOM` floods or megabyte SDPs (Q500, Q502, Q503).
- **Slowloris and flood unaddressed.** `ws` defaults are permissive; no edge-tier hardening means a single botnet host can hold all sockets (Q507, Q508).
- **No schema validation.** Malformed signaling messages can mutate the in-memory map; oversized `roomId` strings or unexpected fields are forwarded verbatim, compounding the SDP/ICE injection risk from [docs/readiness-audit/24-tls-enforcement-and-webrtc-authentication.md](24-tls-enforcement-and-webrtc-authentication.md) Q477, Q482 (Q506).
- **Fingerprinting via health endpoints.** Once Fly.io / Railway probes are wired, default `/healthz` reveals build / dependency info that helps targeted CVE chaining (Q513).
- **Permanent collateral on shared NAT.** Any future ban-by-IP policy applied without time-bounding will block CG-NAT cohorts indefinitely (Q510, Q501).
- **Per-room join-storm.** Even with 2-seat client UI, the server has no per-room cap; an attacker drains room memory before clients learn the room is full (Q511).

### Improvements
- **Commit a TURN provider** (Cloudflare / Twilio / coturn self-host) to the multiplayer task spec; mandate **REST-API ephemeral credentials** (long-term-credential mechanism with HMAC over `username = exp:roomId:peerId`, secret in env var, TTL ≤ 5 min). Issue from the signaling server **only after** a successful `JOIN_ROOM` (and after any future host-approval gate) — never expose them in the static client bundle.
- **Pin coturn / TURN config**: `--no-tcp-relay`, `--no-loopback-peers`, `--denied-peer-ip` for RFC1918 + carrier-grade NAT ranges, realm bound to the game origin, port allowlist (UDP/443 + TCP/443 only), per-credential `--max-bps` quota, per-realm `--total-quota`.
- **Rotate the shared secret** out-of-band (KMS / secret manager) on a documented cadence (e.g., every 7 days) without redeploying the client — clients fetch fresh credentials each session.
- **Define a rate-limit matrix** for the signaling server: per-IP token bucket on `CREATE_ROOM` (e.g., 5/min, burst 10), per-IP on `JOIN_ROOM` (e.g., 10/min), per-code failure cap (e.g., 5 wrong joins / minute → temporary code lock), global `CREATE_ROOM` ceiling (e.g., 50/min), per-connection message rate (e.g., 60 msg/min). Surface counters on a private metrics endpoint.
- **Schema-validate every signaling message** with AJV (`additionalProperties: false`, length caps on `roomId` / `peerId` / `sdp` strings, ICE candidate-list length cap). Reject and disconnect on any failure.
- **Cap WebSocket payload** (`maxPayload: 64 * 1024`) and frame deadline (e.g., 5 s for full message), set `pingTimeout: 30000` / `pingInterval: 25000`, disconnect on missed ping.
- **Add a CAPTCHA challenge** (Cloudflare Turnstile or hCaptcha) gated by the rate-limiter — only triggers when per-IP `CREATE_ROOM` exceeds threshold; transparent to normal users.
- **Time-bound blocklist** (e.g., 15 min auto-ban after sustained breach, 24 h after repeated offense, max 7 d) keyed by `IP /24` for IPv4, `/64` for IPv6 to amortize collateral.
- **Per-room maxPeers** enforced server-side: reject `JOIN_ROOM` with `ROOM_FULL` once the per-room map reaches the configured cap (default 2; configurable for future scope).
- **TURN-down fallback policy**: explicit "STUN-only attempt; if ICE fails, surface 'Direct connection blocked — try a different network or wait for relay' UI; never silently fail-open." Document expected ~10–20% public NAT failure rate without TURN.
- **Segregate health/metrics**: bind `/healthz` and `/metrics` to a private port or admin path with shared-secret auth; redact build SHA / dep versions on public 4xx/5xx responses.
- **Stateless-by-design audit checklist** for any future signaling change: any new field that persists beyond a single connection must be flagged, reviewed, and either ephemeralized or moved out-of-band.

### AI-Readiness
Score: **1/10**

Reason: Of 26 questions in this audit, only **2** are partially or definitionally covered (Q498 N/A by omission of a public lobby; Q511 implicit 2-player target) and **1** is partially defined (Q512 — stateless-by-design is genuinely written down). The remaining 23 are unknown. **TURN does not exist** in the spec at all; **no rate-limiting, schema validation, payload caps, slowloris hardening, blocklist, CAPTCHA, edge-tier defense, or health-endpoint segregation** is documented. An AI implementer following the current task spec would ship a 60-line `ws`-based forwarder with no payload limit, no schema, no rate limit, and no TURN — trivially DoSable and trivially abusable as an open relay if TURN is later bolted on naïvely. This is the weakest dimension of the multiplayer audit set so far. Closing the **Improvements** list (REST-API TURN credentials, coturn allowlists, per-IP+per-room rate limits, AJV schema, payload+ping caps, segregated health, CAPTCHA escalation) would lift this to 7–8/10.
