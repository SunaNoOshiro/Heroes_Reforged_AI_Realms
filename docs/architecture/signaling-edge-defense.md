# Signaling Edge Defense

Canonical contract for the **edge-tier defenses** in front of the M5
signaling WebSocket. Sits below the application-level throttle in
[`signaling-rate-limits.md`](./signaling-rate-limits.md) and is
realized by the `[edge_defense.*]` blocks in
[`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml).

**Companion docs:**
- [`signaling-rate-limits.md`](./signaling-rate-limits.md) — token-bucket matrix that drives sustained-breach detection.
- [`signaling-health-endpoints.md`](./signaling-health-endpoints.md) — public/admin listener split that exposes the resulting counters.
- [`signaling-message-schema.md`](./signaling-message-schema.md) — wire shape of the `ERROR { code: "captcha_required" }` envelope.
- [`signaling-audit-log.md`](./signaling-audit-log.md) — IP-prefix key shape reused by every bucket below.
- [`transport-security.md`](./transport-security.md), [`web-headers.md`](./web-headers.md) — existing TLS / headers / Origin baseline.

**Implementation:**
[`tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md`](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md).

All four defenses key on the same prefix bucket: IPv4 truncated to
`/24`, IPv6 to `/64`. The bucket key is `sha256(prefix || dailySalt)`
truncated, identical to the redaction shape in
[`signaling-audit-log.md` § 3](./signaling-audit-log.md#3-ip-redaction-rule).
The raw IP is never held in the bucket map.

---

## 1. Per-prefix concurrent socket cap

Per `/24` v4 / `/64` v6: at most **8** concurrent open WebSocket
connections. The 9th `Upgrade: websocket` request from the prefix
returns HTTP `429` with no body.

Why bucket on a prefix instead of the raw IP: legitimate shared-NAT
/ CG-NAT cohorts share a handful of sockets, while a botnet from one
ASN exhausts the pool with hundreds. The prefix gives shared-NAT
cohorts fair quota while still bounding a single attacker.

## 2. Upgrade-flood limit

Per `/24` v4 / `/64` v6: at most **30 WebSocket-upgrade attempts per
minute**. Above this, the upgrade returns HTTP `429`; on the next
sustained breach the prefix is auto-added to the blocklist (§ 4).

This is distinct from § 1: an attacker opening / closing connections
to evade the concurrent cap fills the upgrade-flood bucket instead.

## 3. CAPTCHA escalation

When the per-prefix `CREATE_ROOM` rate breaches **2× burst** (10 in
60 s, vs the canonical refill in
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

The lobby UI mounts a Cloudflare Turnstile / hCaptcha widget per
[`64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md)
(`OnCaptchaRequired(captchaToken, action)` handler); the verified
token is replayed on the retried `CREATE_ROOM`.

Provider selection:

- Dev / test: `CAPTCHA_PROVIDER` unset ⇒ stub provider that
  auto-passes every token.
- Prod: `CAPTCHA_PROVIDER=turnstile` or `=hcaptcha`.

The verifier wrapper lives at
`services/signaling/src/captcha/turnstile.ts` (owned by the
edge-defense task).

## 4. Time-bound blocklist

Keyed on `/24` v4 / `/64` v6 prefixes. TTL ladder:

| Trigger | TTL |
| --- | --- |
| Sustained breach of `1× burst` for ≥ 60 s | 15 minutes |
| Repeated within 1 hour | 24 hours |
| Repeated within 24 hours | 7 days (max) |

A blocklisted prefix's WebSocket upgrade returns HTTP `403` with no
body; the audit log records `blocklisted` once per TTL window.

The blocklist is **in-memory** by default. Optional Redis-backed
persistence is available for operators who need cross-restart
memory; in-memory suffices because every TTL above is well under
one wall-clock day, and the worst-case reactivation cost after a
deploy is one prefix re-detecting the breach within 60 s.

## 5. Edge config wiring

