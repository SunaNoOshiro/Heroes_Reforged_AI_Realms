# Version pinning + action SHA-pinning + workflow hygiene

Status: done

Module: [Build Pipeline & Supply-Chain Hygiene (Phase 2)](../13-build-pipeline.md)

Description:
Land the today-relevant subset of
[`docs/implementation-plans/30-dependencies-and-build-pipeline-plan.md`](../../../docs/implementation-plans/30-dependencies-and-build-pipeline-plan.md).
Pre-implementation, most of the plan's release-signing / SBOM /
nightly-audit scaffolding is dormant. This task ships the parts
doing real work today: a committed `.npmrc` with
`ignore-scripts=true` and `save-exact=true`, version pinning
(`engines`, `packageManager`, `.nvmrc`), SHA-pinning of every
external GitHub Action, and two CI guards
(`check-action-pinning`, `check-workflows`) that prevent regression.
Release pipeline, SBOM, audit-allowlist, and Dockerfile-pinning
guards are deferred until the corresponding artifacts (bundler,
first release, first Dockerfile, first deferred CVE) actually exist.

Read First:
- [`docs/implementation-plans/30-dependencies-and-build-pipeline-plan.md`](../../../docs/implementation-plans/30-dependencies-and-build-pipeline-plan.md)
- [`docs/architecture/dependency-policy.md`](../../../docs/architecture/dependency-policy.md)
- [`docs/architecture/build-policy.md`](../../../docs/architecture/build-policy.md)
- [`SECURITY.md`](../../../SECURITY.md)

Inputs:
- Existing workflows under
  [`.github/workflows/`](../../../.github/workflows/) (validate,
  runtime, multiplayer-determinism, secret-scan).
- Existing
  [`dependency-policy.md`](../../../docs/architecture/dependency-policy.md).

Outputs:
- `.npmrc` (`save-exact`, `ignore-scripts`, `engine-strict`).
- `.nvmrc` (`22`).
- `engines.node` and `packageManager` fields in `package.json`.
- `scripts/check-action-pinning.mjs`,
  `scripts/check-workflows.mjs`.
- `validate:action-pinning` and `validate:workflows` scripts in
  `package.json`, chained into `npm run validate`.
- SHA-pinned `actions/*` references across every workflow.
- `docs/architecture/build-policy.md`.

Owned Paths:
- `.npmrc`
- `.nvmrc`
- `scripts/check-action-pinning.mjs`
- `scripts/check-workflows.mjs`
- `docs/architecture/build-policy.md`

Owned Paths (shared):
- `package.json` (primary owner:
  `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`;
  this task contributes `engines`, `packageManager`,
  `validate:action-pinning`, and `validate:workflows` only).
- `.github/workflows/validate.yml`,
  `.github/workflows/multiplayer-determinism.yml`,
  `.github/workflows/runtime.yml`,
  `.github/workflows/secret-scan.yml` (primary owner:
  `mvp.01-engine-core.10-github-actions-ci`; this task drops
  `NPM_CONFIG_AUDIT: false` from `env`, replaces `--no-audit`
  with `--ignore-scripts --audit=false` on `npm ci`, and pins
  every `uses:` line by 40-char SHA only).

Dependencies:
- None

Acceptance Criteria:
- `.npmrc` commits `save-exact=true`, `ignore-scripts=true`, and
  `engine-strict=true`.
- `package.json#engines.node` is `>=22.0.0 <23` and
  `packageManager` is pinned to an exact `npm@X.Y.Z`.
- Every `uses:` line under `.github/workflows/*.yml` matches
  `@<40-hex> #` and is rejected by
  `scripts/check-action-pinning.mjs` if it regresses.
- `scripts/check-workflows.mjs` rejects any workflow without an
  explicit top-level `permissions:` block, any self-hosted
  runner without an allowlist comment, and any
  `pull_request_target` without an allowlist comment.
- `npm audit --omit=dev --audit-level=high` runs on every PR;
  it no-ops while the lockfile is empty and gates merges once
  any dep lands.
- Shared-path work is additive only: this task must not rewrite
  `dependency-policy.md` §§ 1–5 nor the existing audit/validate
  steps in workflow files. The primary owner of `package.json` is
  `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`;
  the primary owner of each existing workflow file is
  `mvp.01-engine-core.10-github-actions-ci`.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
