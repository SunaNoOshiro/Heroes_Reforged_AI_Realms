# Implementation Plan: 16 — Implementation Readiness

> Source audit: [docs/readiness-audit/16-implementation-readiness.md](../readiness-audit/16-implementation-readiness.md)
> Audit AI-Readiness score at time of writing: **8 / 10** — target after this plan: **9.5 / 10**.

---

## 1. Overview

This plan converts the gaps surfaced by the implementation-readiness audit
(Q261–Q276) into concrete, AI-executable changes.

The audit confirms the project is structurally well-prepared for AI
execution at the **task** layer (machine-verified `Verify:`, dependency
graph, `tasks:next`, strict TS) but is uneven at three other layers:

1. **Cross-module contracts** — interfaces are inlined in task bodies,
   several contracts live as prose only (renderer events, AI-pipeline
   reports, screen `data-contracts.md`).
2. **Test infrastructure** — no DI/mocking convention, no shared fake
   catalogue, no per-module test rubric.
3. **Supply-chain & non-functional** — no `LICENSE`, no `npm audit`
   step, no Dependabot/Renovate, no SBOM, no global NFR matrix.

Plus one critical doc/audit divergence (DEFEND damage reduction) that
will block any agent reading the canonical sources.

Scope of this plan:

- 11 ❌ / ⚠ findings from Q261–Q276
- All 7 "Improvements" from the summary
- All 5 "Risks" from the summary

Out of scope (handled by sibling plans):

- Concrete dependency-pipeline work — see `30-dependencies-and-build-pipeline-plan.md`
- Concrete testability / test-infra work — see [15-testability-plan.md](./15-testability-plan.md)
- Per-screen data-contract → JSON Schema conversion details — see [06-data-contracts-and-schema-plan.md](./06-data-contracts-and-schema-plan.md)

This plan therefore focuses on the **glue** that the implementation-readiness audit specifically owns:
the canonical truth artifacts (NFR matrix, testing-conventions doc,
dependency-policy doc, cross-module contracts index, schema-backed
renderer/AI-pipeline payloads) and the ✅ wiring that pins those to CI
and to task Acceptance Criteria.

---

## 2. Critical Fixes (Must Do First)

These are blocking: an AI agent reading the canonical sources today will
either get stuck or make up an answer.

### Issue: DEFEND damage-reduction TBD doc/audit divergence

**Source:**
- Q266 — TODOs / FIXMEs / TBD markers in critical specs

**Problem:**
- [docs/architecture/command-schema.md:303](../architecture/command-schema.md) still reads `(TBD: exact reduction)`.
- [tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md](../../tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md) still reads `formula TBD based on DEF stat`.
- [docs/planning/audits/AUDIT-EXECUTIVE-SUMMARY.md](../archive/AUDIT-EXECUTIVE-SUMMARY.md) (now archived under [docs/archive/](../archive/)) claims DEFEND was locked at "250 permille".
- The same wording is mirrored in `tasks/task-registry.json`.

**Impact:**
- Any AI agent picking up `09-tactical-combat/02a` cannot proceed without inventing the reduction formula.
- An agent reading the audit summary will use `250 permille` and silently override the canonical spec — undetectable until tactical-combat tests run.

**Solution:**
- Resolve the divergence in **one** direction (preferred: ratify `250 permille` in the canonical sources, since the audit summary committed that lock first).
- Re-generate `tasks/task-registry.json` so its inlined description matches.
- Add a verification check in `scripts/check-repo-contracts.mjs` that grep-fails on the literal strings `TBD`, `TODO`, `FIXME`, and `???` inside `docs/architecture/` and `tasks/mvp/`.

**Files to Update:**
- [docs/architecture/command-schema.md](../architecture/command-schema.md) — line 303, replace `(TBD: exact reduction)` with the locked formula.
- [tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md](../../tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md) — replace `TBD based on DEF stat` with the locked formula and add `Verify:` step that asserts the constant.
- [tasks/task-registry.json](../../tasks/task-registry.json) — regenerate via `npm run generate:task-registry`.
- [scripts/check-repo-contracts.mjs](../../scripts/check-repo-contracts.mjs) — extend with TBD/TODO grep gate.

**New Files (if needed):**
- None.

**Implementation Steps:**
1. Confirm canonical value with the project owner (`250 permille` per archived executive summary, or the value codified in the M2 balance pass).
2. Patch `command-schema.md:303` with the explicit numeric formula and a worked example.
3. Patch `02a-defend-damage-reduction.md` description, Acceptance Criteria, and Verify steps to reference the same numeric formula.
4. Run `npm run generate:task-registry` and inspect the diff in `tasks/task-registry.json`.
5. Add the grep gate to `check-repo-contracts.mjs` and run `npm run validate` end-to-end.
6. Capture the resolution in [docs/planning/implementation-log.md](../planning/implementation-log.md).

