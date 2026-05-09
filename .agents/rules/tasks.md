---
paths:
  - "tasks/**"
---

# Task system

Implementation work is organized as one Markdown file per task under
`tasks/<phase>/<module>/<id>.md`. The registry
[`tasks/task-registry.json`](../../tasks/task-registry.json) is **generated**
from those files; do not hand-edit it.

## Workflow

```
npm run tasks:pick                                  # the single recommended next task ID
npm run tasks:pick -- --show                        # same, plus full spec
npm run tasks:next                                  # ready queue (alphabetical)
npm run tasks:next -- --phase=mvp --hot --json      # parallel-dispatch queue (impact-sorted, machine-readable)
npm run tasks:show -- <id>                          # one task's full record
npm run tasks:start -- <id>                         # mark in-progress, regen registry
… implement within Owned Paths …
npm run tasks:done -- <id>                          # runs verifyCommands; flips on success
npm run tasks:revalidate -- <id>                    # promote a pre-gate "revalidate" task to a real done
```

## Status values

The ledger has five statuses:

- `planned` — default; work not started.
- `in-progress` — set by `tasks:start`.
- `done` — gate-verified; has `completedAtSha` + `verifyCommandsHash`.
- `blocked` — explicit, with `blockedReason` recorded.
- `revalidate` — work was completed pre-gate (or otherwise lacks the
  modern verify trail). Promoted to `done` by `tasks:revalidate`,
  which runs the task's verifyCommands against the current tree and
  records the most recent commit that touched the task path.

The previously-used `legacy: true` field was retired 2026-05-09 in
favor of the explicit `revalidate` status. Any new entry carrying
`legacy: true` is rejected by `validate:status-ledger`.

`tasks:pick` is the canonical "what should I do next?" command. It
returns one task ID (no list) **plus an explicit action label** — so
no task is silently skipped regardless of status. Priority order:

1. **`continue`** — any `in-progress` task; finish before starting new.
2. **`revalidate`** — any `revalidate` task (ordered MVP → phase-2 →
   phase-3 → phase-4, then by id). Promote with
   `tasks:revalidate -- <id>`.
3. **`implement`** — top-of-queue planned task with all deps satisfied;
   sorted by transitive downstream desc, then estimated time asc.
   Falls through MVP → phase-2 → phase-3 → phase-4.

The action label is printed to stderr (default mode) or returned in
the JSON payload (`--json`), so a piping shell `$(tasks:pick)` still
captures only the ID:

```
$ npm run --silent tasks:pick
mvp.00-core-architecture.arch-module-graph
# action: revalidate  |  reason: 12 task(s) awaiting revalidate; clearing mvp first
# next: npm run tasks:revalidate -- mvp.00-core-architecture.arch-module-graph
```

For parallel agents on disjoint `Owned Paths`, use `tasks:next` with
`--phase`, `--hot`, and `--json` flags to get the ranked machine-
readable queue (only `planned` tasks; revalidate work is a serial
clean-up, not parallel).

`npm run tasks:done` is the only path that writes to
[`tasks/task-status.json`](../../tasks/task-status.json) (the ledger).
Hand-edits to the ledger fail `validate:status-ledger`.

## Three contracts per task

Each task `.md` has three fields that are **separate contracts**:

- **Owned Paths** — the task's primary write responsibility. Only one
  task should primarily own a path.
- **Owned Paths (shared)** — additive extension points where another
  task owns the path. Extend without rewriting earlier behavior.
- **Dependencies** — scheduling/order constraints only. They do
  **NOT** grant permission to edit the dependency task's files.

Status is no longer carried in the per-task `.md`; it lives in the
ledger.

## Verify gate

`verifyCommands` are derived from each task in
[`scripts/lib/derive-verify-commands.mjs`](../../scripts/lib/derive-verify-commands.mjs)
(restricted). For code-path tasks the chain runs structural pre-checks
before the mutation gate (see the `structural-checks` and
`mutation-test` skills).

## Trust anchor

The GitHub Actions `Validate Repo Contracts` workflow at
[`.github/workflows/validate.yml`](../../.github/workflows/validate.yml)
re-runs `npm run validate` on a fresh checkout. Branch protection on
`main` (set in repo settings) must require it as a status check;
without that toggle the gate is honor-system only.

## Common after-edit commands

```
npm run validate:tasks    # task-system invariants
npm run validate          # before handoff
```
