# Implementation Report: 30 — Dependencies & Build-Pipeline Security

> Companion to
> [`docs/archive/implementation-plans/30-dependencies-and-build-pipeline-plan.md`](./30-dependencies-and-build-pipeline-plan.md).
> Records what was actually applied to the repository on 2026-05-05.

---

## Summary

Landed the today-relevant subset of the plan: version pinning,
postinstall-hook lockdown, action SHA-pinning across every
workflow, and two CI guards that prevent regression. Release
signing, SBOM emission, audit-allowlist, Dockerfile-pinning, and
the nightly audit workflow are intentionally deferred — they are
dormant scaffolding pre-bundler / pre-deps / pre-Dockerfile and
were cut to keep the repo simple.

`npm run all` is green and `npm test` reports 32 / 32 passing.

---

## What landed

### Version pinning

- [`.npmrc`](../../../.npmrc) — `save-exact=true`,
  `ignore-scripts=true`, `engine-strict=true`, `fund=false`,
  `audit=false`.
- [`.nvmrc`](../../../.nvmrc) — `22`, parity with CI.
- [`package.json`](../../../package.json) — `engines.node`
  `>=22.0.0 <23` and `packageManager` pinned to `npm@10.9.2`.

### CI guards (new validate steps)

Wired into `npm run validate`:

- [`scripts/check-action-pinning.mjs`](../../../scripts/check-action-pinning.mjs) —
  rejects any `uses:` line not pinned by 40-char SHA + trailing
  version comment.
- [`scripts/check-workflows.mjs`](../../../scripts/check-workflows.mjs) —
  rejects any workflow without an explicit top-level
  `permissions:` block, any self-hosted runner without an
  allowlist comment, any `pull_request_target` without an
  allowlist comment.

### Workflows

Every external action is now pinned by 40-character commit SHA
with a trailing `# vX.Y.Z` comment:

- [`.github/workflows/validate.yml`](../../../.github/workflows/validate.yml) —
  also dropped `NPM_CONFIG_AUDIT: false` from `env` and switched
  `npm ci` from `--no-audit` to `--ignore-scripts --audit=false`.
  The `npm audit --omit=dev --audit-level=high` step from Plan 16
  is preserved as a single inline step.
- [`.github/workflows/multiplayer-determinism.yml`](../../../.github/workflows/multiplayer-determinism.yml),
  [`.github/workflows/runtime.yml`](../../../.github/workflows/runtime.yml),
  [`.github/workflows/secret-scan.yml`](../../../.github/workflows/secret-scan.yml) —
  same SHA-pin and install-flag updates.

### Documentation

- [`docs/architecture/build-policy.md`](../../architecture/build-policy.md)
  *(new)* — workflow-author rules, CI logging hygiene, verified-by
  table.
- [`docs/architecture/dependency-policy.md`](../../architecture/dependency-policy.md) —
  refreshed § 7 *Verified by* to cite the new action-pinning and
  workflow-permission guards.

### Tasks

- [`tasks/phase-2/13-build-pipeline.md`](../../../tasks/phase-2/13-build-pipeline.md)
  *(new module)*.
- [`tasks/phase-2/13-build-pipeline/01-dependency-policy-and-audit-pipeline.md`](../../../tasks/phase-2/13-build-pipeline/01-dependency-policy-and-audit-pipeline.md)
  *(new task)* — Status: done.

---

## Deferred

Per the plan, these are intentionally not implemented yet:

- **Release pipeline** (`release.yml`, `CHANGELOG.md`,
  release-runbook, cosign keyless signing, CycloneDX SBOM,
  build-provenance attestation) — needs a bundler that doesn't
  exist. Add when the first taggable artifact lands.
- **Nightly audit workflow** (`audit.yml`) — duplicates
  `validate.yml`'s per-PR audit and finds nothing while the
  lockfile is empty. Add when production deps land.
- **Dockerfile-pinning guard** — no Dockerfiles exist. Add when
  the first one is committed.
- **Audit-allowlist** (`audit-allow.json` + schema +
  shape-checker) — no findings to defer yet. Add the file (with
  shape-checker) when the first time-boxed CVE acceptance is
  needed.
- **Trusted-package allowlist** (`install-trusted.sh`) — no
  native deps yet. Add when the first dep with a legitimate
  postinstall step is introduced.
- **`CODEOWNERS`** — single-developer repo; CODEOWNERS only adds
  value with multiple reviewers + branch protection that requires
  CODEOWNERS approval. Add when the second contributor joins.

---

## Verification

```sh
npm run all
npm test
```

Both succeed. `validate:action-pinning` and `validate:workflows`
are green; the action-pinning gate inspects all four committed
workflows and confirms every external action is pinned by SHA.

---

## Assumptions

- `packageManager` pinned to `npm@10.9.2` (default with Node 22
  LTS at the time this work landed).

---

## Blockers

None.
