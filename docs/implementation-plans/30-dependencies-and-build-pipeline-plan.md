# Implementation Plan: 30 — Dependency Vulnerabilities & Build Pipeline Security

> Source audit: [docs/readiness-audit/30-dependencies-and-build-pipeline.md](../readiness-audit/30-dependencies-and-build-pipeline.md)
> Audit AI-Readiness score at time of writing: **3 / 10** — target after this plan: **8 / 10**.
> The original audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic, and Risk item from Q619–Q644
> into concrete, executable work items grounded in existing artifacts:
> [`package.json`](../../package.json),
> [`package-lock.json`](../../package-lock.json),
> [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml),
> [`CONTRIBUTING.md`](../../CONTRIBUTING.md),
> [`AGENTS.md`](../../AGENTS.md),
> [`tsconfig.base.json`](../../tsconfig.base.json),
> [`services/ai-gateway/README.md`](../../services/ai-gateway/README.md),
> [`services/signaling/README.md`](../../services/signaling/README.md),
> [`docs/architecture/determinism.md`](../architecture/determinism.md),
> [`docs/readiness-audit/27-save-tampering-and-pack-signing.md`](../readiness-audit/27-save-tampering-and-pack-signing.md),
> and adjacent plans **24** (TLS / WSS), **25** (TURN + signaling abuse),
> **27** (save tampering & pack signing), **29** (rate limits & secret
> management), **31** (trust boundaries / logging / monitoring).

---

## 1. Overview

Audit 30 evaluated 26 questions (Q619–Q644) covering dependency
vulnerability management (Q619–Q630) and build-pipeline security
(Q631–Q644). **Of the 26, none are fully ✔; six are ⚠ Partial
(Q619, Q622, Q631, Q632, Q633, Q641, Q643); the remaining are ❌
UNKNOWN.**

The repository today is in a **rare lucky pre-implementation state**:

- zero declared `dependencies` and `devDependencies` in
  [`package.json`](../../package.json);
- a 10-line `package-lock.json` with no `packages[]` entries;
- a single CI workflow ([`.github/workflows/validate.yml`](../../.github/workflows/validate.yml))
  pinned to `ubuntu-24.04`, Node 22, and `permissions: contents: read`;
- `pull_request` (not `pull_request_target`) is the trigger, so fork
  PRs already cannot reach repository secrets.

…but it commits **nothing** about:

1. **Dependency-introduction policy** — license allow-list, maintainer
   threshold, scoped-package rule, postinstall review, native-dep
   policy (Q625, Q626, Q627, Q630).
2. **CVE / audit pipeline** — `NPM_CONFIG_AUDIT: false` + `--no-audit`
   are committed; no `osv-scanner`, `snyk`, `socket`, or Trivy fallback
   (Q620, Q624).
3. **Automated dep updates** — no `dependabot.yml`, no `renovate.json`
   (Q623).
4. **Version-pinning rules** — no `.npmrc save-exact=true`, no
   `engines`, no `packageManager` field (Q622, Q631).
5. **Postinstall hardening** — no `--ignore-scripts`, no `.npmrc`
   `ignore-scripts=true` (Q627).
6. **Polyfill / browserslist policy** — no committed bundle target,
   no polyfill staleness review (Q629).
7. **Native-dep CVE pipeline** — no `cargo audit`, no `oss-fuzz`,
   no native-binding-specific scan (Q630).
8. **SBOM / SLSA / provenance** — no `cyclonedx-npm`, no
   `slsa-github-generator`, no documented SLSA target (Q621, Q642).
9. **Release pipeline & signing** — no `release.yml`, no cosign /
   Sigstore, no `CHANGELOG.md`, no tags, no `gh release create`
   automation (Q635, Q644).
10. **Build / signing separation** — no dual-control split between
    "code that builds" and "code that signs" (Q640).
11. **Action SHA pinning** — `actions/checkout@v4` and
    `actions/setup-node@v4` are tag-pinned only (Q638).
12. **Container image digest pinning** — no `Dockerfile`, no
    `@sha256:` policy committed for future images (Q637).
13. **OIDC federation** — workflow does not declare `id-token: write`,
    no doc forbids long-lived `secrets.AWS_ACCESS_KEY_ID`-style
    credentials (Q639).
14. **Build determinism** — no `SOURCE_DATE_EPOCH`, no rebuild-and-
    diff parity with [`docs/architecture/determinism.md`](../architecture/determinism.md)
    gameplay determinism (Q636).
15. **Branch protection on `main`** — no `CODEOWNERS`, no committed
    commit-signing requirement (Q634).
16. **`SECURITY.md` / disclosure SLA** — no email, no triage timeline,
    no supported-versions table (Q628).
17. **Pre-commit / local secret scan** — no `.husky/`, no
    `lefthook.yml`, no `.pre-commit-config.yaml`, no `gitleaks`
    config in repo or CI (Q643).
18. **Build-log secret scrubbing** — no committed `::add-mask::`
    policy for derived tokens (Q641).
19. **CI hardening for future multi-job pipelines** — no committed
    rule against `pull_request_target`, no per-workflow least-priv
    permissions matrix (Q632, Q633).

A naive autonomous implementer landing the first runtime PR (likely
React + Vite + `@anthropic-ai/sdk` once
[Phase-2](../../tasks/phase-2/) or
[Phase-3](../../tasks/phase-3/) starts) would ship with no audit step,
no version pinning, no postinstall guard, and tag-pinned actions —
exactly the cold-start supply-chain risk Audit 30 calls out.

