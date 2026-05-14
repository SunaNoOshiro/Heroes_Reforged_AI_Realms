# Signaling Health Endpoints

Canonical contract for **how the M5 signaling server exposes health
and metrics**. The rich JSON / Prometheus shape lives on a private
admin port; the public listener exposes only what the platform load
balancer needs.

This file supersedes the looser `/healthz` rule that earlier appeared
in
[`signaling-rate-limits.md` § 6](./signaling-rate-limits.md#6-healthz)
and in
[`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md).

**Companion docs:**
- [`signaling-edge-defense.md`](./signaling-edge-defense.md) — prefix-tier defenses whose counters surface here.
- [`signaling-rate-limits.md`](./signaling-rate-limits.md) — token-bucket matrix behind the rate-limit counters.
- [`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md) — admin endpoint reads in-memory state only.
- [`signaling-message-schema.md`](./signaling-message-schema.md) — closed `reasonCode` / `kind` enums reused as Prometheus labels.
- [`signaling-audit-log.md`](./signaling-audit-log.md) — stdout audit log paired with `/metrics`.
- [`tls-observability.md`](./tls-observability.md) — TLS-error log shape consumed by the metrics emitter.
- [`transport-security.md`](./transport-security.md), [`web-headers.md`](./web-headers.md) — TLS / Origin / headers baseline.

**Implementation:**
[`tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md`](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md).

**Edge config:**
[`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml)
under `[health.public]` / `[health.admin]`.

---

## 1. Public listener

The public WebSocket listener exposes only:

| Path | Method | Response |
| --- | --- | --- |
| `/` (`Upgrade: websocket`) | `GET` | `101 Switching Protocols`, then signaling protocol per [`signaling-message-schema.md`](./signaling-message-schema.md). |
| any other path | `GET` | `200 OK` with empty body. Reserved for the platform-LB liveness probe. No version, no build SHA, no body content. |

Required headers on **every** response (`101` / `200` / `401` /
`403` / `429`):

- `Server: signaling` — no version string; never `Server: Node.js/X`,
  `nginx/X.Y`, or build hash. Node's HTTP / `ws` defaults
  (`Server: Node`, `Server: WS`) are explicitly overridden.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  per [`web-headers.md` § 1](./web-headers.md#1-required-headers).
- `Referrer-Policy: no-referrer`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

The public listener **never** serves `/healthz`, `/metrics`,
`/admin`, `/.well-known/stack`, or any other path that reveals
deploy state.

## 2. Admin listener

A separate HTTP listener binds to **`127.0.0.1:9091`** (loopback
only; never the public interface):

| Path | Method | Response |
| --- | --- | --- |
| `/healthz` | `GET` | `{ activeRooms, rateLimitTriggersLast60s, globalFloodMode, blocklistedPrefixes }` |
| `/metrics` | `GET` | Prometheus text format per § 3 (`MetricsSnapshot`). |

Both endpoints require:

```
Authorization: Bearer <ADMIN_TOKEN>
```

- `ADMIN_TOKEN` is provisioned via env var, never logged, and
  rotated out-of-band on the same 7-day cadence as
  [`turn-credentials.md` § 9](./turn-credentials.md#9-rotation).
- A request without (or with an invalid) bearer header returns
  `401` with no body.
- The admin port is **never** opened to the public network. The
  deploy-host firewall blocks `9091` at the edge; the hosting-
  platform reverse-proxy never forwards to it.

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

Counter labels are **closed enums**, matching the closed `reasonCode`
table in
[`signaling-message-schema.md` § 4](./signaling-message-schema.md#4-rejection-behavior).
**No high-cardinality labels**: no IP, no `roomCode`, no `peerId`.

## 4. CI gates

The owning task wires `npm run validate:edge` to assert:

- the public listener applies the path policy in § 1 (no `/healthz`,
  no `/metrics`);
- the admin listener binds to `127.0.0.1` exclusively;
- every admin request requires `Authorization: Bearer <ADMIN_TOKEN>`;
- the public `Server` header is pinned to `Server: signaling`
  (greps the bootstrap);
- no admin path is referenced from any public response builder
  (source grep).

The same gate also asserts the `[health.public]` / `[health.admin]`
TOML sections are present in
[`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml)
with the values pinned in §§ 1–2. The full `[edge_defense.*]` /
`[health.*]` matrix the gate parses is documented in
[`signaling-edge-defense.md` § 5](./signaling-edge-defense.md#5-edge-config-wiring).

## 5. Cross-references

- Public listener TLS / Origin allowlist: [`transport-security.md`](./transport-security.md), [`web-headers.md`](./web-headers.md).
- Edge-defense throttle that drives the metric counters: [`signaling-edge-defense.md`](./signaling-edge-defense.md).
- Stateless-by-design rule (admin endpoint reads in-memory state only): [`signaling-stateless-invariant.md`](./signaling-stateless-invariant.md).
- TLS-error log shape consumed by the metrics emitter: [`tls-observability.md`](./tls-observability.md).
- Stdout audit log paired with `/metrics`: [`signaling-audit-log.md`](./signaling-audit-log.md).

---

## 🔍 Sync Check

- **UI: ✔** — Doc is server-side only; the lobby error-state UI
  driven by these counters lives in
  [`64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md)
  and is owned by Task 35, not by this contract.
- **Schema: ✔** — Edge config
  [`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml)
  carries `[health.public]` (`server_header = "signaling"`,
  `expose_healthz = false`, `expose_metrics = false`,
  `liveness_status = 200`) and `[health.admin]`
  (`bind = "127.0.0.1:9091"`,
  `require_auth = "Bearer:ADMIN_TOKEN"`,
  `paths = ["/healthz", "/metrics"]`) verbatim per §§ 1–2. Counter
  labels reuse the closed `reasonCode` enum in
  [`signaling-message-schema.md` § 4](./signaling-message-schema.md#4-rejection-behavior).
  The `SIGNALING_PAYLOAD_REJECTED` runtime event in
  [`command-schema.md`](./command-schema.md) cites § 3 as its
  surfacing point.
- **Tasks: ⚠** — Owning task
  [`35-edge-defense-and-health-segregation`](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md)
  lists this doc in `Read First` and `Owned Paths`; every § 1–§ 4
  rule maps to one of its acceptance rows. See `## ⚠ Issues` for
  the sibling-doc supersession drift in
  `signaling-rate-limits.md § 6`.

## ⚠ Issues

- **Stale `/healthz` shape in `signaling-rate-limits.md § 6`.** The
  header here states this file supersedes
  [`signaling-rate-limits.md` § 6](./signaling-rate-limits.md#6-healthz),
  but that section still reads as if the response shipped on the
  public listener and lists only
  `{ activeRooms, rateLimitTriggersLast60s, globalFloodMode }` —
  missing the `blocklistedPrefixes` field defined in § 2 above, the
  admin-port pin (`127.0.0.1:9091`), and the
  `Authorization: Bearer <ADMIN_TOKEN>` requirement. Per the
  CLAUDE.md "no duplicated logic" rule and the
  `architecture-quality` clause of this skill, the rate-limits doc
  should demote § 6 to a one-line pointer once Task 35 lands.
  Suggested replacement (in `signaling-rate-limits.md`, **not** this
  file): swap § 6 body for "Health and metrics live on the admin
  listener; see
  [`signaling-health-endpoints.md`](./signaling-health-endpoints.md)."
  This skill did not edit `signaling-rate-limits.md`
  (Hard Prohibition D — never edit cross-checked files); the gap is
  a follow-up under the same Task 35 owner.
