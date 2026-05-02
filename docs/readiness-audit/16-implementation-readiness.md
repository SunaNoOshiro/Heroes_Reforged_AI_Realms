# 16. IMPLEMENTATION READINESS

### Q: 261. Can each module be specified to an AI agent without referencing others?

**Status:** ⚠ Partial

**Answer:**
The task system is explicitly built around single-task hand-off to an AI agent. Each task file carries `Description`, `Read First`, `Inputs`, `Outputs`, `Owned Paths`, `Dependencies`, `Acceptance Criteria`, `Verify`, and `Estimated Time`, plus `Status:` lifecycle managed by `npm run tasks:start` / `tasks:done`. CLAUDE.md instructs agents to implement the smallest coherent unit while staying within `Owned Paths`. So at the *task* granularity, an agent can be onboarded with one file plus its `Read First` set. At the *module* granularity, however, module index files (e.g. [01-engine-core.md](../../tasks/mvp/01-engine-core.md)) deliberately point at sibling tasks — agents must walk the explicit `Dependencies` graph rather than receive a self-contained module spec.

**Evidence:**
- [CLAUDE.md](../../CLAUDE.md) — "Workflow", "implement the smallest coherent unit, staying within the task's `ownedPaths`"
- [tasks/README.md](../../tasks/README.md) — task-system scripts, autonomous MVP execution
- [tasks/mvp/01-engine-core/01-initialize-root-workspace-and-module-layout.md](../../tasks/mvp/01-engine-core/01-initialize-root-workspace-and-module-layout.md) — canonical task shape
- [tasks/task-registry.json](../../tasks/task-registry.json) — machine-readable registry of all tasks/deps

---

### Q: 262. Are all module inputs and outputs explicitly typed?

**Status:** ⚠ Partial

**Answer:**
Every task file has `Inputs:` and `Outputs:` sections at the *file-and-artifact* level, and TypeScript will run with `strict: true`, `noUncheckedIndexedAccess: true`, and `exactOptionalPropertyTypes: true` so runtime types will be enforced once code lands. Some inter-module APIs are sketched as TypeScript class/interface stubs inside the task body (e.g. `PackRegistry` in `02b-asset-pipeline/01`). However, there is no centralized inter-module API/interface catalog yet (no `src/contracts/` or `*.d.ts` source-of-truth file). Until those interfaces ship, "inputs/outputs" are typed at the schema layer (JSON Schema) and the task-text layer, not as compiled TypeScript boundaries.

**Evidence:**
- [tsconfig.base.json](../../tsconfig.base.json) — strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
- [content-schema/schemas/](../../content-schema/schemas/) — 32 JSON schemas covering record contracts
- [tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md](../../tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md) — embedded TS interface for `PackRegistry`
- ❌ no centralized cross-module interface file

---

### Q: 263. Are all module side effects enumerated?

**Status:** ⚠ Partial

**Answer:**
Side effects are enumerated negatively (what is forbidden) and at boundaries (where I/O is allowed), but not positively per module. Determinism rules ban `Math.random()`, `Date.now()` / `performance.now()`, `eval` / `new Function`, `setTimeout`-based race decisions, and unsorted Map/Set iteration in deterministic paths. Asset loader is named as the single point that may call `fetch()` or `new Image()`. State-flow.md identifies content-runtime (load+validate), engine (pure reducer, no I/O), persistence (saves/replays), and net (lockstep) as the only legal effect boundaries. There is no per-module "side effect inventory" table.

**Evidence:**
- [docs/architecture/determinism.md](../architecture/determinism.md) — "Forbidden In Deterministic Paths"
- [docs/architecture/state-flow.md](../architecture/state-flow.md) — "Boundary Responsibilities" table
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md) — "the single point where `fetch()` or `new Image()` is called"
- ❌ no per-module side-effect inventory

---

### Q: 264. Are there any "obvious" behaviors left undocumented?

**Status:** ⚠ Partial

**Answer:**
The project enforces fail-loud semantics in two cases ("missing presentation may fall back; missing gameplay requirements must fail loudly") and pack/save/replay version pinning is explicit. However, the audit history itself shows that "obvious" behavior gaps keep surfacing — eight task-system audits inside ten days, a dedicated `docs/planning/audits/` directory, and this readiness-audit folder all exist precisely because non-obvious-but-assumed behaviors are still being discovered. Specific gaps already flagged elsewhere: stub/mocking convention (Q271), DI strategy (Q15-Testability:248), error-message taxonomy, hot-reload re-validation order, and editor-vs-runtime asset path resolution.