This plan formalizes:

1. **Two new docs** —
   [`SECURITY.md`](../../SECURITY.md) (CVE disclosure + SLA) and
   [`docs/architecture/dependency-policy.md`](../architecture/dependency-policy.md)
   (dep-introduction policy: license, maintainer, scope, postinstall,
   native, polyfill).
2. **A `.npmrc`** at repo root pinning `save-exact=true`,
   `ignore-scripts=true`, `engine-strict=true`.
3. **`engines` and `packageManager` fields** in `package.json`.
4. **A `.nvmrc`** (`22`) for parity with CI.
5. **A `.github/dependabot.yml`** covering `npm` and
   `github-actions` ecosystems with security-PR grouping.
6. **A `.github/CODEOWNERS`** giving review ownership of
   `services/`, `content-schema/`, `scripts/`, and
   `.github/workflows/` to a maintainers group.
7. **An updated [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml)** —
   actions SHA-pinned, an `audit` step staged behind a
   `has-deps` gate, gitleaks scan, and a one-time `--ignore-scripts`
   confirmation.
8. **A new [`.github/workflows/release.yml`](../../.github/workflows/release.yml)** —
   tag-triggered, separate `build` and `sign` jobs,
   `permissions: id-token: write`, OIDC keyless cosign signing,
   CycloneDX SBOM emission, SLSA 3 provenance via
   `slsa-github-generator`, `CHANGELOG.md` enforcement.
9. **A new [`.github/workflows/audit.yml`](../../.github/workflows/audit.yml)** —
   nightly `osv-scanner` + `npm audit --audit-level=high` + gitleaks
   sweep on `main`, opens an issue on findings.
10. **A new local pre-commit layer** under
    [`.husky/`](../../.husky/) (or `lefthook.yml`) running
    `npm run validate:tasks` + `gitleaks protect --staged`, mirrored
    in CI.
11. **Two new tasks** added under
    [`tasks/phase-2/`](../../tasks/phase-2/) (or `tasks/mvp/` if a
    pipeline-foundations milestone exists) — one for the dep policy
    + audit pipeline, one for the release / signing pipeline.
12. **Coordination link with [Plan 27](./27-save-tampering-and-pack-signing-plan.md)**
    so pack-signing and release-signing key custody share one design.

---

## 2. Critical Fixes (Must Do First)

These are the items that flip from "vacuously safe" to "actively
shipping with no guardrail" the moment the **first runtime PR** lands.
They MUST land before — or in the same merge window as — that PR.

### Issue: Cold-start audit gate

**Source:** Q620, Q624, summary risk #1 ("Cold-start supply-chain
risk").

**Problem:**
[`.github/workflows/validate.yml`](../../.github/workflows/validate.yml)
sets `NPM_CONFIG_AUDIT: false` and runs
`npm ci --prefer-offline --no-audit --no-fund`. There is no
fallback scanner. The first PR introducing a runtime dep flows in
with **zero** transitive vulnerability checks.

**Impact:**
Any vulnerable transitive (e.g., a known prototype-pollution chain)
ships into the engine, signaling server, or AI gateway invisibly.
Once tooling is calcified into "we never ran audit", retrofitting
becomes a multi-PR cleanup.

**Solution:**
Stage an audit step that **no-ops when `package.json` declares no
deps** and **fails the build at `--audit-level=high` once deps land**.
Add `osv-scanner` as a second voice (catches advisories `npm audit`
misses). Remove `NPM_CONFIG_AUDIT: false` and the `--no-audit` flag
from the install step at the same time.

**Files to Update:**
- [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml)
  — drop `NPM_CONFIG_AUDIT: false`, drop `--no-audit`, add
  `Dependency audit` step.
- [`package.json`](../../package.json) — add scripts
  `audit:npm` (`npm audit --omit=dev --audit-level=high`) and
  `audit:osv` (`osv-scanner --lockfile package-lock.json`).

**New Files (if needed):**
- [`.github/workflows/audit.yml`](../../.github/workflows/audit.yml)
  — nightly cron + `workflow_dispatch`, runs both scanners on
  `main`, opens an issue tagged `security/cve` on findings.

**Implementation Steps:**
1. Add `audit:npm` and `audit:osv` scripts in `package.json`. Have
   each script `exit 0` early when `package-lock.json` has no
   `packages[]` entries (use a tiny `node -e` guard so it stays a
   no-op pre-deps).
2. In `validate.yml`, after `npm ci`, add a `Dependency audit` step
   running `npm run audit:npm && npm run audit:osv`.
3. Delete `NPM_CONFIG_AUDIT: false` from `env:`. Replace
   `--no-audit` on the install command with the explicit
   `--audit=false` (kept transitionally to silence install-time
   noise) so audit lives in its own step, not the install.
4. Create `audit.yml` with `schedule: cron: '0 6 * * *'` UTC,
   running `osv-scanner --lockfile=package-lock.json` and opening an
   issue on non-zero exit.
5. Document the threshold (`high`) and the override path
   (`audit-allow.json` listing time-boxed accepted CVEs with an
   expiry date) in
   [`docs/architecture/dependency-policy.md`](../architecture/dependency-policy.md).

**Dependencies:**
- New `dependency-policy.md` (below) for the override path.

**Complexity:** **M**

---

### Issue: Postinstall scripts run unsandboxed in CI

**Source:** Q627, summary risk #1.

