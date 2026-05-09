# 30. DEPENDENCY VULNERABILITIES & BUILD PIPELINE SECURITY

> **Repo posture context (2026-05-02).** This is a planning-and-contracts repo with **zero npm runtime/dev dependencies** declared in [package.json](../../../package.json) and a near-empty [package-lock.json](../../../package-lock.json) (10 lines, no `packages` entries). The only CI workflow is [.github/workflows/validate.yml](../../../.github/workflows/validate.yml), which runs Node-only doc/schema validators. None of the build-pipeline-security controls below are *actively required* today, but every one will become load-bearing the moment runtime code, native deps, or release artifacts land. Each answer states the current posture and the gap that opens once implementation starts.

---

### Q: 619. Is there a lockfile (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`), and is it committed?

**Status:** ⚠ Partial

**Answer:**
A `package-lock.json` exists at the repo root and is committed, but it is effectively **empty**: 10 lines total, `lockfileVersion: 3`, no `packages[]` entries beyond the root project. There are no declared dependencies in `package.json` (no `dependencies`, no `devDependencies`). CI runs `npm ci --prefer-offline --no-audit --no-fund`, which would fail-on-drift if a lockfile were ever introduced — so the **mechanism** is correct; the **content** is empty because the runtime stack has not landed yet.

**Evidence:**
- [package-lock.json](../../../package-lock.json) (10 lines, no packages)
- [package.json](../../../package.json) (no `dependencies` / `devDependencies` keys)
- [.github/workflows/validate.yml](../../../.github/workflows/validate.yml) (`npm ci --prefer-offline`)

---

### Q: 620. Is `npm audit` (or equivalent) run in CI on every PR with a fail threshold?

**Status:** ❌ UNKNOWN

**Answer:**
**No.** The CI workflow explicitly **disables** audit via env: `NPM_CONFIG_AUDIT: false` and `--no-audit` on `npm ci`. There is no separate `npm audit --audit-level=high` step, no `osv-scanner`, no `snyk`, no `socket.dev`, no Trivy. Today this is harmless (zero deps) but the moment any package lands, the pipeline will silently ship with vulnerable transitives.

**Evidence:**
- [.github/workflows/validate.yml](../../../.github/workflows/validate.yml) (env `NPM_CONFIG_AUDIT: false`, install step uses `--no-audit`)
- No `audit`/`scan`/`trivy`/`osv` job in `.github/workflows/`

---

### Q: 621. Is there an SBOM (Software Bill of Materials) generated per release?

**Status:** ❌ UNKNOWN

**Answer:**
No. There is no release process at all yet — no `release.yml` workflow, no tagged release in `git log`, no CycloneDX / SPDX generator, no `sbom.json` artifact in repo or CI uploads. SBOM emission is not mentioned in any architecture or planning doc.

**Evidence:**
- [.github/workflows/](../../../.github/workflows/) (only `validate.yml`)
- `git log` shows a single initial-scaffold commit
- No reference to `cyclonedx`, `spdx`, or `sbom` anywhere under [docs/](../) or [scripts/](../../../scripts/)

---

### Q: 622. Are dependencies pinned to exact versions in production builds, not floating ranges?

**Status:** ⚠ Partial

**Answer:**
There are no dependencies to pin, so the question is vacuously satisfied today. There is also **no committed policy** that future deps must use exact versions (`x.y.z`) rather than caret/tilde ranges (`^x.y.z`). [CONTRIBUTING.md](../../../CONTRIBUTING.md) is silent on this; [AGENTS.md](../../../AGENTS.md) and the [docs/architecture/](../../architecture/) folder are silent on this. The lockfile would normally pin transitives — but a per-PR policy on **direct** version specifiers is undefined.

**Evidence:**
- [package.json](../../../package.json) (no deps at all)
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) (no version-range policy)
- No `.npmrc` with `save-exact=true`

---

### Q: 623. Is Dependabot/Renovate configured to open PRs for security updates automatically?

**Status:** ❌ UNKNOWN

