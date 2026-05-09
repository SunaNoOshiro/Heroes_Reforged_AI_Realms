# Signaling Audit Log

This file is the canonical contract for what the M5 signaling
server logs, how it redacts PII, how long it retains, and when an
event escalates.

The implementation lives alongside
[`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md);
the rate-limit signal source is owned by
[`13-signaling-rate-limiting.md`](../../tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md).

The application-side `Logger` interface is defined in
[`observability.md`](./observability.md); this doc adds
signaling-specific fields and redaction rules.

---

## 1. Always-logged events

| Event identifier | Trigger | Fields |
|---|---|---|
| `signaling.room.created` | `CREATE_ROOM` accepted | `{ roomCode, creatorIpHash, ts }` |
| `signaling.room.allocation_exhausted` | 5 collision retries failed (Issue 1 § 5) | `{ ts }` |
| `signaling.room.expired` | TTL sweep dropped a room | `{ roomCode, reason: "idle" \| "max_lifetime", ts }` |
| `signaling.room.closed` | Host `CLOSE_ROOM` | `{ roomCode, ts }` |
| `signaling.rate_limit.triggered` | Per-IP, per-code, or global bucket exhausted | `{ tier, key, retryAfterMs, ts }` |
| `signaling.global.flood_detected` | Global rolling-window ≥ 200/min | `{ count, windowMs, ts }` |
| `signaling.join_attempt.rejected` | Wrong code, denylisted, or rate-limited | `{ roomCode, reason, ts }` |
| `signaling.ice.dropped_pre_consent` | Server filtered a non-`typ relay` candidate from a pending peer | `{ roomCode, candidateType, ts }` |
| `signaling.handshake.rejected` | Bad secret, schema-version mismatch, or room full | `{ roomCode?, reason, ts }` |

Every event is a single JSON object on stdout, one per line. Log
shipping is the operator's responsibility — the signaling server
itself emits to stdout only and has no central log destination.

## 2. Never-logged values

The signaling server MUST NOT include any of the following in any
log line:

| Forbidden value | Reason |
|---|---|
| Display names | Per [`signaling-payload-policy.md`](./signaling-payload-policy.md), they never reach the server. |
| Chat content | Same. |
| Pack hash / save hash | Same. |
| Raw client IPs | Privacy posture — see § 3. |
| `Authorization` headers | Defence-in-depth. |
| Full `peerPubKey` (only first 8 chars allowed if needed) | Identity reduction; full key is sensitive correlation data. |
| Request bodies (raw) | `JOIN_HANDSHAKE { secret }` would otherwise leak the secret. |

A unit test asserts that a log capture from a 100-message synthetic
session contains zero matches for any of the literals above.

## 3. IP redaction rule

The IP key surfaced in `signaling.rate_limit.triggered` and
`signaling.room.created` is **not** the raw client IP. The
canonical form is:

```
ipHash = sha256( prefix(rawIp, /24 for v4 or /64 for v6) || dailySalt ).slice(0, 16)
```

- **`prefix(...)`** truncates IPv4 to its `/24` subnet and IPv6 to
  its `/64` subnet.
- **`dailySalt`** rotates every 24 hours and is held only in
  process memory; once rotated, prior days' hashes cannot be
  reversed.
- The truncated hex prefix (16 chars) is the value that lands in
  log lines.

This preserves operator capacity to detect "many failures from
one /24" without retaining a value that links back to an
individual.

## 4. Retention

- Signaling logs are retained for **7 days** at the operator's
  log collector and then purged.
- The retention policy is documented in the deployment runbook
  ([`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md)
  is the canonical operator surface and references this rule).
- The signaling server itself has no on-disk persistence — logs
  go to stdout, the operator's collector enforces retention.

## 5. Sample log lines

```jsonc
{ "level": "info", "event": "signaling.room.created",
  "roomCode": "9FTPV7EY",
  "creatorIpHash": "8a3f2e9c1b4d7e0f",
  "ts": "2026-05-04T12:34:56.789Z" }

{ "level": "warn", "event": "signaling.rate_limit.triggered",
  "tier": "per_ip",
  "key": "8a3f2e9c1b4d7e0f",
  "retryAfterMs": 60000,
  "ts": "2026-05-04T12:35:01.123Z" }

{ "level": "warn", "event": "signaling.ice.dropped_pre_consent",
  "roomCode": "9FTPV7EY",
  "candidateType": "srflx",
  "ts": "2026-05-04T12:35:14.005Z" }

{ "level": "error", "event": "signaling.global.flood_detected",
  "count": 240, "windowMs": 60000,
  "ts": "2026-05-04T12:36:00.000Z" }
```

## 6. Escalation

The operator's collector is responsible for paging on:

- `signaling.global.flood_detected` (immediate page)
- `signaling.rate_limit.triggered { tier: "global" }` rolling rate
  ≥ 5/min (warning)
- `signaling.handshake.rejected` rolling rate ≥ 50/min (warning —
  may indicate an ongoing enumeration attempt)

The thresholds live with the operator dashboards, not in this
file; this doc documents the **events** the dashboards consume.

## 7. Local report log (`REPORT_PEER`)

The `REPORT_PEER` lobby command writes a structured record to the
**local** browser audit log (IndexedDB, scoped to the user's
profile). The schema mirrors § 5 but adds `peerPubKey` (first 8
chars), `roomCode`, and a free-form `note` field. The report is
**never** exfiltrated to a central server in M5; M7 may add a
hosted reporting workflow, deferred under
[`DEF-016`](../planning/deferred.md).
