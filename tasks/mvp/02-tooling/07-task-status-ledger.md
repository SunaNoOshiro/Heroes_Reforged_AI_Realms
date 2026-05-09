# Task Status Ledger

Module: [Test & Tooling Contracts (M0)](../02-tooling.md)

> **Forward note (2026-05-09):** the `legacy: true` exemption described
> below was retired and replaced by an explicit `revalidate` status.
> The 12 entries that originally carried `legacy: true` were migrated
> to `status: "revalidate"`. Promotion to a real `done` is now done via
> `npm run tasks:revalidate -- <id>`, which records `completedAtSha`
> from the most recent commit that touched the task path.
> `validate:status-ledger` rejects any new entry with `legacy: true`.
> The original spec is preserved below for historical accuracy.

Description:
Move task status out of every per-task `.md` file and into a single
structured ledger at `tasks/task-status.json`. The `Status:` field is
removed from all task `.md` files; the ledger becomes the only source
of truth read by `generate-task-registry`, `tasks:next`, `tasks:show`,
`tasks:start`, `tasks:done`, and `tasks:blocked`. Status flips happen
only by writing the ledger via the provided commands; hand-editing
the ledger is detected by a paired `validate:status-ledger` check
that verifies each `done` entry against `git`, the
implementation-log, and a recorded `verifyCommandsHash`. The trust
anchor for the gate is the existing `Validate Repo Contracts` GitHub
Actions workflow at `.github/workflows/validate.yml`, which re-runs
`npm run validate` (including `validate:status-ledger`) on a fresh
checkout for every PR. Branch-protection on `main` requiring this
workflow as a status check is a one-time manual toggle in repo
settings — see DEC-004 § "Manual prerequisite". CODEOWNERS was
considered and rejected because in a solo repo where the AI agent
commits using the human owner's GitHub identity, a CODEOWNERS rule
naming the owner is satisfied trivially by the agent acting as the
owner; only a CI status check that runs on a GitHub-hosted runner
(which the agent has no token for) is identity-independent.

This task closes the cheat path where an agent edits the status
field of a task .md by hand to fake completion, by removing the
field from the cheat surface entirely. It also makes status flips
diff-readable in PRs (one-line changes in one file, instead of
needle-in-haystack across 471 .md files).

Read First:
- [`docs/planning/decision-log.md`](../../../docs/planning/decision-log.md) DEC-004
- [`.claude/skills/mutation-test/SKILL.md`](../../../.claude/skills/mutation-test/SKILL.md)
- [`scripts/tasks.mjs`](../../../scripts/tasks.mjs)
- [`scripts/generate-task-registry.mjs`](../../../scripts/generate-task-registry.mjs)

Inputs:
- Existing `Status:` fields across 471 task `.md` files
- Existing `docs/planning/implementation-log.md` entries

Outputs:
- `tasks/task-status.json` — structured ledger seeded from current
  `.md` statuses; written only by `tasks:start`, `tasks:done`,
  `tasks:blocked`.
- `scripts/lib/task-status-ledger.mjs` — read/write module used by
  every `tasks:*` command and the registry generator.
- `scripts/check-status-ledger.mjs` — validator: every task in the
  registry has a ledger entry; no `Status:` line remains in any task
  `.md`; every `done` entry's `completedAtSha` exists in `git`,
  reachable from `main`, touches the task `.md` (or its companion
  files), and has a matching line in `implementation-log.md`.
- Updated `scripts/tasks.mjs` and `scripts/generate-task-registry.mjs`
  reading status exclusively from the ledger.
- The `Validate Repo Contracts` workflow at
  `.github/workflows/validate.yml` (already present) is reused as
  the trust anchor — `npm run validate` includes
  `validate:status-ledger`, so any hand-edit of the ledger fails CI.
  Enabling branch-protection on `main` to require this workflow as a
  status check is a manual repo-settings toggle, documented in
  DEC-004 § "Manual prerequisite"; it is not produced by this task.

Owned Paths:
- `tasks/task-status.json`
- `scripts/lib/task-status-ledger.mjs`
- `scripts/check-status-ledger.mjs`

Owned Paths (shared):
- `scripts/tasks.mjs` (primary owner:
  `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`;
  this task only swaps the status reader/writer to the ledger and does
  not rewrite the command-dispatch structure).
- `scripts/generate-task-registry.mjs` (primary owner:
  `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`;
  this task only replaces `parseStatus` with a ledger lookup and does
  not rewrite the registry shape).
- `package.json` (primary owner:
  `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`;
  this task contributes the `validate:status-ledger` script entry only).
- `CLAUDE.md` and `AGENTS.md` (primary owner: repo-level guidance;
  this task contributes the workflow-bullet update only — replaces
  "do not hand-edit `Status:`" with the ledger procedure).

Dependencies:
- mvp.01-engine-core.01-initialize-root-workspace-and-module-layout

Acceptance Criteria:
- After migration, no task `.md` under `tasks/` contains a line
  matching `^Status:\s*\S+\s*$`. `validate:status-ledger` enforces this.
- `tasks/task-status.json` has exactly one entry per task in the
  registry (count = 471 at migration time, growing additively as new
  tasks are added).
- `npm run tasks:next`, `tasks:show`, `tasks:start`, `tasks:done`,
  `tasks:blocked` continue to work and produce identical output to the
  pre-migration behavior, except status now comes from the ledger.
- `tasks:done` records `completedAt`, `completedAtSha` (current short
  SHA), and `verifyCommandsHash` (sha256 of the literal verifyCommands
  list at the time of the flip).
- `validate:status-ledger` fails if any `done` entry's
  `completedAtSha` is missing from `git`, is unreachable from `main`,
  has no matching line in `implementation-log.md`, or has a
  `verifyCommandsHash` that no longer matches the task's current
  verifyCommands (catches the late-stage cheat: weakening verify
  commands after marking done).
- The 12 currently-`done` tasks are seeded with `legacy: true` and
  exempted from `completedAtSha` / `verifyCommandsHash` enforcement
  with a one-shot allowlist check. New `done` flips after migration
  must not use the legacy exemption.
- DEC-004 records the trust-anchor decision (required CI status
  check on `main`) and the reasons CODEOWNERS was rejected for this
  setup. Setting up branch protection on `main` to require the
  `validate` workflow as a status check is a one-time manual toggle
  the human owner must perform in repo settings; it is documented
  in DEC-004 § "Manual prerequisite" and is not produced by this
  task.
- Shared paths (`scripts/tasks.mjs`,
  `scripts/generate-task-registry.mjs`, `package.json`, `CLAUDE.md`,
  `AGENTS.md`) are extended with additive scope only. This task
  must not rewrite the command-dispatch logic, the registry shape,
  the script catalogue order, or the doctrine clusters; the primary
  owner of each shared path remains as named in Owned Paths
  (shared) above.

Verify:
- npm run validate
- npm run validate:status-ledger
- npm run tasks:next

Estimated Time:
- 6 hours
