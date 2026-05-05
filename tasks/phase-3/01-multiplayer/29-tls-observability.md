# TLS Observability

Status: planned

Module: [Multiplayer — WebRTC Lockstep (M5)](../01-multiplayer.md)

Description:
Wire the redacted TLS-error log shape from
[`tls-observability.md`](../../../docs/architecture/tls-observability.md)
through the signaling server's structured logger. Per-IP-bucket
rate aggregation; closed `errorCode` enum; no raw IP / UA / SDP /
cert in any sample emission.

Plan 24 § System Improvements — Observability.

Read First:
- [`docs/architecture/tls-observability.md`](../../../docs/architecture/tls-observability.md)
- [`docs/architecture/signaling-audit-log.md`](../../../docs/architecture/signaling-audit-log.md)
- [`docs/architecture/observability.md`](../../../docs/architecture/observability.md)
- [`docs/architecture/error-formatter.md`](../../../docs/architecture/error-formatter.md)

Inputs:
- Edge-config TLS hooks (per
  [Task 24](./24-transport-security-edge-config.md)).
- Signaling-server structured logger from
  [Task 1](./01-signaling-server-node-js-websocket-lobby.md).
- IP-bucket helper (`/24` IPv4, `/64` IPv6).

Outputs:
- `services/signaling/observability/tls.ts` — `emitTlsEvent({ kind,
  tlsVersion, cipher, ip, errorCode })` that bucketizes the IP and
  emits the closed shape from
  [`tls-observability.md` § 2](../../../docs/architecture/tls-observability.md#2-log-shape).
- `services/signaling/observability/__tests__/tls.test.ts` —
  IPv4 / IPv6 bucket assertions, raw-IP / UA / SDP / cert
  redaction assertion, per-bucket rate-aggregation cap (1 entry /
  60 s).

Owned Paths:
- `services/signaling/observability/tls.ts`
- `services/signaling/observability/__tests__/`

Owned Paths (shared):
- `scripts/check-transport-security.mjs` — Task 24 is the **primary
  owner**. This task contributes only the per-IPv4 `/24` and
  per-IPv6 `/64` bucket assertion + the no-raw-IP / no-UA / no-SDP
  / no-cert assertion. Wiring is **additive**: it MUST NOT rewrite
  Task 24's grep gates or HSTS assertions.

Dependencies:
- phase-3.01-multiplayer.24-transport-security-edge-config

Acceptance Criteria:
- `emitTlsEvent` emits a structured JSON line with the exact shape
  from
  [`tls-observability.md` § 2](../../../docs/architecture/tls-observability.md#2-log-shape):
  `{ ts, kind, tlsVersion, cipher, ipBucket, errorCode }`.
- The `kind` enum is closed to
  `tls-handshake-failure | cert-mismatch | cipher-rejected`.
- The `errorCode` enum is closed per
  [`tls-observability.md` § 4](../../../docs/architecture/tls-observability.md#4-closed-errorcode-enum);
  unknown codes throw at compile time (TypeScript) and runtime
  (test).
- IPv4 `203.0.113.42` → `ipBucket === "203.0.113.0/24"`.
- IPv6 `2001:db8:abcd:1234::1` → `ipBucket === "2001:db8:abcd:1234::/64"`.
- The output line MUST NOT contain raw IP, UA tail, SDP body,
  cert chain, or handshake-duration timing; the redaction test
  asserts none of these substrings appear in any sample
  emission.
- Per-bucket rate-aggregation: a single `ipBucket` never emits
  more than 1 entry per 60 s; subsequent events in the same
  bucket are coalesced into a `count` field.
- The validate hook fed into `npm run validate:transport`
  (Task 24) asserts the bucket / redaction invariants on a
  fixture corpus.
- **Shared-ownership split with Task 24**: Task 24 is the
  **primary owner** of `scripts/check-transport-security.mjs`.
  The TLS-bucket assertion wiring is **additive**: it MUST NOT
  rewrite Task 24's grep gates or HSTS assertions.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
