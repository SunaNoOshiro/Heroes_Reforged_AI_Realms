# Dependency Policy

Canonical policy for any third-party package, GitHub Action, or
other supply-chain artifact entering the repo. Referenced by
[`AGENTS.md`](../../AGENTS.md) (which is exposed to Claude via the
`CLAUDE.md → AGENTS.md` symlink). AI agents adding a dependency
must consult this doc before opening a PR.

The repo's own license is **MIT** (see [`LICENSE`](../../LICENSE)
and `package.json#license`). Workflow-author rules — pinning,
permissions, runners — live in the sibling
[`build-policy.md`](./build-policy.md).

---

## 1. Allowed and denied SPDX licenses

A dependency may enter the production graph only if its SPDX
identifier appears in the **allowed** list. Anything in the
**denied** list is rejected; anything not on either list requires
explicit owner approval.

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
- Any custom-restrictive license that limits commercial use,
  derivative works, redistribution, or platform targets

**Allowed (dev-only — `devDependencies`):**

- The same allowed list above, plus
- `LGPL-3.0-only` / `LGPL-3.0-or-later` (acceptable as a dev tool
  when the binary runs at build time and is not statically linked
  into the shipped artifact).

Resolution rules:

- **Dual-licensed.** If `package.json#license` is an SPDX expression
  like `(MIT OR Apache-2.0)`, the dep is allowed if **either** side
  is on the allowed list.
- **Missing or vague license.** A dep whose `package.json#license`
  is missing, `UNLICENSED`, or `SEE LICENSE IN <file>` without a
  concrete SPDX identifier is rejected.

---

## 2. Dependency-add rubric

Before adding a new package, an agent or contributor must verify
**all** of the following:

- License is on the allowed list (production) or dev-allowed list
  (`devDependencies`).
- A release within the last **18 months**.
- **≥ 1,000 weekly downloads** on npm — or, for GitHub-hosted
  packages, **≥ 100 stargazers** and active issue traffic.
- **≥ 2 maintainers**, OR hosted under a recognized
  multi-maintainer org (Vercel, Microsoft, Google, Mozilla, Apache,
  Eclipse, OpenJS Foundation, etc.).
- Zero known **High** or **Critical** vulnerabilities at add time
  (`npm audit` confirms a clean tree).
- The dependency is the simplest option for the job. Prefer the
  standard library, prefer existing deps, and prefer one
  well-known package over chains of micro-modules.

If any rubric item fails, file an issue with the deviation
justified and request explicit owner approval before merging.

---

## 3. Lockfile and install policy

- `package-lock.json` is **always committed** at the repo root and
  must never be edited by hand.
- CI installs with
  `npm ci --prefer-offline --ignore-scripts --audit=false --no-fund`
  (see [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml)).
  `--ignore-scripts` is redundant given the committed
  [`.npmrc`](../../.npmrc) (`ignore-scripts=true`) but is kept
  explicit for grep-ability; `--audit=false` keeps audit in its
  own step (§ 4).
- `npm install` is **forbidden** in CI; it runs only in a
  developer's local working copy when adding or upgrading a
  package.
- Workspace packages declared in `package.json#workspaces`
  (currently `src/contracts/`) inherit the same root lockfile.

---

## 4. Audit cadence and CVE-response policy

- `npm audit --omit=dev --audit-level=high` runs as a dedicated
  step on every PR (see
  [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml)).
  A failing audit step **blocks merge**.
- The only allowed suppressions are: removing the offending dep,
  upgrading past the vulnerable range, or pinning a patched
  transitive version via `npm overrides` with a comment in
  `package.json` linking to the CVE.

Remediation SLAs from disclosure:

| Severity | Production deps | Notes |
|---|---|---|
| **High / Critical** | within **7 days** | also blocks merge via the audit step |
| **Medium** | within **30 days** | tracked separately; not merge-blocking |
| **Low / Informational** | next minor or patch upgrade | no dedicated SLA |

Cadence:

- Dependabot opens grouped weekly PRs (see
  [`.github/dependabot.yml`](../../.github/dependabot.yml)).
  Major-version PRs are reviewed individually.
- A monthly manual lockfile review runs on the same cadence as
  the implementation-readiness audit.

