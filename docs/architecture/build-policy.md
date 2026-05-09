# Build Policy

> Pairs with [`dependency-policy.md`](dependency-policy.md).

`dependency-policy.md` gates *what enters* the lockfile; this doc
gates *how CI workflows run*.

The full release-signing / SBOM / SLSA wiring is deferred until a
bundler and a first release artifact exist. The sections below cover
only what is enforced today.

---

## 1. Workflow-author rules

Every file under `.github/workflows/` MUST:

1. Declare an explicit top-level `permissions:` block before
   `jobs:`. Default to `permissions: contents: read` and grant
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
5. Avoid `pull_request_target`. Adopting it requires an
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