The clauses above are consumed by
[`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml)
under `[edge_defense]`. The CI gate `npm run validate:edge`
(deferred to the owning task) parses that file and asserts the four
named sections are present with conformant values:

- `[edge_defense.per_prefix_socket_cap]`
- `[edge_defense.upgrade_flood]`
- `[edge_defense.captcha_escalation]`
- `[edge_defense.blocklist]`

The same gate also asserts the `[health.public]` / `[health.admin]`
split per
[`signaling-health-endpoints.md` § 4](./signaling-health-endpoints.md#4-ci-gates);
those sections are out of scope for this doc.

## 6. Cross-References

- Application-level token-bucket matrix: [`signaling-rate-limits.md`](./signaling-rate-limits.md).
- Public / admin listener split that surfaces the resulting metrics: [`signaling-health-endpoints.md`](./signaling-health-endpoints.md).
- Wire shape of the `ERROR { code: "captcha_required" }` envelope: [`signaling-message-schema.md` § 1](./signaling-message-schema.md#1-discriminator).
- Lobby UI handlers (`OnCaptchaRequired`, `OnRateLimited`, `OnRoomFull`, `OnCodeLocked`, `OnRelayUnavailable`): [`64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md).
- Existing edge config baseline (TLS / headers / Origin allowlist): [`transport-security.md`](./transport-security.md), [`web-headers.md`](./web-headers.md).

---

## 🔍 Sync Check

- **UI: ✔** — The CAPTCHA wire envelope and lobby handler match [`64-network-lobby/interactions.md`](./wiki/screens/64-network-lobby/interactions.md) (`OnCaptchaRequired(captchaToken, action)` consumes `ERROR { code: "captcha_required", captchaToken, action }`).
- **Schema: ✔** — `ERROR` is in the closed discriminator enum at [`signaling-message-schema.md` § 1](./signaling-message-schema.md#1-discriminator); the four `[edge_defense.*]` TOML sections asserted in § 5 are present in [`services/signaling/config/edge.example.toml`](../../services/signaling/config/edge.example.toml). The `CAPTCHA_REQUIRED` runtime-only command in `command-schema.md` documents the same envelope.
- **Tasks: ⚠** — Owning task [`35-edge-defense-and-health-segregation`](../../tasks/phase-3/01-multiplayer/35-edge-defense-and-health-segregation.md) lists this doc in `Read First` and every acceptance row maps to a § 1–§ 5 rule. See `## ⚠ Issues` for the `signaling-rate-limits.md` cross-citation drift.

## ⚠ Issues

- **CAPTCHA-escalation citation drift against `signaling-rate-limits.md` § 1.** § 3 cites the per-prefix `CREATE_ROOM` baseline as a basis for "2× burst (10 in 60 s)", but [`signaling-rate-limits.md` § 1](./signaling-rate-limits.md#1-bucket-table) defines per-IP `CREATE_ROOM` as **3 tokens, refill 1 token / 60 s, burst 3**. With burst = 3, "2× burst" arithmetically resolves to 6 in 60 s, not 10; the prior wording "5/min refill" did not match either. The "10 in 60 s" threshold is the operationally meaningful number (it also drives the `breach_window_sec=60` / `breach_threshold_multiplier=2.0` values in `[edge_defense.captcha_escalation]`), so the rewrite kept it verbatim (Hard Prohibition A — no meaning change) and softened the cross-reference to "the canonical refill". A follow-up reconciliation should: (a) decide whether the CAPTCHA threshold is independent of the per-IP `CREATE_ROOM` bucket capacity (in which case § 3 should drop the "Nx burst" framing and cite the absolute 10/60 s number) or (b) realign the rate-limits bucket so "2× burst" arithmetically equals 10/60 s. Per CLAUDE.md "no duplicated logic" rule, the canonical numbers belong in `signaling-rate-limits.md`; this skill did not edit that file (Hard Prohibition D).