---

## 5. Removal policy

Dependencies may be removed at any time without ceremony. When a
dep is removed:

- Run `npm uninstall <pkg>` and commit the lockfile diff.
- Verify `npm run all` and `npm test` still pass.
- Remove any CI-gated audit suppressions or `overrides` entries
  that were specific to the removed dep.

---

## 6. SBOM and signing

SBOM emission and release signing are deferred until a bundler /
release artifact exists; see
[`build-policy.md`](./build-policy.md). Until then, the lockfile,
the audit step, and the Dependabot config above are the
authoritative supply-chain controls.

---

## 7. Verified by

- [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml) —
  runs `npm audit --omit=dev --audit-level=high` on every PR.
- [`.github/dependabot.yml`](../../.github/dependabot.yml) — opens
  grouped weekly PRs for `npm` and `github-actions`.
- [`scripts/check-action-pinning.mjs`](../../scripts/check-action-pinning.mjs) —
  rejects unpinned GitHub Actions.
- [`scripts/check-workflows.mjs`](../../scripts/check-workflows.mjs) —
  enforces explicit `permissions:` and bans `pull_request_target`
  without an allowlist comment.
- [`.npmrc`](../../.npmrc) — commits `ignore-scripts=true`, so no
  dep's postinstall hook runs at install time.
- [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs) —
  rejects bare `TBD`, `TODO`, `FIXME`, or `???` markers in
  canonical sources, so this policy doc cannot regress to a
  placeholder.
- [`LICENSE`](../../LICENSE) — the repo's own MIT license.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surfaces are claimed; this doc governs
  supply-chain policy only.
- **Schema: ✔** — No schema claims. SPDX list is policy, not a
  registered schema; no [`schema-matrix.md`](./schema-matrix.md)
  row applies.
- **Tasks: ⚠** — Owning task
  [`phase-2.13-build-pipeline.01`](../../tasks/phase-2/13-build-pipeline/01-dependency-policy-and-audit-pipeline.md)
  reads this doc First and forbids itself from rewriting §§ 1–5.
  All verifier scripts and config files referenced in §§ 3–4, 7
  exist on disk. See `## ⚠ Issues` for cross-file drift.

## ⚠ Issues

- **Symlink direction in the original was reversed.** The original
  said "via the `AGENTS.md → CLAUDE.md` symlink", but the on-disk
  symlink is `CLAUDE.md → AGENTS.md` (`AGENTS.md` is canonical;
  `CLAUDE.md` is the symlink target Claude reads). Rewrote the
  intro to state the correct direction. No code change implied.
- **`npm ci` flag list in § 3 was out of date.** The original
  specified `npm ci --prefer-offline --no-audit --no-fund`, but
  [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml)
  actually runs
  `npm ci --prefer-offline --ignore-scripts --audit=false --no-fund`
  (the `--audit=false` form replaced the deprecated `--no-audit`,
  and `--ignore-scripts` was added explicitly per the
  `phase-2.13-build-pipeline.01` task). Aligned the doc to the
  workflow and added the rationale inline. The workflow is
  canonical; no workflow change implied.
- **`.npmrc` comment references a § 8 that does not exist.**
  [`.npmrc`](../../.npmrc) line 12 says
  "explicit allowlisted natives are rebuilt via
  `scripts/install-trusted.sh`. See dependency-policy.md § 8" —
  but this doc has only seven sections, and `scripts/install-trusted.sh`
  does not exist on disk. Per Hard Prohibition D the audit cannot
  edit `.npmrc`; the `phase-2.13-build-pipeline.01` task (the
  primary owner of `.npmrc`) should either drop the dangling
  reference or add the missing § 8 + script.
- **`docs/architecture/INDEX.md` does not list this doc.** The
  "Decision and policy registers" cluster (entries 39–47) covers
  data, persistence, permissions, UGC, security, and trust
  boundaries, but omits supply-chain policy. The
  [`build-policy.md`](./build-policy.md) sync block already flags
  the same gap and proposes appending a 48–49 pair (`48.
  dependency-policy.md`, `49. build-policy.md`). Audit did not
  modify [`INDEX.md`](./INDEX.md) (Hard Prohibition D — never
  edit cross-checked files).
