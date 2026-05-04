# AI Gateway Retention and Error Codes

Status: planned

Module: [AI-Generated Content (M6)](../02-ai-generation.md)

Description:
Author [`services/ai-gateway/retention.md`](../../../services/ai-gateway/retention.md)
and [`services/ai-gateway/error-codes.md`](../../../services/ai-gateway/error-codes.md).
Prompts log only as `promptHash` (the `notes.promptHash` field
already declared by Plan 14); raw responses retained ≤ 24 h in the
provider-response cache then purged; failure-path logger uses
`formatDevError` to strip the prompt body before any sink.
Wire the new error-code mapping (401/403 collapse → 404, 429 with
`Retry-After`, 500 without `cause`).

Plan 22 § 3 — Service-side observability + retention docs.

Read First:
- [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../../../docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md)
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/ai-generation-pipeline.md`](../../../docs/architecture/ai-generation-pipeline.md)
- [`docs/architecture/error-formatter.md`](../../../docs/architecture/error-formatter.md)

Inputs:
- Plan 14's `notes.promptHash` rule.
- Plan 22's failure-path redactor.
- The closed [`provider-failure.schema.json`](../../../content-schema/schemas/provider-failure.schema.json)
  taxonomy (transport / auth / quota / content-policy).

Outputs:
- `services/ai-gateway/retention.md`
- `services/ai-gateway/error-codes.md`
- Cross-link sentence in `ai-integration.md` and
  `ai-generation-pipeline.md`.

Owned Paths:
- `services/ai-gateway/retention.md`
- `services/ai-gateway/error-codes.md`

Dependencies:
- mvp.00-core-architecture.22-01-error-formatter-contract
- mvp.02-content-schemas.40-privacy-and-legal-docs

Acceptance Criteria:
- The retention doc names every "do not log" / "log as hash" / "TTL"
  row, including the 24 h response-cache TTL.
- The error-codes doc collapses 401 / 403 → 404 on the wire and
  forbids `cause` chains in 500 responses.
- The failure-path logger contract is named: prompt body is
  `redact: true`, cause chain is dropped in production builds.
- `npm run validate` passes.

Verify:
- npm run validate

Estimated Time:
- 3 hours
