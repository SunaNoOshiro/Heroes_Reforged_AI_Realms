# Planning Docs

This folder contains delivery planning, execution sequencing, audits,
and current-state reports. Use it after you understand the architecture
and need to decide what to build next.

## Start Here

- `roadmap.md`
  Milestones, phase boundaries, and what "M0/M1/M2" mean in practice.
- `solo-build-lane.md`
  Smallest sensible path for a solo developer using AI assistance.
- `../../tasks/README.md`
  Execution board and module/task index.
- `implementation-log.md`
  Current-state snapshot of what is actually in the repo today.
- `task-system-report.md`
  Generated AI-navigation and audit snapshot. It maps screen packages
  and schemas to owning tasks and reports dependency health.

## Audits and Reports

All audit, refactor, and implementation-report files live in
[`audits/`](./audits/) (moved 2026-04-22 to keep the top level
focused on durable planning docs). Most recent first:

- `audits/audit-2026-04-22-full-repo.md`
  Full independent repo audit (2026-04-22).
- `audits/repo-hardening-2026-04-22.md`
  Planning cleanup, task hardening, and AI-navigation improvements.
- `audits/audit-2026-04-21-implementation-report-v2.md`
  Implementation pass that closed the highest-risk schema and task
  issues from the prior full audit.
- `audits/refactor-2026-04-21-report.md`
  Hygiene pass that removed duplicate planning indirection.
- `audits/audit-2026-04-21-full-repo.md`
  Full independent repository audit (2026-04-21).
- `audits/audit-2026-04-21-implementation-report.md`
  First implementation response to the 2026-04-21 audit.
- `audits/audit-2026-04-20.md`
  Earlier audit snapshot kept for historical context.

## Generated Artifacts

- `../../tasks/task-registry.json`
  Generated machine-readable task index. Regenerate with
  `npm run generate:task-registry`; do not edit by hand.
- `task-system-report.md`
  Generated readable task-system report. Regenerate with
  `npm run generate:task-system-report` after task, screen, schema, or
  task-script changes.

Historical reports remain in this folder on purpose. They describe the
state of the repo at the time they were written and should not be
rewritten retroactively.
