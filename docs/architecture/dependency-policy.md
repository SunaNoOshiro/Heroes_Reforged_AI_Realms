# Dependency Policy

> Source plan:
> [`docs/implementation-plans/16-implementation-readiness-plan.md`](../implementation-plans/16-implementation-readiness-plan.md)
> (T3). Deeper SBOM / CVE-response wiring lives in
> [`docs/implementation-plans/30-dependencies-and-build-pipeline-plan.md`](../implementation-plans/30-dependencies-and-build-pipeline-plan.md).

This doc is the canonical policy for any third-party package, GitHub
Action, or other supply-chain artifact entering the repo. It is
referenced by [`AGENTS.md`](../../AGENTS.md) (and via the
`AGENTS.md → CLAUDE.md` symlink). AI agents adding a dependency must
consult this doc before opening a PR.

The repo's own license is **MIT** (see [`LICENSE`](../../LICENSE) and
`package.json#license`).

---

## 1. Allowed and denied SPDX licenses

A dependency may enter the production graph only if its SPDX identifier
appears in the **allowed** list. Anything in the **denied** list is
rejected; anything not on either list requires explicit owner approval.

**Allowed (production):**

- `MIT`
- `Apache-2.0`
- `BSD-2-Clause`
- `BSD-3-Clause`
- `ISC`
- `MPL-2.0`
- `0BSD`
- `Unlicense` (treat as public-domain dedication)
- `CC0-1.0` (assets only, never code)

**Denied:**

- `GPL-2.0-only`, `GPL-2.0-or-later`, `GPL-3.0-only`, `GPL-3.0-or-later`
- `LGPL-2.1-only`, `LGPL-2.1-or-later`, `LGPL-3.0-only`, `LGPL-3.0-or-later`
- `AGPL-3.0-only`, `AGPL-3.0-or-later`
- `SSPL-1.0`
- `BUSL-1.1` (Business Source License, all variants)
- Any "Commons Clause" or "ELv2" rider on top of an otherwise-allowed license
- Any custom-restrictive license that limits commercial use, derivative
  works, redistribution, or platform targets

**Allowed (dev-only — `devDependencies`):**

- The same allowed list above, plus
- `LGPL-3.0-only` / `LGPL-3.0-or-later` (acceptable as a dev tool when
  the binary is used at build time and not statically linked into the
  shipped artifact).

If a license is dual-licensed (e.g. `(MIT OR Apache-2.0)`), the
dependency is allowed if **either** identifier is in the allowed list.

A dependency whose `package.json#license` is missing, `UNLICENSED`, or
`SEE LICENSE IN <file>` without a clear SPDX identifier is rejected.

---

## 2. Dependency-add rubric

Before adding a new package, an agent or contributor must verify all of
the following:

- License is on the allowed list above (production) or dev-allowed
  list (devDependencies).
- Package has had a release within the last **18 months**.
- Package has **≥ 1,000 weekly downloads** on npm (or, for
  GitHub-hosted packages, ≥ 100 stargazers and active issue traffic).
- Package has **≥ 2 maintainers** OR is hosted under a recognized
  multi-maintainer org (Vercel, Microsoft, Google, Mozilla, Apache,
  Eclipse, OpenJS Foundation, etc.).
- Package has zero known **High** or **Critical** vulnerabilities at
  add time (`npm audit` confirms a clean tree).
- The dependency is the simplest option for the job. Prefer the
  standard library, prefer existing deps, and prefer one well-known
  package over chains of micro-modules.

If any rubric item fails, file an issue with the deviation justified
and request explicit owner approval before merging.

---

## 3. Lockfile and install policy

- `package-lock.json` is **always committed** at the repo root.
- CI installs with `npm ci --prefer-offline --no-audit --no-fund`.
  See [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml).
- `npm install` is **forbidden** in CI; it must only run in a
  developer's local working copy when adding or upgrading a package.
- `package-lock.json` must never be edited by hand.
- Workspace packages (e.g. `src/contracts/`) inherit the same lockfile.

---

## 4. Audit cadence and CVE-response policy

- `npm audit --omit=dev --audit-level=high` runs on every PR and on
  pushes to `main`. See [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml).
- A failing audit step **blocks merge**. Suppression is allowed only
  by removing the offending dep, upgrading past the vulnerable range,
  or applying an `npm overrides` pin to a patched transitive version
  with a comment in `package.json` linking to the CVE.
- **High and Critical CVEs**: must be remediated in production deps
  within **7 days** of disclosure.
- **Medium CVEs**: remediated within **30 days**.
- **Low / Informational CVEs**: remediated when the next minor or
  patch upgrade lands.
- Dependabot opens grouped weekly PRs (see
  [`.github/dependabot.yml`](../../.github/dependabot.yml)). Major-
  version PRs are reviewed individually.
- A monthly manual review of the lockfile happens during the same
  cadence as the implementation-readiness audit.

---

## 5. Removal policy

Dependencies may be removed at any time without ceremony. When a dep
is removed:

- Run `npm uninstall <pkg>` and commit the lockfile diff.
- Verify `npm run all` and `npm test` still pass.
- Remove any CI-gated audit suppressions or `overrides` entries that
  were specific to the removed dep.

---

## 6. SBOM and signing

SBOM emission and release signing are deferred until a bundler /
release artifact exists; see
[`30-dependencies-and-build-pipeline-plan.md`](../implementation-plans/30-dependencies-and-build-pipeline-plan.md)
§ 3.2. Until then, the lockfile + audit step + Dependabot config
above are the authoritative supply-chain controls.

---

## 7. Verified by

- `.github/workflows/validate.yml` runs `npm audit --omit=dev
  --audit-level=high` on every PR.
- `.github/dependabot.yml` opens grouped weekly PRs for `npm` and
  `github-actions`.
- [`scripts/check-action-pinning.mjs`](../../scripts/check-action-pinning.mjs)
  rejects unpinned GitHub Actions.
- [`scripts/check-workflows.mjs`](../../scripts/check-workflows.mjs)
  enforces explicit `permissions:` and bans `pull_request_target`
  without an allowlist comment.
- `.npmrc` commits `ignore-scripts=true` so no dep's postinstall
  hook runs at install time.
- [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  refuses bare `TBD`, `TODO`, `FIXME`, or `???` markers in canonical
  sources, so this policy doc cannot regress to a placeholder.
- The repo's own license is committed at [`LICENSE`](../../LICENSE).
