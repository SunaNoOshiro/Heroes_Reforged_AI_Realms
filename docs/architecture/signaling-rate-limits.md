# Signaling Rate Limits

Canonical contract for the M5 signaling server's throttle layer.
Three token buckets — **per-IP**, **per-code**, **global** — held
in-memory; no Redis dependency.

**Companion docs:**
- [`signaling-audit-log.md`](./signaling-audit-log.md) — IP-key
  redaction shape and the `signaling.rate_limit.triggered` /
  `signaling.global.flood_detected` events emitted by these
  buckets.
- [`signaling-message-schema.md`](./signaling-message-schema.md) —
  wire `RateLimited` `$def` (closed `tier` / `reason` enums).
- [`signaling-health-endpoints.md`](./signaling-health-endpoints.md)
  — owner of `/healthz` and `/metrics` (supersedes the prior § 6
  here).
- [`signaling-edge-defense.md`](./signaling-edge-defense.md) —
  prefix-tier defenses and CAPTCHA escalation that build on this
  matrix.
- [`lobby-identifiers.md`](./lobby-identifiers.md) — canonical
  upper-case room-code form used as the per-code bucket key.
- [`docs/operations/error-envelope.md`](../operations/error-envelope.md)
  — public `RATE_LIMITED` envelope wrapped inside the wire `ERROR`
  payload (§ 4 oracle-resistance forbids exact-bucket fields).