**Answer:**
**No.** No `.github/dependabot.yml`, no `renovate.json` / `.renovaterc`, no `.github/renovate-bot.json`. The `.github/` directory contains only `workflows/`. No automated dep-update bot is configured.

**Evidence:**
- `find . -maxdepth 2 -name "dependabot*" -o -name "renovate*"` → empty
- [.github/](../../../.github/) contains only `workflows/`

---

### Q: 624. Are transitive dependencies audited, not only direct ones?

**Status:** ❌ UNKNOWN

**Answer:**
No, because no audit runs at all (Q620). When deps eventually land, `npm audit` walks the resolved tree (transitives included), but with `NPM_CONFIG_AUDIT: false` and no fallback scanner, the transitive frontier is unmonitored.

**Evidence:**
- [.github/workflows/validate.yml](../../../.github/workflows/validate.yml) (audit disabled)
- See Q620

---

### Q: 625. Is there a policy for evaluating new dependencies (license, maintainership, supply-chain risk)?

**Status:** ❌ UNKNOWN

**Answer:**
No written policy. [CONTRIBUTING.md](../../../CONTRIBUTING.md) covers schemas, links, tasks, and validation, but **does not** mention dependency review, license allow-lists (MIT/Apache-2.0/BSD-3 etc.), maintainer-count thresholds, or supply-chain risk scoring (e.g., Socket / Snyk Advisor). There is no `dep-policy.md` or `THIRD_PARTY.md`.

**Evidence:**
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) (silent on deps)
- [AGENTS.md](../../../AGENTS.md) (silent on deps)
- No `docs/architecture/dependency-policy.md`

---

### Q: 626. Are typosquat/dependency-confusion attacks defended against (scoped packages, internal registry)?

**Status:** ❌ UNKNOWN

**Answer:**
No defense documented. The package itself is unscoped (`"name": "heroes-reforged-ai-realms"`, not `@heroes-reforged/...`), there is no `.npmrc` pinning a private registry, no internal-package allowlist, and no documented procedure for first-publishing an internal scope to npm to claim the namespace. Dependency-confusion is not mentioned in any audit or threat model.

**Evidence:**
- [package.json](../../../package.json) (`"name": "heroes-reforged-ai-realms"`, unscoped)
- No `.npmrc` in repo
- No mention of "dependency confusion" / "typosquat" in [docs/](../)

---

### Q: 627. Are postinstall scripts disabled or audited, given their use as a supply-chain attack vector?

**Status:** ❌ UNKNOWN

**Answer:**
Not addressed. The CI install command is `npm ci --prefer-offline --no-audit --no-fund` — note the absence of `--ignore-scripts`. `.npmrc` is missing, so `ignore-scripts=true` is not set globally. There is no policy to review postinstall hooks of new deps. Today this is harmless (no deps); tomorrow it is a wide attack surface.

**Evidence:**
- [.github/workflows/validate.yml](../../../.github/workflows/validate.yml) (`npm ci` without `--ignore-scripts`)
- No `.npmrc` setting `ignore-scripts=true`

---

### Q: 628. Is there a documented response time for triaging critical CVEs (e.g., patch within 7 days)?

**Status:** ❌ UNKNOWN

**Answer:**
No. There is no `SECURITY.md`, no published vulnerability disclosure process, no SLA for CVE response, and no on-call / security-owner contact. [docs/planning/](../../planning/) audits flag many gaps but do not commit a patch SLA.

**Evidence:**
- No `SECURITY.md` at repo root or under [.github/](../../../.github/)
- No CVE-response section in [CONTRIBUTING.md](../../../CONTRIBUTING.md) or [AGENTS.md](../../../AGENTS.md)

---

### Q: 629. Are runtime polyfills and shims audited for staleness, since they often outlive their original need?

**Status:** ❌ UNKNOWN

