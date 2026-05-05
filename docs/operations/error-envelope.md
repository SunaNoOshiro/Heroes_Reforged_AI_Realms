# Error Envelope Doctrine

> Source plan:
> [`docs/implementation-plans/29-rate-limiting-and-secret-management-plan.md`](../implementation-plans/29-rate-limiting-and-secret-management-plan.md)
> — Critical Fix 4.

One canonical response shape for every public error surface.
Schema: [`error-envelope.schema.json`](../../content-schema/schemas/error-envelope.schema.json).

## 1. Closed Error Codes

| Code | Meaning | Retry-eligible | Owner doctrine |
| --- | --- | --- | --- |
| `RATE_LIMITED` | Request rejected by a per-axis rate limiter. | yes — wait `retryAfterMs` | [`signaling-rate-limits.md`](../architecture/signaling-rate-limits.md) |
| `BUDGET_EXCEEDED` | Per-account or per-category cost budget exhausted. Reserved for a future hosted-AI-gateway deploy; not used in the default BYO-key build. | yes — wait until window reset | — |
| `SERVICE_PAUSED` | Operational kill-switch is engaged. Reserved for a future hosted-AI-gateway deploy; not used in the default BYO-key build. | yes — long retry, value advisory only | — |
| `VALIDATION_FAILED` | Request shape violates a schema. | no | [`error-taxonomy.md`](../architecture/error-taxonomy.md) |
| `UNAVAILABLE` | Transient outage. | yes | [`error-taxonomy.md`](../architecture/error-taxonomy.md) |
| `INTERNAL` | Unhandled server-side error. | no — file an issue | [`error-taxonomy.md`](../architecture/error-taxonomy.md) |

## 2. HTTP Mapping

| Code | HTTP status | Headers |
| --- | --- | --- |
| `RATE_LIMITED` | `429 Too Many Requests` | `Retry-After: <seconds>` (mirrors `retryAfterMs / 1000`, rounded up) |
| `BUDGET_EXCEEDED` | `402 Payment Required` (semantic match for budget exhaustion) | `Retry-After: <seconds>` |
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

Why: a precise breakdown lets an attacker triangulate the exact
bucket key (e.g., "the per-IP bucket reset at second 31") and time
attacks against the next refill. Coarse scope keeps clients useful
(they know which axis to adjust their retry strategy on) while
denying that calibration signal.

## 5. `retryAfterMs` Semantics

- Present on every retry-eligible code (`RATE_LIMITED`,
  `BUDGET_EXCEEDED`, `SERVICE_PAUSED`, `UNAVAILABLE`).
- Absent on terminal codes (`VALIDATION_FAILED`, `INTERNAL`).
- Coarsened to the nearest 5 s for `RATE_LIMITED` to deny token-bucket
  timing leakage.
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
- [`services/signaling/error-codes.md`](../../services/signaling/error-codes.md)
  — wire-level signaling error vocabulary.
- [`services/ai-gateway/error-codes.md`](../../services/ai-gateway/error-codes.md)
  — AI-gateway HTTP error vocabulary.
