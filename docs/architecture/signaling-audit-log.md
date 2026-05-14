# Signaling Audit Log

Canonical contract for the M5 signaling server's stdout audit log:
**what** events are emitted, **how** PII is redacted, **how long**
the operator retains, and **when** an event escalates.

Scope: the signaling server only. The peer-side `REPORT_PEER` flow
is local-only and is owned by [`chat-safety.md`](./chat-safety.md)
— see § 7.

**Companion docs:**
- [`observability.md`](./observability.md) — the application-side
  `Logger` interface; this doc adds signaling-specific fields and
  redaction rules.
- [`signaling-rate-limits.md`](./signaling-rate-limits.md) — bucket
  table that drives `signaling.rate_limit.triggered` and
  `signaling.global.flood_detected`.
- [`signaling-message-schema.md`](./signaling-message-schema.md) —
  the validation gate that emits `signaling.payload.rejected`.
- [`signaling-payload-policy.md`](./signaling-payload-policy.md) —
  allow / deny list that constrains what fields can ever appear
  in a log line.
- [`lobby-identifiers.md`](./lobby-identifiers.md) §§ 5–6 —
  collision-retry and cool-down rules cited by
  `signaling.room.allocation_exhausted` and `signaling.room.expired`.

**Implementation:**
- Server entrypoint —
  [`tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md).
- Rate-limit signal source —
  [`tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md`](../../tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md).
- Validation-failure signal source —
  [`tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md`](../../tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md).

---

## 1. Always-logged events

Every event is one JSON object on stdout, one per line. Log
shipping is the operator's responsibility — the signaling server
emits to stdout only and has no central log destination.

| Event | Trigger | Fields |
|---|---|---|
| `signaling.room.created` | `CREATE_ROOM` accepted | `{ roomCode, creatorIpHash, ts }` |
| `signaling.room.allocation_exhausted` | 5 collision retries failed per [`lobby-identifiers.md` § 5](./lobby-identifiers.md#5-collision-retries) | `{ ts }` |
| `signaling.room.expired` | TTL sweep dropped a room | `{ roomCode, reason: "idle" \| "max_lifetime", ts }` |
| `signaling.room.closed` | Host `CLOSE_ROOM` | `{ roomCode, ts }` |
| `signaling.rate_limit.triggered` | Per-IP, per-code, or global bucket exhausted | `{ tier, key, retryAfterMs, ts }` |
| `signaling.global.flood_detected` | Global rolling window ≥ 200 / min | `{ count, windowMs, ts }` |
| `signaling.join_attempt.rejected` | Wrong code, denylisted, or rate-limited | `{ roomCode, reason, ts }` |
| `signaling.handshake.rejected` | Bad secret, schema-version mismatch, or `room_full` | `{ roomCode?, reason, ts }` |
| `signaling.ice.dropped_pre_consent` | Server filtered a non-`typ relay` candidate destined for a pending peer | `{ roomCode, candidateType, ts }` |
| `signaling.payload.rejected` | AJV validation failed on an inbound frame per [`signaling-message-schema.md` § 4](./signaling-message-schema.md#4-rejection-behavior) | `{ ipPrefix, kind?, reasonCode, ts }` |

The redacted-IP field is named `creatorIpHash`,  `key`, or
`ipPrefix` depending on the event — all three carry the same
16-char hex value defined in § 3.

## 2. Never-logged values

The server MUST NOT include any of the following in any log line:

| Forbidden value | Reason |
|---|---|
| Display names | Per [`signaling-payload-policy.md`](./signaling-payload-policy.md), they never reach the server. |
| Chat content | Same. |
| Pack hash / save hash | Same. |
| Raw client IPs | Privacy posture — see § 3. |
| `Authorization` headers | Defence-in-depth. |
| Full `peerPubKey` (only the first 8 chars are allowed if needed) | Identity reduction; the full key is sensitive correlation data. |
| Raw request bodies | A `JOIN_HANDSHAKE { secret }` body would otherwise leak the secret. The validation-failure path (§ 1, `signaling.payload.rejected`) explicitly never echoes the offending payload. |

A unit test asserts that a log capture from a 100-message synthetic
session contains zero matches for any literal above.

## 3. IP redaction rule

The redacted-IP field on `signaling.room.created`,
`signaling.rate_limit.triggered`, and `signaling.payload.rejected`
is **not** the raw client IP. The canonical form is:

```
ipHash = sha256( prefix(rawIp, /24 for v4 or /64 for v6) || dailySalt ).slice(0, 16)
```

- `prefix(...)` truncates IPv4 to its `/24` subnet and IPv6 to its
  `/64` subnet.
- `dailySalt` rotates every 24 hours and is held only in process
  memory; once rotated, prior days' hashes cannot be reversed.
- The 16-char hex prefix is the value that lands in log lines.

This preserves "many failures from one /24" detection without
retaining a value that links back to an individual.

## 4. Retention

- Signaling logs are retained **7 days** at the operator's log
  collector and then purged.
- The signaling server itself has no on-disk persistence. All
  retention is enforced at the operator's collector.
- The deployment runbook is
  [`services/multiplayer/turn-config.md`](../../services/multiplayer/turn-config.md);
  it is the canonical operator surface and references this rule.

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

{ "level": "warn", "event": "signaling.payload.rejected",
  "ipPrefix": "8a3f2e9c1b4d7e0f",
  "reasonCode": "unknown_type",
  "ts": "2026-05-04T12:35:42.000Z" }

{ "level": "error", "event": "signaling.global.flood_detected",
  "count": 240, "windowMs": 60000,
  "ts": "2026-05-04T12:36:00.000Z" }
```

## 6. Escalation

The operator's collector pages on:

- `signaling.global.flood_detected` — immediate page.
- `signaling.rate_limit.triggered { tier: "global" }` rolling rate
  ≥ 5 / min — warning.
- `signaling.handshake.rejected` rolling rate ≥ 50 / min — warning;
  may indicate an enumeration attempt.

Thresholds live with the operator dashboards, not in this file;
this doc documents the **events** the dashboards consume.

## 7. `REPORT_PEER` is out of scope

`REPORT_PEER` is a **local-only** lobby command. Its bundle is
serialized to a JSON blob, offered for download via blob URL, and
saved to the user's downloads folder; the signaling server never
sees it. There is no central upload in MVP.

The canonical contract — reason codes, evidence inclusion,
filenames, retention — lives in
[`chat-safety.md` § 8](./chat-safety.md#8-report) and is
implemented by
[`tasks/phase-3/01-multiplayer/19-report-bundle-and-export.md`](../../tasks/phase-3/01-multiplayer/19-report-bundle-and-export.md)
against
[`report-bundle.schema.json`](../../content-schema/schemas/report-bundle.schema.json).

This doc is **server-side only** and intentionally does not
duplicate any field of the report bundle.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surface is owned by this doc; the
  `REPORT_PEER` UI surface is owned by
  [`chat-safety.md`](./chat-safety.md) and the
  [`64-network-lobby`](./wiki/screens/64-network-lobby/) screen
  package, which this doc now defers to.
- **Schema: ✔** — Event field shapes match
  [`signaling-message-schema.md` § 4](./signaling-message-schema.md#4-rejection-behavior)
  (`signaling.payload.rejected`),
  [`signaling-rate-limits.md` § 1](./signaling-rate-limits.md#1-bucket-table)
  (`signaling.rate_limit.triggered`,
  `signaling.global.flood_detected`), and
  [`lobby-identifiers.md` § 5](./lobby-identifiers.md#5-collision-retries)
  (`signaling.room.allocation_exhausted`). The redaction formula
  in § 3 matches the per-IP key shape used by
  [`signaling-rate-limits.md` § 1](./signaling-rate-limits.md#1-bucket-table).
- **Tasks: ✔** — Owning task
  [`01-signaling-server-node-js-websocket-lobby`](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
  lists this file in its `Read First` block and pins
  `signaling.payload.rejected` in its validation-failure
  acceptance row;
  [`13-signaling-rate-limiting`](../../tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md)
  cites § 3 for the IP-key shape;
  [`31-signaling-message-schema-and-validation`](../../tasks/phase-3/01-multiplayer/31-signaling-message-schema-and-validation.md)
  is the runtime owner of the validation gate that emits
  `signaling.payload.rejected`.

## ⚠ Issues

- **Stale `REPORT_PEER` framing in the prior § 7.** The previous
  revision claimed `REPORT_PEER` writes to "the local browser
  audit log (IndexedDB, scoped to the user's profile)" with a
  schema mirroring § 5 and a deferral citation `DEF-016`. All
  three points were wrong:
  - Per [`chat-safety.md` §§ 8–9](./chat-safety.md#8-report) and
    [`tasks/phase-3/01-multiplayer/19-report-bundle-and-export.md`](../../tasks/phase-3/01-multiplayer/19-report-bundle-and-export.md),
    `REPORT_PEER` produces an in-memory bundle that is **offered
    for download via blob URL** and saved to the user's downloads
    folder — there is no IndexedDB local audit log.
  - The bundle conforms to
    [`report-bundle.schema.json`](../../content-schema/schemas/report-bundle.schema.json),
    which is much richer than § 5's stdout shape.
  - [`DEF-016`](../planning/deferred.md) is "Dedicated lobby
    browser / friend list", not a hosted reporting workflow.
    [`docs/planning/deferred.md`](../planning/deferred.md) has no
    DEF row for hosted reporting; the future AI-UGC intake is
    flagged as "owned by the personal-data plan" in
    [`chat-safety.md` § 11](./chat-safety.md#11-reserved-fields--cross-plan-hooks)
    without a DEF citation.

  Fixed inline by replacing § 7 with a pointer to
  [`chat-safety.md`](./chat-safety.md) (per § 8 Option A — the
  target was wrong, the rest of the system is consistent). No
  cross-checked file was edited (Hard Prohibition D).
- **Field-name inconsistency for the redacted-IP value.** The
  same 16-char hex value (defined in § 3) is named
  `creatorIpHash` on `signaling.room.created`, `key` on
  `signaling.rate_limit.triggered`, and `ipPrefix` on
  `signaling.payload.rejected` (the last per
  [`signaling-message-schema.md` § 4](./signaling-message-schema.md#4-rejection-behavior)).
  Per the observability "shared vocabulary" principle in
  [`observability.md` § 1](./observability.md#1-logger-interface),
  the three should use one canonical name. Suggested fix:
  `01-signaling-server-node-js-websocket-lobby` (event emitter)
  and `31-signaling-message-schema-and-validation` (which pins
  `ipPrefix`) align on a single field name across all four
  events. This skill kept the existing names verbatim (Hard
  Prohibition A — no meaning change) and noted the alias inline
  in § 1 so log consumers can grep correctly today; renaming is
  a follow-up task contract.