**Dependencies:**
- Owner confirmation of the canonical formula value.

**Complexity:** S

---

### Issue: No `LICENSE` / `package.json#license`

**Source:**
- Q274 — Licensing of every dependency reviewed?

**Problem:**
- No `LICENSE` file at the repo root.
- No `license` field in `package.json`.
- No declared license-policy doc.

**Impact:**
- Until a license exists, any external collaborator (or AI agent acting as one) is in legal grey territory.
- Once dependencies start populating `package-lock.json`, there is no allowed/denied list to gate them against.

**Solution:**
- Add a `LICENSE` file with the project-owner-chosen OSS license (placeholder: MIT until the owner chooses).
- Set `package.json#license` to a valid SPDX identifier matching the file.
- Author `docs/architecture/dependency-policy.md` (see Architecture issue below) covering allowed/denied SPDX lists.

**Files to Update:**
- [package.json](../../package.json) — add `"license": "MIT"` (or owner choice).

**New Files (if needed):**
- `LICENSE` (repo root) — full text of the chosen OSS license.
- `docs/architecture/dependency-policy.md` — see "Architecture > Dependency policy" below.

**Implementation Steps:**
1. Confirm the chosen license with the project owner.
2. Drop full license text in `LICENSE`.
3. Add the matching SPDX identifier to `package.json`.
4. Add a CI grep step that fails the PR if `LICENSE` is removed or `package.json#license` is missing.

**Dependencies:**
- Owner choice of license.

**Complexity:** S

---

### Issue: Empty lockfile + no supply-chain audit policy

**Source:**
- Q273 — External dependencies pinned and audited?

**Problem:**
- `package-lock.json` is committed but currently empty of production deps.
- No `npm audit` step in CI.
- No Dependabot / Renovate configuration.
- No SBOM generation.
- No documented response-time policy for CVEs.

**Impact:**
- The moment runtime dependencies are added (M0), supply-chain risk is unmanaged.
- An AI agent adding a dependency has no policy to check against — anything goes.

**Solution:**
- Add an `npm audit --omit=dev --audit-level=high` step to CI **now**, while it is a no-op, so the gate exists when deps land.
- Configure Dependabot (preferred — first-party, no external account) for `npm` and `github-actions` ecosystems with weekly cadence.
- Document policy in `docs/architecture/dependency-policy.md`.

**Files to Update:**
- [.github/workflows/validate.yml](../../.github/workflows/validate.yml) — add `npm audit` step after `npm ci`.

**New Files (if needed):**
- `.github/dependabot.yml` — npm + github-actions, weekly, group minor/patch.
- `docs/architecture/dependency-policy.md` — see Architecture below.

**Implementation Steps:**
1. Add `npm audit --omit=dev --audit-level=high` to `validate.yml` (continue-on-error: false; current empty lockfile makes it a no-op).
2. Author `.github/dependabot.yml`.
3. Author `dependency-policy.md` and link from CLAUDE.md "Engineering Guide".
4. Run `npm run validate` and a CI dry-run.

**Dependencies:**
- `LICENSE` issue above (`dependency-policy.md` references the project license).

**Complexity:** M — see [30-dependencies-and-build-pipeline-plan.md](./30-dependencies-and-build-pipeline-plan.md) for the deeper SBOM/CVE-response work.

---

## 3. System Improvements

### UI / Screens

#### Issue: Screen `data-contracts.md` are descriptive prose, not validated schemas

**Source:**
- Q265 — Contracts described in prose but not in schema

**Problem:**
- Each screen package under [docs/architecture/wiki/screens/](../architecture/wiki/screens/) ships a `data-contracts.md` that describes inbound/outbound payloads in Markdown.
- None of these are validated against actual code or against `content-schema/`.

**Impact:**
- UI tasks (e.g. `06-game-screens/*`) and content tasks can drift silently.
- AI agents implementing a screen will infer types from prose — error-prone.

**Solution:**
- For each screen package, add a sibling JSON Schema (or set of schemas) under `content-schema/schemas/screens/<screen-id>.schema.json`.
- The schema describes the *binding contract* the screen consumes (inputs from the engine, store, or pack).
- Wire `scripts/check-repo-contracts.mjs::checkLinks` to also assert each `data-contracts.md` links to its schema.

**Files to Update:**
- [scripts/check-repo-contracts.mjs](../../scripts/check-repo-contracts.mjs) — add screen-data-contract presence check.
- Each `docs/architecture/wiki/screens/<n>-<screen-id>/data-contracts.md` — add a `Schema:` link.
- [scripts/generate-wiki.mjs](../../scripts/generate-wiki.mjs) (if it exists) — render the linked schema next to the prose.

