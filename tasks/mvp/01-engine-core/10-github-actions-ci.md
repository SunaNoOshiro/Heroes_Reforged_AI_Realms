# GitHub Actions CI

Status: planned

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Set up CI that runs on every push and PR: lint, type-check, unit tests, and the fuzz harness. Fail the PR if any step fails. Add a badge to the root README.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- All prior tasks merged

Outputs:
- `.github/workflows/ci.yml`
- Steps: `npm install` → `npm run -ws type-check` → `npm run lint` → `npm run -ws test` (includes fuzz)
- Badge in root `README.md`

Owned Paths:
- `.github/workflows/ci.yml`
- `README.md`

Dependencies:
- mvp.01-engine-core.09-fuzz-harness-1000-command-ai-vs-ai-determinism-test

Acceptance Criteria:
- CI passes on `main` after all M0 tasks are merged
- A deliberate `Math.random()` injection causes CI to fail at the lint step
- A deliberate state-mutation bug causes CI to fail at the fuzz step
- Total CI runtime < 3 minutes

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