**Evidence:**
- [AGENTS.md](../../AGENTS.md) — "Protect These Rules"
- [docs/planning/audits/](../archive/) — multiple consecutive consistency audits
- [docs/readiness-audit/15-testability.md](./15-testability.md) — flags missing per-module test rubric and DI convention
- ⚠ "obvious behavior" gap is itself diagnosed in the audit cadence

---

### Q: 265. Are there any contracts described in prose but not in schema?

**Status:** ⚠ Partial

**Answer:**
Yes — several. Prose-only or partially-schemaed contracts: the renderer technology decision (WebGL2) is documented in `renderer-technology-choice.md` but there is no `renderer.schema.json` describing render-event payloads; the screen UI packages declare `data-contracts.md` per screen but those are descriptive Markdown, not validated JSON schemas; the AI generation pipeline stages have schemas at boundaries (`generation-request`, `generated-faction`) but stage validators (`ValidationReport`, `CoherenceReport`, `BalanceReport`) are described in prose only. Conversely, command, effect, formula, manifest, and 27 other record types ARE backed by JSON Schemas validated by `scripts/check-repo-contracts.mjs`.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md](../architecture/renderer-technology-choice.md) — prose decision, no schema
- [docs/architecture/wiki/screens/](../architecture/wiki/screens/) — `data-contracts.md` per screen (descriptive)
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — "ValidationReport / CoherenceReport / BalanceReport" referenced in prose
- [content-schema/schemas/](../../content-schema/schemas/) — 32 schemas that ARE enforced

---

### Q: 266. Are there TODOs, FIXMEs, or "TBD" markers in critical specs?

**Status:** ⚠ Partial

**Answer:**
At least one live TBD remains in a critical spec. `docs/architecture/command-schema.md:303` reads "Incoming damage this round is reduced by formula (TBD: exact reduction)", and the same wording is mirrored in [tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md](../../tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md) and `tasks/task-registry.json`. The 2026-04-25 executive audit summary claims this was locked to 250 permille, but the source documents still carry the TBD label, so the canonical text is out of sync with the audit. No other `TODO`/`FIXME`/`TBD` markers were found in `docs/architecture/` or `tasks/mvp/`.

**Evidence:**
- [docs/architecture/command-schema.md](../architecture/command-schema.md) line 303 — "(TBD: exact reduction)"
- [tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md](../../tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md) — "formula TBD based on DEF stat"
- [docs/planning/audits/AUDIT-EXECUTIVE-SUMMARY.md](../archive/AUDIT-EXECUTIVE-SUMMARY.md) — claims DEFEND was locked at "250 permille"
- ⚠ doc/audit divergence — DEFEND formula

---

### Q: 267. Is the build system specified (toolchain, versions, lockfiles)?

**Status:** ✔ Defined

**Answer:**
Toolchain is pinned: TypeScript with strict mode, Vite (library mode for `src/engine`/`src/rules`, app mode for `src/ui`), Node 22 in CI, npm workspaces (`workspaces: ["src/*", "services/*"]`), and `package-lock.json` is committed and required by CI (`npm ci --prefer-offline --no-audit --no-fund`). The repo standardized on npm workspaces on 2026-04-22 (audit N8) explicitly to keep one toolchain. The lockfile is `lockfileVersion: 3` and tracked, but currently lists no production dependencies because runtime code has not yet been written — when `M0` lands, dependencies will populate it.

**Evidence:**
- [tsconfig.base.json](../../tsconfig.base.json) — strict + nUIA + EOPT
- [package.json](../../package.json) — workspaces, scripts
- [.github/workflows/validate.yml](../../.github/workflows/validate.yml) — Node 22, `npm ci`
- [tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md](../../tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md)

---

### Q: 268. Are repo layout, naming conventions, and module boundaries defined?

**Status:** ✔ Defined