**Answer:**
N/A today (no runtime). No documented policy on polyfill review. The intended stack ([CLAUDE.md](../../../CLAUDE.md): TypeScript + React) and Node 22 in CI implies modern targets, but there is no committed `browserslist`, no `tsconfig` `target` discussion, no statement like "we ship to ES2022+ only and forbid `core-js` polyfills." The base [tsconfig.base.json](../../../tsconfig.base.json) is the only compile-time anchor; dependent task files do not yet declare bundle targets.

**Evidence:**
- [tsconfig.base.json](../../../tsconfig.base.json)
- No `browserslist` in [package.json](../../../package.json)
- No polyfill review checklist in [docs/architecture/](../../architecture/)

---

### Q: 630. Are native dependencies (sharp, sqlite3) audited for memory-safety CVEs separately?

**Status:** ❌ UNKNOWN

**Answer:**
No native deps exist yet. There is no policy covering native modules. The persistence audit ([docs/archive/readiness-audit/08-persistence-save-system.md](08-persistence-save-system.md)) selected IndexedDB / OPFS for browser saves, which avoids `sqlite3`-class native bindings on the client; but if/when the signaling server, AI-gateway, or asset pipeline ([services/](../../../services/)) introduces `sharp`, `bcrypt`, `better-sqlite3`, etc., there is no separate native-CVE pipeline (e.g., `cargo audit` for any Rust addons, or `oss-fuzz`-style fuzzing) defined.

**Evidence:**
- No native deps in [package.json](../../../package.json)
- [services/ai-gateway/README.md](../../../services/ai-gateway/README.md) (stub, native posture undefined)
- [services/signaling/README.md](../../../services/signaling/README.md) (stub)

---

### Q: 631. Is the build environment itself (Node, npm, build tools) version-pinned and signature-verified?

**Status:** ⚠ Partial

**Answer:**
Partially pinned, **not** signature-verified.
- **Node**: pinned to **major version only** (`node-version: 22`) via `actions/setup-node@v4`. No `.nvmrc` or `.node-version` file forces local devs to the same minor. There is no SHA-pinning of the Node tarball.
- **npm**: implicit (whatever ships with Node 22). No `"engines"` field in `package.json`, no `packageManager` field.
- **Runner OS**: pinned to `ubuntu-24.04` (good).
- **Signature verification**: `actions/setup-node@v4` does verify the Node tarball checksum against `nodejs.org` lists internally, but the project itself does not perform a cosign / minisign / GPG check.

**Evidence:**
- [.github/workflows/validate.yml](../../../.github/workflows/validate.yml) (`node-version: 22`, `runs-on: ubuntu-24.04`)
- [package.json](../../../package.json) (no `engines`, no `packageManager`)
- No `.nvmrc` / `.node-version` in repo

---

### Q: 632. Are CI runners hardened (no privileged mode, no host-network, no shared workspace between jobs)?

**Status:** ⚠ Partial

**Answer:**
The single workflow uses GitHub-hosted runners (`ubuntu-24.04`), which are non-privileged, ephemeral, and per-job by default. There is **one** job (`validate`) so no cross-job workspace risk exists today. The workflow correctly sets `permissions: contents: read` (least-privilege `GITHUB_TOKEN`). No self-hosted runners, no `services:` containers, no `--privileged` Docker. Hardening **specific to a future multi-job release pipeline** is not pre-defined.

**Evidence:**
- [.github/workflows/validate.yml](../../../.github/workflows/validate.yml) (`permissions: contents: read`, single job, GitHub-hosted runner)

---

### Q: 633. Are CI secrets scoped per workflow, and are PRs from forks denied access to write-scoped secrets?

**Status:** ⚠ Partial

**Answer:**
**Vacuously secure today** — there are zero secrets referenced in the only workflow (no `${{ secrets.* }}` usage), so there is nothing to leak. The workflow runs on `pull_request` (not `pull_request_target`), which means PR forks run with the fork's permissions and **cannot** access repository secrets even if any existed — this is the safe default. No documented policy exists for **future** workflows that will need OIDC/AWS keys (e.g., release, telemetry uploads). The "fork PRs cannot access write secrets" guarantee depends on never switching to `pull_request_target` without an explicit allow-list — not committed in writing.

