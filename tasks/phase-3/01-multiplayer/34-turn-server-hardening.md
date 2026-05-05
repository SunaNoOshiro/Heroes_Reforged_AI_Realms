# TURN Server Hardening (No Open Relay)

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Pin the **hardened TURN-server config** in
[`services/turn/config/turnserver.example.conf`](../../../services/turn/config/turnserver.example.conf):
`lt-cred-mech` paired with HMAC issuance from
[Task 33](./33-turn-credentials-doctrine-issuance.md), `no-tcp-relay`,
`no-loopback-peers`, `no-multicast-peers`, full `denied-peer-ip`
allowlist for IPv4 / IPv6 private / loopback / multicast / reserved
ranges, port allowlist, per-credential and per-instance bandwidth
quotas, attribution log, and the deny-list sync worker. Closes
Plan 25 Critical Fix 4.

Read First:
- [`services/turn/README.md`](../../../services/turn/README.md)
- [`docs/architecture/turn-credentials.md`](../../../docs/architecture/turn-credentials.md)
- [`services/multiplayer/turn-config.md`](../../../services/multiplayer/turn-config.md)
- [`docs/architecture/multiplayer-security.md`](../../../docs/architecture/multiplayer-security.md)
- [`docs/architecture/signaling-stateless-invariant.md`](../../../docs/architecture/signaling-stateless-invariant.md)

Inputs:
- coturn 4.6+ (Docker `coturn/coturn:latest-alpine`) for
  self-hosted; Cloudflare Calls TURN for managed.
- HMAC-SHA1 shared secret from Task 33 (env-injected; never
  committed).
- Deny-list pub/sub channel emitted by Task 33's
  `services/signaling/src/turn/deny-list.ts`.

Outputs:
- `services/turn/config/turnserver.example.conf` (already
  authored by this plan) — operator-copy baseline; CI gate
  parses it as the canonical pinned config.
- `services/turn/scripts/sync-deny-list.ts` — already authored
  contract surface; this task implements the Redis pub/sub
  consumer (`RedisCotrunProvider`) and the Cloudflare Calls HTTP
  consumer (`CloudflareCallsProvider`). Both implement
  `DenyListProvider`.
- `services/turn/log/schema.json` (already authored by this
  plan) — attribution log shape; this task implements the
  log-rewriter sidecar that bucketizes peer addresses to
  `/24` v4 / `/64` v6 before stdout-JSON emission.
- `scripts/validate-turn-config.mjs` — CI gate
  (`npm run validate:turn-config`):
  - asserts the example config sets `no-tcp-relay`,
    `no-loopback-peers`, `no-multicast-peers`, `lt-cred-mech`,
    `realm`, `min-port`, `max-port`, `user-quota`, `max-bps`,
    `total-quota`, `cipher-list`
  - asserts every IPv4 + IPv6 private / loopback / multicast /
    reserved range from
    [`services/turn/config/turnserver.example.conf`](../../../services/turn/config/turnserver.example.conf)
    is in `denied-peer-ip`
  - rejects any commit that adds `cli-password` (admin via Redis
    only)
  - asserts `static-auth-secret-file` references an env-injected
    path; never an inline secret
- `services/turn/__tests__/sync-deny-list.test.ts` — idempotency,
  retry-with-backoff, double-revocation no-op, transient-error
  recovery.

Owned Paths:
- `services/turn/`
- `scripts/validate-turn-config.mjs`

Owned Paths (shared):
- `package.json` — owned by repo-tooling. This task appends one
  `validate:*` script entry and wires it into `validate`. No
  rename or removal of existing entries.

Dependencies:
- phase-3.01-multiplayer.33-turn-credentials-doctrine-issuance

Acceptance Criteria:
- `coturn -c turnserver.example.conf` boots with no warnings on
  the four hardening directives.
- A valid HMAC credential admits an allocation; an invalid
  credential is rejected with `401`.
- An allocation request whose `peer-address` falls in
  `192.168.0.0/16`, `127.0.0.0/8`, or `::1` is rejected by
  coturn before the relay binds.
- 4 concurrent allocations under one credential succeed; the 5th
  is rejected with `486 Allocation Quota Reached`.
- Per-allocation bandwidth above 1.5 Mbps is dropped at the
  configured ceiling.
- The attribution log writes `alloc.created` / `alloc.refreshed` /
  `alloc.closed` events per [`services/turn/log/schema.json`](../../../services/turn/log/schema.json);
  no entry contains the credential `username` or `credential`,
  no entry contains the full peer IP.
- Peer addresses are bucketed to `/24` v4 / `/64` v6 in the log
  rewriter sidecar before stdout-JSON emission.
- The deny-list sync worker closes an active allocation within
  the same TTL window when the signaling deny-list emits
  `(roomCode, peerId, exp)`.
- The dual-secret rotation window (per
  [`turn-credentials.md` § 9](../../../docs/architecture/turn-credentials.md#9-rotation))
  is exercised: a credential signed with the previous secret is
  accepted during the 5-minute window and rejected after.
- `npm run validate:turn-config` fails on any missing
  hardening directive, on any private IP range omitted from
  `denied-peer-ip`, on any inline `cli-password`, and on any
  inline secret literal.
- The runbook for rotating `static-auth-secret-file` without
  dropping in-flight allocations is documented in
  [`services/multiplayer/turn-config.md`](../../../services/multiplayer/turn-config.md)
  (cross-link from this task; the runbook itself is the SSOT).
- **Shared-ownership split with repo-tooling**: `package.json`
  is **owned by** the repo-tooling task layer. The
  `validate:turn-config` entry contributed by this task is
  **additive**; it MUST NOT rewrite or remove existing
  `validate:*` entries.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