**New Files (if needed):**
- `content-schema/schemas/screens/<screen-id>.schema.json` — one per screen package.

**Implementation Steps:**
1. Inventory all screen packages and their current `data-contracts.md` payloads.
2. Generate a schema-skeleton script: `scripts/scaffold-screen-schema.mjs` that reads a `data-contracts.md` and writes a `*.schema.json` skeleton.
3. Author each schema (driven by the existing prose contracts).
4. Add the new schemas to the cross-ref check in `check-repo-contracts.mjs`.
5. Run `npm run validate` to ensure all screens have a backing schema.

**Dependencies:**
- This is shared with [06-data-contracts-and-schema-plan.md](./06-data-contracts-and-schema-plan.md). Coordinate to avoid double work — owner of execution should be 06's plan; this plan only contributes the **enforcement gate**.

**Complexity:** L (across all screens) — defer to 06's plan; here we only land the gate stub.

---

### Data Contracts

#### Issue: Renderer event payloads are not schema-backed

**Source:**
- Q265

**Problem:**
- `docs/architecture/renderer-technology-choice.md` documents the WebGL2 decision in prose.
- The engine→renderer boundary (which events the engine emits, which payloads the renderer consumes) has no schema.

**Impact:**
- Renderer module ([06-renderer.md](../../tasks/mvp/06-renderer.md)) and engine module ([01-engine-core.md](../../tasks/mvp/01-engine-core.md)) cannot be validated against each other.
- Future renderer redesign would not be caught by `check-repo-contracts.mjs`.

**Solution:**
- Define `content-schema/schemas/renderer-event.schema.json` covering all event kinds (e.g. `unit_moved`, `tile_revealed`, `effect_triggered`, `camera_focused`, `damage_number`, `selection_changed`).
- Use a discriminated-union shape (`kind` + per-kind payload) consistent with the existing command/effect shapes in the schema matrix.
- Add example records under `content-schema/examples/renderer-events/` and validate them in `check-repo-contracts.mjs::schemaForFile`.

**Files to Update:**
- [content-schema/](../../content-schema/) — register new schema in the manifest.
- [scripts/check-repo-contracts.mjs](../../scripts/check-repo-contracts.mjs) — extend `schemaForFile` mapping for `*.renderer-event.json`.
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — add row.
- [docs/architecture/renderer-technology-choice.md](../architecture/renderer-technology-choice.md) — link to the new schema.

**New Files (if needed):**
- `content-schema/schemas/renderer-event.schema.json`
- `content-schema/examples/renderer-events/*.renderer-event.json` (≥ 3 examples — one per discriminator family).

**Implementation Steps:**
1. Enumerate all renderer events implied by current task texts (search `tasks/mvp/06-renderer/`).
2. Draft the discriminated-union JSON Schema.
3. Author 3+ canonical example records.
4. Add the suffix→schema mapping in `check-repo-contracts.mjs`.
5. Add a row to `schema-matrix.md`.
6. Run `npm run validate`.

**Dependencies:**
- None (renderer events are an additive contract).

**Complexity:** M

---

#### Issue: AI-pipeline `*Report` shapes live in prose

**Source:**
- Q265

**Problem:**
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) references `ValidationReport`, `CoherenceReport`, `BalanceReport`.
- Inputs (`generation-request`) and outputs (`generated-faction`) have schemas; the in-flight stage reports do not.

**Impact:**
- Any task implementing a pipeline stage (e.g. content-platform balance pass) will invent the report shape.
- Cross-stage validation is not machine-checkable.

**Solution:**
- Add three schemas: `validation-report.schema.json`, `coherence-report.schema.json`, `balance-report.schema.json`.
- Each carries `stage`, `inputId`, `verdict`, `findings[]` (with severity), `metrics{}`.
- Reference them from `ai-generation-pipeline.md`.

**Files to Update:**
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — link to the three new schemas.
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md) — add three rows.
- [scripts/check-repo-contracts.mjs](../../scripts/check-repo-contracts.mjs) — add suffix→schema mapping.

**New Files (if needed):**
- `content-schema/schemas/validation-report.schema.json`
- `content-schema/schemas/coherence-report.schema.json`
- `content-schema/schemas/balance-report.schema.json`
- `content-schema/examples/reports/*.{validation,coherence,balance}-report.json` (one example each).

**Implementation Steps:**
1. Read `ai-generation-pipeline.md` and extract every property currently described in prose for each report type.
2. Draft the three schemas with a shared `report-base.schema.json` for `stage`/`verdict`/`findings`.
3. Author one canonical example per report.
4. Wire suffix → schema mapping.
5. Add rows to `schema-matrix.md` and link from the AI pipeline doc.