**Problem:**
`npm ci --prefer-offline --no-audit --no-fund` runs **without**
`--ignore-scripts`. No `.npmrc` is committed, so
`ignore-scripts=true` is not on globally. Any future dep can ship a
postinstall hook that touches the runner FS, exfiltrates env, or
writes to `~/.npmrc`.

**Impact:**
A single typosquatted or compromised transitive (the
[`event-stream`](https://github.com/dominictarr/event-stream)
class of incident) gains code-exec on every PR run.

**Solution:**
Commit a repo-root [`.npmrc`](../../.npmrc) with
`ignore-scripts=true`. Add a vetted-allowlist mechanism for the
narrow set of deps that legitimately need a build step (e.g.,
`esbuild`, `sharp`). The allowlist lives in
[`docs/architecture/dependency-policy.md`](../architecture/dependency-policy.md)
and a `scripts/install-trusted.sh` runs the targeted
`npm rebuild <pkg>` per allowlisted entry.

**Files to Update:**
- [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml)
  — add `--ignore-scripts` to `npm ci` (redundant once `.npmrc`
  is committed, but explicit for grep-ability).
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — document the
  trusted-package allowlist override path.

**New Files (if needed):**
- [`.npmrc`](../../.npmrc) — `save-exact=true\nignore-scripts=true\nengine-strict=true\nfund=false\naudit=false` (audit lives in the dedicated step).
- `scripts/install-trusted.sh` — invoked after `npm ci` to
  `npm rebuild` only the allowlisted natives.

**Implementation Steps:**
1. Write `.npmrc` with the four flags above.
2. Update `validate.yml` install step to
   `npm ci --prefer-offline --ignore-scripts` and immediately run
   `bash scripts/install-trusted.sh` (no-op until the allowlist
   has any entry).
3. Add a `dependency-policy.md` section listing the allowlist
   schema (`{ "name": "esbuild", "reason": "build tool, signed
   tarball", "owner": "@maintainers/build", "expires": "2027-01-01" }`).
4. Add a CI guard in `scripts/check-repo-contracts.mjs` (or a new
   `scripts/check-trusted-allowlist.mjs`) that cross-references the
   allowlist with `dependency-policy.md` and rejects orphans.

**Dependencies:**
- `dependency-policy.md` (must exist for the allowlist anchor).

**Complexity:** **S**

---

### Issue: Actions tag-pinned, not SHA-pinned

**Source:** Q638, summary risk #2 ("Tag-pin drift").

**Problem:**
[`.github/workflows/validate.yml`](../../.github/workflows/validate.yml)
references `actions/checkout@v4` and `actions/setup-node@v4`. A
maintainer-account compromise on either action can push a malicious
`v4.x.y` that flows into this repo silently on the next run.

**Impact:**
Single-commit upstream supply-chain compromise reaches `main` with
no review surface.

**Solution:**
Pin every external action by 40-char SHA with the version tag in a
trailing comment. Enable Dependabot's `github-actions` ecosystem so
SHA bumps come as auditable PRs. Add a CI guard that fails any PR
introducing an action without a SHA.

**Files to Update:**
- [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml)
  — replace `@v4` with `@<sha> # v4.x.y` for both actions.

**New Files (if needed):**
- [`.github/dependabot.yml`](../../.github/dependabot.yml) — covers
  `github-actions` and `npm`.
- `scripts/check-action-pinning.mjs` — fails on unpinned actions
  in any `.github/workflows/*.yml`; wired into `npm run validate`.

**Implementation Steps:**
1. Resolve current `actions/checkout@v4` and
   `actions/setup-node@v4` to their commit SHAs. Replace tags in
   `validate.yml`.
2. Write `dependabot.yml` with two ecosystems
   (`npm`, `github-actions`), `interval: weekly`, label
   `dependencies` + `security`, group `security-updates` together.
3. Implement `check-action-pinning.mjs` to walk
   `.github/workflows/*.yml`, parse `uses:` lines, and reject any
   that don't match `/@[a-f0-9]{40} #/`.
4. Add a step `node scripts/check-action-pinning.mjs` to the
   `validate` script in `package.json`, between
   `validate:cross-refs` and `validate:tasks`.

**Dependencies:**
- None.

**Complexity:** **S**

---

### Issue: No `SECURITY.md` / disclosure channel

**Source:** Q628, Q634, summary missing-logic #7.

**Problem:**
No top-level `SECURITY.md`, no
`.github/SECURITY.md`. External researchers have no triage email,
no PGP key, no SLA. No commit-signing or `CODEOWNERS` requirement
is committed, and branch-protection state lives only in GitHub
settings.

**Impact:**
A disclosed vulnerability has no canonical reporting path and no
patch-time guarantee. The first-mover incident is then handled in
an ad-hoc thread with unbounded blast radius.

**Solution:**
Land a `SECURITY.md` with: contact email (or
`security-advisories` GitHub link), supported versions table (will
be empty until a release exists — note that explicitly), CVE-triage
SLA (critical ≤ 7 days, high ≤ 30 days, medium ≤ 90 days, low
best-effort), and a public-disclosure window (90-day default).
Land a `CODEOWNERS` covering `services/`, `content-schema/`,
`scripts/`, and `.github/workflows/`. Document branch-protection
expectations in `CONTRIBUTING.md` so it survives admin turnover.

**Files to Update:**
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — add a "Branch
  Protection & Commit Signing" section (≥1 review,
  `validate.yml` required, `CODEOWNERS` enforced, signed
  commits required after a stated cutoff date).

**New Files (if needed):**
- [`SECURITY.md`](../../SECURITY.md)
- [`.github/CODEOWNERS`](../../.github/CODEOWNERS)

