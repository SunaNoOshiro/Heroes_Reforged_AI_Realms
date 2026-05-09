# Crypto Rules and Signature-Error Vocabulary

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
Author [`docs/architecture/crypto-rules.md`](../../../docs/architecture/crypto-rules.md)
with three mandatory rules: constant-time secret compare, uniform
throw with `redact: true`, and dev-only `errorId` log. Add the closed
[`signature-error.schema.json`](../../../content-schema/schemas/signature-error.schema.json)
enum (`INVALID_SIGNATURE`, `SIGNATURE_DISABLED`). Cross-link from
[`pack-contract.md` § Trust Fields](../../../docs/architecture/pack-contract.md#trust-fields).
Reserve the `no-raw-eq-on-secret` lint rule for a Phase-2 task.

2 — Crypto-rules + constant-time compare.

Read First:
- [`docs/architecture/error-formatter.md`](../../../docs/architecture/error-formatter.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)

Inputs:
- the three crypto rules (Compare / Throw / Log).
- the prospective save-MAC and pack-signing surfaces.

Outputs:
- `docs/architecture/crypto-rules.md`
- `content-schema/schemas/signature-error.schema.json`
- Canonical example
  `content-schema/examples/signature-error/canonical.signature-error.json`
- Cross-link sentence in `pack-contract.md` § Trust Fields.

Owned Paths:
- `docs/architecture/crypto-rules.md`
- `content-schema/schemas/signature-error.schema.json`
- `content-schema/examples/signature-error/`

Owned Paths (shared):
- `docs/architecture/pack-contract.md` is the **primary contract**
  of the pack-loading task family; this task adds the cross-link
  sentence **additively** and does not rewrite the trust-field rules.

Dependencies:
- mvp.00-core-architecture.22-01-error-formatter-contract

Acceptance Criteria:
- The schema validates the canonical example.
- The schema's `code` enum is exactly
  `["INVALID_SIGNATURE", "SIGNATURE_DISABLED"]`.
- The doc names all three rules and references the formatter's
  `redact: true` tag.
- A Phase-2 task slot is reserved for the `no-raw-eq-on-secret`
  lint integration.

Owned Paths (shared) acceptance:
- `docs/architecture/pack-contract.md` is **owned by** the pack-loading
  task family (the primary owner of trust-field rules). This task is
  **additive**: a single cross-link sentence is added under
  § Trust Fields naming `crypto-rules.md` and the closed
  `signatureErrorCode` enum; the existing trust-field, sandbox, and
  revocation rules must not rewrite anything else.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
