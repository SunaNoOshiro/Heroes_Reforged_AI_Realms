# Decision Log

Register of **cross-cutting** locked decisions with no single canonical
source. Decisions that own one canonical source (a task spec, a lint
config, a schema docstring) belong **inside that source**, not here —
inline beats centralized for almost everything.

The original centralized entries (`DEC-001` through `DEC-005`) were
inlined into their canonical sources on 2026-05-09 and are no longer
defined here; see git history at that date for the prior centralized
form. **Retired IDs are not reused** — the next entry is `DEC-006`.

## Entry format

Every entry has:

- `ID` — stable `DEC-NNN` identifier.
- `Date` — date the decision was ratified (ISO-8601).
- `Decision` — one short sentence stating what was locked.
- `Value` — the concrete value (number, formula, choice). Keep
  machine-grep-able.
- `Rationale` — why this option was picked.
- `Canonical sources patched` — files that now carry the locked
  value. Future readers must follow these, not chat history.

**Append-only.** Entries are ordered chronologically; do not reorder.
To revise a decision, append a new entry that supersedes the prior
one and add `Superseded by: DEC-NNN` (or
`Partially superseded by: DEC-NNN (clause)`) to the prior entry.

---

## (No current entries.)

New entries go below this line.

---

## How to add a new entry

1. Confirm the decision is genuinely cross-cutting (no single
   canonical source that should hold it inline). If it owns one file,
   put it there instead.
2. Pick the next `DEC-NNN` — continue past the retired
   `DEC-001`–`DEC-005`; do not reuse retired IDs.
3. Fill the template above. Keep `Value` machine-grep-able.
4. Add an inline reference back to this log from each canonical
   source you patched, so readers reach the rationale in one hop.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surfaces in scope; this is a planning register.
- **Schema: ✔** — No schemas in scope.
- **Tasks: ⚠** — Several canonical sources still cite the retired
  IDs `DEC-003` / `DEC-004` (some with links back to this log).
  Non-blocking — the inlined values exist at the canonical sources
  per the 2026-05-09 retirement — but the citations are dangling
  pointers since this log no longer carries those entries. Listed
  in **⚠ Issues**.

## ⚠ Issues

- **Dangling `DEC-003` citations.** After the 2026-05-09 inlining,
  these files still reference `DEC-003` by ID, in some cases with a
  link back to this log:
  - [`.agents/rules/scripts.md`](../../.agents/rules/scripts.md) line
    20 — link target `../../docs/planning/decision-log.md` no longer
    resolves to a `DEC-003` anchor.
  - [`scripts/lib/module-classes.mjs`](../../scripts/lib/module-classes.mjs)
    line 10 — comment says "Floors mirror `.claude/skills/mutation-test/SKILL.md`
    and DEC-003".
  - [`tasks/mvp/02-tooling/06-mutation-test-gate.md`](../../tasks/mvp/02-tooling/06-mutation-test-gate.md)
    line 25 — `Read First` link to this log tagged `DEC-003`.
  - [`tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md`](../../tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md)
    lines 15, 38, 77 — body and acceptance criteria cite `DEC-003`
    as the runner-choice source of truth.
  - [`tasks/task-registry.json`](../../tasks/task-registry.json) (generated)
    — mirrors the above task-file references.

  Per the 2026-05-09 retirement note above, those citations should
  point at the canonical inlined source (e.g.
  [`testing-conventions.md` § 9](../architecture/testing-conventions.md)
  for the locked-runner / mutation-floor values). The audit skill
  cannot edit those files (Hard Prohibition D — never edit
  cross-checked files); the owning tasks must update the references.
- **Dangling `DEC-004` citations.** Same shape as above:
  - [`tasks/mvp/02-tooling/07-task-status-ledger.md`](../../tasks/mvp/02-tooling/07-task-status-ledger.md)
    lines 29, 43, 71, 119, 124 — references `DEC-004 § "Manual
    prerequisite"`, including a `Read First` link to this log.
  - [`tasks/task-registry.json`](../../tasks/task-registry.json)
    (generated) — mirrors the above.

  The manual-prerequisite text (branch-protection toggle on `main`)
  was inlined into the task and the
  [`Validate Repo Contracts` workflow](../../.github/workflows/validate.yml)
  rationale on 2026-05-09; the lingering `DEC-004 §` references
  point at a section that no longer exists in this log. Same fix
  shape — point at the canonical inlined location, not the retired
  ID. Skill did not edit (Hard Prohibition D).