**Implementation Steps:**
1. Draft `SECURITY.md` with: email
   `security@<placeholder-domain>` (left as `<TODO>` until the
   maintainer chooses one), GitHub Security Advisories link, SLA
   table, supported-versions stub, PGP fingerprint placeholder.
2. Write `.github/CODEOWNERS` mapping
   `services/* @maintainers`,
   `content-schema/* @schema-owners`,
   `scripts/* @tooling-owners`,
   `.github/workflows/* @maintainers @security-owners`.
   Use generic group names (the repo is single-author today;
   teams are populated when the org exists).
3. Add a "Branch Protection" section to `CONTRIBUTING.md` listing
   the GitHub-side rules an admin must apply: require signed
   commits, require `validate` workflow success, require ≥1 review,
   require `CODEOWNERS` ownership, dismiss stale reviews, no
   force-push to `main`.
4. Cross-link `SECURITY.md` from `README.md` and `AGENTS.md`.

**Dependencies:**
- None.

**Complexity:** **S**

---

## 3. System Improvements

Grouped by system. Each item lists `Source`, `Solution`, files,
steps, dependencies, and complexity at the granularity above for
critical fixes; lower-priority items use a more compact form.

### 3.1 Dependency Policy & Tooling

#### Issue: No dependency-introduction policy

**Source:** Q625, Q626, Q629, Q630, summary missing-logic #6.

**Problem:**
[`CONTRIBUTING.md`](../../CONTRIBUTING.md) and
[`AGENTS.md`](../../AGENTS.md) are silent on license allow-list,
maintainer threshold, scoped-package rule, postinstall review,
native-dep policy, and polyfill staleness. The package itself is
unscoped (`"name": "heroes-reforged-ai-realms"`).

**Impact:**
Any future PR can add an unscoped, single-maintainer, GPL-licensed
package with active postinstall scripts; nothing in the contracts
folder rejects it.

**Solution:**
Single-page
[`docs/architecture/dependency-policy.md`](../architecture/dependency-policy.md)
covering:

1. **License allow-list**: MIT, Apache-2.0, BSD-2-Clause,
   BSD-3-Clause, ISC, MPL-2.0 (with file-level isolation rule),
   Unlicense, CC0. Anything else requires a `dep-policy-exception`
   PR with legal review.
2. **Maintainer threshold**: ≥ 2 active maintainers OR ≥ 50k
   weekly downloads OR a Tier-1 vendor (Microsoft, Vercel,
   Anthropic, Google, AWS). Otherwise the dep is vendored
   under `vendor/` or replaced.
3. **Scoped-package rule**: prefer `@scope/name` over unscoped to
   reduce typosquat risk. The repo's own future packages publish
   under `@heroes-reforged/...` (claim the namespace early — see
   Q626).
4. **Postinstall review**: any dep with `scripts.postinstall` /
   `preinstall` / `install` requires explicit allowlist in
   `.npmrc`-paired `scripts/install-trusted.sh`.
5. **Native-dep policy**: any package shipping `binding.gyp`,
   `*.node`, `*.wasm`, or Rust crates requires a separate `cargo
   audit` (for Rust) or memory-safety review note in the PR
   description, plus an entry in the `audit-allow.json` review
   trail.
6. **Polyfill / browserslist policy**: target `ES2022+` (modern
   evergreen browsers); `core-js` and analogous polyfill packs
   are forbidden unless an explicit `browserslist` carve-out is
   reviewed. Added when bundler lands; cited in
   [`tsconfig.base.json`](../../tsconfig.base.json).
7. **Override path**: `audit-allow.json` for time-boxed CVE
   exceptions (max 30 days), reviewed weekly.

**Files to Update:**
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — link to the new
  policy from the "Before You Start" section.
- [`AGENTS.md`](../../AGENTS.md) — add a "Adding a Dependency"
  one-liner pointing AI agents at the policy.
- [`docs/architecture/`](../architecture/) — index update if a
  TOC exists.

**New Files (if needed):**
- [`docs/architecture/dependency-policy.md`](../architecture/dependency-policy.md)
- [`audit-allow.json`](../../audit-allow.json) (empty array `[]`
  initially with a `$schema` field).
- [`audit-allow.schema.json`](../../audit-allow.schema.json) under
  `content-schema/` if the repo's contract-validator should enforce
  shape.

**Implementation Steps:**
1. Draft `dependency-policy.md` with the seven sections above.
2. Add `audit-allow.json` with `[]`.
3. Wire `scripts/check-repo-contracts.mjs` to validate
   `audit-allow.json` against
   `audit-allow.schema.json` (each entry must have
   `cve`, `package`, `reason`, `owner`, `expires` (ISO date,
   ≤ 30 days from `now`)).
4. Cross-link from `CONTRIBUTING.md`, `AGENTS.md`, and the new
   `SECURITY.md`.

**Dependencies:**
- `SECURITY.md` (cross-referenced).

**Complexity:** **M**

---

#### Issue: No version pinning policy / no `engines` / no `packageManager`

**Source:** Q622, Q631, summary improvement #3.

**Problem:**
No `.npmrc save-exact=true`, no `engines` field, no
`packageManager` field, no `.nvmrc`. Local devs may drift from
CI's Node 22 minor; future direct deps may use caret/tilde ranges.

**Impact:**
Caret ranges allow silent minor-version drift across PRs;
`.nvmrc` absence means a contributor on Node 20 sees inscrutable
errors that pass CI; lack of `packageManager` allows yarn/pnpm
mixing that corrupts the lockfile.

