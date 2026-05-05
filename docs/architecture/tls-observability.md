# TLS Observability

Canonical doctrine for **structured TLS-error logging** with
**PII redaction**. Wires through the signaling-server logger so
MITM / cert-substitution attempts produce a signal without
violating audit 22's privacy contract.

> Source plan:
> [`docs/implementation-plans/24-tls-enforcement-and-webrtc-authentication-plan.md`](../implementation-plans/24-tls-enforcement-and-webrtc-authentication-plan.md)
> § System Improvements — Observability.

Companion docs:

- [`transport-security.md`](./transport-security.md) — TLS floor
  and cert lifecycle.
- [`signaling-audit-log.md`](./signaling-audit-log.md) — broader
  signaling-side log shape.
- [`observability.md`](./observability.md) — `Logger` /
  `MetricsSink` interfaces.
- [`error-formatter.md`](./error-formatter.md) — redaction allowlist.

---

## 1. Required Emissions

Three closed kinds:

| `kind` | When emitted | Severity |
|---|---|---|
| `tls-handshake-failure` | TLS handshake aborts before the room handshake | `warn` |
| `cert-mismatch` | Edge served a cert that fails its chain or pin checks | `error` |
| `cipher-rejected` | Client-proposed cipher set has no overlap with the allowlist in [`transport-security.md` § 2](./transport-security.md#2-tls-floor) | `warn` |

The signaling server bootstrap MUST emit one of these on every
TLS-layer failure; the absence of a required emission is a CI
violation surfaced by the runbook tests in
[`tasks/phase-3/01-multiplayer/29-tls-observability.md`](../../tasks/phase-3/01-multiplayer/29-tls-observability.md).

## 2. Log Shape

```jsonc
{
  "ts": "<ISO 8601>",
  "kind": "tls-handshake-failure" | "cert-mismatch" | "cipher-rejected",
  "tlsVersion": "TLSv1.2" | "TLSv1.3" | null,
  "cipher": "<cipher suite name>" | null,
  "ipBucket": "<bucketed IP>",
  "errorCode": "<closed enum from § 4>"
}
```

All fields are required; `tlsVersion` and `cipher` may be `null`
when the handshake aborts before negotiation.

## 3. PII Redaction

- **No raw IP**: the IP is always bucketed before logging.
  - IPv4 → `/24` mask (e.g. `203.0.113.0/24`).
  - IPv6 → `/64` mask (e.g. `2001:db8::/64`).
- **No User-Agent tail**: UA strings are forbidden in the log
  shape entirely. If operators need browser-engine breakdowns,
  the `cipher` field already correlates with browser-version
  cipher preferences within statistical bounds.
- **No SDP, no ICE, no peerId, no roomId, no displayName**: the
  TLS layer fires before any of these are known; they MUST NOT
  appear even if a handshake leaks them.
- **No timing**: handshake duration is not logged; timing
  signals enable side-channel inference per
  [`crypto-rules.md` § 3](./crypto-rules.md#3-log--errorid-only).
- **No raw cert**: never log the cert chain; the `errorCode`
  is the only identity-related signal.

## 4. Closed `errorCode` Enum

| Code | Meaning |
|---|---|
| `tls.handshake.timeout` | Client did not complete the handshake within 10 s |
| `tls.handshake.protocol_unsupported` | Client offered TLS < 1.2 |
| `tls.handshake.cipher_no_overlap` | Cipher allowlist had no overlap |
| `tls.cert.chain_invalid` | Client rejected our chain (mTLS path; unused in current scope) |
| `tls.cert.pin_mismatch` | (reserved) future native-shell cert pinning per [`transport-security.md` § 7](./transport-security.md#7-cert-pinning) |
| `tls.alert.unknown_ca` | Client sent `unknown_ca` alert |
| `tls.alert.bad_cert` | Client sent `bad_certificate` alert |
| `tls.io.early_close` | Connection closed before any TLS message |

Adding a new code is an enum-lifecycle bump per
[`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md).

## 5. Storage & Retention

- **Sink**: structured JSON to stdout per
  [`signaling-audit-log.md`](./signaling-audit-log.md).
- **Retention**: 7 days at the host platform. Cross-link to
  Plan 22's privacy retention schedule for the binding contract;
  the TLS log inherits the same TTL as the rest of the signaling
  audit log.
- **Aggregation**: per-IP-bucket rate aggregation runs in the same
  process so a single bucket never exceeds 1 entry per 60 s. This
  prevents a noisy peer from filling the log.

## 6. CI Gate

`npm run validate:transport` (extended in
[`tasks/phase-3/01-multiplayer/29-tls-observability.md`](../../tasks/phase-3/01-multiplayer/29-tls-observability.md)):

- feed a known IPv4 → assert `/24` bucket;
- feed a known IPv6 → assert `/64` bucket;
- assert no raw IP / UA / SDP / cert in any sample emission.

## 7. Out of scope

- **Alert routing** — owned by Plan 31 (alerting / monitoring infra).
- **Geo-IP enrichment** — explicitly forbidden; would defeat the
  bucket redaction.
- **Per-peer correlation** — TLS-layer logs do not carry `peerId`
  by design.