**Evidence:**
- [.github/workflows/validate.yml](../../../.github/workflows/validate.yml) (no `secrets.*` references, `on: pull_request`)
- No documented secrets policy in [docs/](../)

---

### Q: 634. Is there branch protection on `main` requiring signed commits and successful CI?

**Status:** ❌ UNKNOWN

**Answer:**
Cannot be confirmed from repo contents alone — branch-protection rules live in GitHub repo settings, not in committed files. No `CODEOWNERS`, no commit-signing policy in [AGENTS.md](../../../AGENTS.md) or [CONTRIBUTING.md](../../../CONTRIBUTING.md). The only on-disk hint is the workflow's `Fail on stale task-registry.json` step, which provides a **content** gate but does not address **branch protection** or **commit signing**. The single existing commit (`5396368 Initial IP-neutral planning scaffold`) is **not** GPG/SSH-signed (`git log --show-signature` would confirm; not done in this audit).

**Evidence:**
- No `CODEOWNERS` file
- No commit-signing requirement in [CONTRIBUTING.md](../../../CONTRIBUTING.md)
- Branch-protection state is GitHub-side and unverifiable from repo

---

### Q: 635. Are release artifacts signed (Sigstore/cosign or PGP), and are signatures verified by the deployer?

**Status:** ❌ UNKNOWN

**Answer:**
No release pipeline exists. No cosign/Sigstore/SLSA workflow, no `.github/workflows/release.yml`, no `keyless-signing.yml`, no `.well-known/cosign.pub`. Pack signing (separate concern) is discussed in [docs/archive/readiness-audit/27-save-tampering-and-pack-signing.md](27-save-tampering-and-pack-signing.md) but **app/release artifact** signing is not.

**Evidence:**
- [.github/workflows/](../../../.github/workflows/) (only `validate.yml`)
- No `cosign.*`, `*.pem`, `*.sig` artifacts in repo

---

### Q: 636. Are build steps reproducible, so a tampered build is detectable by re-running the build?

**Status:** ❌ UNKNOWN

**Answer:**
Not specified. The current build is "no build" — `npm run validate` regenerates JSON inventories that are gated by `git diff --exit-code tasks/task-registry.json`, which is itself a soft reproducibility check on **one** generated file. No bundler is configured, no `SOURCE_DATE_EPOCH`, no deterministic bundling settings, no comparison-after-rebuild step. Given the project's strong "deterministic" rule for **gameplay** ([docs/architecture/determinism.md](../../architecture/determinism.md)), the omission of build-time reproducibility is consistent with the planning-only state but should be planned for parity once Vite/esbuild lands.

**Evidence:**
- [.github/workflows/validate.yml](../../../.github/workflows/validate.yml) (regenerates `task-registry.json`, then `git diff --exit-code`)
- No bundler config in repo
- [docs/architecture/determinism.md](../../architecture/determinism.md) covers gameplay determinism, not build determinism

---

### Q: 637. Is the build container pinned by digest, not by tag, to prevent image-tag swap?

**Status:** ❌ UNKNOWN

**Answer:**
No build container is used. The runner uses the `ubuntu-24.04` GitHub-hosted image (not a Docker image the project owns), and there are no `container:` blocks or `docker://...` references in the workflow. **No `Dockerfile` exists** in the repo. When one is introduced (e.g., for the signaling server), there is no committed policy requiring `FROM image@sha256:...` digest pinning.

**Evidence:**
- No `Dockerfile`, `*.dockerfile`, or `container:` in [.github/workflows/validate.yml](../../../.github/workflows/validate.yml)
- `ubuntu-24.04` is a GitHub-managed runner label, not a project-owned image

---

### Q: 638. Are GitHub Actions / external actions pinned by SHA, not by version tag?

**Status:** ❌ UNKNOWN

**Answer:**
No — actions are pinned by **major version tag** only:
- `actions/checkout@v4`
- `actions/setup-node@v4`

