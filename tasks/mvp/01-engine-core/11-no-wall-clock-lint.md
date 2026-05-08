# ESLint rule — `no-wall-clock` (deterministic paths)

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Add an ESLint rule that bans wall-clock readers (`Date.now()`,
`Date()`, `performance.now()`, `crypto.randomUUID()`,
`Intl.DateTimeFormat()` with `now`) inside the deterministic paths
listed in
[`docs/architecture/determinism.md` § Wall-clock readers](../../../docs/architecture/determinism.md#wall-clock-readers).
The full inventory of subsystems allowed to read wall-clock and
their backward / DST-jump behavior is canonical there; this task
makes the rule machine-enforceable.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/edge-cases-policy.md`](../../../docs/architecture/edge-cases-policy.md)

Inputs:
- `eslint.config.js` (host config)

Outputs:
- `eslint-rules/no-wall-clock.js`
- ESLint host wired so the rule runs against `src/engine/**`,
  `src/rules/**`, `src/content-runtime/**`, `src/net/webrtc/**`.

Owned Paths:
- `eslint-rules/no-wall-clock.js`

Owned Paths (shared):
- `eslint.config.js`

Dependencies:
- mvp.01-engine-core.05-eslint-rule-ban-math-random-and-floats-in-src-engine

Acceptance Criteria:
- `Date.now()`, `new Date()`, `performance.now()`,
  `crypto.randomUUID()` and `Intl.DateTimeFormat(..., { now: ... })`
  inside any of the in-scope folders raise an ESLint error citing
  this rule.
- A test fixture asserts the rule fires on each of the banned
  forms and stays silent inside `src/persistence/**`,
  `src/renderer/**`, and other allowed read sites.
- `npm run lint` exits non-zero on any violation.
- The rule message links to
  [`docs/architecture/determinism.md` § Wall-clock readers](../../../docs/architecture/determinism.md#wall-clock-readers).
- Shared path work on `eslint.config.js` is **additive only**: this
  task appends the new rule registration and the path-scoped
  override without rewriting the existing host config. The primary
  contract for `eslint.config.js` remains owned by
  `mvp.01-engine-core.05-eslint-rule-ban-math-random-and-floats-in-src-engine`.
  Reordering or removing existing rule entries from that file is
  out of scope here.

Verify:
- npm run lint
- npm test

Estimated Time:
- 2 hours
