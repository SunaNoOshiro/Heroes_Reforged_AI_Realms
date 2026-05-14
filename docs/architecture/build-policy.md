# Build Policy

> Pairs with [`dependency-policy.md`](dependency-policy.md).

`dependency-policy.md` gates *what enters* the lockfile; this doc
gates *how CI workflows run*. Release-signing / SBOM / SLSA wiring
is deferred until a bundler and a first release artifact exist;
the sections below cover only what is enforced today.

---

## 1. Workflow-author rules

Every file under `.github/workflows/` MUST:

1. Declare an explicit top-level `permissions:` block before
   `jobs:`. Default to `permissions: contents: read`; grant
   narrower scopes only on the job that needs them.
2. Pin every external action by 40-character commit SHA with a
   trailing `# vX.Y.Z` comment. Tag pins (`@v4`) are rejected by
   [`scripts/check-action-pinning.mjs`](../../scripts/check-action-pinning.mjs).
3. Pin `runs-on` to a specific Ubuntu LTS image
   (`ubuntu-24.04`) — `ubuntu-latest` silently rolls images.
4. Use only GitHub-hosted runners. Self-hosted runners require
   an explicit `# allow-self-hosted: <reason>` allowlist comment;
   without it
   [`scripts/check-workflows.mjs`](../../scripts/check-workflows.mjs)
   rejects the file.
5. Avoid `pull_request_target`. Adopting it requires both an
   `# allow-pull-request-target: <reason>` allowlist comment AND
   an `if: github.event.pull_request.head.repo.full_name ==
   github.repository` guard on every step that touches secrets.

---

## 2. CI logging hygiene

- Wrap every printed value derived from a secret in a GitHub
  `::add-mask::` directive on the line that produces it.
- Never `echo "$SECRET"` or pipe a secret through a logging
  command. Workflow logs are public for a public repo.

---

## 3. Verified by

- [`scripts/check-action-pinning.mjs`](../../scripts/check-action-pinning.mjs) —
  rejects unpinned actions in any `.github/workflows/*.yml`.
- [`scripts/check-workflows.mjs`](../../scripts/check-workflows.mjs) —
  enforces explicit `permissions:`, no self-hosted runners, no
  `pull_request_target` without an allowlist comment.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surfaces are claimed; this doc governs CI workflow authoring only.
- **Schema: ✔** — No schema claims; supply-chain scope only. Sibling [`dependency-policy.md`](./dependency-policy.md) owns the lockfile / SPDX / audit policy and back-references this file from §§ 6–7.
- **Tasks: ⚠** — Owning task [`phase-2.13-build-pipeline.01`](../../tasks/phase-2/13-build-pipeline/01-dependency-policy-and-audit-pipeline.md) lists `build-policy.md` in `Read First`, `Outputs`, and `Owned Paths`, and both verifiers (`scripts/check-action-pinning.mjs`, `scripts/check-workflows.mjs`) exist on disk. Rule 3 (`runs-on` pinning) is policy without a validator — see `## ⚠ Issues`.

## ⚠ Issues

- **Rule 3 has no enforcer and is currently violated.** The doc
  requires every workflow to pin `runs-on` to `ubuntu-24.04`, but
  [`scripts/check-workflows.mjs`](../../scripts/check-workflows.mjs)
  only scans for `self-hosted` and does not flag `ubuntu-latest`.
  Today [`.github/workflows/secret-scan.yml`](../../.github/workflows/secret-scan.yml)
  uses `runs-on: ubuntu-latest`, violating Rule 3 silently. Per
  the verified-by contract in § 3, either extend
  `check-workflows.mjs` with an `ubuntu-latest` rejection (and
  re-pin `secret-scan.yml` to `ubuntu-24.04`), or demote Rule 3 to
  a recommendation. Suggested owner:
  [`phase-2.13-build-pipeline.01`](../../tasks/phase-2/13-build-pipeline/01-dependency-policy-and-audit-pipeline.md)
  (the task that owns both this doc and `check-workflows.mjs`).
  Audit did not edit either file (Hard Prohibition D — never edit
  cross-checked files).
- **`docs/architecture/INDEX.md` lists neither this doc nor
  `dependency-policy.md`.** The "Decision and policy registers"
  cluster (entries 39–47) covers data, persistence, permissions,
  UGC, security, and trust boundaries, but omits supply-chain
  policy. Not CI-blocking — the index intro states it is
  selective — but `build-policy.md` is referenced from the task
  registry and from [`dependency-policy.md § 6`](./dependency-policy.md),
  so an implementer navigating via the index would miss it.
  Suggested values: append a 48–49 pair under the same cluster,
  e.g. `48. dependency-policy.md` and `49. build-policy.md`.
  Audit did not modify [`INDEX.md`](./INDEX.md) (Hard Prohibition D).