**Answer:**
Yes. `master-plan.md` and `overview.md` give the canonical "Repo Shape" table (one role per top-level path), CLAUDE.md and AGENTS.md repeat the same module list under `src/`, and pack-contract.md plus schema-matrix.md pin pack-side layout. File naming uses suffixes (`*.unit.json`, `*.spell.json`, `*.scenario.json`, …) and the suffix→schema mapping is enforced in `scripts/check-repo-contracts.mjs::schemaForFile`. Stable IDs are namespaced and treated as public API. Module boundaries are enforced by `Owned Paths` per task plus dependency lint.

**Evidence:**
- [docs/architecture/master-plan.md](../architecture/master-plan.md) — "Repo Shape"
- [docs/architecture/overview.md](../architecture/overview.md) — module roles table
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) — pack folder layout
- [scripts/check-repo-contracts.mjs](../../scripts/check-repo-contracts.mjs) — enforces file-suffix → schema mapping
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — naming cookbook

---

### Q: 269. Is the CI pipeline specified?

**Status:** ⚠ Partial

**Answer:**
A CI pipeline exists today but covers only contract-validation, not gameplay/runtime: `.github/workflows/validate.yml` runs on every PR and push to `main` against Node 22, executing `npm ci`, `npm run validate` (regenerate registry → check links → contracts → cross-refs → commands → tasks lint), a stale-registry diff guard, and `npm test` (script test suite). The full game CI — lint + type-check + unit + fuzz harness — is specified by [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md) but is `Status: planned`, with acceptance criteria including "deliberate `Math.random()` injection causes CI to fail at the lint step" and "total CI runtime < 3 minutes". So the runtime-quality CI is fully specified but not yet wired.

**Evidence:**
- [.github/workflows/validate.yml](../../.github/workflows/validate.yml) — current CI
- [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md) — planned full CI
- [package.json](../../package.json) — `validate` and `test` scripts

---

### Q: 270. Is there a defined order of implementation (dependency-respecting)?

**Status:** ✔ Defined

**Answer:**
Yes, multiple layers. Strategic ordering: `roadmap.md` defines milestones M0→M7 with explicit "Critical Path" (engine foundation → schemas → asset/content → faction → map → renderer → persistence → tactical → AI). Tactical ordering: every task carries explicit `Dependencies:` IDs that resolve through `tasks/task-registry.json`, and `npm run tasks:next` (with `--phase=mvp`) only surfaces tasks whose deps are `done`. `npm run tasks:next:hot` orders ready tasks by transitive fan-out so the most-unblocking task surfaces first. `solo-build-lane.md` provides the practical execution order for the default solo-with-AI mode. `npm run validate:tasks` rejects dependency cycles.

**Evidence:**
- [docs/planning/roadmap.md](../planning/roadmap.md) — milestones + critical path
- [docs/planning/solo-build-lane.md](../planning/solo-build-lane.md)
- [scripts/tasks.mjs](../../scripts/tasks.mjs) — `next`, `start`, `done`, `lint`
- [tasks/task-registry.json](../../tasks/task-registry.json)

---

### Q: 271. Are stub/mocking strategies defined for not-yet-built modules?

**Status:** ❌ UNKNOWN

**Answer:**
There is no centralized stub/mocking policy. No DI convention document, no shared "fake/mock catalogue", no per-module test-double rubric. The only concrete test artifact specified is the engine fuzz harness; tasks like `10-heuristic-ai/06-run-ai-in-web-worker` and the renderer/UI tasks describe production interfaces but not how downstream consumers stub them while waiting. The testability audit ([15-testability.md](./15-testability.md)) flags the same gap.

**Evidence:**
- ❌ no `docs/architecture/testing-conventions.md` or equivalent
- [docs/readiness-audit/15-testability.md](./15-testability.md) — explicitly notes "no shared mock/fake catalogue, no dependency-injection convention"
- [tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md) — only fully-scoped test harness today

---

### Q: 272. Is there a module-completion definition-of-done checklist?

**Status:** ✔ Defined

**Answer:**
Yes, at task granularity, machine-enforced. Every task file has `Acceptance Criteria:` (functional gate) + `Verify:` (commands that must pass), and `npm run tasks:done -- <id>` runs those verify commands and refuses to flip `Status:` to `done` unless they pass. CLAUDE.md states: "do not hand-edit `Status:` to skip this gate". Module-level DoD aggregates from task DoD: each module index also lists `Exit Criteria` (e.g. M0: "Replay-determinism fuzz test passes on every PR in CI"). `npm run validate:tasks` enforces task-system invariants across the board.

