# Decision Log

Append-only register of locked decisions that materially shape the
canonical sources. Every entry has:

- `ID` — stable `DEC-NNN` identifier.
- `Date` — date the decision was ratified into canonical sources
  (ISO-8601).
- `Decision` — one short sentence stating what was locked.
- `Value` — the concrete value (number, formula, choice).
- `Rationale` — why this option was picked.
- `Canonical sources patched` — the files that now carry the locked
  value. Future agents must read these, not the audit summary.
- `Provenance check` — the canonical token the provenance gate
  matches against (typically the value verbatim).

A decision-log entry exists so that any historical claim made in
[`docs/archive/AUDIT-*`](../archive/) (e.g. "DEFEND was locked at
250 permille") resolves to a value that is *also* present in the
canonical sources. The provenance gate
[`scripts/check-decision-provenance.mjs`](../../scripts/check-decision-provenance.mjs)
enforces this: every archive `Locked` claim must either be reflected
verbatim in canonical sources or carry a `DEC-NNN` reference here.

Entries are ordered chronologically; do not reorder. If a decision is
revised, append a new entry that supersedes the prior one and update
the prior entry with `Superseded by: DEC-NNN`.

---

## DEC-001 — DEFEND damage-reduction formula

- **Date:** 2026-04-25
- **Decision:** DEFEND command reduces incoming damage by a fixed
  ratio that does not scale with the defender's DEF stat.
- **Value:** `defendDamageReductionPermille = 250` (25 % reduction).
  The fixed-point formula is
  `damageAfterDefend = damage × (1000 - 250) // 1000 = damage × 750 // 1000`.
- **Rationale:** A flat ratio is closed-form, replay-stable, and
  trivially testable. A DEF-scaled variant adds a parameter without
  meaningfully changing balance at the early-game numbers where
  DEFEND is most often used. A future ruleset that wants a scaled
  variant lands as a separate constant; it does not edit
  `defendDamageReductionPermille`.
- **Canonical sources patched:**
  - [`docs/architecture/command-schema.md`](../architecture/command-schema.md)
    (`BATTLE_DEFEND` Effects section).
  - [`tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md`](../../tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md).
- **Provenance check:** archive claim "DEFEND = 25% reduction" /
  "250 permille" resolves here.

## DEC-002 — IP-neutralization rename log (rolling)

- **Date:** 2026-05-04 (initial entry; this is a rolling log).
- **Decision:** Repository text and content references must remain
  IP-neutral. Specific renames and drops applied during the IP-neutral
  pass are kept here so a future contributor questioning a rename
  finds a stable record without re-deriving the rationale from commit
  history.
- **Value:** see entries below; expand as further renames land.
- **Rationale:** Without a single record, every reviewer who notices
  an unusual rename re-derives the answer from `git log` and risks
  reverting a rename. The decision-log replaces re-derivation with a
  reference.
- **Canonical sources patched:**
  - [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
    forbidden-source patterns.
  - [`research/deep-research-report.md`](../../research/deep-research-report.md)
    (corridor-only language).
- **Provenance check:** archive references to renamed mechanics
  resolve here when the rename predates the canonical patch.

### DEC-002 entries

- *Generic strategy-game vocabulary preferred over branded mechanics
  names.* The repo refers to "tactical combat", "adventure map",
  "town building loop", "auto-resolve", and similar generic terms
  rather than reusing trademarked product mechanics names.
- *Numeric ranges replace branded balance tables.* Damage corridors,
  growth ranges, and cost ranges live in
  [`research/deep-research-report.md`](../../research/deep-research-report.md)
  expressed as inclusive bounds, not as references to any external
  product's tables.
- *Asset names use descriptive role tokens, not character or
  faction names from any prior art.* When this register
  needs to record a specific rename, append a sub-bullet here with
  `<old> → <new>` and a one-line rationale.

## DEC-003 — Test runner and mutation-test gate

- **Date:** 2026-05-06
- **Decision:** Vitest is the canonical runner for `src/**/*.test.ts`,
  and StrykerJS is the canonical mutation-testing gate that runs
  before `npm run tasks:done` flips a task to `done`. The runner
  switch retires the transitional
  `node --experimental-strip-types --test` path locked in
  [`testing-conventions.md` § 8](../architecture/testing-conventions.md);
  the mutation gate enforces a per-module mutation-score floor and
  a per-file coverage-no-regression check, with anti-cheat rules
  prohibiting source deletion, assertion softening, threshold
  lowering, silent excludes, and unjustified `// Stryker disable`.
- **Value:**
  `runner = vitest` (4.x), `mutationFramework = StrykerJS` (9.x via
  `@stryker-mutator/vitest-runner`),
  `coverageAnalysis = perTest`,
  mutation-score floor (kills/total): `engine 80 %`, `rules 80 %`,
  `content-schema 80 %`, `content-runtime 80 %`, `net 80 %`,
  `shared 80 %`, `contracts 75 %`, `services 75 %`, `ui 65 %`,
  `renderer 65 %`,
  coverage floor (lines / branches): `engine 90 / 80`,
  `rules 90 / 80`, `content-schema 90 / 80`,
  `content-runtime 90 / 80`, `net 90 / 80`, `shared 90 / 80`,
  `contracts 80 / 70`, `services 80 / 70`, `ui 70 / 60`,
  `renderer 70 / 60`.
- **Rationale:** `node:test` has no first-class StrykerJS plugin; the
  command-runner workaround loses `perTest` coverage analysis (the
  5–10 × speedup that makes mutation testing affordable per task).
  Vitest is already referenced by the
  `mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module`
  output set, so adopting it as the runner is additive rather than
  a parallel install. Mutation score is the only gate that catches
  the "test executes the line but never asserts on the output"
  failure mode that pure coverage misses — exactly the failure mode
  most likely under autonomous AI execution. Per-module floors
  match the reach of test discipline already implied by the
  coverage-policy thresholds; ui and renderer get lower floors
  because mutation score is noisier on presentation code.
- **Canonical sources patched:**
  - [`tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md`](../../tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md)
    (runner choice + node:test → Vitest migration scope).
  - [`tasks/mvp/02-tooling/06-mutation-test-gate.md`](../../tasks/mvp/02-tooling/06-mutation-test-gate.md)
    (Stryker config + validate-* scripts + skill ownership).
  - [`docs/architecture/testing-conventions.md`](../architecture/testing-conventions.md) § 8
    (cross-link to this entry).
  - [`.claude/skills/mutation-test/SKILL.md`](../../.claude/skills/mutation-test/SKILL.md)
    (the loop, the anti-cheat rules, the equivalent-mutant procedure,
    the threshold table).
  - [`AGENTS.md`](../../AGENTS.md) (Workflow pointer to the skill).
- **Provenance check:** archive references to "mutation-test gate",
  "Stryker", or "test runner = Vitest" resolve here.

## DEC-004 — Task status ledger (single source of truth)

- **Date:** 2026-05-07
- **Decision:** Task status moves out of every per-task `.md` file
  and into a single structured ledger at
  [`tasks/task-status.json`](../../tasks/task-status.json). The
  `Status:` field is removed from all task `.md` files.
  `tasks:start`, `tasks:done`, and `tasks:blocked` are the only
  local writers; `validate:status-ledger` enforces that every
  non-legacy `done` entry is paired with a real git SHA, an
  `implementation-log.md` line, and a `verifyCommandsHash` matching
  the task's current `verifyCommands` list. The trust anchor is the
  `Validate Repo Contracts` GitHub Actions workflow
  ([`.github/workflows/validate.yml`](../../.github/workflows/validate.yml)),
  which re-runs `npm run validate` (including
  `validate:status-ledger`) on a fresh checkout for every PR and
  push to `main`. CODEOWNERS was considered and rejected: in a solo
  repo where AI agents commit using the human owner's GitHub
  identity, CODEOWNERS adds friction without adding cheat-proofness
  (the agent satisfies the rule trivially by acting as the owner).
  A required CI status check is identity-independent and is the
  correct anchor.
- **Value:**
  ledger path = `tasks/task-status.json`,
  schemaVersion = 1,
  done-entry fields = `{status, updatedAt, completedAt,
  completedAtSha, verifyCommandsHash}`,
  legacy-entry fields = `{status, updatedAt, legacy: true}`
  (one-shot exemption for the 12 tasks marked `done` before the
  ledger existed; new `done` flips after migration must not use
  `legacy`),
  required CI check on `main` = the `validate` job in
  `.github/workflows/validate.yml`.
- **Rationale:** The `Status:` field embedded in 471 .md files made
  hand-edits invisible in PR diffs and gave every task its own
  potential cheat surface ("agent flips Status: planned →
  Status: done by hand and skips `tasks:done`"). Concentrating
  status into one structured file flips that: every change is a
  one-line diff in one file, easy to review and easy to gate by CI.
  The `verifyCommandsHash` further catches the late-stage cheat
  (weakening the verify list after marking done) which no per-.md
  field could detect. The realistic threat is an AI agent committing
  with the human owner's GitHub identity — CODEOWNERS does not bind
  that adversary because the agent IS the owner from GitHub's
  perspective; only a status check that runs on a fresh GitHub-hosted
  runner (which the agent has no token for) is independent of the
  agent's identity.
- **Manual prerequisite (not enforceable from code):** the repo
  owner must enable branch protection on `main` in repo settings →
  Branches → "Require status checks to pass before merging", with
  the `validate` check selected. Until that toggle is set, the
  whole gate is honor-system. The CI workflow itself runs on every
  PR regardless and surfaces failures, but only branch protection
  blocks merge.
- **Canonical sources patched:**
  - [`tasks/mvp/02-tooling/07-task-status-ledger.md`](../../tasks/mvp/02-tooling/07-task-status-ledger.md)
    (the owning task spec and its acceptance criteria).
  - [`tasks/task-status.json`](../../tasks/task-status.json)
    (the ledger itself, seeded from current .md statuses).
  - [`scripts/lib/task-status-ledger.mjs`](../../scripts/lib/task-status-ledger.mjs)
    (read/write module).
  - [`scripts/check-status-ledger.mjs`](../../scripts/check-status-ledger.mjs)
    (validator wired into `npm run validate`).
  - [`scripts/tasks.mjs`](../../scripts/tasks.mjs)
    (`setStatus` and `blockedCmd` rewritten to write the ledger).
  - [`scripts/generate-task-registry.mjs`](../../scripts/generate-task-registry.mjs)
    (status now read from the ledger; legacy `Status:` fallback
    retained only for tasks not yet present in the ledger).
  - [`AGENTS.md`](../../AGENTS.md) (Workflow bullet rewritten;
    `CLAUDE.md` symlinks to `AGENTS.md`).
  - [`.github/workflows/validate.yml`](../../.github/workflows/validate.yml)
    (the trust anchor; pre-existing, no edits needed — already runs
    `npm run validate` on every PR).
- **Provenance check:** archive references to "task status ledger",
  "tasks/task-status.json", or "verifyCommandsHash" resolve here.

---

## How to Add A New Entry

1. Pick the next `DEC-NNN`.
2. Fill the template above. Keep `Value` machine-grep-able (the
   provenance gate looks for the value substring inside the canonical
   sources you list).
3. Run `npm run validate:provenance` (wired into `npm run validate`).
4. If you patched a canonical source, also update its inline
   reference back to this log so readers reach the rationale in one
   hop.

---

## Module-Name Aliases

Plan authors repeatedly named folders that don't exist in the repo
(`tasks/mvp/01-foundations/`, `tasks/mvp/02-rules-engine/`,
`tasks/mvp/00-foundation/`, `tasks/phase-1/<schema>/`). The implementer
of each plan reverse-engineered the closest existing folder. This
table pins the canonical mapping so future plan authors see the
target folder before naming new work. Closes Plan 32 § PI-2.

| Aspirational | Canonical | Rationale |
|---|---|---|
| `tasks/mvp/01-foundations/` | [`tasks/mvp/00-core-architecture/`](../../tasks/mvp/00-core-architecture/) | Foundations / engine-core contracts (state shape, command queue, RNG streams, ID allocator) live in `00-core-architecture` per [`docs/architecture/state-flow.md`](../architecture/state-flow.md). |
| `tasks/mvp/02-rules-engine/` | [`tasks/mvp/02-content-schemas/`](../../tasks/mvp/02-content-schemas/) | Rules / formulas land as schemas + Zod validators inside `02-content-schemas`; there is no separate "rules-engine" task module. |
| `tasks/mvp/00-foundation/` | [`tasks/mvp/00-core-architecture/`](../../tasks/mvp/00-core-architecture/) | Same target as `01-foundations`; the canonical singular form is `00-core-architecture`. |
| `tasks/phase-1/<schema>/` | [`tasks/mvp/02-content-schemas/`](../../tasks/mvp/02-content-schemas/) | The repo collapses Phase-1 schema work into the MVP `02-content-schemas` module; there is no `phase-1` directory. |
| `services/multiplayer/` | `src/net/webrtc/` (runtime, reserved) + [`services/signaling/`](../../services/signaling/) (server) | Multiplayer runtime code lives under the reserved `src/net/webrtc/` path (folder created when M5 runtime work lands); the optional signaling server adapter lives under `services/signaling/`. The legacy `services/multiplayer/` folder holds only operational config (e.g. TURN). |

Plan authors: read this table before adding `Owned Paths` entries
that name a new folder. Append rows here when a new aspirational
name surfaces; do not retroactively rename existing tasks.
