# services/ai-gateway

> **Status: scaffolding only. Optional, out of scope for 1.x.**
> Tracked as
> [`DEF-017`](../../docs/planning/deferred.md) — Phase-3 deferred.
> The 1.x AI-generation path is **BYO-key**: the player
> supplies their own provider API key and the browser calls the
> provider directly. The hosted gateway lands only if/when the
> project ships a shared, project-paid key. Today this directory
> carries contracts + retention rules; no runtime.

Optional backend boundary for provider-backed AI generation and
moderation.

Use this when:

- provider secrets should stay off the client
- rate limiting or policy enforcement is centralized
- multiple model providers need one stable app-facing interface

Client and orchestration code should depend on the request/response
contract, not on one provider SDK.

## Operational contracts

- [`error-codes.md`](./error-codes.md) — closed HTTP-wire vocabulary
  (`401` / `404` collapse, `429` with `Retry-After`, `500` without
  `cause`).
- [`retention.md`](./retention.md) — `promptHash` rule, ≤ 24 h
  response cache TTL, failure-path logger contract.

## Transport

This gateway is **HTTPS-only** in staging and production. Plain
`http://` upstreams are forbidden; the adapter refuses to attach to
an `http://` upstream regardless of environment.

- TLS floor, cipher allowlist, HSTS, anti-downgrade, dev-cert
  exclusion, and cert-lifecycle policy are pinned by
  [`docs/architecture/transport-security.md`](../../docs/architecture/transport-security.md).
- Required response headers (HSTS, `Access-Control-Allow-Origin`
  pinned to the canonical web origin — never `*` —
  `Referrer-Policy`, `Permissions-Policy`,
  `X-Content-Type-Options`) are pinned by
  [`docs/architecture/web-headers.md`](../../docs/architecture/web-headers.md).
- Example reverse-proxy / edge config:
  [`config/edge.example.toml`](./config/edge.example.toml)
  (introduced by
  [`tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md`](../../tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md)).
