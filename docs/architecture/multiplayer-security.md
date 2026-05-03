# Multiplayer Security

Single canonical doc for the M5 (Phase-3) multiplayer module:
transport TLS, room-secret authentication, TURN credentials, and the
anti-cheat threat model. Cross-link from
[`tasks/phase-3/01-multiplayer.md`](../../tasks/phase-3/01-multiplayer.md)
and [`overview.md`](./overview.md).

The deterministic-replay rules referenced here live in
[`determinism.md`](./determinism.md). The lockstep transport, hash
exchange, and reconnection contracts live in the per-task files under
[`tasks/phase-3/01-multiplayer/`](../../tasks/phase-3/01-multiplayer/).

---

## Transport Security

### `wss://` Mandate

Signaling MUST be served over `wss://` in staging and production.
Plain-text `ws://` is allowed only on `localhost` for the dev loop.

- Cert provisioning: Let's Encrypt (managed by the deploy host —
  Fly.io and Railway both terminate TLS at the edge).
- HSTS: enabled with 1-year max-age on the signaling vhost.
- Cipher suites: defer to the platform default; reject anything
  weaker than TLS 1.2.

### Room Secret + Handshake

Room codes alone (6-character alphanumeric, ~2 billion keyspace) are
enumerable for any active public lobby and cannot evict a known
griefer. Every room therefore carries a per-room **shared secret**
in addition to the room ID:

- Generated at `CREATE_ROOM` time on the signaling server: 16 bytes,
  base64url-encoded, ~22 chars on the wire.
- Embedded in the invite URL fragment (`#secret=…`) so it never hits
  server logs and never crosses HTTP referer headers.
- Rotated on `LEAVE_ROOM` if the room becomes empty; the next
  `CREATE_ROOM` call gets a fresh secret.

The handshake message is the first frame on the WebSocket after the
TLS handshake completes:

```
JOIN_HANDSHAKE { roomId, peerId, secret, sigSchemaVersion }
```

The signaling server matches `(roomId, secret)` against in-memory
state; mismatches receive `JOIN_REJECTED { reason }` and are
disconnected. Load-balancer health checks bypass the handshake.

### Threat Model — Transport

| Threat | Mitigation |
| --- | --- |
| Sniffed signaling on public Wi-Fi | `wss://` mandate |
| Enumerated room codes | 16-byte room secret in URL fragment |
| Replay of an old invite link | Secret rotates on empty-room |
| MITM of the WebRTC SDP exchange | Browser DTLS-SRTP fingerprint |
| Privileged-peer state on signaling | Server is stateless lobby only |

---

## TURN Credentials

### Provider Pin

Default provider: **Cloudflare Calls TURN**. Self-hosted **coturn**
is documented as a fallback for self-publishers in
[`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md).

### Credential Format

Short-lived HMAC-signed credentials issued by the signaling server:

```
username   = `${unixTsExpiry}:${roomId}`
credential = base64( HMAC_SHA1(secret, username) )
ttl        = 600 seconds
```

The signaling server exposes a single endpoint:

```
GET /turn-credential
→ { urls: string[], username: string, credential: string, ttl: number }
```

Clients add the returned URLs to `RTCConfiguration.iceServers` only
after the STUN-only attempt times out (4 s). See Task 10 for the
client-side fallback flow.

### Threat Model — TURN

| Threat | Mitigation |
| --- | --- |
| Credential leak via logs | Short TTL (600 s); secret never logged |
| Bandwidth abuse via stolen TURN URLs | TTL + per-room rate limit |
| Provider lock-in | coturn fallback recipe in `services/` |
| TURN-only matches inflating bills | Force STUN-first; record TURN use |

---

## Anti-Cheat Threat Model

Determinism (per-turn xxh64 state hash, pinned `engineHash` +
`contentHash` on every command) catches *outcome-altering* cheats.
The table below enumerates the remaining classes and their M5
mitigation. "Deferred to M7" entries are explicit scope-outs, not
forgotten work.

| Class | M5 Mitigation | Owner |
| --- | --- | --- |
| Outcome cheat (forged stat) | Per-turn state hash exchange | Existing — [Task 4](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md) |
| Information cheat (fog reveal, opponent army inspection) | **Deferred to M7** — server-authoritative fog state requires authoritative server, out of P2P scope | Doc only — see "Deferred Mitigations" below |
| Replay / rewind | `engineHash` + `contentHash` pinned on every command in the wire format | Existing — [Task 3](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) |
| Slow-loris (intentional turn stalling) | Input-delay budget (2 s soft / 10 s hard / 120 s forfeit) — see [Task 3 § Input-Delay Budget](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) and [Task 6](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md) | Existing |
| Map-hack via memory inspection | **Acknowledged not solvable in P2P** — both peers hold full state by definition | Doc only |
| Modified client (custom RNG, skipped guards) | Per-turn state-hash divergence catches outcome impact within 1 turn | Existing — [Task 4](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md) |
| Lobby griefing / hijack | Room secret + `JOIN_HANDSHAKE` (above) | Existing — extends [Task 1](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) |
| Privileged-peer drift on bots | Bot RNG sub-stream + broadcaster election — see [`determinism.md` § Bot RNG Sub-Streams](./determinism.md#bot-rng-sub-streams) | Existing — extends [Task 3](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) |

### Deferred Mitigations

The following classes are explicit M7 scope. Listing them here so
that contributors who add fog-of-war state, observers, or tournament
mode do not accidentally regress the M5 determinism contract.

- **Server-authoritative fog**: requires moving away from pure P2P.
  The "screen of truth" for fog moves from the deterministic engine
  to a relay that filters per-player state diffs. Plan: M7 polish.
- **Server-side game replay verification**: a non-real-time job that
  re-runs the full command log on the server to detect divergence
  patterns invisible to the per-turn hash (e.g., self-consistent
  cheats from a modified client paired with a colluding peer).
- **Tournament observer mode**: distinct from spectator (see
  [`glossary.md`](./glossary.md)) — tournament observers have
  authority bound to a tournament authority service.

---

## Operational Hooks

- Signaling deployment templates and the room-secret rotation policy
  live in [`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md)
  and the (existing) [`services/signaling/`](../../services/signaling/)
  README.
- The chaos test matrix
  ([Task 11](../../tasks/phase-3/01-multiplayer/11-network-chaos-test-matrix.md))
  exercises TURN failover and signaling restart mid-match against the
  thresholds above.
- The CI determinism gate for multiplayer code paths is described in
  [`determinism.md` § Clock Policy](./determinism.md#clock-policy);
  the path-filter triggers re-running the fuzz harness with the
  multiplayer chaos shim on any change to `src/net/webrtc/**`,
  `src/engine/**`, `src/rules/**`, or `resources/**/pack.*`.
