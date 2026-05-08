# Property-Based Testing

Module: [Test & Tooling Contracts (M0)](../02-tooling.md)

Description:
Adopt `fast-check` as the project's property-based testing layer.
Author two anchor property-test files — one for the formula evaluator
in `src/rules/`, one for the canonical-JSON serializer in
`src/engine/` — that pin a small set of invariants (purity,
fixed-point bounds, round-trip identity, key-order insensitivity,
byte stability). Document the pattern in the unit-test contract so
subsequent modules add their own property tests by copying the shape.

Read First:
- [`docs/architecture/testing/unit-test-contract.md`](../../../docs/architecture/testing/unit-test-contract.md) § Property Testing
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`content-schema/schemas/formula.schema.json`](../../../content-schema/schemas/formula.schema.json)

Inputs:
- Canonical-JSON serializer
  (`mvp.01-engine-core.07b-canonical-json`)
- Formula evaluator (lives in `src/rules/`; pinned by ruleset
  schema)

Outputs:
- `package.json` — add `fast-check` to `devDependencies`.
- `src/rules/__tests__/formula-invariants.property.test.ts` —
  three invariants on the evaluator: purity (same inputs always
  produce same output), fixed-point bounds (no intermediate exceeds
  the documented integer cap from
  [`docs/architecture/determinism.md` § Saturation policy](../../../docs/architecture/determinism.md#saturation-policy)),
  zero-divisor handling (`divFloor` clamps per ruleset constants).
- `src/engine/__tests__/canonical-json.property.test.ts` — three
  invariants on canonical JSON: round-trip identity
  (`parse(canonicalize(v)) → canonicalize again` is byte-equal),
  key-order insensitivity (two structurally equal records hash
  identically regardless of input key order), byte stability across
  Node and browser.

Owned Paths:
- `src/rules/__tests__/formula-invariants.property.test.ts`
- `src/engine/__tests__/canonical-json.property.test.ts`

Owned Paths (shared):
- `package.json` (primary owner:
  `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`;
  this task contributes the `fast-check` devDependency entry only).

Dependencies:
- mvp.02-tooling.03-unit-test-contract
- mvp.01-engine-core.07b-canonical-json

Acceptance Criteria:
- Both property-test files run inside the existing Vitest pipeline
  (`npm test`).
- Each property test asserts at least three named invariants; the
  test runner reports each invariant separately on shrink.
- A deliberate non-pure formula evaluator (e.g. consults
  `Date.now()`) causes the formula property test to fail with a
  shrunk counterexample.
- A deliberate non-canonical key sort in the canonical-JSON
  serializer causes the canonical-JSON property test to fail with a
  shrunk counterexample.
- Shared path (`package.json`) is extended with additive scope only.
  This task must not rewrite the existing scripts or dependency
  entries; the primary owner of `package.json` remains as named in
  Owned Paths (shared) above.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
