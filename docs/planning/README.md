# Planning Docs

Delivery planning, execution sequencing, and current-state reports.
Use this folder after you understand the architecture and need to
decide what to build next. For the architecture map, see
[`../architecture/INDEX.md`](../architecture/INDEX.md).

## Start Here

- [`roadmap.md`](./roadmap.md) — Milestones, phase boundaries, and
  what `M0` / `M1` / `M2` mean in practice.
- [`solo-build-lane.md`](./solo-build-lane.md) — Smallest sensible
  path for a solo developer using AI assistance.
- [`../../tasks/README.md`](../../tasks/README.md) — Execution board
  and module/task index.
- [`implementation-log.md`](./implementation-log.md) — Current-state
  snapshot of what is actually in the repo today.
- [`decision-log.md`](./decision-log.md) — Cross-cutting locked
  decisions that don't have a single canonical source.
- [`deferred.md`](./deferred.md) — Items deliberately out of current
  scope; roadmap and tasks reference rows here.

## Audits and Reports

Audit, refactor, and implementation-report files live in
[`../archive/`](../archive/) (moved 2026-04-22 to keep the top
level focused on durable planning docs). Most recent first:

- [`audit-2026-04-22-full-repo.md`](../archive/audit-2026-04-22-full-repo.md)
  — Full independent repo audit (2026-04-22).
- [`repo-hardening-2026-04-22.md`](../archive/repo-hardening-2026-04-22.md)
  — Planning cleanup, task hardening, and AI-navigation improvements.
- [`audit-2026-04-21-implementation-report-v2.md`](../archive/audit-2026-04-21-implementation-report-v2.md)
  — Implementation pass that closed the highest-risk schema and task
  issues from the prior full audit.
- [`refactor-2026-04-21-report.md`](../archive/refactor-2026-04-21-report.md)
  — Hygiene pass that removed duplicate planning indirection.
- [`audit-2026-04-21-full-repo.md`](../archive/audit-2026-04-21-full-repo.md)
  — Full independent repository audit (2026-04-21).
- [`audit-2026-04-21-implementation-report.md`](../archive/audit-2026-04-21-implementation-report.md)
  — First implementation response to the 2026-04-21 audit.
- [`audit-2026-04-20.md`](../archive/audit-2026-04-20.md) —
  Earlier audit snapshot kept for historical context.

Historical reports remain in the archive on purpose. They describe
the state of the repo at the time they were written and should not
be rewritten retroactively.

## Generated Artifacts

Do not hand-edit. Regenerate after task, screen, schema, or
task-script changes.

| File | Regenerate with | Purpose |
|---|---|---|
| [`../../tasks/task-registry.json`](../../tasks/task-registry.json) | `npm run generate:task-registry` | Machine-readable task index. |
| [`task-system-report.md`](./task-system-report.md) | `npm run generate:task-system-report` | Readable AI-navigation and audit snapshot. Maps screen packages and schemas to owning tasks; reports dependency health. |

---

## 🔍 Sync Check

- **UI: ✔** — No UI surfaces in scope; this is an index page.
- **Schema: ✔** — No schemas in scope.
- **Tasks: ✔** — `tasks/README.md` and `tasks/task-registry.json`
  exist; `npm run generate:task-registry` and
  `npm run generate:task-system-report` are defined in
  [`package.json`](../../package.json).

## ⚠ Issues

- **Broken archive path prefix in the prior revision.** The previous
  list under "Audits and Reports" prefixed each entry with `audits/`,
  but `docs/archive/audits/` does not exist — the files live flat at
  `docs/archive/<name>.md`. Rewrote each entry as a relative link to
  `../archive/<name>.md` so the references resolve. No content
  change implied; only path repair.
- **Index omitted two durable planning docs.** The prior revision
  did not list `decision-log.md` or `deferred.md`, even though both
  exist in `docs/planning/` and are referenced from
  [`CLAUDE.md`](../../CLAUDE.md) ("For decisions, see
  `docs/planning/decision-log.md`") and from roadmap/task files
  (`deferred.md`). Added both to **Start Here** to keep the index
  honest. No new content authored.
