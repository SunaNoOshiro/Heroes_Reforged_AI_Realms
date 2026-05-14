# Error Envelope Doctrine

One canonical response shape for every public error surface
(HTTP + WebSocket). Schema:
[`error-envelope.schema.json`](../../content-schema/schemas/error-envelope.schema.json).

**Companion docs:**
- [`error-schema-map.md`](../architecture/error-schema-map.md) —
  which error schema each layer emits; this envelope is the
  public-service row.
- [`error-taxonomy.md`](../architecture/error-taxonomy.md) —
  wider engine-internal error vocabulary; the codes below are
  the **public-surface** subset.
- [`signaling-rate-limits.md`](../architecture/signaling-rate-limits.md)
  — bucket table that emits `RATE_LIMITED`.
- [`services/signaling/error-codes.md`](../../services/signaling/error-codes.md)
  — wire-level signaling vocabulary (legacy three-code shape).
- [`services/ai-gateway/error-codes.md`](../../services/ai-gateway/error-codes.md)
  — AI-gateway HTTP vocabulary.

> The codes `BUDGET_EXCEEDED` and `SERVICE_PAUSED` are reserved
> for a future hosted-AI-gateway deploy; the default BYO-key
> build never emits them.

## 1. Closed Error Codes

| Code | Meaning | Retry-eligible | Owner doctrine |
| --- | --- | --- | --- |
| `RATE_LIMITED` | Request rejected by a per-axis rate limiter. | yes — wait `retryAfterMs` | [`signaling-rate-limits.md`](../architecture/signaling-rate-limits.md) |
| `BUDGET_EXCEEDED` | Per-account or per-category cost budget exhausted. | yes — wait until window reset | — |
| `SERVICE_PAUSED` | Operational kill-switch is engaged. | yes — long retry, value advisory only | — |
| `VALIDATION_FAILED` | Request shape violates a schema. | no | [`error-taxonomy.md`](../architecture/error-taxonomy.md) |
| `UNAVAILABLE` | Transient outage. | yes | [`error-taxonomy.md`](../architecture/error-taxonomy.md) |
| `INTERNAL` | Unhandled server-side error. | no — file an issue | [`error-taxonomy.md`](../architecture/error-taxonomy.md) |

## 2. HTTP Mapping

| Code | HTTP status | Headers |
| --- | --- | --- |
| `RATE_LIMITED` | `429 Too Many Requests` | `Retry-After: <seconds>` (mirrors `retryAfterMs / 1000`, rounded up) |
| `BUDGET_EXCEEDED` | `402 Payment Required` | `Retry-After: <seconds>` |
| `SERVICE_PAUSED` | `503 Service Unavailable` | `Retry-After: <seconds>` |
| `VALIDATION_FAILED` | `400 Bad Request` | — |
| `UNAVAILABLE` | `503 Service Unavailable` | `Retry-After: <seconds>` |
| `INTERNAL` | `500 Internal Server Error` | — |

The response body is the canonical envelope — never an HTML error
page, never a stack trace, never a vendor-specific shape.

## 3. Signaling Mapping

Inside a signaling `ERROR` frame the payload conforms to the same
schema:

```json
{
  "type": "ERROR",
  "payload": {
    "error": "RATE_LIMITED",
    "retryAfterMs": 30000,
    "scope": "ip",
    "requestId": "..."
  }
}
```

The signaling-server-specific `RATE_LIMITED` legacy shape pinned by
[`services/signaling/error-codes.md`](../../services/signaling/error-codes.md)
remains the wire-level discriminator for that service; the envelope
above is the canonical body inside `payload`.

## 4. Oracle-Resistance

The `scope` field is intentionally coarse: `ip` / `session` /
`account` / `global`. Schema `additionalProperties: false`
**forbids** the following fields by name:

- `bucketKey`, `bucket`, `key`
- `remaining`, `limit`, `currentCount`, `tokens`
- exact account/session IDs

A precise breakdown would let an attacker triangulate the bucket
key and time attacks against the next refill. Coarse scope keeps
clients useful — they know which axis to adjust retry strategy
on — while denying that calibration signal.

## 5. `retryAfterMs` Semantics

- Present on every retry-eligible code (`RATE_LIMITED`,
  `BUDGET_EXCEEDED`, `SERVICE_PAUSED`, `UNAVAILABLE`).
- Absent on terminal codes (`VALIDATION_FAILED`, `INTERNAL`).
- Coarsened to the nearest 5 s for `RATE_LIMITED` to deny
  token-bucket timing leakage.
- For `SERVICE_PAUSED` the value is advisory: clients should treat
  it as a floor and back off further if a subsequent attempt also
  returns `SERVICE_PAUSED`.

## 6. `requestId`

- UUID v4 generated server-side at the request entry.
- Echoed in the `requestId` HTTP header **and** in the body.
- Never derived from a user identifier; the value carries no PII.
- Logs may include the `requestId` (it is not a secret); a support
  flow correlates a user report with server logs without exposing
  the user's account.