**Solution:**
Commit `.npmrc` (Critical Fix above), add `engines`,
`packageManager`, and `.nvmrc`.

**Files to Update:**
- [`package.json`](../../package.json) — add
  `"engines": { "node": ">=22.0.0 <23" }` and
  `"packageManager": "npm@<exact-version>"` (use `npm --version`
  output from current Node 22 LTS; e.g., `npm@10.9.2`).

**New Files (if needed):**
- [`.nvmrc`](../../.nvmrc) — single line: `22`.

**Implementation Steps:**
1. Read current `npm --version` from a Node 22 LTS install; commit
   that as `packageManager`.
2. Add `engines.node` with the exact minor cap to keep us on a
   single LTS major.
3. Add `.nvmrc` with `22`.
4. Update `validate.yml` to honor `packageManager` (Corepack);
   add a `corepack enable` step before `npm ci`.

**Dependencies:**
- None.

**Complexity:** **S**

---

#### Issue: No automated dep-update bot

**Source:** Q623, summary improvement #2.

**Problem:**
No `.github/dependabot.yml`, no `renovate.json`. Supply-chain
freshness depends on manual review.

**Impact:**
Once deps land, they age silently; CVE-fix PRs do not auto-open;
the cost of catching up grows linearly with time.

**Solution:**
Land [`.github/dependabot.yml`](../../.github/dependabot.yml) covering
both `npm` (when deps exist) and `github-actions` (immediately
useful for SHA bumps from Q638).

**Files to Update:**
- None until creation.

**New Files (if needed):**
- [`.github/dependabot.yml`](../../.github/dependabot.yml).

**Implementation Steps:**
1. Two `updates:` blocks: `npm` (weekly, group security PRs),
   `github-actions` (weekly, group all minor/patch).
2. Set `open-pull-requests-limit: 10` per ecosystem.
3. Set `commit-message.prefix: "deps"` to match repo conventions.
4. Add `reviewers: ["@security-owners"]` (the placeholder team
   from `CODEOWNERS`).
5. Add `labels: ["dependencies", "security"]` for triage.

**Dependencies:**
- `.github/CODEOWNERS` (for reviewer team).

**Complexity:** **S**

---

### 3.2 Build Pipeline Hardening

#### Issue: No SHA-pinned build container policy

**Source:** Q637.

**Problem:**
No `Dockerfile` exists, but no committed policy mandates
`@sha256:<digest>` pinning when one lands (e.g., for the
signaling server in
[`services/signaling/`](../../services/signaling/) or asset
pipeline).

**Impact:**
A `node:22-bookworm` tag swap on Docker Hub silently changes the
build; combined with no SBOM, the change is undetectable.

**Solution:**
Append a "Container Image Pinning" section to
`dependency-policy.md` (or a new
[`docs/architecture/build-policy.md`](../architecture/build-policy.md))
requiring `FROM image@sha256:...` for every base image, with the
human-readable tag in a trailing comment. Add a CI guard
(`scripts/check-dockerfile-pinning.mjs`) that walks any
`**/Dockerfile` and rejects un-digested `FROM` lines.

**Files to Update:**
- `package.json` — add `validate:dockerfiles` script and chain it
  into `validate`.

**New Files (if needed):**
- [`docs/architecture/build-policy.md`](../architecture/build-policy.md)
  (or section in `dependency-policy.md`).
- `scripts/check-dockerfile-pinning.mjs`.

**Implementation Steps:**
1. Write the policy section: every `FROM` must have
   `@sha256:<64-char-hex>` and a trailing
   `# <repo>:<tag> updated YYYY-MM-DD`.
2. Implement the guard: glob `**/Dockerfile`,
   `**/*.dockerfile`; reject any `^FROM\s+\S+(?!@sha256:)`.
3. Wire into `npm run validate`.

**Dependencies:**
- None.

**Complexity:** **S**

---

#### Issue: No release pipeline / no signing / no SBOM / no SLSA

**Source:** Q621, Q635, Q636, Q639, Q640, Q642, Q644.

**Problem:**
No `release.yml`, no cosign/Sigstore, no SBOM emission, no SLSA
target, no `CHANGELOG.md`, no tags, no `gh release create`
automation, no OIDC federation. Build and signing run as one
implicit step (no dual-control). No reproducible build story.

**Impact:**
The first release artifact is unsigned, has no provenance, no
bill-of-materials, and is built by whatever environment the
maintainer happens to use. A tampered build is undetectable and
cannot be reconciled against a chain of trust.

**Solution:**
Land [`.github/workflows/release.yml`](../../.github/workflows/release.yml)
**before** the first tag. Reuse Plan 27's pack-signing key custody
design — see
[Plan 27](./27-save-tampering-and-pack-signing-plan.md) — so
release-signing keys and pack-signing keys share one HSM /
keyless-signing model and one rotation schedule.

The workflow has **two jobs**:

1. **`build`** —
   - `permissions: contents: read, id-token: write`,
   - reproducible build via `SOURCE_DATE_EPOCH=$(git log -1
     --format=%ct)` (Q636),
   - emits `dist/` artifacts,
   - runs `npx @cyclonedx/cyclonedx-npm --output-file
     dist/sbom.cdx.json` (Q621),
   - uploads `dist/` + `sbom.cdx.json` as a job artifact,
   - **no signing key access**.

