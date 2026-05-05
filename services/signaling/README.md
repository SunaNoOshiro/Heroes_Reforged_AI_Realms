# services/signaling

Optional multiplayer signaling service.

Runtime lockstep rules still belong to deterministic client or shared
simulation code. This service only helps peers discover each other and
exchange connection metadata.

## Operational contracts

- [`error-codes.md`](./error-codes.md) — closed wire-error vocabulary
  (`JOIN_FAILED` / `RATE_LIMITED` / `SERVER_ERROR`) and `OWNER_NOTICE`
  envelope.
- [`observability.md`](./observability.md) — log floor, retention TTLs,
  scrubbing rules for IPs / SDP / ICE / chat content.

## Transport

This service is **WSS-only** in staging and production. Plain
`ws://` is rejected at the listener; the bootstrap refuses to bind on
`ws://` unless `process.env.NODE_ENV === 'test'`.

- TLS floor, cipher allowlist, HSTS, anti-downgrade, dev-cert
  exclusion, and cert-lifecycle policy are pinned by
  [`docs/architecture/transport-security.md`](../../docs/architecture/transport-security.md).
- Required response headers (HSTS, `Referrer-Policy`,
  `Permissions-Policy`, `X-Content-Type-Options`) and the
  `Origin` allowlist on the WebSocket upgrade are pinned by
  [`docs/architecture/web-headers.md`](../../docs/architecture/web-headers.md).
- TLS-error log shape with PII redaction is pinned by
  [`docs/architecture/tls-observability.md`](../../docs/architecture/tls-observability.md).
- Example reverse-proxy / edge config:
  [`config/edge.example.toml`](./config/edge.example.toml)
  (introduced by
  [`tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md`](../../tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md)).

Every signaling frame after `JOIN_HANDSHAKE` is wrapped in a signed
envelope per
[`docs/architecture/signaling-envelope.md`](../../docs/architecture/signaling-envelope.md);
this service validates **shape + freshness** only and never holds
peer private keys.
