# Signaling Edge Defense

> Source plan:
> [`docs/implementation-plans/25-turn-credentials-and-signaling-server-abuse-plan.md`](../implementation-plans/25-turn-credentials-and-signaling-server-abuse-plan.md)
> § Critical Fix 5.

This file is the canonical contract for the **edge-tier defenses**
in front of the M5 signaling WebSocket. It extends the
hosting-platform-agnostic config in
[`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml)
(authored by [Plan 24](../implementation-plans/24-tls-enforcement-and-webrtc-authentication-plan.md))
with the abuse-defense surface that complements the application-level
throttle in
[`signaling-rate-limits.md`](./signaling-rate-limits.md).

The owning task is
[`tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md`](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md).

---

## 1. Per-prefix concurrent socket cap

A single `/24` IPv4 prefix or `/64` IPv6 prefix may hold at most
**8 concurrent open WebSocket connections** to the signaling
server. The 9th `Upgrade: websocket` request from the same prefix
is refused with HTTP `429` and no body.

Rationale: legitimate shared-NAT / CG-NAT cohorts use a handful of
sockets; a botnet from a single ASN exhausts the socket pool with
hundreds. Bucketing on `/24` / `/64` instead of raw IP gives
shared-NAT cohorts fair quota while still bounding a single
attacker.

Bucket key: same shape as
[`signaling-audit-log.md`](./signaling-audit-log.md)
(`sha256(prefix || dailySalt)` truncated). The raw IP is never
held in the bucket map.

## 2. Upgrade-flood limit

Per `/24` v4 / `/64` v6, **30 WebSocket upgrade attempts per minute**
is the ceiling. Above this, the upgrade returns HTTP `429` and the
prefix is auto-added to the time-bound blocklist (§ 4) at the next
sustained breach.

This is distinct from § 1 (concurrent socket cap): an attacker
opening / closing connections to evade the concurrent cap fills the
upgrade-flood bucket instead.

## 3. CAPTCHA escalation

When the per-prefix `CREATE_ROOM` rate breaches **2× burst** (10
in 60 s, vs the 5/min refill in
[`signaling-rate-limits.md` § 1](./signaling-rate-limits.md#1-bucket-table))
for ≥ 60 s, the next `CREATE_ROOM` from that prefix returns:

```jsonc
{
  "type": "ERROR",
  "code": "captcha_required",
  "action": "createroom",
  "captchaToken": "<opaque-token>"
}
```

The lobby UI (per
[`64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md))
mounts a Cloudflare Turnstile / hCaptcha widget; the verified
token is replayed on the retried `CREATE_ROOM`.

The CAPTCHA provider is **off by default** in dev / test
(`CAPTCHA_PROVIDER` env var unset ⇒ stub provider that auto-passes
every token). In prod the provider is set to `turnstile` or
`hcaptcha`. The CAPTCHA verifier wrapper lives at
`services/signaling/src/captcha/turnstile.ts` (owned by the edge
task).

## 4. Time-bound blocklist

The blocklist is keyed on `/24` v4 / `/64` v6 prefixes. TTL ladder:

| Trigger | TTL |
| --- | --- |
| Sustained breach of `1× burst` for ≥ 60 s | 15 minutes |
| Repeated within 1 hour | 24 hours |
| Repeated within 24 hours | 7 days (max) |

The blocklist is **in-memory** in the signaling server by default;
optional Redis-backed persistence is documented for operators who
need cross-restart memory. In-memory is the default because every
TTL above is well under one wall-clock day, and survival across a
deploy restart is not load-bearing for the threat model — the
worst-case reactivation cost is one prefix re-detecting the
breach pattern within 60 s of the new deploy.

A blocklisted prefix's WebSocket upgrade returns HTTP `403` with no
body; the per-prefix audit-log row records `blocklisted` once per
TTL window.

## 5. Edge config wiring

The clauses in this doc are consumed by
[`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml)
under `[edge_defense]`. The CI gate
`npm run validate:edge` (deferred to the owning task) parses that
file and asserts the four named sections (`per_prefix_socket_cap`,
`upgrade_flood`, `captcha_escalation`, `blocklist`) are present
with conformant values.

## 6. Cross-References

- Application-level token-bucket matrix: [`signaling-rate-limits.md`](./signaling-rate-limits.md).
- Health / metrics segregation: [`signaling-health-endpoints.md`](./signaling-health-endpoints.md).
- Wire shape of the `ERROR { code: "captcha_required" }` envelope: [`signaling-message-schema.md` § 1](./signaling-message-schema.md#1-discriminator).
- Lobby UI handlers: [`64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md).
- Existing edge config baseline (TLS / headers / Origin allowlist): [`transport-security.md`](./transport-security.md), [`web-headers.md`](./web-headers.md).
