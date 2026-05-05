# services/turn

Operational scaffolding for the M5 multiplayer TURN relay.

The signaling service ([`services/signaling/`](../signaling/)) is the
**only issuer** of TURN credentials per
[`docs/architecture/turn-credentials.md`](../../docs/architecture/turn-credentials.md);
this directory holds the **TURN server** config (deploy artifact),
the deny-list sync worker, and the attribution-log shape. The
provider pin and operational runbook live in
[`services/multiplayer/turn-config.md`](../multiplayer/turn-config.md).

## Provider

Default: **Cloudflare Calls TURN** (managed). Self-hosted fallback:
**coturn** with the hardened config in
[`config/turnserver.example.conf`](./config/turnserver.example.conf).

| Concern | Cloudflare Calls TURN | Self-hosted coturn |
| --- | --- | --- |
| Open-relay risk | Provider-managed; reputation hardened | This directory's config explicitly disables TCP relay, loopback, multicast, and private-IP destinations |
| Credential format | Long-term-credential mechanism with HMAC-SHA1 | Same (`lt-cred-mech`) |
| Bandwidth abuse | Provider quotas + revocation API | `max-bps` per allocation, `bps-capacity` per instance, `user-quota` per credential |
| Deny-list sync | HTTP credential-revocation API | Redis pub/sub + `closesession` admin command |
| Attribution log | Provider dashboard | [`log/schema.json`](./log/schema.json), structured JSON to stdout |

The TURN service is **operationally separate** from the signaling
WebSocket: it runs on its own ports (3478 / 5349 + a 40-port
allocation range), has its own deploy lifecycle, and does not
participate in the signaling stateless contract.

## Files

| Path | Purpose |
| --- | --- |
| [`config/turnserver.example.conf`](./config/turnserver.example.conf) | Pinned coturn config (no-tcp-relay, denied-peer-ip allowlist, port range, `lt-cred-mech`, quotas). Operators copy this into their deploy. |
| [`scripts/sync-deny-list.ts`](./scripts/sync-deny-list.ts) | Subscribes to the signaling server's deny-list channel; pushes credential revocations to coturn (Redis admin) or Cloudflare Calls (HTTP API). Idempotent; retries on transient failure. |
| [`log/schema.json`](./log/schema.json) | TURN attribution-log shape. Per-allocation entries with PII-scrubbed peer addresses (`/24` v4 / `/64` v6). |

## Hardening contract

- `lt-cred-mech` ON; static-auth-secret-file env-injected; never
  committed.
- `no-tcp-relay`, `no-loopback-peers`, `no-multicast-peers`.
- `denied-peer-ip` covers every IPv4 / IPv6 RFC 1918 / RFC 6598 /
  loopback / link-local / multicast / reserved range. The CI gate
  `npm run validate:turn-config` (deferred to the owning task)
  cross-checks the example config against the closed list in
  [`config/turnserver.example.conf`](./config/turnserver.example.conf).
- `min-port=49160`, `max-port=49200` (40 ports, behind a firewall
  allowlist).
- `total-quota=200` concurrent allocations (100 rooms × 2 peers
  ceiling).
- `user-quota=4` concurrent allocations per credential.
- `max-bps=1500000` (≈ 1.5 Mbps) per allocation.
- `bps-capacity=300000000` (300 Mbps) per instance.
- `cli-password` is **forbidden**: admin operations route through
  the Redis pub/sub channel only. The CI gate fails any commit that
  reintroduces it.

## Deny-list flow

1. The signaling server appends `(roomCode, peerId, expEpochSeconds)`
   to its in-memory deny-list when a peer's room mapping is removed
   (DC, kick, room evicted, room closed).
2. A short-lived Redis pub/sub channel (`hr:turn:deny`) carries the
   triple. TTL = `expEpochSeconds + 60_000`.
3. [`scripts/sync-deny-list.ts`](./scripts/sync-deny-list.ts)
   subscribes; on every message:
   - For coturn: `closesession <username>` over the admin Redis.
   - For Cloudflare Calls: HTTP DELETE to the credential-revocation
     endpoint.
4. The TURN attribution log records `revoked` for the affected
   `allocId`; the call survives at most 60 s after the original
   credential expiry, bounded by the credential TTL ceiling itself.

## Cross-References

- Credential lifecycle: [`docs/architecture/turn-credentials.md`](../../docs/architecture/turn-credentials.md).
- Wire shape: [`turn-credential.schema.json`](../../content-schema/schemas/turn-credential.schema.json).
- Fallback policy: [`docs/architecture/turn-fallback-policy.md`](../../docs/architecture/turn-fallback-policy.md).
- Provider pin and rotation runbook: [`services/multiplayer/turn-config.md`](../multiplayer/turn-config.md).
- Threat model: [`docs/architecture/multiplayer-security.md` § TURN Credentials](../../docs/architecture/multiplayer-security.md#turn-credentials).
- Owning task (server hardening): [`tasks/phase-3/01-multiplayer/34-turn-server-hardening.md`](../../tasks/phase-3/01-multiplayer/34-turn-server-hardening.md).
- Owning task (issuance): [`tasks/phase-3/01-multiplayer/33-turn-credentials-doctrine-issuance.md`](../../tasks/phase-3/01-multiplayer/33-turn-credentials-doctrine-issuance.md).