**Evidence:**
- [CLAUDE.md](../../CLAUDE.md) — "Workflow", `tasks:done` gate
- [tasks/mvp/01-engine-core.md](../../tasks/mvp/01-engine-core.md) — module-level Exit Criteria
- [scripts/tasks.mjs](../../scripts/tasks.mjs) — verify-then-flip behavior
- [tasks/mvp/01-engine-core/01-initialize-root-workspace-and-module-layout.md](../../tasks/mvp/01-engine-core/01-initialize-root-workspace-and-module-layout.md) — example Acceptance + Verify

---

### Q: 273. Are external dependencies pinned and audited?

**Status:** ❌ UNKNOWN

**Answer:**
The lockfile (`package-lock.json`) is committed and `npm ci` is mandatory in CI, which is the *mechanism* for pinning. However, the file is currently `lockfileVersion: 3` with **no production dependencies populated** because runtime code has not been written (only validation scripts run). There is no `npm audit` step in CI, no fail-threshold for vulnerabilities, no SBOM generation, no Dependabot/Renovate config, and no documented dependency-evaluation policy. The companion audit folder [docs/readiness-audit/30-dependencies-and-build-pipeline.md](./30-dependencies-and-build-pipeline.md) lists 26 unanswered questions about exactly this area.

**Evidence:**
- [package-lock.json](../../package-lock.json) — committed but empty (no real deps)
- [.github/workflows/validate.yml](../../.github/workflows/validate.yml) — no `npm audit` step
- [docs/readiness-audit/30-dependencies-and-build-pipeline.md](./30-dependencies-and-build-pipeline.md) — open questions
- ❌ no Dependabot/Renovate, no SBOM, no audit policy

---

### Q: 274. Is the licensing of every dependency reviewed?

**Status:** ❌ UNKNOWN

**Answer:**
No. There is no `LICENSE` file at the repo root, no license declared in `package.json`, no dependency-license audit policy, and no `license-checker` (or equivalent) step in CI. No prose document defines an allowed-licenses list (MIT/Apache-2/BSD/etc.) or a denied-licenses list (AGPL/SSPL/etc.). When the project transitions from planning to runtime code and starts pulling in dependencies, this gap will become acute.

**Evidence:**
- ❌ no `LICENSE` file in repo root
- [package.json](../../package.json) — no `license` field
- ❌ no license-audit CI step or policy doc

---

### Q: 275. Is the asset pipeline specified end-to-end?

**Status:** ✔ Defined

**Answer:**
Yes. Module [02b-asset-pipeline](../../tasks/mvp/02b-asset-pipeline.md) declares "Adding a new race or world should mean adding a pack, not editing engine code" and breaks the pipeline into 10 tasks: manifest format + pack registry, animation JSON, sound manifest, asset registry (ID-based, no hardcoded paths), async loader with caching (single fetch/Image boundary), pack-completeness validator, dev hot-reload, faction-scaffold script, faction-author guide, and emberwild migration. The canonical pack layout lives in `pack-contract.md`; the canonical reference pack is `content-schema/examples/packs/emberwild-faction/`; manifest and asset-index schemas back the contract; and `scripts/check-repo-contracts.mjs` already validates every example record against its schema in CI.

**Evidence:**
- [tasks/mvp/02b-asset-pipeline.md](../../tasks/mvp/02b-asset-pipeline.md) — module index, 10 task list, Exit Criteria
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md) — canonical layout
- [content-schema/schemas/manifest.schema.json](../../content-schema/schemas/manifest.schema.json), [asset-index.schema.json](../../content-schema/schemas/asset-index.schema.json)
- [content-schema/examples/packs/emberwild-faction/](../../content-schema/examples/packs/emberwild-faction/) — reference pack

---

### Q: 276. Are non-functional requirements (perf, memory, latency) measurable per module?

**Status:** ⚠ Partial

**Answer:**
Some NFRs are pinned and measurable; coverage is uneven. Concrete numeric targets that exist: CI total runtime <3 min ([01-engine-core/10](../../tasks/mvp/01-engine-core/10-github-actions-ci.md)), asset cache hit <1 ms ([02b/05](../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md)), heuristic AI offloaded to Web Worker ([10-heuristic-ai/06](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)), strategic-AI Wilson 95 % CI ∈ [35 %, 65 %] balance corridor, MCTS performance benchmark task in Phase 3, layered tile storage in `03-map-system/03`. Missing: there is no global NFR matrix (frame budget, RAM ceiling, max map size beyond "200×200 hexes" called out in the renderer doc, network latency budget for lockstep, save/load latency ceiling, cold-start time). Each task that *does* set an NFR gates it via Acceptance Criteria, but most modules do not currently set one.