This is the GitHub default and convenient, but a maintainer-account compromise of either action allows a malicious push to `v4` to flow into this repo silently. SHA pinning (`actions/checkout@<40-char-SHA> # v4.x.x`) is industry best-practice for security-sensitive repos and is **not** applied here. Dependabot can automate this if enabled (Q623).

**Evidence:**
- [.github/workflows/validate.yml](../../../.github/workflows/validate.yml) (`@v4` tag pins on both actions)

---

### Q: 639. Are deploy credentials short-lived (OIDC federation) rather than long-lived API keys?

**Status:** ❌ UNKNOWN

**Answer:**
No deploy step exists. The workflow does not declare `id-token: write` permission (required for OIDC federation), and no AWS/GCP/Azure deploy step is present. When a release pipeline is added, no policy mandates OIDC over static `secrets.*` API keys. This is unaddressed in [services/ai-gateway/README.md](../../../services/ai-gateway/README.md) and [services/signaling/README.md](../../../services/signaling/README.md), both of which are stubs.

**Evidence:**
- [.github/workflows/validate.yml](../../../.github/workflows/validate.yml) (`permissions: contents: read` only — no `id-token`)
- No deploy job in repo

---

### Q: 640. Is there a separation between build environment and signing-key access (e.g., dual-control)?

**Status:** ❌ UNKNOWN

**Answer:**
N/A and undefined. There are no signing keys, no build-time secrets, no dual-control split between "code can build" and "code can sign release." The `pack-signing` audit ([docs/archive/readiness-audit/27-save-tampering-and-pack-signing.md](27-save-tampering-and-pack-signing.md) Q557–Q562) calls out unresolved key custody for **packs**, but **release-key** custody is not even raised. When pack signing or app signing lands, dual-control (build job ≠ signing job, separate workflow with restricted reusable-workflow permissions) is unmodeled.

**Evidence:**
- See [docs/archive/readiness-audit/27-save-tampering-and-pack-signing.md](27-save-tampering-and-pack-signing.md) Q557–Q562
- No `release-sign.yml` workflow or split-job pattern in [.github/workflows/](../../../.github/workflows/)

---

### Q: 641. Are build logs scrubbed of secrets before being made publicly viewable?

**Status:** ⚠ Partial

**Answer:**
Trivially safe today (no secrets in logs). GitHub Actions auto-masks anything registered as `secrets.*` in console output, which would cover the default case. But there is no documented policy requiring the use of `::add-mask::` for **derived** secrets (e.g., a token rotated from an OIDC exchange), no log-retention setting, and no policy on whether public-fork PR runs could expose env-var dumps. This becomes load-bearing when Q639 deploy steps land.

**Evidence:**
- GitHub-default secret masking applies; nothing custom configured
- No `mask`/`redact` documentation in [CONTRIBUTING.md](../../../CONTRIBUTING.md)

---

### Q: 642. Is supply-chain provenance (SLSA level) defined as a goal, and is the current level documented?

**Status:** ❌ UNKNOWN

**Answer:**
Not stated. SLSA is not mentioned in any document under [docs/](../). No `provenance.json` is emitted, no `slsa-github-generator` reusable workflow is referenced, no target level (SLSA 1/2/3/4) is named. Given the project intends to ship signed packs and verifiable saves, an explicit SLSA target (likely **SLSA 3** for the engine + first-party packs) would be a coherent next decision but is undefined.

**Evidence:**
- `grep -ri "slsa\|provenance" docs/` → no project-level mention (only in audit docs themselves)
- No `slsa-*.yml` workflow

---

### Q: 643. Are pre-commit hooks (lint, secret scan, schema validate) enforced server-side as well, not only locally?

**Status:** ⚠ Partial