- [`determinism.md` § Wall-clock readers](./determinism.md#wall-clock-readers)
  — carve-out that lets bucket refill read wall-clock.

**Implementation:**
- Primary —
  [`tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md`](../../tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md).
- Request-handler wiring (shared) —
  [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md).

---

## 1. Bucket table

| Tier | Bucket | Refill | Burst | Action on exceed |
|---|---|---|---|---|
| Per-IP `JOIN_ROOM` | 10 tokens | 1 token / 10 s | 10 | `RATE_LIMITED { retryAfterMs }` then 60 s ban |
| Per-IP `CREATE_ROOM` | 3 tokens | 1 token / 60 s | 3 | `RATE_LIMITED` (closes the room-squat risk) |
| Per-code failed `JOIN_ROOM` | 5 tokens | 1 token / 30 s | 5 | Code locked 60 s; host receives `JOIN_ATTEMPT_REJECTED` |
| Global failure | 200 / minute (rolling) | n/a | n/a | Structured alert + temp accept-only-known-IPs mode |

Bucket-key shape per tier:

- **Per-IP** — the same redacted form used for log lines per
  [`signaling-audit-log.md` § 3](./signaling-audit-log.md#3-ip-redaction-rule):
  `sha256( prefix(rawIp, /24 for v4 or /64 for v6) || dailySalt )`
  (audit log truncates the hex to 16 chars; the bucket map may
  hold the full digest). No raw IP is retained.
- **Per-code** — the canonical upper-case Crockford-Base32 form
  per [`lobby-identifiers.md`](./lobby-identifiers.md).
- **Global** — a single counter.

## 2. Bucket data structure

```ts
type Bucket = {
  tokens: number;
  lastRefillMs: number; // wall-clock; signaling-server-only
  burstCapacity: number;
  refillTokensPerMs: number;
};
```

A `Map<string, Bucket>` per tier; entries are evicted after **10
minutes of inactivity** to bound memory growth.

## 3. `RATE_LIMITED` reply

Wire-level discriminator emitted by the signaling server:

```jsonc
{
  "type": "RATE_LIMITED",
  "tier": "per_ip" | "per_code" | "global",
  "retryAfterMs": <integer>,
  "reason": "join_flood" | "create_flood" | "wrong_code" | "global"
}
```

The closed `tier` / `reason` enums are pinned in the wire schema's
`RateLimited` `$def` at
[`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json).

When this frame is wrapped in an `ERROR` payload for HTTP-mapped
surfaces, the body conforms to
[`error-envelope.md` §§ 3–5](../operations/error-envelope.md#3-signaling-mapping):
the `scope` field is coarse (`ip` / `session` / `account` /
`global`) and exact-bucket fields (`bucketKey`, `remaining`,
`limit`, `tokens`) are forbidden by `additionalProperties: false`.

Client back-off is **exponential**: start at 1 s, double on each
subsequent `RATE_LIMITED`, cap at 30 s. The clamp resets after a
single accepted message.

## 4. Per-code failure interaction

When a per-code bucket exhausts:

1. The code is **locked** for 60 s; no `JOIN_ROOM` is accepted.
2. The host (already in the room) receives a
   `JOIN_ATTEMPT_REJECTED { count, sinceMs }` notice. Subsequent
   rejections within the same 30 s window are aggregated into the
   `count`; one notice per 30 s window per host.
3. The lobby UI surfaces a non-modal toast at thresholds 1, 5, 20
   per
   [`screens/64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md).

## 5. Global failure tier

The global tier is a rolling 60 s window of *failed* messages
(invalid handshake, wrong code, denylisted peer). At ≥ 200 / minute:

- The server logs `signaling.global.flood_detected` per
  [`signaling-audit-log.md`](./signaling-audit-log.md).
- The server enters **accept-only-known-IPs** mode for 5 minutes:
  IPs that have a pre-existing accepted session continue to flow;
  new IPs are dropped at the WebSocket-upgrade handshake.

This mode is automatic; no operator action required.

## 6. Health and metrics

Health and metric counters live on the admin listener (loopback,
bearer-auth) per
[`signaling-health-endpoints.md`](./signaling-health-endpoints.md).
The public listener does **not** expose `/healthz` or `/metrics`.

## 7. Determinism note

Rate-limit state is wall-clock-driven (signaling-server-side only).
The signaling server is exempt from the engine determinism contract
per
[`determinism.md` § Wall-clock readers](./determinism.md#wall-clock-readers).
No PCG32 or seeded RNG is used; bucket refill is a pure
`(now - lastRefillMs) * refillTokensPerMs` calculation.

---

## 🔍 Sync Check

- **UI: ✔** — `JOIN_ATTEMPT_REJECTED` toast thresholds (1, 5, 20)
  in § 4 match
  [`screens/64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md)
  and
  [`64-network-lobby/interactions.md` § Join Attempt Toast](./wiki/screens/64-network-lobby/interactions.md#join-attempt-toast);
  the `rateLimited` and `codeLocked` failure states bind to
  `state.net.lobby.errorState.kind` per the same spec.
- **Schema: ⚠** — § 3's wire shape matches the legacy
  discriminator, but the `RateLimited` `$def` in
  [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)
  has a wider `tier` enum (`per_connection`, `per_prefix`) and a
  wider `reason` enum (`per_connection_burst`, `prefix_socket_cap`)
  than this doc lists. Those values were added by the edge-defense
  layer (see [`signaling-edge-defense.md`](./signaling-edge-defense.md)).
  See `## ⚠ Issues`.
- **Tasks: ✔** — Owning task
  [`13-signaling-rate-limiting`](../../tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md)
  reads this doc First and pins each acceptance row to a § 1 / § 3
  rule; the request-handler wiring is shared additively with
  [`01-signaling-server-…`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md);
  the `SIGNALING_RATE_LIMITED` runtime event in
  [`command-schema.md`](./command-schema.md) consumes the § 3 reply.

## ⚠ Issues

- **`RateLimited` enum drift between this doc and the wire
  schema.** § 3 lists `tier ∈ {per_ip, per_code, global}` and
  `reason ∈ {join_flood, create_flood, wrong_code, global}`. The
  schema's `RateLimited` `$def` in
  [`signaling-message.schema.json`](../../content-schema/schemas/signaling-message.schema.json)
  also admits `tier ∈ {per_connection, per_prefix}` and
  `reason ∈ {per_connection_burst, prefix_socket_cap}`, added when
  [`signaling-edge-defense.md`](./signaling-edge-defense.md)
  introduced the prefix-socket cap and per-connection burst tiers.
  This canonical doc only documents three tiers; the schema and
  the edge-defense doc imply five. Per CLAUDE.md "no duplicated
  logic" + `enum-lifecycle-policy.md`, either (a) fold the
  `per_connection` / `per_prefix` rows into § 1 of this doc with
  their own bucket parameters and trim § 3's enum to match, or
  (b) keep this doc's three core tiers and have
  `signaling-edge-defense.md` host the fourth and fifth bucket
  rows under a "supersedes § 1" header. Suggested owner:
  [`35-edge-defense-and-health-segregation`](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md)
  (it owns the prefix-tier additions). Skill kept the canonical
  three-tier wire vocabulary verbatim (Hard Prohibition A — no
  meaning change, no invented values) and surfaced the gap here.
- **§ 6 demoted to a pointer (was the canonical `/healthz`
  contract).** The previous revision listed `/healthz` as a public
  HTTP route returning
  `{ activeRooms, rateLimitTriggersLast60s, globalFloodMode }`.
  Per
  [`signaling-health-endpoints.md`](./signaling-health-endpoints.md),
  `/healthz` actually lives on the **admin listener**
  (`127.0.0.1:9091`, requires `Authorization: Bearer <ADMIN_TOKEN>`)
  and the response now includes `blocklistedPrefixes`. The public
  listener intentionally exposes neither `/healthz` nor `/metrics`.
  That sibling doc (and its own `## ⚠ Issues`) already names this
  file's § 6 as the demotion target; this audit performed the
  demotion. No facts were lost — the canonical shape is preserved
  in the sibling doc; this file now points at it (§ 8 Option B
  conflict resolution: target was wrong, sibling was right).
- **IP-key formula clarified to match
  `signaling-audit-log.md § 3`.** The previous revision read
  `sha256 prefix of (remoteIp || dailySalt) truncated to /24 for
  IPv4 and /64 for IPv6`, which inverts the order of operations
  (subnet truncation happens **before** the sha256, on the IP
  itself, not after on the digest). Per
  [`signaling-audit-log.md § 3`](./signaling-audit-log.md#3-ip-redaction-rule):
  `sha256( prefix(rawIp, /24 or /64) || dailySalt )`, then optionally
  `.slice(0, 16)` for log lines. § 1 of this file now mirrors that
  formula. No code change implied (Hard Prohibition A — the wording
  was ambiguous; the canonical math is unchanged).
