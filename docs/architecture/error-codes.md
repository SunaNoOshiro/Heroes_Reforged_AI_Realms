# Error Codes — Cross-Service Index

> Companion docs:
> [`error-schema-map.md`](./error-schema-map.md) (which error
> schema each layer emits and consumes),
> [`error-taxonomy.md`](./error-taxonomy.md) (internal error-record
> taxonomy),
> [`error-formatter.md`](./error-formatter.md) (`formatUserError`),
> [`error-ux.md`](./error-ux.md) (surface decision matrix),
> [`crypto-rules.md`](./crypto-rules.md) (secret-compare contract),
> [`production-build.md`](./production-build.md) (prod cause-chain
> stripping).

Single index of every **wire-visible** error vocabulary the project
ships: two service surfaces (signaling, AI gateway) plus the closed
pack-signature taxonomy. Internal `*_*` codes that never reach a
remote caller live in
[`error-taxonomy.md`](./error-taxonomy.md); do not duplicate them
here.

## 1. Closed vocabularies

| Surface | Schema | Owning doc |
|---|---|---|
| Signaling — joiner-visible wire | [`signaling-error.schema.json`](../../content-schema/schemas/signaling-error.schema.json) (`kind: wire`) | [`services/signaling/error-codes.md`](../../services/signaling/error-codes.md) |
| Signaling — owner-only authenticated channel | [`signaling-error.schema.json`](../../content-schema/schemas/signaling-error.schema.json) (`kind: ownerNotice`) | [`services/signaling/error-codes.md`](../../services/signaling/error-codes.md) |
| AI gateway — HTTP wire | _HTTP status + minimal body; see § 2_ | [`services/ai-gateway/error-codes.md`](../../services/ai-gateway/error-codes.md) |
| Pack signature | [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json) | [`crypto-rules.md`](./crypto-rules.md) |

For the broader layer / consumer / owning-plan map across **all**
error-shaped schemas (including internal ones), see
[`error-schema-map.md`](./error-schema-map.md).

## 2. Wire-visible codes

| Surface | Code | Meaning | Carries cause? |
|---|---|---|---|
| Signaling | `JOIN_FAILED` | Any rejected join — wrong code, full, expired, banned, forbidden | No |
| Signaling | `RATE_LIMITED` | Throttled; carries `retryAfterMs` | No |
| Signaling | `SERVER_ERROR` | Generic 500 | No |
| AI gateway HTTP 400 | body `{ errorId, code: "INVALID_REQUEST" }` | Request shape failed validation (no field path) | No |
| AI gateway HTTP 401 | body `{ errorId }` (no code) | Missing or malformed token — collapsed | No |
| AI gateway HTTP 404 | body `{ errorId }` (no code) | Not found *or* exists-but-forbidden — collapsed | No |
| AI gateway HTTP 429 | body `{ errorId }` (no code); `Retry-After` header | Throttled | No |
| AI gateway HTTP 500 | body `{ errorId }` (no code) | Generic; never carries `cause` in body | No |
| Pack signature | `INVALID_SIGNATURE` | Wrong key, no such key, malformed sig — collapsed | No |
| Pack signature | `SIGNATURE_DISABLED` | Explicit "feature off" state | No |

The `Carries cause?` column is non-negotiable: no wire-visible code
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
carries the user-grade key per surface. Every UI sink that surfaces
a wire-visible failure routes through `formatUserError` (per
[`error-formatter.md`](./error-formatter.md)) and resolves to one of
the keys below; raw wire codes never reach UI.

Wire-code mapping (signaling + pack-signature):

| Wire code | UI key |
|---|---|
| `JOIN_FAILED` | `errors.network.joinFailed` |
| `RATE_LIMITED` | `errors.network.rateLimited` |
| `SERVER_ERROR` | `errors.network.serverError` |
| `INVALID_SIGNATURE` | `errors.signature.invalid` |
| `SIGNATURE_DISABLED` | `errors.signature.disabled` |

