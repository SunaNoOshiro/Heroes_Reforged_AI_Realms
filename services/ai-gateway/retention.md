# services/ai-gateway — Retention & Scrubbing

What the AI gateway may log, where, for how long, and what it must
scrub. Cross-link from the gateway-task surface in
[`docs/architecture/ai-integration.md`](../../docs/architecture/ai-integration.md)
and the pipeline in
[`docs/architecture/ai-generation-pipeline.md`](../../docs/architecture/ai-generation-pipeline.md).

> Source plan:
> [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../../docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md).

## 1. Log floor

| Item | Logged? | Notes |
|---|---|---|
| Prompt content | **no** (never raw) | Logged only as `promptHash` per [`generated-faction.schema.json`](../../content-schema/schemas/generated-faction.schema.json) `notes.promptHash`. |
| Response content | **no** (never raw) | Cached for ≤ 24 h keyed by `(promptHash, seed, providerId, modelHint)` per [`provider-response-cache-entry.schema.json`](../../content-schema/schemas/provider-response-cache-entry.schema.json); no logging at the gateway. |
| Provider HTTP status | yes | Counts only; never the upstream body. |
| Failure path | yes (redacted) | The failure-path logger calls [`formatDevError`](../../docs/architecture/error-formatter.md) before any sink; the prompt body never reaches the log. |
| `errorId` on every response | yes | UUID v4; cross-references the on-device crash log. |
| Per-user identifier | **no** | No auth surface exists at v1; therefore no user id is transmitted or persisted. |
| API key | **no** | Stored in deploy-platform secrets only; never logged. |
| Provider error message | **no** (raw) | Mapped to a closed wire code (see [`error-codes.md`](./error-codes.md)); the upstream message is dropped before the response. |

## 2. Retention TTL

| Surface | TTL | Owner |
|---|---|---|
| Provider response cache | **≤ 24 h** | gateway code purges on TTL |
| Service stdout | as forwarded by the deploy platform | platform config |
| Platform-side access log | **≤ 24 h** | deploy step |
| In-memory rate-limit buckets | cleared on bucket expiry | gateway code |

The deploy step (when a gateway lands) must:

1. configure the platform's access-log retention to ≤ 24 h;
2. confirm the AI provider's terms permit prompt content opt-out
   from training data (see DPA checklist § 4);
3. add the deploy platform *and* the AI provider as rows in
   [`processors.md`](../../docs/legal/processors.md).

## 3. Failure-path logger contract

When a provider call throws (transport, auth, quota, or content-policy
failure per [`provider-failure.schema.json`](../../content-schema/schemas/provider-failure.schema.json)):

1. The thrown `Error` is passed through `formatDevError` before any
   sink.
2. The prompt body is **never** included in the redacted output;
   the redactor reuses the base64-≥ 32 rule from
   [`error-formatter.md` § 3](../../docs/architecture/error-formatter.md#3-redaction-allowlist)
   — most prompt bodies are long enough to trip the rule on their
   own, but the gateway also tags prompt fields `redact: true` to
   make the redaction unambiguous.
3. The cause chain is dropped in production builds (per
   [`production-build.md` rule 3](../../docs/architecture/production-build.md#3-formatusererror-is-the-only-ui-error-sink)).
4. The error is emitted to stdout as `{ errorId, providerId,
   modelHint, failureClass, redactedMessage }` only.

## 4. Forbidden patterns

The implementation MUST NOT:

- log raw prompts (only `promptHash`);
- forward the upstream provider's error body to the wire response;
- emit different HTTP codes for "endpoint not found" vs. "endpoint
  exists but forbidden" — both collapse to `404` (per
  [`error-codes.md`](./error-codes.md));
- emit `401` with a body that distinguishes "missing token" from
  "malformed token";
- include a per-user identifier in any cache key (no auth surface
  at v1);
- store responses beyond the 24 h cache TTL.

## 5. Cross-references

- [`services/ai-gateway/error-codes.md`](./error-codes.md) — wire vocabulary.
- [`docs/architecture/ai-integration.md`](../../docs/architecture/ai-integration.md) — provider-neutral generation contract.
- [`docs/architecture/ai-generation-pipeline.md`](../../docs/architecture/ai-generation-pipeline.md) — pipeline stages and `notes.promptHash`.
- [`docs/architecture/error-formatter.md`](../../docs/architecture/error-formatter.md) — `formatDevError` contract.
- [`docs/architecture/privacy.md`](../../docs/architecture/privacy.md) — retention TTL matrix.
- [`docs/legal/processors.md`](../../docs/legal/processors.md) — third-party processor list.