2. **`sign`** — depends on `build`,
   - `permissions: contents: write, id-token: write`,
   - downloads the build artifact,
   - calls `cosign sign-blob --yes --output-signature
     dist/<artifact>.sig --output-certificate
     dist/<artifact>.pem dist/<artifact>` using OIDC keyless
     (Sigstore) (Q635),
   - calls `slsa-github-generator/.github/workflows/generator_generic_slsa3.yml`
     for SLSA 3 provenance (Q642),
   - calls `gh release create v$VERSION --generate-notes
     dist/*` to publish (Q644).

The two-job split is the dual-control of Q640 — the `build`
job can produce arbitrary artifacts but cannot sign; the `sign`
job has key access but cannot rebuild.

OIDC federation (Q639) is enforced because **no `secrets.*` keys
are used**; cosign exchanges the GitHub OIDC token for a
short-lived Fulcio cert.

**Files to Update:**
- [`README.md`](../../README.md) — add a "Release Process"
  section linking to the new workflow.
- `.github/CODEOWNERS` — add `release.yml` to the security-owner
  list.

**New Files (if needed):**
- [`.github/workflows/release.yml`](../../.github/workflows/release.yml).
- [`CHANGELOG.md`](../../CHANGELOG.md) (Keep-a-Changelog format).
- [`docs/operations/release-runbook.md`](../operations/release-runbook.md)
  — step-by-step for a maintainer cutting a release: bump version,
  update CHANGELOG, push tag, watch workflow, verify
  `cosign verify-blob`.

**Implementation Steps:**
1. Write `CHANGELOG.md` with `Unreleased` header only.
2. Scaffold `release.yml` with `on: { push: { tags: ['v*'] }
   }`, two jobs, OIDC perms.
3. Implement reproducible build flag in the `build` job.
4. Add `cyclonedx-npm` install + SBOM emission.
5. Add `cosign sign-blob` keyless signing in the `sign` job.
6. Reference the SLSA 3 reusable workflow.
7. Add `gh release create` with `dist/*` glob upload.
8. Write `release-runbook.md` covering the maintainer side and
   the verifier side (`cosign verify-blob --certificate-identity
   ... --certificate-oidc-issuer https://token.actions.githubusercontent.com`).
9. Cross-link Plan 27 — pack-signing and release-signing share
   the keyless-Sigstore model so a single OIDC identity
   (`@heroes-reforged/release-signer`) governs both.

**Dependencies:**
- `SECURITY.md` (links to disclosure path from runbook).
- Plan 27 design alignment for shared key custody.
- A first taggable artifact actually exists (i.e., bundler has
  landed); the workflow can be committed earlier as scaffolding
  and gated behind `if: false` until a release is wanted.

**Complexity:** **L**

---

#### Issue: No build-log secret-scrubbing policy

**Source:** Q641.

**Problem:**
No committed rule on `::add-mask::` for derived secrets; no log
retention guidance; no policy preventing `pull_request_target`
adoption that would expose env to fork PRs.

**Impact:**
Once OIDC tokens or rotated derived secrets enter logs (e.g., a
short-lived AWS STS token printed by an SDK), they become
publicly indexed via the GitHub Actions log retention window.

**Solution:**
Append a "CI Logging Hygiene" section to
`docs/architecture/build-policy.md` (or
`dependency-policy.md`) covering:

1. Always wrap derived secret printing in `::add-mask::`.
2. Forbid `pull_request_target` without an explicit
   security-owner review and an `if:
   github.event.pull_request.head.repo.full_name ==
   github.repository` guard on every step that touches secrets.
3. Set workflow `defaults.run.shell: bash` and `set -u` to make
   unbound secrets fail loudly.
4. Add a CI guard `scripts/check-workflows.mjs` that rejects
   `pull_request_target` triggers without an explicit allowlist
   comment.

**Files to Update:**
- `package.json` — add `validate:workflows` script.
- All future `.github/workflows/*.yml` — comply.

**New Files (if needed):**
- `scripts/check-workflows.mjs`.

**Implementation Steps:**
1. Write the policy section.
2. Implement `check-workflows.mjs` to walk
   `.github/workflows/*.yml` and reject unsanctioned triggers.
3. Wire into `validate`.

**Dependencies:**
- None.

**Complexity:** **S**

---

### 3.3 CI Hardening (Existing Single-Job Workflow)

#### Issue: CI runner hardening relies on defaults, not committed rules

**Source:** Q632, Q633.

**Problem:**
Today `validate.yml` is correctly set to `permissions: contents:
read` and runs as a single GitHub-hosted job. There is no
**committed rule** that future workflows must (a) declare explicit
`permissions:` blocks at the workflow or job level, (b) refuse
self-hosted runners, (c) refuse `pull_request_target` without
review.

**Impact:**
A second workflow lands with default `permissions: write-all`
inherited from repo settings; least-privilege erodes silently.

**Solution:**
Codify the rule in `docs/architecture/build-policy.md`. Enforce
via `scripts/check-workflows.mjs` (above): reject any workflow
without an explicit top-level `permissions:` block; reject any
self-hosted runner label; reject any
`pull_request_target` without the allowlist comment.

**Files to Update:**
- `docs/architecture/build-policy.md` (or
  `dependency-policy.md`).

**New Files (if needed):**
- (Reuses `scripts/check-workflows.mjs` from above.)

**Implementation Steps:**
1. Extend `check-workflows.mjs` rules.
2. Document in `build-policy.md`.
3. Cross-link from `CONTRIBUTING.md` PR checklist.

**Dependencies:**
- Build-log hygiene rule (same file).

**Complexity:** **S**