AI-gateway HTTP-status mapping (canonical table in
[`services/ai-gateway/error-codes.md` § 4](../../services/ai-gateway/error-codes.md#4-mapping-to-ui-keys)):

| HTTP | UI key |
|---|---|
| `400` | `errors.ai.generationFailed` |
| `401` | `errors.ai.providerUnavailable` |
| `404` | `errors.ai.providerUnavailable` |
| `429` | `errors.network.rateLimited` |
| `500` | `errors.ai.generationFailed` |

The `errors.network.rateLimited` reuse across signaling + AI gateway
is intentional: rate-limit posture is consistent across surfaces,
and collapsing the user copy reduces the locale surface.

## 4. Internal-only error taxonomy

This file covers **wire-visible** codes only. The richer internal
record taxonomy (prefixes, severities, `ErrorState` shape) lives in
[`error-taxonomy.md`](./error-taxonomy.md); the per-record schemas
are indexed by [`error-schema-map.md`](./error-schema-map.md). Do
not duplicate either here.

## 5. Cross-references

- [`error-schema-map.md`](./error-schema-map.md) — layer / consumer / owning-plan map for every error-shaped schema.
- [`error-formatter.md`](./error-formatter.md) — `formatUserError` / `formatDevError`.
- [`error-taxonomy.md`](./error-taxonomy.md) — internal record taxonomy.
- [`error-ux.md`](./error-ux.md) — surface-decision matrix.
- [`crypto-rules.md`](./crypto-rules.md) — secret-compare contract.
- [`production-build.md`](./production-build.md) — prod cause-chain stripping.
- [`localization.schema.json`](../../content-schema/schemas/localization.schema.json) — closed `errors.*` namespace.

---

## 🔍 Sync Check

- **UI: ✔** — Every UI key in § 3 is required by [`localization.schema.json`](../../content-schema/schemas/localization.schema.json) `errors.*` (`network.joinFailed | rateLimited | serverError`, `signature.invalid | disabled`, `ai.generationFailed | providerUnavailable`); the AI-gateway HTTP→UI mapping mirrors [`services/ai-gateway/error-codes.md` § 4](../../services/ai-gateway/error-codes.md#4-mapping-to-ui-keys) exactly.
- **Schema: ✔** — `wireCode` enum in [`signaling-error.schema.json`](../../content-schema/schemas/signaling-error.schema.json) is exactly `["JOIN_FAILED", "RATE_LIMITED", "SERVER_ERROR"]`; `code` enum in [`signature-error.schema.json`](../../content-schema/schemas/signature-error.schema.json) is exactly `["INVALID_SIGNATURE", "SIGNATURE_DISABLED"]`; `SignalingError` row present in [`schema-matrix.md`](./schema-matrix.md).
- **Tasks: ✔** — Owning task [`phase-3/01-multiplayer/20-signaling-observability-and-error-vocabulary.md`](../../tasks/phase-3/01-multiplayer/20-signaling-observability-and-error-vocabulary.md) lists this file under `Owned Paths` and its acceptance criterion ("`docs/architecture/error-codes.md` cross-references both service tables and pins the UI-grade key mapping") is satisfied by §§ 1–3; AI-gateway side maintained by [`phase-3/02-ai-generation/10-ai-gateway-retention-and-error-codes.md`](../../tasks/phase-3/02-ai-generation/10-ai-gateway-retention-and-error-codes.md).

## ⚠ Issues

- **Localization-key convention conflict across error docs.** § 3 here uses the plural-camelCase form (`errors.network.joinFailed`, `errors.signature.invalid`) — which matches [`localization.schema.json`](../../content-schema/schemas/localization.schema.json) exactly. [`error-ux.md` § 3](./error-ux.md#3-localization-key-naming) names a different form (`error.<domain>.<code>.<part>`, singular `error`, hyphenated, with `body` / `title` / `cta` parts), and [`error-taxonomy.md` § 4](./error-taxonomy.md#4-user-facing-vs-internal) names a third (`errors.<lowercase code>`). The runtime can honor one; the localization schema sides with this file. Per CLAUDE.md ("Stable IDs are public API"), owner [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md) (the formatter is the single hop resolving codes to keys) must reconcile. Already flagged from the `error-ux.md` and `error-taxonomy.md` audit trailers; surfaced again because this file is the third corner. Skill did not silently rewrite either side because the conflict is structural and the localization schema is the tie-breaker.
- **HTTP 400 + `INVALID_REQUEST` was undocumented in this index.** Previous revision listed AI-gateway 401/404/429/500 only and asserted every status had `_(no body code)_`; [`services/ai-gateway/error-codes.md` § 1](../../services/ai-gateway/error-codes.md#1-allowed-wire-statuses) defines a 400 body `{ errorId, code: "INVALID_REQUEST" }` and § 4 maps it to `errors.ai.generationFailed`. Fix applied inline in §§ 2–3 (this file is the cross-service index, the service doc is the canonical owner). Non-blocking.