**Dependencies:**
- Coordinate with [14-ai-generated-content-pipeline-plan.md](./14-ai-generated-content-pipeline-plan.md) (it owns the stage executors; we own the report shape).

**Complexity:** M

---

### Schemas

#### Issue: No central inter-module TS contract surface

**Source:**
- Q262 — Are all module inputs and outputs explicitly typed?

**Problem:**
- TS interfaces (e.g. `PackRegistry` in [tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md](../../tasks/mvp/02b-asset-pipeline/01-manifest-format-plus-pack-registry.md)) are inlined in task bodies.
- No `src/contracts/` (or equivalent) source-of-truth file exists yet.

**Impact:**
- When two tasks reference the same interface, they can diverge.
- AI agents implementing module B cannot import the typed contract from module A — they re-derive it.

**Solution:**
- Add a `src/contracts/` workspace package that exports zero-runtime TS types describing each cross-module boundary.
- Each contract file matches a schema where one exists (`PackManifest`, `AssetIndex`, `Command`, `Effect`, `RendererEvent`, etc.) and is generated from the schema where possible (`json-schema-to-typescript`).
- Where a contract is TS-only (interfaces like `PackRegistry`, `AssetLoader`), hand-author the file and reference it from the relevant task body (replacing inline duplicates).

**Files to Update:**
- All task files currently inlining interfaces — replace inline blocks with a one-line `import type { ... } from '@hr/contracts/<file>'` reference and a link to the source file.

**New Files (if needed):**
- `src/contracts/package.json` — workspace package, `name: "@hr/contracts"`, `type: "module"`, no runtime deps.
- `src/contracts/index.ts` — re-export surface.
- `src/contracts/pack-registry.ts`
- `src/contracts/asset-loader.ts`
- `src/contracts/command-bus.ts`
- `src/contracts/renderer-event.ts` (generated from new schema)
- `src/contracts/<each cross-module boundary>.ts`
- `scripts/generate-contracts-from-schemas.mjs` — runs `json-schema-to-typescript`.

**Implementation Steps:**
1. Add the `src/contracts/` workspace; confirm npm workspaces picks it up.
2. Add `json-schema-to-typescript` as a dev dep.
3. Author `scripts/generate-contracts-from-schemas.mjs` driven by `content-schema/schemas/*.schema.json`.
4. Generate the schema-derived contracts.
5. Hand-author the TS-only contracts (`PackRegistry`, `AssetLoader`, etc.) by porting inline blocks from existing task files.
6. Walk every task file in `tasks/mvp/` and replace inline interface blocks with `import type` + a comment pointing at `src/contracts/`.
7. Add `npm run validate:contracts` (regenerate then `git diff --exit-code`) to CI.
8. Update [CLAUDE.md](../../CLAUDE.md) "Patterns To Prefer" to point at `src/contracts/` as the cross-module type surface.

**Dependencies:**
- Renderer-event schema landed (so its generated TS lives in `src/contracts/`).

**Complexity:** L

---

### Architecture

#### Issue: No per-module side-effect inventory

**Source:**
- Q263 — Are all module side effects enumerated?

**Problem:**
- `determinism.md` tells you what is **forbidden**.
- `state-flow.md` tells you which **boundaries** can do I/O.
- No document tells you, for a given module, what side effects it actually produces.

**Impact:**
- Reviewers and AI agents cannot quickly answer "is this module pure?" or "is this call legal here?".

**Solution:**
- Add a single matrix doc: `docs/architecture/side-effect-matrix.md`.
- One row per `src/<module>` (engine, rules, content-runtime, content-schema, ui, renderer, ai, persistence, net, contracts, services).
- Columns: `purity` (pure / boundary / impure), `permitted side effects` (concrete list), `forbidden in this module` (concrete list), `enforced by` (link to lint rule or test).

**Files to Update:**
- [docs/architecture/determinism.md](../architecture/determinism.md) — add a link to the matrix.
- [docs/architecture/state-flow.md](../architecture/state-flow.md) — add a link to the matrix.
- [CLAUDE.md](../../CLAUDE.md) — add the matrix to the "Read first" list.

**New Files (if needed):**
- `docs/architecture/side-effect-matrix.md`.

**Implementation Steps:**
1. Walk every `src/<module>` task module index and extract its declared boundary behavior.
2. Author the matrix.
3. Cross-link from determinism + state-flow.
4. Add a `validate:cross-refs` check that fails if a `src/` module is added without a matrix row.

**Dependencies:**
- None.

**Complexity:** M

---

#### Issue: No global Non-Functional-Requirements matrix

**Source:**
- Q276 — Are non-functional requirements measurable per module?