**Evidence:**
- [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md) — "Total CI runtime < 3 minutes"
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md) — "< 1ms" cache hit
- [docs/architecture/renderer-technology-choice.md](../architecture/renderer-technology-choice.md) — "up to 200×200 hexes"
- [tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md](../../tasks/mvp/10-heuristic-ai/06-run-ai-in-web-worker.md)
- ❌ no global NFR matrix; no documented frame budget, RAM ceiling, network/lockstep latency budget

---

## 🔍 Summary

### Missing Logic
- No centralized stub/mocking / DI / fake-catalogue convention (Q271).
- No license file at repo root and no dependency license-audit policy (Q274).
- No `npm audit` / Dependabot / SBOM / supply-chain step in CI (Q273; expanded in [30-dependencies-and-build-pipeline.md](./30-dependencies-and-build-pipeline.md)).
- No global non-functional-requirement matrix (frame budget, RAM ceiling, network latency for lockstep, save/load latency, cold-start time) (Q276).
- No central inter-module API/interface contract source (interfaces appear inline in task bodies) (Q262).
- No per-module side-effect inventory; effects are defined only by negation + boundary docs (Q263).
- No schema-backed contracts for renderer events, screen `data-contracts.md`, and AI-pipeline `*Report` shapes (Q265).

### Risks
- **DEFEND formula doc/audit divergence**: source files still say `TBD: exact reduction` while the executive audit declares the formula locked at 250 permille (Q266). An AI agent reading the source will block; an agent reading the audit will guess.
- **Empty lockfile + no audit policy** means the moment runtime deps are added, supply-chain risk is unmanaged (Q273).
- **CI today validates contracts only**, not gameplay/runtime; the planned full CI (Task 10) is gated behind the entire M0 chain landing first (Q269).
- **Unspecified mocking convention** will cause divergent test patterns across modules and bleed real engine deps into UI/AI tests (Q271, Q15-248).
- **No NFR matrix** means modules will land without a perf budget; regressions become invisible until end-to-end testing (Q276).

### Improvements
1. Resolve the DEFEND TBD: either patch `command-schema.md:303` and `tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md` to the locked 250 permille value, or revert the audit summary if the lock is not real.
2. Add `LICENSE`, `package.json#license`, and a `docs/architecture/dependency-policy.md` (allowed/denied license list, audit cadence, response time for CVEs).
3. Add an `npm audit --omit=dev --audit-level=high` step to CI; configure Dependabot or Renovate.
4. Author `docs/architecture/testing-conventions.md` covering DI convention, in-memory pack registry stub, deterministic-engine mock policy, and per-module unit-test rubric.
5. Author `docs/architecture/non-functional-requirements.md` with frame budget, RAM ceiling, lockstep latency budget, save/load latency, and cold-start ceiling — wire these into the relevant module tasks' Acceptance Criteria.
6. Centralize cross-module TS interfaces in `src/contracts/` (or equivalent) and have task bodies link there instead of redefining inline.
7. Promote prose `data-contracts.md` and AI-pipeline reports to JSON Schemas validated by `check-repo-contracts.mjs`.
8. Schema-back renderer event payloads (a `renderer-event.schema.json`) so the engine→renderer boundary is validated.

### AI-Readiness
**Score:** 8 / 10

**Reason:** The task system is unusually well-suited for AI-agent execution: every task has explicit `Inputs`, `Outputs`, `Owned Paths`, `Dependencies`, `Acceptance Criteria`, and machine-verified `Verify` commands; `tasks:next` produces a dependency-respecting work queue; CI gates the contract layer on every PR; build toolchain and module boundaries are pinned. The remaining 2 points are real and load-bearing: (a) one live `TBD` in the DEFEND combat path, (b) no testing/mocking convention or stub policy, (c) no license/dependency-audit hygiene, (d) no global NFR matrix, and (e) some contracts (renderer events, AI-pipeline reports, screen data-contracts) live in prose only. Fix those and this score moves to 9.5 / 10.
