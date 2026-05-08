# Shipped CSP & Trusted Types

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
Ship a deny-by-default Content Security Policy and a single
Trusted Types policy on the host HTML so every other defence
layer (no-eval, no-remote-fetch, no-inline-script, no-dynamic-DOM)
is enforced at the browser layer, not just by intent. Owns the
`<meta>` tag in the canonical HTML, the static-host header
contract, the `canonical-policy` Trusted Types policy
registration, and the build-time CSP-assertion gate.

Plan 28 § Tasks — Shipped CSP.

Read First:
- [`docs/implementation-plans/28-asset-loading-and-sandboxing-plan.md`](../../../docs/implementation-plans/28-asset-loading-and-sandboxing-plan.md)
- [`docs/architecture/csp.md`](../../../docs/architecture/csp.md)
- [`docs/architecture/worker-csp.md`](../../../docs/architecture/worker-csp.md)
- [`docs/architecture/error-formatter.md`](../../../docs/architecture/error-formatter.md)

Inputs:
- The policy text and per-directive rationale in
  [`docs/architecture/csp.md` § 1](../../../docs/architecture/csp.md#1-shipped-policy).
- The Trusted Types policy stub in
  [`docs/architecture/csp.md` § 2](../../../docs/architecture/csp.md#2-trusted-types-policy).
- The bundled HTML produced by the Plan 30 build pipeline (this
  task only owns the meta tag + policy registration; the build
  pipeline owns header emission).

Outputs:
- `docs/architecture/csp.md` — already authored under Plan 28.
- `index.html` `<meta http-equiv="Content-Security-Policy">`
  carrying the policy text byte-for-byte.
- `src/runtime/security/trusted-types.ts` — registers the
  `canonical-policy` Trusted Types policy at boot. `createScript`
  and `createScriptURL` throw; `createHTML` defers to the
  formatter pipeline.
- `scripts/check-csp.mjs` — CI gate that asserts (1) the bundled
  `index.html` `<meta>` CSP matches `csp.md` § 1 byte-for-byte,
  (2) the bundled JS contains no `eval(`, `new Function(`,
  `setTimeout("…")`, `setInterval("…")`, or inline `<script>`
  content, (3) `trustedTypes.createPolicy` is called exactly once
  with the name `canonical-policy`, and (4) the static-host CSP
  header (when emitted by the build pipeline) matches the meta
  tag.

Owned Paths:
- `docs/architecture/csp.md`
- `index.html` (CSP `<meta>` tag only)
- `src/runtime/security/trusted-types.ts`
- `scripts/check-csp.mjs`

Dependencies:
- mvp.00-core-architecture.22-01-error-formatter-contract

Acceptance Criteria:
- `index.html` ships a `<meta http-equiv="Content-Security-Policy">`
  whose content matches [`csp.md` § 1](../../../docs/architecture/csp.md#1-shipped-policy)
  byte-for-byte.
- `src/runtime/security/trusted-types.ts` registers exactly one
  Trusted Types policy named `canonical-policy`. `createScript`
  and `createScriptURL` throw with a fixed message that the
  CI gate greps for. `createHTML` returns `formatTrustedHtml(input)`
  per [`error-formatter.md`](../../../docs/architecture/error-formatter.md).
- `scripts/check-csp.mjs` runs as part of `npm run validate` and
  fails on any of: meta tag drift, banned dynamic-eval pattern in
  the bundled JS, missing or extra `createPolicy` call, or
  static-host header drift.
- The CSP-assertion gate is wired into `npm run validate` after
  `validate:build-attestation`.
- Refusal codes for the gate are registered in
  [`pack-error-codes.md`](../../../docs/architecture/pack-error-codes.md)
  under `build.error.csp.*`.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