## 7. Examples

- [`canonical-rate-limited.error-envelope.json`](../../content-schema/examples/error-envelope/canonical-rate-limited.error-envelope.json)
- [`canonical-budget-exceeded.error-envelope.json`](../../content-schema/examples/error-envelope/canonical-budget-exceeded.error-envelope.json)
- [`canonical-service-paused.error-envelope.json`](../../content-schema/examples/error-envelope/canonical-service-paused.error-envelope.json)
- [`canonical-validation-failed.error-envelope.json`](../../content-schema/examples/error-envelope/canonical-validation-failed.error-envelope.json)
- [`canonical-unavailable.error-envelope.json`](../../content-schema/examples/error-envelope/canonical-unavailable.error-envelope.json)
- [`canonical-internal.error-envelope.json`](../../content-schema/examples/error-envelope/canonical-internal.error-envelope.json)

## 8. Cross-References

- [`docs/architecture/signaling-rate-limits.md`](../architecture/signaling-rate-limits.md)
  — signaling-server bucket table that emits `RATE_LIMITED`.
- [`docs/architecture/error-taxonomy.md`](../architecture/error-taxonomy.md)
  — wider engine-internal error vocabulary; the envelope above is
  the **public-surface** subset.
- [`docs/architecture/error-schema-map.md`](../architecture/error-schema-map.md)
  — layer / consumer / owning-plan map across all error-shaped
  schemas; this envelope is the public-service-surface row.
- [`services/signaling/error-codes.md`](../../services/signaling/error-codes.md)
  — wire-level signaling error vocabulary.
- [`services/ai-gateway/error-codes.md`](../../services/ai-gateway/error-codes.md)
  — AI-gateway HTTP error vocabulary.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surface owned by this doc; user-facing
  presentation is delegated to
  [`error-ux.md`](../architecture/error-ux.md) via the closed
  codes in § 1.
- **Schema: ⚠** — Field names, the `error` enum, the `scope` enum,
  required keys, and `additionalProperties: false` in § 4 all match
  [`error-envelope.schema.json`](../../content-schema/schemas/error-envelope.schema.json);
  the schema description back-points to this doc. Two structural
  gaps remain off-target: `ErrorEnvelope` has no row in
  [`schema-matrix.md`](../architecture/schema-matrix.md), and the
  AI-gateway HTTP body diverges from this envelope. Detail in
  `## ⚠ Issues`.
- **Tasks: ✔** —
  [`tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md`](../../tasks/phase-3/01-multiplayer/13-signaling-rate-limiting.md)
  reads this doc First and its acceptance criteria pin the `scope`
  enum + forbidden-keys rule to § 4; the registry's `schemaPaths`
  for that task lists `content-schema/schemas/error-envelope.schema.json`.

## ⚠ Issues

- **`ErrorEnvelope` missing from
  [`schema-matrix.md`](../architecture/schema-matrix.md).** The
  schema is referenced by this doc and by
  [`error-schema-map.md` row 6](../architecture/error-schema-map.md)
  but has no matrix row, so agents searching the matrix for "what
  shape is a public-service error response?" find nothing. Per
  CLAUDE.md root contract on schema registration, the
  schema-matrix owner must add the row. Suggested values:
  Gameplay Role `none — surface error only`, Presentation Role
  pointing at this file + the canonical examples directory.
  Already flagged by
  [`error-schema-map.md`'s audit](../architecture/error-schema-map.md)
  and
  [`error-taxonomy.md`'s audit](../architecture/error-taxonomy.md).
  Skill did not edit the matrix (Hard Prohibition D).
- **AI-gateway HTTP body diverges from this envelope.** § 2 + § 8
  list [`services/ai-gateway/error-codes.md`](../../services/ai-gateway/error-codes.md)
  as a consumer, and
  [`error-schema-map.md` row 6](../architecture/error-schema-map.md)
  names the "AI gateway client" as a consumer of this envelope.
  In practice that doc's § 1 returns
  `{ errorId, code: "INVALID_REQUEST" }` (400) and `{ errorId }`
  (401/404/429/500) — no `error` enum value, no `scope`, no
  `requestId` field (the gateway uses `errorId` instead). The two
  shapes are not interchangeable. Per CLAUDE.md "Stable IDs are
  public API," one side must give. Suggested owner: the AI-gateway
  task chain (the schema is the public-service contract and is
  already wired into the signaling rate-limit task). Suggested
  fix: either (a) the gateway adopts this envelope (rename
  `errorId` → `requestId`, add `error` from the closed enum, add
  `scope`) and `error-codes.md` § 1 is rewritten as a mapping
  table from HTTP status to envelope code; or (b) the gateway is
  removed from this doc's "every public surface" scope and
  [`error-schema-map.md` row 6](../architecture/error-schema-map.md)
  drops the AI gateway from the consumer column. Skill kept the
  envelope's "every public error surface" framing verbatim (Hard
  Prohibition A) and surfaced the gap here.
