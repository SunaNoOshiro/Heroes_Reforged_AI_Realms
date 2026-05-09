# Signaling Health Endpoints

This file is the canonical contract for **how the M5 signaling
server exposes health and metrics**. It supersedes the looser
`/healthz` rule that earlier appeared in
[`signaling-rate-limits.md` § 6](./signaling-rate-limits.md#6-healthz)
and in
[`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
— the rich JSON shape moves to a private admin port; the public
listener exposes only what the platform load balancer needs.

The owning task is
[`tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md`](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md).

---

## 1. Public listener

The public WebSocket listener exposes:

| Path | Method | Response |
| --- | --- | --- |
| `/` (Upgrade: websocket) | GET | 101 Switching Protocols, then signaling protocol per [`signaling-message-schema.md`](./signaling-message-schema.md). |
| any other path | GET | `200 OK` with empty body. Reserved for the platform-LB liveness probe. No version, no build SHA, no body content. |

Required response headers (every response, including 101 / 200 /
401 / 403 / 429):

- `Server: signaling` (no version string; no `Server: Node.js/X` /
  `nginx/X.Y` / build hash)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  per [`web-headers.md` § 1](./web-headers.md#1-required-headers)
- `Referrer-Policy: no-referrer`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

`Server` defaults from Node's HTTP / `ws` library (`Server: Node`,
`Server: WS`, etc.) are **explicitly overridden**. The CI gate
`npm run validate:edge` (deferred to the owning task) greps the
bootstrap for the `Server` header pin.

The public listener does **not** expose `/healthz`, `/metrics`,
`/admin`, `/.well-known/stack`, or any other path that reveals
deploy state.

## 2. Admin listener

A second HTTP listener binds to **`127.0.0.1:9091`** (loopback
only; never the public interface). It exposes:

| Path | Method | Response |
| --- | --- | --- |
| `/healthz` | GET | `{ activeRooms, rateLimitTriggersLast60s, globalFloodMode, blocklistedPrefixes }` |
| `/metrics` | GET | Prometheus text format; per-bucket and per-event counters per `MetricsSnapshot` |

Both endpoints require:

```
Authorization: Bearer <ADMIN_TOKEN>
```

`ADMIN_TOKEN` is provisioned via env var; never logged; rotated
out-of-band on the same 7-day cadence as
[`turn-credentials.md` § 9](./turn-credentials.md#9-rotation).
A request without the bearer header returns `401` with no body.

The admin port is **never** opened to the public network. The
deploy-host firewall blocks port 9091 at the edge; the
hosting-platform reverse-proxy never forwards to it.

## 3. Metrics shape

`MetricsSnapshot` exported on `/metrics`:

```
heroes_signaling_active_rooms <gauge>
heroes_signaling_rate_limit_triggers_total{tier="per_ip|per_code|per_prefix|per_connection|global"} <counter>
heroes_signaling_global_flood_mode <gauge>
heroes_signaling_blocklisted_prefixes <gauge>
heroes_signaling_payload_rejected_total{reason="..."} <counter>
heroes_signaling_validation_failed_total{kind="..."} <counter>
heroes_signaling_turn_issued_total{event="create|join|refresh"} <counter>
heroes_signaling_room_full_total <counter>
```

Counter labels are **closed enums** (matching the closed reason
codes in [`signaling-message-schema.md` § 4](./signaling-message-schema.md#4-rejection-behavior));
no high-cardinality labels (no IP, no roomCode, no peerId).

## 4. CI gates

The owning task wires `npm run validate:edge`:

- asserts the bootstrap binds the public listener with the public
  path policy (no `/healthz`, no `/metrics`)
- asserts the bootstrap binds the admin listener to `127.0.0.1`
  exclusively
- asserts the bootstrap requires `ADMIN_TOKEN` for every admin
  request
- asserts the public `Server` header is pinned to `Server: signaling`
- asserts no admin path is referenced from the public response
  builders (greps the source)

## 5. Cross-References

- Public listener TLS / Origin allowlist: [`transport-security.md`](./transport-security.md), [`web-headers.md`](./web-headers.md).
- Edge-defense throttle that drives the metric counters: [`signaling-edge-defense.md`](./signaling-edge-defense.md).
- Stateless-by-design rule (admin endpoint reads in-memory state only): [`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md).
- TLS-error log shape used by the metrics emitter: [`tls-observability.md`](./tls-observability.md).
- Audit log: [`signaling-audit-log.md`](./signaling-audit-log.md).
