# Error Codes — Cross-Service Index

Single index doc cross-referencing the closed wire-error vocabularies
that span the project's two service surfaces (signaling, AI gateway)
plus the closed pack-signature vocabulary. Every wire-visible error
code is listed here so a contributor can find one canonical mapping
instead of hunting through service folders.

## 1. Closed vocabularies

| Surface | Schema | Doc |
|---|---|---|
| Signaling (joiner-visible wire) | [`signaling-error.schema.json`](../../content-schema/schemas/signaling-error.schema.json) | [`services/signaling/error-codes.md`](../../services/signaling/error-codes.md) |
| Signaling (owner-only authenticated channel) | [`signaling-error.schema.json`](../../content-schema/schemas/signaling-error.schema.json) (`kind: ownerNotice`) | [`services/signaling/error-codes.md`](../../services/signaling/error-codes.md) |
| AI gateway (HTTP wire) | _no schema; HTTP status only_ | [`services/ai-gateway/error-codes.md`](../../services/ai-gateway/error-codes.md) |
| Pack signature | [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json) | [`crypto-rules.md`](./crypto-rules.md) |

## 2. Wire-visible codes

| Surface | Code | Meaning | Carries cause? |
|---|---|---|---|
| Signaling | `JOIN_FAILED` | Any rejected join — wrong code, full, expired, banned, forbidden | No |
| Signaling | `RATE_LIMITED` | Throttled; carries `retryAfterMs` | No |
| Signaling | `SERVER_ERROR` | Generic 500 | No |
| AI gateway HTTP 401 | _(no body code)_ | Missing or malformed token | No |
| AI gateway HTTP 404 | _(no body code)_ | Not found *or* exists-but-forbidden (collapsed) | No |
| AI gateway HTTP 429 | _(no body code)_ | Throttled; `Retry-After` header | No |
| AI gateway HTTP 500 | _(no body code)_ | Generic; never carries `cause` in body | No |
| Pack signature | `INVALID_SIGNATURE` | Wrong key, no such key, malformed sig — collapsed | No |
| Pack signature | `SIGNATURE_DISABLED` | Explicit "feature off" state | No |

The "carries cause?" column is non-negotiable: no wire-visible code
carries an `Error.cause` chain in any field a remote caller can
read. Internal service-side logs still carry the cause for
debugging — see
[`services/signaling/observability.md`](../../services/signaling/observability.md)
and
[`services/ai-gateway/retention.md`](../../services/ai-gateway/retention.md)
for redaction rules.

## 3. UI-grade keys

The closed `errors.*` namespace on
[`localization.schema.json`](../../content-schema/schemas/localization.schema.json)
carries one user-grade key per wire code. The mapping:

| Wire code | UI key |
|---|---|
| `JOIN_FAILED` | `errors.network.joinFailed` |
| `RATE_LIMITED` | `errors.network.rateLimited` |
| `SERVER_ERROR` | `errors.network.serverError` |
| `INVALID_SIGNATURE` | `errors.signature.invalid` |
| `SIGNATURE_DISABLED` | `errors.signature.disabled` |

Every other UI sink that surfaces a wire-visible failure routes
through `formatUserError` (per
[`error-formatter.md`](./error-formatter.md)) and resolves to one
of the keys above; raw wire codes never reach UI.

## 4. Internal-only error taxonomy

The richer `error-taxonomy.md` and `error-state.schema.json` live in
[`error-taxonomy.md`](./error-taxonomy.md); they are the closed
vocabulary for *internal* error records (ErrorState rows on the
state tree, validator output). This file (`error-codes.md`) covers
**wire-visible** codes only; do not duplicate the taxonomy.

## 5. Cross-references

- [`error-formatter.md`](./error-formatter.md) — `formatUserError`.
- [`crypto-rules.md`](./crypto-rules.md) — secret-compare contract.
- [`error-taxonomy.md`](./error-taxonomy.md) — internal record taxonomy.
- [`error-ux.md`](./error-ux.md) — surface-decision matrix.
- [`production-build.md`](./production-build.md) — prod cause-chain stripping.