---

### 3.4 Local Developer Layer

#### Issue: No pre-commit hooks / no local secret scan

**Source:** Q643, summary improvement #9.

**Problem:**
No `.husky/`, no `lefthook.yml`, no `.pre-commit-config.yaml`. No
`gitleaks` config in repo or CI. Devs must remember
`npm run validate && npm test`. Server-side `validate` runs on
every PR (good), but secret leakage is checked nowhere.

**Impact:**
A dev commits `.env` with a real provider key; pushes; the key is
public; the workflow run still passes because it does not scan.
GitHub's push-protection (paid GHAS) is not committed-state.

**Solution:**
Land `lefthook.yml` (preferred over husky — single binary, no
node-modules dependency, runs `gitleaks` natively). Pre-commit
runs:

1. `npm run validate:tasks` — fast subset of validation.
2. `gitleaks protect --staged --redact`.

Mirror the `gitleaks` scan in CI (`audit.yml` or as a step in
`validate.yml`) so devs without the local hook still get caught.

**Files to Update:**
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — "Setup" section
  documents `lefthook install`.
- `package.json` — add a
  `"prepare": "lefthook install || true"` script so
  `npm install` (when it exists) installs the hook.
- [`.gitignore`](../../.gitignore) — already excludes typical
  secrets per Plan 29; verify and reinforce
  (`.env`, `.env.*`, `*.pem`, `*.key`, `id_rsa*`, `id_ed25519*`).

**New Files (if needed):**
- [`lefthook.yml`](../../lefthook.yml).
- [`.gitleaks.toml`](../../.gitleaks.toml) — extends default
  rules with project-specific allowlist (e.g., the hardcoded
  Ed25519 **public** key from
  [Plan 27](./27-save-tampering-and-pack-signing-plan.md) is
  not a secret — allowlist its fingerprint).

**Implementation Steps:**
1. Write `lefthook.yml` with a `pre-commit` group running both
   commands.
2. Write `.gitleaks.toml` extending defaults; allowlist the Ed25519
   public key fingerprint and any deliberate test fixtures.
3. Add a `gitleaks-scan` step to `audit.yml` (full-history weekly
   sweep) and to `validate.yml` (`gitleaks detect --source . --no-banner --redact` on the PR diff only, fast).
4. Document in `CONTRIBUTING.md`: install lefthook (
   `brew install lefthook` / `go install github.com/evilmartians/lefthook@latest`)
   then `lefthook install`.

**Dependencies:**
- Plan 29 (`.gitignore` secret-shape coverage).

**Complexity:** **M**

---

## 4. Suggested Task Breakdown

Convert the issues above into trackable tasks. Two new task files
land under
[`tasks/phase-2/`](../../tasks/phase-2/) (or `tasks/mvp/` if
that milestone is preferred for foundations); keep them small and
self-contained.

- [ ] **`tasks/phase-2/<n>-build-pipeline/01-dependency-policy-and-audit-pipeline.md`** —
  ships [`SECURITY.md`](../../SECURITY.md),
  [`docs/architecture/dependency-policy.md`](../architecture/dependency-policy.md),
  [`.npmrc`](../../.npmrc),
  [`.nvmrc`](../../.nvmrc),
  [`.github/dependabot.yml`](../../.github/dependabot.yml),
  [`.github/CODEOWNERS`](../../.github/CODEOWNERS),
  `engines` + `packageManager` in `package.json`,
  `audit-allow.json` (+ schema), `scripts/check-action-pinning.mjs`,
  `scripts/check-dockerfile-pinning.mjs`,
  `scripts/check-workflows.mjs`, the SHA-pin migration of
  `validate.yml`, and the `audit:npm` / `audit:osv` steps.
  Closes Q620, Q622, Q623, Q624, Q625, Q626, Q627, Q628, Q629,
  Q630, Q631, Q632, Q633, Q637, Q638, Q641. **Complexity: L.**
- [ ] **`tasks/phase-2/<n>-build-pipeline/02-release-pipeline-with-cosign-sbom-slsa.md`** —
  ships [`.github/workflows/release.yml`](../../.github/workflows/release.yml)
  with split `build` + `sign` jobs, OIDC keyless cosign, CycloneDX
  SBOM, SLSA 3 provenance, `CHANGELOG.md`, and
  `docs/operations/release-runbook.md`. Cross-references
  [Plan 27](./27-save-tampering-and-pack-signing-plan.md) for
  shared key custody. Closes Q621, Q635, Q636, Q639, Q640, Q642,
  Q644. **Complexity: L.**
- [ ] **`tasks/phase-2/<n>-build-pipeline/03-pre-commit-and-secret-scan.md`** —
  ships [`lefthook.yml`](../../lefthook.yml),
  [`.gitleaks.toml`](../../.gitleaks.toml),
  `gitleaks-scan` steps in `validate.yml` + `audit.yml`,
  CONTRIBUTING setup section, `prepare` script in `package.json`.
  Closes Q643. **Complexity: M.**

Each task file should include the standard Heroes Reforged
header (`Phase`, `Owned Paths`, `Owned Paths (shared)`,
`Dependencies`, `verifyCommands`, `Status: planned`) per
[CONTRIBUTING.md](../../CONTRIBUTING.md) and is registered via
`npm run generate:task-registry`.

---

## 5. Execution Order