**Problem:**
- Some NFRs exist on individual tasks (CI <3 min, asset cache hit <1 ms, AI in Web Worker, 200×200 hex max).
- There is no central matrix capturing frame budget, RAM ceiling, network/lockstep latency budget, save/load latency, cold-start time, target FPS, max concurrent units, max active spells.

**Impact:**
- Modules will land without a perf budget; regressions become invisible until E2E testing.
- AI agents implementing a module cannot self-check against an NFR target.

**Solution:**
- Author `docs/architecture/non-functional-requirements.md` with a single table:
  - **Category** (perf / memory / latency / capacity / startup)
  - **Metric** (e.g. "Strategic-map frame time at 200×200")
  - **Target** (e.g. "≤ 16 ms / 60 FPS")
  - **Tolerance** (e.g. "≤ 33 ms / 30 FPS for one frame")
  - **Owning module** (e.g. `06-renderer`)
  - **Verified by** (CI step / fuzz harness / manual benchmark task)
- Wire each row into the relevant module's `Exit Criteria` and into individual task `Acceptance Criteria` where a benchmark exists.

**Files to Update:**
- Each `tasks/mvp/<module>.md` index — add the relevant NFR row(s) under "Exit Criteria".
- Specific tasks that should now gate on an NFR — extend `Acceptance Criteria` and `Verify:` (e.g. add a perf benchmark task).
- [CLAUDE.md](../../CLAUDE.md) — add the NFR doc to "Read first".

**New Files (if needed):**
- `docs/architecture/non-functional-requirements.md`.
- `tasks/mvp/<relevant>/<n>-perf-benchmark.md` task files where missing (one per NFR that needs an automated benchmark).

**Implementation Steps:**
1. Draft the NFR matrix with the project owner — document the chosen targets.
2. Land the matrix doc.
3. For each row whose owning module already has tasks, edit the module index to reference the row in `Exit Criteria`.
4. For each row that requires a new benchmark task, scaffold a `<module>/<n>-perf-benchmark.md` task following the canonical task shape, then `npm run generate:task-registry`.
5. Coordinate with [09-performance-plan.md](./09-performance-plan.md) so its detailed perf tasks reference these targets.

**Dependencies:**
- Coordinate with [09-performance-plan.md](./09-performance-plan.md). This plan owns the **matrix doc**; the performance plan owns the **benchmarks**.

**Complexity:** L

---

#### Issue: No testing / DI / mocking convention

**Source:**
- Q271 — Stub/mocking strategies for not-yet-built modules
- Cross-ref Q15 (testability) — same gap

**Problem:**
- No `docs/architecture/testing-conventions.md`.
- No DI convention.
- No shared "fake/mock catalogue".
- No per-module test rubric.
- The only fully-scoped test artifact is the engine fuzz harness.

**Impact:**
- Modules will adopt divergent test patterns.
- UI/AI tests will pull real engine deps in via lazy paths.
- AI agents will reinvent stubs every task.

**Solution:**
- Author `docs/architecture/testing-conventions.md` covering:
  1. **DI convention**: constructor-injected handles, no module-global singletons in deterministic paths, factory pattern in `src/contracts/`.
  2. **Fake catalogue**: `src/contracts/fakes/` (or `src/test-utils/`) ships canonical in-memory implementations of `PackRegistry`, `AssetLoader`, `RNG`, `Clock`, `CommandBus` etc.
  3. **Deterministic-engine mock policy**: tests against the engine *do not mock the engine* — they use the real reducer with seed inputs. UI tests mock the engine via the contract surface.
  4. **Per-module unit-test rubric**: every public function gets at least one happy-path test; every effect emitter gets a deterministic golden-replay test.
  5. **Fuzz/property targets**: which modules require property-based tests vs unit-only.

**Files to Update:**
- [CLAUDE.md](../../CLAUDE.md) — link the new doc from "Read first".
- [docs/readiness-audit/15-testability.md](../readiness-audit/15-testability.md) — close the open question by linking the new doc.
- [tasks/mvp/01-engine-core.md](../../tasks/mvp/01-engine-core.md) — add a "Read first" reference.

**New Files (if needed):**
- `docs/architecture/testing-conventions.md`.
- `src/contracts/fakes/` (or `src/test-utils/`) — workspace folder with the canonical fakes (created in this plan only as a directory + README; concrete fakes are landed by [15-testability-plan.md](./15-testability-plan.md)).

**Implementation Steps:**
1. Draft the convention doc.
2. Reference it from CLAUDE.md, AGENTS.md, every module index in `tasks/mvp/`.
3. Add `validate:cross-refs` rule: every `Verify:` block must include at least one test command for any task that owns code under `src/`.
4. Coordinate with [15-testability-plan.md](./15-testability-plan.md) to land the actual fake catalogue.