**Answer:**
- **Locally**: there is **no** pre-commit hook framework — no `.husky/`, no `lefthook.yml`, no `lint-staged`, no `pre-commit-config.yaml`, no `.git/hooks/pre-commit` template in repo. Devs must remember to run `npm run validate && npm test` ([CONTRIBUTING.md](../../../CONTRIBUTING.md) §"Before You Start" item 4).
- **Server-side (CI)**: schema validation, link checks, contract checks, cross-ref checks, and task-system invariants **are** enforced via `npm run validate` and `npm test` on every PR. So the validation **content** runs server-side even though no local hook exists.
- **Secret scanning**: neither local nor server-side. No `gitleaks`, `trufflehog`, GitHub Advanced Security secret scan reference, or `git-secrets` config. Secret-scanning is a paid GHAS feature whose enablement state is repo-settings-only and not committed.

**Evidence:**
- [.github/workflows/validate.yml](../../../.github/workflows/validate.yml) (server-side `npm run validate && npm test`)
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) (manual gate, no hook)
- No `.husky/`, `lefthook.yml`, or `.pre-commit-config.yaml` in repo

---

### Q: 644. Is the release process auditable (who triggered, what was built, what was signed) with an immutable trail?

**Status:** ❌ UNKNOWN

**Answer:**
No release process exists. There is no tag-triggered workflow, no release-PR pattern, no `CHANGELOG.md`, no GitHub Releases entry, no `gh release create` automation. GitHub itself preserves an audit log of action runs (workflow run ID, actor, timestamps), but the project commits **no** policy on how that log is consumed, archived, or reconciled with signed artifacts. The `task-registry.json` regeneration drift-check is the closest thing to a "what changed by whom" gate, and it covers task metadata only.

**Evidence:**
- No `CHANGELOG.md` in repo
- No `release.yml`, no tags in `git log`
- [.github/workflows/validate.yml](../../../.github/workflows/validate.yml) (`Fail on stale task-registry.json` is the only auditable-output step)

---

## 🔍 Summary

### Missing Logic
- **No CVE / dep-audit pipeline** (Q620, Q624). `NPM_CONFIG_AUDIT: false` is set globally with no compensating scanner.
- **No automated dep-update bot** (Q623). Neither Dependabot nor Renovate is configured; supply-chain freshness depends on manual review.
- **No SBOM, no provenance, no SLSA target** (Q621, Q642). The release-artifact integrity story is empty.
- **No release pipeline or signing** (Q635, Q639, Q640, Q644). Build/release/sign separation, OIDC federation, and audit trail are all undefined.
- **Actions and tools pinned by tag, not digest** (Q637, Q638). One maintainer-account compromise of `actions/checkout` or `actions/setup-node` flows in silently.
- **No dependency-introduction policy** (Q625, Q626, Q627). Any future PR can add an unscoped, unaudited package with active postinstall scripts.
- **No `SECURITY.md` / CVE SLA / disclosure contact** (Q628). External researchers have no triage channel.
- **No commit-signing requirement, no `CODEOWNERS`** (Q634). Branch-protection state is GitHub-side only and unverifiable from the repo.
- **No pre-commit / secret-scan layer** (Q643). The validate gate exists in CI but not on the developer machine, and no scanner inspects diffs for `.env`-style leaks.
- **No build determinism story** (Q636). Even when bundling lands, repro-build is not in the plan.

### Risks
- **Cold-start supply-chain risk.** The very first PR to introduce a runtime dep (likely React, Vite, esbuild, or `@anthropic-ai/sdk`) will land with no audit, no version policy, no scoped registry, and `--ignore-scripts` not set — a high-leverage moment that needs a guard *before* it happens.
- **Tag-pin drift.** `actions/checkout@v4` and `actions/setup-node@v4` resolving to different SHAs across runs means a malicious or accidental upstream change reaches `main` invisibly. Combined with no Dependabot, this rot accumulates.
- **Future deploy credentials assumed long-lived by default.** With no OIDC scaffold and stub `services/ai-gateway/` and `services/signaling/`, the path of least resistance is `secrets.AI_API_KEY` / `secrets.TURN_SECRET` — exactly the long-lived shape Q639 warns against.
- **Pack-signing key custody (audit 27 Q557–Q562) and release-key custody (Q640) will collide** if not designed together. Without a dual-control plan, one signing key may end up gating both first-party packs and release artifacts, single-point-of-compromise.
- **No `SECURITY.md`** + **no commit signing** + **no CODEOWNERS** means a PR touching `services/` or `scripts/` can be merged by any maintainer with no second pair of eyes — and external researchers have no clear disclosure path.
- **`npm ci --no-audit` is committed convention.** Easy to overlook; will require an explicit "remove `NPM_CONFIG_AUDIT: false` and gate on `--audit-level=high`" PR coordinated with the first dep-introduction PR, or else the audit will silently never run.

