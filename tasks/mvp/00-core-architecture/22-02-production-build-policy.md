# Production-Build Error & Bundle Policy

Status: planned

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
Author [`docs/architecture/production-build.md`](../../../docs/architecture/production-build.md)
declaring the five rules the build pipeline (Plan 30) must satisfy
before any production bundle ships: `__DEV__` constant-folding,
public source-map strip, `formatUserError` as the only UI error sink,
console sinks routed through `formatDevError`, and a bundle-size CI
check against dev-only constants. Cross-link from
[`state-flow.md`](../../../docs/architecture/state-flow.md) and the
error-formatter doc.

Plan 22 § 2 — Production-build error policy.

Read First:
- [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../../../docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md)
- [`docs/architecture/error-formatter.md`](../../../docs/architecture/error-formatter.md)

Inputs:
- The five rules listed in Plan 22 § Critical Fixes — Production-build
  error policy.

Outputs:
- `docs/architecture/production-build.md`

Owned Paths:
- `docs/architecture/production-build.md`

Dependencies:
- mvp.00-core-architecture.22-01-error-formatter-contract

Acceptance Criteria:
- The doc names all five rules and references
  [`error-formatter.md`](../../../docs/architecture/error-formatter.md)
  + [`crypto-rules.md`](../../../docs/architecture/crypto-rules.md).
- The bundle-size CI check is reserved as a Plan 30 acceptance
  criterion; this task does not implement the toolchain.
- `state-flow.md` cross-links the doc.

Verify:
- npm run validate

Estimated Time:
- 2 hours
