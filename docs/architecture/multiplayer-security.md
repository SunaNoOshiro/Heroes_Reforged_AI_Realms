# Multiplayer Security

Threat-model overview for the M5 (Phase-3) multiplayer module. This
file owns the **room secret + invite-link handshake** contract and
the **anti-cheat threat-model summary**; the deeper doctrines for
transport, TURN credentials, and lockstep security live in their
own canonical docs and are linked, not duplicated.

Companion docs:

- [`transport-security.md`](./transport-security.md) — canonical
  WSS / HTTPS / HSTS / TLS-floor doctrine.
- [`turn-credentials.md`](./turn-credentials.md) — canonical TURN
  credential issuance, scope, TTL, rotation, and revocation.
- [`security-model.md`](./security-model.md) — canonical
  symmetric-input-only-lockstep doctrine (what the netcode protects
  and what it structurally cannot).
- [`lobby-identifiers.md`](./lobby-identifiers.md) — canonical
  room-code alphabet, length, RNG mandate, cool-down, TTL.
- [`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md)
  — what the signaling server is allowed to remember.
- [`signaling-message-schema.md`](./signaling-message-schema.md) —
  wire shape for `JOIN_HANDSHAKE`, `JOIN_REJECTED`, and every other
  signaling frame.
- [`determinism.md`](./determinism.md) — pure-reducer + RNG contract
  the lockstep model rests on.
- [`overview.md`](./overview.md) — module map for the architecture
  set this doc participates in.

Per-task contracts (lockstep transport, hash exchange, reconnection,
host migration) live under
[`tasks/phase-3/01-multiplayer/`](../../tasks/phase-3/01-multiplayer/);
the module entry-point is
[`tasks/phase-3/01-multiplayer.md`](../../tasks/phase-3/01-multiplayer.md).

---

## Transport Security

`wss://` mandate, HSTS, TLS floor, anti-downgrade, cert lifecycle,
and dev-cert exclusion are owned by
[`transport-security.md`](./transport-security.md). This section
owns only the **room-secret invite-link handshake** layered on top.

### Room Secret + Handshake

Room codes alone are enumerable for any active public lobby and
cannot evict a known griefer; the alphabet, length, and CSPRNG
mandate live in
[`lobby-identifiers.md`](./lobby-identifiers.md). Every room
therefore carries a per-room **shared secret** in addition to the
room code:

- **Mint.** Generated at `CREATE_ROOM` time on the signaling
  server: 16 random bytes, base64url-encoded (22 chars on the wire,
  matching the `Base64Url22` `$def` in
  [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)).
- **Carriage.** Embedded in the invite-URL **fragment** (canonical
  fragment shape:
  [`screens/62-multiplayer-setup/spec.md` § Invite URL](./wiki/screens/62-multiplayer-setup/spec.md))
  so the secret never reaches server logs and never crosses
  `Referer` headers.
- **Rotation.** A fresh secret is minted at every `CREATE_ROOM`;
  once a room becomes empty, the room code enters its cool-down
  per [`lobby-identifiers.md` § 6](./lobby-identifiers.md#6-reuse-policy-cool-down)
  and the next `CREATE_ROOM` issues a new `(code, secret)` pair.

The handshake message is the first frame on the WebSocket after
the TLS handshake completes; the wire shape is pinned by the
`JoinHandshake` `$def` in
[`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json):

```
JOIN_HANDSHAKE { type, roomId, peerId, peerPubKey, secret, sigSchemaVersion }
```

The signaling server matches `(roomId, secret)` against the
in-memory `room → peer` map (canonical state list:
[`signaling-stateless-invariant.md` § 1](./signaling-stateless-invariant.md#1-allowed-in-memory-state)).
Mismatches receive `JOIN_REJECTED { reason }` and are
disconnected. Load-balancer health checks bypass the handshake.

### Threat Model — Transport

| Threat | Mitigation |
| --- | --- |
| Sniffed signaling on public Wi-Fi | `wss://` mandate ([`transport-security.md` § 1](./transport-security.md#1-listener-wss-only--https-only)) |
| Enumerated room codes | 16-byte room secret in URL fragment (this section) |
| Replay of an old invite link | Secret re-minted on next `CREATE_ROOM`; code cool-down per [`lobby-identifiers.md` § 6](./lobby-identifiers.md#6-reuse-policy-cool-down) |
| MITM of the WebRTC SDP exchange | Browser DTLS-SRTP fingerprint pin ([`dtls-fingerprint-pinning.md`](./dtls-fingerprint-pinning.md)) |
| Privileged-peer state on signaling | Stateless lobby invariant ([`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md)) |

---

## TURN Credentials

The canonical credential issuance, scope, TTL, refresh, revocation,
rotation, and logging contract is
[`turn-credentials.md`](./turn-credentials.md). The wire shape is
pinned by
[`turn-credential.schema.json`](../../content-schema/schemas/turn-credential.schema.json)
and embedded in the `TURN_CREDENTIALS` envelope of
[`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json).
Provider pin and operational runbook live in
[`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md);
fallback policy when TURN is unavailable lives in
[`turn-fallback-policy.md`](./turn-fallback-policy.md).

This section keeps only the threat-model summary; numbers and field
names belong in those canonical docs.

### Threat Model — TURN

| Threat | Mitigation |
| --- | --- |
| Credential leak via logs | Short TTL + secret never logged ([`turn-credentials.md` §§ 3, 8](./turn-credentials.md#3-ttl)) |
| Bandwidth abuse via stolen TURN URLs | Short TTL + per-`(roomCode, peerId)` scope + per-room rate limit ([`turn-credentials.md` § 4](./turn-credentials.md#4-scope), [`signaling-rate-limits.md`](./signaling-rate-limits.md)) |
| Provider lock-in | coturn fallback recipe in [`services/turn/`](../../services/turn/) and [`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md) |
| TURN-only matches inflating bills | STUN-first fallback flow ([Task 10](../../tasks/phase-3/01-multiplayer/10-turn-fallback-and-credentials.md)) and TURN-use telemetry |

---

## Anti-Cheat Threat Model

The full doctrine for what symmetric input-only lockstep protects
and what it structurally cannot is in
[`security-model.md`](./security-model.md). This section is a
compact threat-class summary: each row points at the M5 mitigation
and its owning task, and "Deferred to M7" rows are explicit
scope-outs (not forgotten work).

| Class | M5 Mitigation | Owner |
| --- | --- | --- |
| Outcome cheat (forged stat) | Per-turn `xxh64` state-hash exchange | [Task 4](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md) |
| Information cheat (fog reveal, opponent army inspection) | **Deferred to M7** — server-authoritative fog requires moving away from pure P2P | Doc only — see [Deferred Mitigations](#deferred-mitigations) and [`security-model.md` § 2](./security-model.md#2-what-symmetric-input-only-lockstep-does-not-protect) |
| Replay / rewind | `engineHash` + `contentHash` pinned on every command in the wire format | [Task 3](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) |
| Slow-loris (intentional turn stalling) | Input-delay budget (2 s soft / 10 s hard / 120 s forfeit) | [Task 3](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md), [Task 6](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md) |
| Map-hack via memory inspection | **Acknowledged not solvable in P2P** — both peers hold full state by definition ([`security-model.md` § 2](./security-model.md#2-what-symmetric-input-only-lockstep-does-not-protect)) | Doc only |
| Modified client (custom RNG, skipped guards) | Per-turn state-hash divergence catches outcome impact within 1 turn | [Task 4](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md) |
| Lobby griefing / hijack | Room secret + `JOIN_HANDSHAKE` (above) | Extends [Task 1](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md) |
| Privileged-peer drift on bots | Bot RNG sub-stream + broadcaster election ([`determinism.md` § Bot RNG Sub-Streams](./determinism.md#bot-rng-sub-streams)) | Extends [Task 3](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md) |

### Deferred Mitigations

These classes are explicit M7+ scope. Listing them here so that
contributors who add fog-of-war state, observers, or tournament
mode do not accidentally regress the M5 determinism contract.

- **Server-authoritative fog.** Requires moving away from pure P2P;
  the "screen of truth" for fog moves from the deterministic engine
  to a relay that filters per-player state diffs. Plan: M7 polish.
- **Server-side replay verification.** A non-real-time job that
  re-runs the full command log on the server to detect divergence
  patterns invisible to the per-turn hash (e.g., self-consistent
  cheats from a modified client paired with a colluding peer).
  Contract sketch in
  [`replay-audit-pipeline.md`](./replay-audit-pipeline.md).
- **Tournament observer mode.** Distinct from spectator (see
  [`glossary.md`](./glossary.md)); tournament observers have
  authority bound to a tournament authority service. Spectator
  requirements live in
  [`spectator-mode-requirements.md`](./spectator-mode-requirements.md).

---

## Operational Hooks

- Signaling deployment templates and the room-secret rotation
  policy live in
  [`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md)
  and the [`services/signaling/`](../../services/signaling/) README.
- The chaos test matrix
  ([Task 11](../../tasks/phase-3/01-multiplayer/11-network-chaos-test-matrix.md))
  exercises TURN failover and signaling restart mid-match against
  the thresholds above.
- The CI determinism gate for multiplayer code paths is described
  in
  [`determinism.md` § Clock Policy](./determinism.md#clock-policy);
  the path filter re-runs the fuzz harness with the multiplayer
  chaos shim on any change to `src/net/webrtc/**`, `src/engine/**`,
  `src/rules/**`, or `resources/**/pack.*`.
- Edge-config and listener-binding gates (`validate:transport`,
  `validate:headers`) are owned by
  [Task 24](../../tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md)
  and detailed in
  [`transport-security.md` § 8](./transport-security.md#8-ci-gates).

---

## 🔍 Sync Check

- **UI: ✔** — Invite-URL fragment shape (`#r=<code>&s=<secret>`)
  matches
  [`screens/62-multiplayer-setup/spec.md` § Invite URL](./wiki/screens/62-multiplayer-setup/spec.md)
  and
  [`screens/62-multiplayer-setup/data-contracts.md`](./wiki/screens/62-multiplayer-setup/data-contracts.md);
  this doc no longer pins a literal fragment grammar (UI is canonical).
- **Schema: ⚠** — `JOIN_HANDSHAKE` field list now matches the
  `JoinHandshake` `$def` in
  [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)
  (adds `peerPubKey`, which the previous prose omitted). TURN
  credential format and TTL are now demoted entirely to
  [`turn-credentials.md`](./turn-credentials.md), which is the
  declared SSOT; see `## ⚠ Issues`.
- **Tasks: ✔** — Owning module
  [`tasks/phase-3/01-multiplayer.md`](../../tasks/phase-3/01-multiplayer.md)
  and Task 1, Task 3, Task 4, Task 6, Task 10, Task 11, Task 24 all
  resolve in `task-registry.json`; inbound anchors
  `#room-secret--handshake`, `#turn-credentials`,
  `#anti-cheat-threat-model`, and `#deferred-mitigations`
  preserved.

## ⚠ Issues

- **Stale TURN credential format demoted.** Previous prose pinned
  `username = ${unixTsExpiry}:${roomId}`, `ttl = 600 seconds`, and
  a `GET /turn-credential` HTTP endpoint. The canonical doctrine in
  [`turn-credentials.md`](./turn-credentials.md) is
  `username = ${expEpochSeconds}:${roomCode}:${peerId}`, hard
  ceiling **300 s**, delivered via the `TURN_CREDENTIALS`
  signaling envelope (no separate HTTP endpoint). Per
  [`turn-credentials.md`](./turn-credentials.md) ("the older docs
  cross-link forward into this one as the SSOT"), the rewrite
  removed the inline numbers and replaced them with a one-line
  pointer. No silent rewrite of the canonical numbers — they were
  already correct in `turn-credentials.md`; this doc was the stale
  copy.
- **Stale room-code description demoted.** Previous prose described
  room codes as `6-character alphanumeric, ~2 billion keyspace`.
  The canonical contract in
  [`lobby-identifiers.md`](./lobby-identifiers.md) is 8-character
  Crockford-Base32 over 30 symbols (≈ 39.24 bits, ~6.56 × 10¹¹
  keyspace). Already flagged in the sibling doc's `## ⚠ Issues`
  block; this rewrite drops the inline figure and links to the
  canonical doc.
- **Transport-doctrine duplication demoted.** Previous prose pinned
  `wss://` mandate, HSTS max-age, and TLS 1.2 cipher floor inline.
  Those rules now live solely in
  [`transport-security.md`](./transport-security.md); per
  CLAUDE.md "no duplicated logic", the rewrite replaces them with
  one-line cross-references. No numeric drift from the original —
  every threshold restated in `transport-security.md` is at least
  as strict as the version this doc previously carried.
- **Anti-cheat doctrine canonicalized.** The full
  protects-vs-does-not-protect doctrine now lives in
  [`security-model.md`](./security-model.md). The threat-class
  table here is preserved as a compact summary (the inbound
  `#anti-cheat-threat-model` anchor is load-bearing for
  [`docs/operations/free-tier-deploy.md`](../operations/free-tier-deploy.md)
  and the in-doc table covers classes — room secret, TURN bandwidth
  abuse — that `security-model.md` does not enumerate). No CI gap;
  flag is FYI only.
