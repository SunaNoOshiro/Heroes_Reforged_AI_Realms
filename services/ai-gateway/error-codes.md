# services/ai-gateway — Error Codes

Closed HTTP-wire vocabulary for the AI gateway. The wire surface is
HTTP — there is no body-side enum schema; the rules below pin which
HTTP statuses may appear and what each means.

## 1. Allowed wire statuses

| Status | When | Body |
|---|---|---|
| `200` | Success | provider response (normalized to `GenerationRequest` / `GeneratedFaction` shape per [`docs/architecture/ai-integration.md`](../../docs/architecture/ai-integration.md)) |
| `400` | Validation failure on the request shape | `{ errorId, code: "INVALID_REQUEST" }` (no field path) |
| `401` | Missing or malformed auth token | `{ errorId }` (never distinguishes "missing" vs "malformed") |
| `404` | Endpoint not found *or* exists but forbidden — collapsed | `{ errorId }` |
| `429` | Throttled | `{ errorId }`; `Retry-After` header carries seconds |
| `500` | Internal failure | `{ errorId }` (no `cause`, no stack) |

No other status may appear on the wire. A 502 / 503 / 504 from the
upstream provider is logged (per [`retention.md`](./retention.md))
and translated to `500` on the wire.

## 2. Failure classes

The internal failure classification (transport, auth, quota,
content-policy) lives in
[`provider-failure.schema.json`](../../content-schema/schemas/provider-failure.schema.json)
and is consumed by the orchestrator's retry logic. The failure
class is **not** exposed on the wire — the gateway responds with
HTTP status only. The retry policy that consumes the closed
four-class taxonomy lives in
[`retry-policy.schema.json`](../../content-schema/schemas/retry-policy.schema.json)
and runs **inside** the orchestrator, on the client; the gateway's
job is only to return the HTTP status above.

## 3. Forbidden patterns

The implementation MUST NOT:

- emit `403` ("forbidden") — the gateway collapses forbidden into
  `404` so that "exists but forbidden" cannot be distinguished from
  "does not exist";
- emit a `401` body that distinguishes "missing token" from
  "malformed token";
- emit a `500` body with `cause`, `stack`, or any provider error
  message;
- emit a `429` without a `Retry-After` header;
- log the upstream provider's response body verbatim.

## 4. Mapping to UI keys

`formatUserError` (per
[`docs/architecture/error-formatter.md`](../../docs/architecture/error-formatter.md))
maps gateway statuses to closed UI keys:

| HTTP | UI key |
|---|---|
| `400` | `errors.ai.generationFailed` |
| `401` / `403` (collapsed → 404) | `errors.ai.providerUnavailable` |
| `404` | `errors.ai.providerUnavailable` |
| `429` | `errors.network.rateLimited` |
| `500` | `errors.ai.generationFailed` |

The `errors.network.rateLimited` reuse is intentional: rate-limit
posture is consistent across surfaces (signaling, AI gateway), and
collapsing the user copy reduces the locale surface.

## 5. Cross-references

- [`services/ai-gateway/retention.md`](./retention.md) — log retention.
- [`docs/architecture/error-codes.md`](../../docs/architecture/error-codes.md) — cross-service index.
- [`docs/architecture/ai-integration.md`](../../docs/architecture/ai-integration.md) — provider-neutral contract.
- [`docs/architecture/error-formatter.md`](../../docs/architecture/error-formatter.md) — UI key resolution.
