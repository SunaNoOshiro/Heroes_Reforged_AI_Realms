# Security Tests — Escape-Vectors Corpus & CI Gate

Status: planned

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
Build the `tests/security/escape-vectors/` fixture corpus and the
CI driver that runs every fixture through the real loader and
asserts a closed-code refusal. The corpus closes the regression
gap on every cap, sanitiser, magic-byte check, and trust gate
authored by Plan 28 — once it is wired into CI, drift on any
loader rule fails the build instead of silently regressing.

Plan 28 § Tasks — security-fuzz / escape-vector corpus.

Read First:
- [`docs/implementation-plans/28-asset-loading-and-sandboxing-plan.md`](../../../docs/implementation-plans/28-asset-loading-and-sandboxing-plan.md)
- [`docs/architecture/asset-loading.md`](../../../docs/architecture/asset-loading.md)
- [`docs/architecture/asset-policy.md`](../../../docs/architecture/asset-policy.md)
- [`docs/architecture/sandbox-model.md`](../../../docs/architecture/sandbox-model.md)
- [`docs/architecture/parser-hardening.md`](../../../docs/architecture/parser-hardening.md)
- [`tests/security/escape-vectors/README.md`](../../../tests/security/escape-vectors/README.md)

Inputs:
- The cap table in [`asset-loading.md` § 1](../../../docs/architecture/asset-loading.md#1-cap-table).
- The forbidden-kind table in [`asset-policy.md` § 2](../../../docs/architecture/asset-policy.md#2-forbidden-kinds).
- The closed error-code list in
  [`pack-error-codes.md`](../../../docs/architecture/pack-error-codes.md).

Outputs:
- `tests/security/escape-vectors/` — payload-class README plus per-class
  fixture files (text-only descriptors at this stage; binary fixtures
  are produced by the loader tasks at CI time):
  - `zip-traversal.hrmod.json` — entry path containing `..`.
  - `zip-bomb.hrmod.json` — declared-ratio descriptor.
  - `proto-pollution.json` — JSON with `__proto__` / `constructor` keys.
  - `bigint-confusion.json` — JSON with stringified bigint values.
  - `malformed-png.png.json` — PNG-magic header with truncated IHDR.
  - `oversized-png.png.json` — declared-dim descriptor over
    `maxImageWidth`.
  - `oog-channel-bomb.ogg.json` — declared-channel descriptor over
    `maxAudioChannels`.
  - `icu-injection.json` — localization payload with non-ICU template
    syntax.
  - `mime-polyglot.bin.json` — descriptor for a polyglot payload that
    fails the magic-byte gate.
- `tests/security/run.mjs` — driver that loads every fixture through
  the real loader (or its scaffold) and asserts the documented
  refusal code.
- `package.json` — script
  `"test:security": "node tests/security/run.mjs"`.

Owned Paths:
- `tests/security/escape-vectors/`
- `tests/security/run.mjs`

Owned Paths (shared):
- `package.json` (additive: `test:security` script row)

Dependencies:
- mvp.00-core-architecture.22-04-shipped-csp-and-trusted-types
- mvp.02b-asset-pipeline.05-async-asset-loader-with-caching
- mvp.02b-asset-pipeline.04-asset-registry-id-based-resolution-no-hardcoded-paths
- mvp.08-persistence.16-parser-hardening

Acceptance Criteria:
- `tests/security/escape-vectors/README.md` enumerates every payload
  class with its expected refusal code, cross-linking
  [`pack-error-codes.md`](../../../docs/architecture/pack-error-codes.md)
  by anchor.
- Each fixture descriptor names the cap or sanitiser it stresses.
- `tests/security/run.mjs` exits non-zero on the first fixture that
  does not refuse with the declared code.
- `npm run test:security` is wired into CI immediately after
  `npm run validate`.
- Coverage table in `README.md` lists at least one fixture per
  closed `pack.error.asset.*`, `pack.error.archive.*`, and
  `parser.error.*` code emitted by the loaders Plan 28 names.
- Adding a new cap or refusal code requires either a fixture in
  this corpus or a documented exemption in `README.md`; CI
  surfaces the gap as
  `security-tests.error.uncovered-refusal-code`.
- **Shared-path scope.** Edits to `package.json` are **additive**
  — the task adds the `test:security` script row only and **must
  not** rewrite or remove existing scripts. The primary contract
  for `package.json` is **owned by**
  [`tasks/mvp/00-core-architecture/22-02-production-build-policy.md`](./22-02-production-build-policy.md);
  this task's edit is a script-row addition under that primary
  ownership.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
