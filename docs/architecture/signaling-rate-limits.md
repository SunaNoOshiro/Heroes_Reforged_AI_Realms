# Signaling Rate Limits

This file is the canonical contract for the M5 signaling server's
throttle layer. Token-bucket throttles in three tiers — per-IP,
per-code, and global. Implemented in-memory; no Redis dependency.

The implementation lives in
[`tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md`](../../tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md);
the wiring into the request handler is shared with
[Task 01](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md).

---

## 1. Bucket table

| Tier | Bucket | Refill | Burst | Action on exceed |
|---|---|---|---|---|
| Per-IP `JOIN_ROOM` | 10 tokens | 1 token / 10 s | 10 | `RATE_LIMITED { retryAfterMs }` then 60 s ban |
| Per-IP `CREATE_ROOM` | 3 tokens | 1 token / 60 s | 3 | `RATE_LIMITED` (closes the room-squat risk) |
| Per-code failed `JOIN_ROOM` | 5 tokens | 1 token / 30 s | 5 | Code locked 60 s; host receives `JOIN_ATTEMPT_REJECTED` |
| Global failure | 200 / minute (rolling) | n/a | n/a | Structured alert + temp accept-only-known-IPs mode |

A bucket "key" is the canonical form:

- Per-IP: a sha256 prefix of `(remoteIp || dailySalt)` truncated
  to `/24` for IPv4 and `/64` for IPv6 (the same shape that
  [`signaling-audit-log.md`](./signaling-audit-log.md) uses for
  log redaction).
- Per-code: the upper-cased Crockford-Base32 form per
  [`lobby-identifiers.md`](./lobby-identifiers.md).
- Global: a single counter.

## 2. Bucket data structure

```ts
type Bucket = {
  tokens: number;
  lastRefillMs: number; // wall-clock; signaling-server-only
  burstCapacity: number;
  refillTokensPerMs: number;
};
```

A `Map<string, Bucket>` per tier; entries are evicted after 10
minutes of inactivity to bound memory growth.

## 3. `RATE_LIMITED` reply

```jsonc
{
  "type": "RATE_LIMITED",
  "tier": "per_ip" | "per_code" | "global",
  "retryAfterMs": <integer>,
  "reason": "join_flood" | "create_flood" | "wrong_code" | "global"
}
```

The client's back-off is **exponential**: start at 1 s, double on
each subsequent `RATE_LIMITED`, cap at 30 s. The clamp resets after
a single accepted message.

## 4. Per-code failure interaction

When a per-code bucket exhausts:

1. The code is **locked** for 60 s (no `JOIN_ROOM` is accepted).
2. The host (already in the room) receives a
   `JOIN_ATTEMPT_REJECTED { count, sinceMs }` notice. Subsequent
   rejections within the same 30 s window are aggregated into the
   `count`; only one notice per 30 s window per host.
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

## 6. `/healthz`

The `/healthz` HTTP route exposes:

```jsonc
{
  "activeRooms": <integer>,
  "rateLimitTriggersLast60s": {
    "perIp": <integer>,
    "perCode": <integer>,
    "global": <integer>
  },
  "globalFloodMode": <boolean>
}
```

These counters are the operator's primary signal that a
room-code enumeration risk is materializing.

## 7. Determinism note

Rate-limit state is wall-clock-driven (signaling-server-side only).
The signaling server is exempt from the engine determinism contract
per
[`determinism.md` § Wall-clock readers](./determinism.md#wall-clock-readers).
No PCG32 or seeded RNG is used; bucket refill is a pure
`(now - lastRefillMs) * refillTokensPerMs` calculation.