1. **Critical first** — land `SECURITY.md`, `dependency-policy.md`,
   `.npmrc`, `engines` / `packageManager` / `.nvmrc`, dependabot
   for `github-actions` only (npm group dormant), CODEOWNERS,
   SHA-pinned actions, `check-action-pinning.mjs`,
   `check-workflows.mjs`. **No deps yet.** Closes the
   "vacuously safe → silently broken" gap.
2. **Audit gate** — wire `audit:npm` / `audit:osv` scripts as
   no-ops; prepare `audit.yml`. Once the first runtime PR adds a
   dep, the audit step activates automatically and CI starts
   gating on `--audit-level=high`.
3. **Pre-commit & secret scan** — lefthook + gitleaks + CI mirror.
   Independent of deps; can land at any time.
4. **Release pipeline scaffolding** — write `release.yml`,
   `CHANGELOG.md`, runbook with the workflow gated `if: false`
   (or behind a manual `workflow_dispatch` only). The split
   `build`/`sign` jobs and SLSA reusable wf are committed and
   review-ready before any real release tag is pushed.
5. **Plan-27 coordination** — review pack-signing key-custody
   design in [Plan 27](./27-save-tampering-and-pack-signing-plan.md)
   and align `release.yml` keyless cosign identity with the
   pack-signing identity (single OIDC subject, dual scopes).
6. **First runtime PR** — when React + Vite + `@anthropic-ai/sdk`
   (or whichever stack) lands, the policy gates fire automatically:
   audit step blocks vulnerable transitives; allowlist mechanism
   blocks unreviewed postinstalls; Dependabot npm ecosystem
   activates; SBOM and SLSA provenance start emitting on the
   next tag.
7. **Branch protection (admin step, repo settings)** — once
   `CODEOWNERS` and `SECURITY.md` are merged, an admin enables:
   require signed commits, require `validate.yml`, require
   `CODEOWNERS` review, dismiss stale reviews, no force-push to
   `main`. Document the date in `CHANGELOG.md`.

---

## 6. Risks if Not Implemented

- **First runtime PR ships unaudited.** Without the audit gate,
  the PR introducing React + Vite + `@anthropic-ai/sdk` lands
  with whatever transitive CVE frontier exists that day — and
  with `NPM_CONFIG_AUDIT: false` committed, no future PR will
  surface it either (Q620, Q624, summary risk #1).
- **Action-tag swap reaches `main`.** A compromised
  `actions/checkout@v4` push reaches every PR run with no review
  surface (Q638, summary risk #2).
- **Provider key paste-leak.** A dev commits `.env` with a real
  Anthropic key; gitleaks does not scan; the key is public for
  the GitHub indexing window (Q643, Plan 29 cross-cut).
- **Unsigned, un-attested first release.** The first downloadable
  artifact has no cosign signature, no SBOM, no SLSA provenance,
  no `CHANGELOG.md` entry; downstream consumers cannot verify
  integrity (Q635, Q621, Q642, Q644).
- **Pack-signing and release-signing keys collide.** Without
  coordinating with [Plan 27](./27-save-tampering-and-pack-signing-plan.md),
  one key may end up gating both first-party packs and release
  artifacts → single-point-of-compromise (summary risk #4).
- **Long-lived API keys become the deploy default.** Without an
  OIDC scaffold, the path-of-least-resistance for the first
  deploy job is `secrets.AWS_ACCESS_KEY_ID` — exactly the
  long-lived shape Q639 warns against.
- **No disclosure channel.** External researchers have no email
  / advisory link; reports go to public issues or vanish (Q628,
  summary missing-logic #7).
- **Postinstall code-exec.** A typosquatted transitive runs
  postinstall on every CI run because `--ignore-scripts` is not
  on (Q627, summary risk #1).
- **Branch-protection erosion.** Without `CODEOWNERS` and a
  committed `CONTRIBUTING.md` policy, an admin turnover can
  silently relax `main` protection (Q634).

---

## 7. AI Implementation Readiness

**Score:** 8 / 10 (target after this plan).

**Reason:**
After this plan lands, an AI agent following
[`AGENTS.md`](../../AGENTS.md) and the new
[`docs/architecture/dependency-policy.md`](../architecture/dependency-policy.md)
has explicit guardrails for every "first time we add X" moment:

- Adding a dep → policy lints license, maintainer count, scope,
  postinstall, native-binding requirements; `audit:npm` /
  `audit:osv` block vulnerable transitives; lockfile pins exact
  versions via `.npmrc`.
- Adding an action → SHA-pin guard rejects the PR;
  Dependabot keeps the SHA fresh.
- Adding a workflow → `check-workflows.mjs` enforces explicit
  `permissions:`, no self-hosted runners, no
  `pull_request_target`.
- Adding a Dockerfile → digest-pin guard.
- Cutting a release → `release.yml` produces a signed,
  provenance-attested, SBOM-bearing artifact via OIDC
  keyless-cosign and a SLSA 3 reusable workflow, with
  build/sign dual-control.
- Disclosing a vulnerability → `SECURITY.md` provides the
  channel and SLA.
- Local commits → lefthook + gitleaks block secret leaks.

The two points held back from 10 / 10 reflect items that depend
on **runtime stack actually existing**:

1. The audit gate's effectiveness is unverifiable until the first
   real dep lands (the no-op shape is correct but exercising the
   real shape requires deps).
2. SLSA 3 provenance and reproducible-build parity require the
   bundler choice (likely Vite) to land so deterministic build
   flags can be wired and tested end-to-end.

Once those two land in the same merge window as the first runtime
PR — protected by all the gates above — the score should reach
**10 / 10** and Audit 30 can be re-run with mostly ✔ statuses.