### Improvements
1. **Land a `SECURITY.md`** with disclosure email, supported versions, and a CVE-triage SLA (e.g., critical ≤ 7 days, high ≤ 30 days). Closes Q628.
2. **Land a `.github/dependabot.yml`** covering `npm` and `github-actions` ecosystems, weekly cadence, grouping security PRs. Closes Q623, partially Q638 (Dependabot can SHA-pin actions when configured).
3. **Add `.npmrc` with `save-exact=true` and `ignore-scripts=true`**, document the override path for trusted packages. Closes Q622, Q627. Pair with `engines` and `packageManager` in `package.json` for Q631.
4. **Add a `npm audit --audit-level=high` (or `osv-scanner`) step in `validate.yml`** that runs *after* the first real dep lands. Remove `NPM_CONFIG_AUDIT: false`. Closes Q620, Q624.
5. **Write a one-page `docs/architecture/dependency-policy.md`** covering license allow-list, maintainer-count threshold, scoped-package rule, postinstall review, native-dep audit (Q630), polyfill staleness review (Q629). Closes Q625, Q626.
6. **Pin all actions by SHA** (`actions/checkout@<sha> # v4.1.7` style). Add a CI-side check (or rely on Dependabot) that fails PRs adding unpinned actions. Closes Q638.
7. **When a release pipeline is added**, scaffold it with: separate workflow with `permissions: id-token: write, contents: read`; OIDC federation to cloud (Q639); `slsa-github-generator` reusable workflow targeting **SLSA 3** (Q642); cosign keyless signing of artifacts (Q635); SBOM emission via `cyclonedx-npm` (Q621); `Dockerfile` images pinned by `@sha256` digest (Q637); separate signing job/environment for dual-control (Q640); release-PR template producing an immutable `CHANGELOG.md` entry plus the run-ID linkage (Q644).
8. **Enable branch protection on `main`** in repo settings: require signed commits, successful `validate` workflow, ≥1 review, `CODEOWNERS` ownership for `services/`, `content-schema/`, `scripts/`. Closes Q634. Document this in `CONTRIBUTING.md` so it survives admin turnover.
9. **Add a local pre-commit layer** (lefthook or husky) running `npm run validate:tasks` + `gitleaks protect --staged` to catch secrets/typos before push. Mirror the gitleaks scan in CI. Closes Q643 secret-scan gap.
10. **Cross-link this audit with [docs/archive/readiness-audit/27-save-tampering-and-pack-signing.md](27-save-tampering-and-pack-signing.md)** so pack-signing key custody and release-signing key custody are designed in one pass, not two.

### AI-Readiness
**Score:** 3/10

**Reason:**
The repo is in the **rare lucky state** of having zero dependencies, so most build-pipeline-security questions are vacuously safe today. But "vacuously safe" is not a posture an AI agent can extend. As soon as an AI executes the first task that introduces a runtime stack — almost any task in `tasks/phase-2/` or `tasks/phase-3/` involving React, multiplayer, or AI integration — every gap above flips from "N/A" to "actively shipping with no guardrail." There is no committed dependency-introduction policy for an AI to follow, no audit/scan step that would block a vulnerable transitive, no SBOM/SLSA scaffold, no signing pipeline, no `SECURITY.md`. The single CI workflow correctly applies least-privilege and content gating, which raises the floor from `1/10` to `3/10`, but until a `SECURITY.md`, `dependency-policy.md`, `dependabot.yml`, and a sketched release pipeline land, an AI agent has no rails to stay between when implementation begins.
