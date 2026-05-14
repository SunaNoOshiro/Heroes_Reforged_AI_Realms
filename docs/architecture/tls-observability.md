# TLS Observability

Structured **TLS-error logging** with **PII redaction** at the
signaling-server boundary. Surfaces MITM / cert-substitution attempts
without violating the privacy contract. Every TLS-layer failure
the edge sees MUST emit one of the three kinds in § 1.

Companion docs:

- [`transport-security.md`](./transport-security.md) — TLS floor
  and cert lifecycle.
- [`signaling-audit-log.md`](./signaling-audit-log.md) — broader
  signaling-side log shape.
- [`observability.md`](./observability.md) — `Logger` /
  `MetricsSink` interfaces.
- [`error-formatter.md`](./error-formatter.md) — redaction allowlist.

---

## 1. Required emissions

| `kind` | When emitted | Severity |
|---|---|---|
| `tls-handshake-failure` | TLS handshake aborts before the room handshake | `warn` |
| `cert-mismatch` | Edge served a cert that fails its chain or pin checks | `error` |
| `cipher-rejected` | Client-proposed cipher set has no overlap with the allowlist in [`transport-security.md` § 2](./transport-security.md#2-tls-floor) | `warn` |

The signaling-server bootstrap MUST emit one of these on every
TLS-layer failure. The absence of a required emission is a CI
violation surfaced by the runbook tests in
[`tasks/phase-3/01-multiplayer/29-tls-observability.md`](../../tasks/phase-3/01-multiplayer/29-tls-observability.md).

## 2. Log shape

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

All fields are required. `tlsVersion` and `cipher` MAY be `null`
when the handshake aborts before negotiation; every other field
MUST be present.

## 3. PII redaction

| Forbidden value | Substitute |
|---|---|
| Raw IP | `ipBucket`: IPv4 → `/24` mask (e.g. `203.0.113.0/24`); IPv6 → `/64` mask (e.g. `2001:db8::/64`). |
| User-Agent string | Not logged. Browser-engine breakdowns can be inferred statistically from `cipher`. |
| `peerId`, `roomId`, `displayName`, SDP, ICE | Not known at the TLS layer; MUST NOT appear even if a handshake leaks them. |
| Handshake duration | Not logged; timing enables side-channel inference per [`crypto-rules.md` § 3](./crypto-rules.md#3-log--errorid-only). |
| Raw cert chain | Not logged; the `errorCode` is the only identity-related signal. |

## 4. Closed `errorCode` enum

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

## 5. Storage & retention

- **Sink**: structured JSON to stdout per
  [`signaling-audit-log.md`](./signaling-audit-log.md).
- **Retention**: 7 days at the host platform — same TTL as the rest
  of the signaling audit log per
  [`signaling-audit-log.md` § 4](./signaling-audit-log.md#4-retention).
  The user-facing summary lives in
  [`privacy.md`](./privacy.md); see `## ⚠ Issues` for an
  unreconciled retention number across the two docs.
- **Aggregation**: per-`ipBucket` rate aggregation runs in the same
  process; a single bucket never exceeds 1 entry per 60 s. This
  prevents a noisy peer from filling the log.

## 6. CI gate

`npm run validate:transport` (extended in
[`tasks/phase-3/01-multiplayer/29-tls-observability.md`](../../tasks/phase-3/01-multiplayer/29-tls-observability.md)):

- feed a known IPv4 → assert `/24` bucket;
- feed a known IPv6 → assert `/64` bucket;
- assert no raw IP / UA / SDP / cert in any sample emission.

## 7. Out of scope

- **Alert routing** — owned by alerting / monitoring infra.
- **Geo-IP enrichment** — explicitly forbidden; would defeat bucket
  redaction.
- **Per-peer correlation** — TLS-layer logs do not carry `peerId`
  by design; the layer fires before any peer identity is known.

---

## 🔍 Sync Check

- **UI: ✔** — Operator-side log surface only; no UI screen consumes
  this shape. The closest UI surfaces ([`64-network-lobby/`](./wiki/screens/64-network-lobby/)
  peer-trust toasts) consume `error-formatter.md` output, not raw
  TLS log lines.
- **Schema: ✔** — `kind` enum (3 values) and `errorCode` enum (8
  values) are closed and self-contained in this doc; the cipher
  allowlist row in § 1 resolves to
  [`transport-security.md` § 2](./transport-security.md#2-tls-floor),
  and the redaction-allowlist anchor in the companion block resolves
  to [`error-formatter.md` § 3](./error-formatter.md#3-redaction-allowlist).
  No `content-schema/schemas/*.schema.json` registration is implied
  — the TLS log is a stdout shape, not a wire / save schema.
- **Tasks: ✔** — Owning task
  [`phase-3.01-multiplayer.29-tls-observability`](../../tasks/phase-3/01-multiplayer/29-tls-observability.md)
  lists this file in `Read First`, derives `emitTlsEvent`'s
  signature from § 2 / § 4, asserts the IPv4 `/24` and IPv6 `/64`
  bucket invariants from § 3, and shares ownership of
  `scripts/check-transport-security.mjs` with
  [`phase-3.01-multiplayer.24-transport-security-edge-config`](../../tasks/phase-3/01-multiplayer/24-transport-security-edge-config.md)
  for the § 6 CI gate. Reciprocal links in
  [`command-stream-integrity.md`](./command-stream-integrity.md) § 2
  and [`turn-timer.md`](./turn-timer.md) § (peer-disconnect logging)
  resolve.

## ⚠ Issues

- **Retention number diverges across docs.** This file (§ 5) and
  [`signaling-audit-log.md` § 4](./signaling-audit-log.md#4-retention)
  both pin **7 days** at the operator's collector;
  [`privacy.md` § 2](./privacy.md#2-retention-ttl-matrix) Signaling-
  server-logs row pins **≤ 24 h**. The operator-side docs are the
  canonical surface, and the TLS log inherits that TTL by design,
  so this rewrite kept "7 days." Per CLAUDE.md root contract on
  data lifetimes,
  [`tasks/mvp/02-content-schemas/40-privacy-and-legal-docs.md`](../../tasks/mvp/02-content-schemas/40-privacy-and-legal-docs.md)
  (privacy.md owner) should reconcile the row to either 7 days
  (matching operator policy) or update the operator policy to
  ≤ 24 h. Skill kept this doc verbatim and did not edit
  `privacy.md` (Hard Prohibition D — never edit cross-checked
  files; Hard Prohibition A — never silently rewrite a
  structural-invariant claim).
- **Redacted-IP form diverges from `signaling-audit-log.md`.** This
  doc emits `ipBucket` as plaintext CIDR (`203.0.113.0/24`,
  `2001:db8::/64`);
  [`signaling-audit-log.md` § 3](./signaling-audit-log.md#3-ip-redaction-rule)
  hashes the same CIDR prefix with a daily-rotating salt and emits
  a 16-char hex (`creatorIpHash` / `key` / `ipPrefix`). Both docs
  fire from the same signaling process. The TLS-layer log is
  emitted before any room exists, so per-peer correlation is not
  available, but the signaling-audit hash form would still be
  defence-in-depth (same observability, less subnet leakage).
  Decision is owner's call; per
  [`.agents/rules/tasks.md`](../../.agents/rules/tasks.md), the
  reconciliation task is
  [`phase-3.01-multiplayer.29-tls-observability`](../../tasks/phase-3/01-multiplayer/29-tls-observability.md)
  (the `emitTlsEvent` author) coordinating with
  [`phase-3.01-multiplayer.01-signaling-server-node-js-websocket-lobby`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  (the audit-log emitter). Suggested resolution: align both surfaces
  on the salted-hash shape, or pin in this doc that plaintext CIDR
  is intentional. Skill preserved both surfaces verbatim (Hard
  Prohibition A — both are pinned by their owning task acceptance
  criteria).