**Dependencies:**
- `src/contracts/` workspace exists (so fakes have somewhere to live).

**Complexity:** M (doc) + L (full fake catalogue, owned by 15's plan).

---

#### Issue: No dependency policy doc

**Source:**
- Q273, Q274 — Combined supply-chain gap

**Problem:**
- No allowed/denied SPDX list.
- No CVE-response time policy.
- No dependency-evaluation rubric (e.g. "must have ≥ 2 maintainers", "no single-maintainer packages above tier-3 dependency depth").

**Impact:**
- AI agents adding deps have no policy to consult.

**Solution:**
- Author `docs/architecture/dependency-policy.md` covering:
  - Allowed SPDX list (MIT, Apache-2.0, BSD-2/3-Clause, ISC, MPL-2.0).
  - Denied SPDX list (GPL family, AGPL, SSPL, BUSL, custom-restrictive).
  - CVE response: high+critical fixed within 7 days, medium within 30 days.
  - Dependency-add rubric (≥1k weekly downloads, last release within 18 mo, ≥2 maintainers, license compatible).
  - Lockfile policy: always commit, `npm ci` only.
  - Audit cadence: weekly Dependabot PRs, monthly manual review.

**Files to Update:**
- [CLAUDE.md](../../CLAUDE.md) — link from "Engineering Guide".
- [.github/workflows/validate.yml](../../.github/workflows/validate.yml) — `npm audit` step.

**New Files (if needed):**
- `docs/architecture/dependency-policy.md`.
- `.github/dependabot.yml`.

**Implementation Steps:**
1. Author the policy doc.
2. Wire `npm audit` step.
3. Add `dependabot.yml`.
4. Cross-ref from CLAUDE.md and AGENTS.md.

**Dependencies:**
- `LICENSE` exists (the policy references the project's own license).

**Complexity:** S (doc) — the deeper SBOM/CVE-response work belongs to [30-dependencies-and-build-pipeline-plan.md](./30-dependencies-and-build-pipeline-plan.md).

---

### Tasks

#### Issue: Module index files are not self-contained for AI hand-off

**Source:**
- Q261 — Can each module be specified to an AI agent without referencing others?

**Problem:**
- Per-task hand-off works (well-structured, machine-verified).
- Per-module hand-off does not — module indices like [tasks/mvp/01-engine-core.md](../../tasks/mvp/01-engine-core.md) deliberately point at sibling tasks; an agent cannot pick up "the engine module" with a single file.

**Impact:**
- This is acceptable while the project stays in single-task mode.
- It blocks future "give me the whole module" hand-off, which becomes valuable once parallel agents land.

**Solution (lightweight):**
- Add a `Self-Contained Brief:` section to every module index that summarizes:
  - Purpose
  - Public surface (link to `src/contracts/<module>.ts`)
  - Side-effect row (link to `side-effect-matrix.md`)
  - Exit Criteria (already present)
  - NFR row (link to `non-functional-requirements.md`)
- An agent reading the module index plus those four linked files gets a complete spec without walking every sibling task.

**Files to Update:**
- Every `tasks/mvp/<n>-<module>.md` index.

**New Files (if needed):**
- None — additive section only.

**Implementation Steps:**
1. After `src/contracts/`, side-effect matrix, and NFR matrix all exist, run a script to scaffold the `Self-Contained Brief:` block in each module index.
2. Hand-edit each block for correctness.
3. Add `validate:tasks` rule: every module index must contain a `Self-Contained Brief:` section.

**Dependencies:**
- `src/contracts/`, `side-effect-matrix.md`, `non-functional-requirements.md` all exist.

**Complexity:** M

---

#### Issue: CI today validates contracts only — runtime CI is gated behind M0

**Source:**
- Q269 — Is the CI pipeline specified?

**Problem:**
- Current `.github/workflows/validate.yml` runs schema/contract checks only.
- Full game CI (lint, type-check, unit, fuzz) is fully **specified** in [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md), but `Status: planned`, blocked by the rest of M0.

**Impact:**
- Acceptable today (no runtime code yet).
- Becomes a problem the day someone lands the first `.ts` file in `src/`.

**Solution:**
- Add a **second** workflow file `.github/workflows/runtime.yml` now, configured to run only when `src/**.ts` files exist (use a step-level `if:` guard).
- It runs: `npm run lint`, `npm run typecheck`, `npm test --workspaces`, and the fuzz harness.
- The workflow is a no-op until the first runtime task lands; then it activates without further infra work.

**Files to Update:**
- [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md) — note the staged-activation strategy.

**New Files (if needed):**
- `.github/workflows/runtime.yml` — staged-activation runtime CI.

**Implementation Steps:**
1. Author `runtime.yml` with conditional steps gated by file existence.
2. Test on a branch with a synthetic `src/engine/sample.ts` to confirm activation works.
3. Remove the synthetic file, merge.

**Dependencies:**
- None.

**Complexity:** S

---

#### Issue: "Obvious" behaviors keep surfacing in audits

**Source:**
- Q264 — Obvious behaviors left undocumented?

**Problem:**
- Eight task-system audits in ten days is itself the symptom — assumed-but-undocumented behavior keeps slipping through.
- Already-flagged subgaps: stub convention (Q271), DI strategy (Q248), error-message taxonomy, hot-reload re-validation order, editor-vs-runtime asset path resolution.

**Impact:**
- Each gap is small individually; cumulatively they slow AI execution.

**Solution:**
- This plan already closes Q271 and Q248 (testing-conventions doc).
- Open three additional small docs to close the named subgaps:
  1. `docs/architecture/error-taxonomy.md` — error codes, severities, user-facing vs internal, schema for error records.
  2. `docs/architecture/hot-reload-flow.md` — exact re-validation order in dev hot-reload (manifest → asset-index → schema-validate → registry-rebuild → engine-reload).
  3. `docs/architecture/asset-path-resolution.md` — the difference between editor-time path lookups (string) and runtime path resolution (registry).

**Files to Update:**
- [CLAUDE.md](../../CLAUDE.md) — link all three from "Read first".

**New Files (if needed):**
- `docs/architecture/error-taxonomy.md`
- `docs/architecture/hot-reload-flow.md`
- `docs/architecture/asset-path-resolution.md`

**Implementation Steps:**
1. Draft each doc to the same shape (Purpose / Contract / Examples / Verified by).
2. Add cross-refs.
3. Run `npm run validate`.

**Dependencies:**
- None.

**Complexity:** M

---

## 4. Suggested Task Breakdown

Each item below should land as a discrete task in `tasks/mvp/00-foundation/` (a new sub-module for cross-cutting readiness work) **except** the renderer-event schema and AI-pipeline report schemas which land in their owning modules.

- [ ] **T1** — Resolve DEFEND TBD divergence (canonical formula in `command-schema.md` + `09-tactical-combat/02a` + regen registry + add TBD/TODO grep gate to `check-repo-contracts.mjs`).
- [ ] **T2** — Add `LICENSE` + `package.json#license` (SPDX identifier).
- [ ] **T3** — Author `docs/architecture/dependency-policy.md` and add `npm audit` step + `.github/dependabot.yml`.
- [ ] **T4** — Add screen-data-contract presence gate to `check-repo-contracts.mjs` (full schema landing belongs to `06-data-contracts-and-schema-plan.md`).
- [ ] **T5** — Author `content-schema/schemas/renderer-event.schema.json` + 3 examples + suffix mapping + schema-matrix row.
- [ ] **T6** — Author `validation-report.schema.json`, `coherence-report.schema.json`, `balance-report.schema.json` + examples + suffix mapping + schema-matrix rows.
- [ ] **T7** — Stand up `src/contracts/` workspace + `scripts/generate-contracts-from-schemas.mjs` + replace inline interfaces in task bodies with `import type` references.
- [ ] **T8** — Author `docs/architecture/side-effect-matrix.md` and cross-link from `determinism.md` + `state-flow.md`.
- [ ] **T9** — Author `docs/architecture/non-functional-requirements.md`; backfill module Exit Criteria + per-task Acceptance Criteria; scaffold missing perf-benchmark tasks.
- [ ] **T10** — Author `docs/architecture/testing-conventions.md` (full fake catalogue is owned by `15-testability-plan.md`).
- [ ] **T11** — Add `Self-Contained Brief:` section to every `tasks/mvp/<n>-<module>.md` index + `validate:tasks` rule that requires it.
- [ ] **T12** — Add `.github/workflows/runtime.yml` with file-existence-gated activation.
- [ ] **T13** — Author `error-taxonomy.md`, `hot-reload-flow.md`, `asset-path-resolution.md`; cross-link from CLAUDE.md.

Each task should follow the canonical task shape (Description / Read First / Inputs / Outputs / Owned Paths / Dependencies / Acceptance Criteria / Verify / Estimated Time) so `npm run tasks:start` and `npm run tasks:done` work end-to-end.

---

## 5. Execution Order

1. **T1** — DEFEND TBD resolution. *Unblocks any agent reading canonical sources.*
2. **T2** — `LICENSE` + `package.json#license`. *Trivial, prerequisite for T3.*
3. **T3** — Dependency policy + `npm audit` + Dependabot. *Locks in supply-chain hygiene before runtime deps land.*
4. **T8** — Side-effect matrix. *Cheap; unblocks T11 and clarifies modules immediately.*
5. **T9** — NFR matrix. *Drives downstream task Acceptance Criteria; coordinate with `09-performance-plan.md`.*
6. **T10** — Testing conventions doc. *Coordinates with `15-testability-plan.md`.*
7. **T13** — Error taxonomy / hot-reload / asset-path docs. *Independent, can land in parallel with T8–T10.*
8. **T5** — Renderer event schema. *Required input for T7.*
9. **T6** — AI-pipeline report schemas. *Independent of T5/T7; coordinate with `14-ai-generated-content-pipeline-plan.md`.*
10. **T7** — `src/contracts/` workspace + inline-interface migration. *Largest single piece; depends on T5 for renderer types.*
11. **T11** — Self-Contained Briefs in module indices. *Depends on T7, T8, T9.*
12. **T4** — Screen-data-contract presence gate. *Coordinate with `06-data-contracts-and-schema-plan.md`.*
13. **T12** — `runtime.yml`. *Independent; can land any time after T1 to avoid muddying CI history.*

Suggested wave grouping:

- **Wave A (week 1)**: T1, T2, T3, T13 — all small, all unblocking.
- **Wave B (week 2)**: T8, T9, T10 — cross-cutting docs.
- **Wave C (weeks 3–4)**: T5, T6, T7 — schema + contracts surface.
- **Wave D (week 5)**: T11, T4, T12 — wiring and gates.

---

## 6. Risks if Not Implemented

| Risk | Surfaced by | Severity | If left unfixed |
|---|---|---|---|
| DEFEND TBD divergence | T1 | **Blocking** | Any AI agent on `09-tactical-combat/02a` invents the formula or stalls. Audit summary and source disagree silently. |
| Missing license + audit policy | T2, T3 | **High** | Legal exposure once collaborators or deps land. Supply-chain risk unmanaged from the first runtime dep. |
| Inline interfaces only | T5, T6, T7 | **High** | Two tasks redefine the same interface and diverge; downstream modules pick the wrong one. |
| No NFR matrix | T9 | **High** | Modules land without a perf budget; regressions invisible until E2E. |
| No testing convention | T10 | **High** | Divergent test patterns; UI/AI tests pull real engine deps; AI agents reinvent stubs every task. |
| No side-effect matrix | T8 | **Medium** | Reviewer/agent overhead per PR; subtle determinism leaks possible. |
| No staged runtime CI | T12 | **Medium** | The day the first `.ts` file lands in `src/`, no quality gate runs. |
| Module indices not self-contained | T11 | **Medium** | Blocks parallel-agent execution at module granularity; per-task mode keeps working. |
| Prose-only renderer / pipeline contracts | T5, T6 | **Medium** | Engine ↔ renderer and AI-pipeline-stage boundaries cannot be machine-validated. |
| Missing error/hot-reload/asset-path docs | T13 | **Low–Medium** | Each gap small; cumulatively slows execution and keeps audit cadence high. |

---

## 7. AI Implementation Readiness

**Score:** 8 / 10 (current, per audit) → **9.5 / 10** (target, after this plan).

**Why this plan moves the needle:**

- **+0.5** for closing the DEFEND TBD (T1) — removes the only live blocker in canonical sources.
- **+0.3** for `src/contracts/` (T7) — gives every cross-module type a single source of truth that agents can `import type` from.
- **+0.3** for the NFR matrix (T9) — every benchmarkable task gets a numeric Acceptance Criteria target.
- **+0.2** for testing-conventions doc (T10) — agents stop reinventing stubs; sibling plan ([15-testability-plan.md](./15-testability-plan.md)) lands the actual fakes.
- **+0.1** for license/audit/dependabot (T2, T3) — removes a future supply-chain blocker before it bites.
- **+0.1** for the four cross-cutting docs (T8, T13) — closes the long tail of "obvious behavior" gaps that keep recurring in audits.

**What stays at 0.5 from a perfect 10:**

- Some NFR targets will be best-guess until benchmarks run on real workloads.
- `src/contracts/` will need iteration once runtime code lands — this plan creates the surface, not its final shape.
- The full fake catalogue is owned by [15-testability-plan.md](./15-testability-plan.md), not this one.

**Definition of done for this plan:**

- All 13 tasks (T1–T13) reach `Status: done` via `npm run tasks:done`.
- `npm run validate` passes including the new gates (TBD grep, screen-data-contract presence, module-self-contained-brief, contracts regenerate diff).
- The next implementation-readiness audit re-run of Q261–Q276 produces zero ❌ and at most two ⚠ entries (the two structurally tied to runtime code not yet existing: empty lockfile, runtime CI gated by file existence).
