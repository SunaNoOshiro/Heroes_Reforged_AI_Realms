---
paths:
  - "scripts/**"
---

# Repo scripts

Validators, generators, and CLI tooling for the task / mutation /
structural gates. Many files here are on the **anti-cheat surface**
listed in [`.agents/settings.json#permissions.deny`](../../.agents/settings.json) —
do not edit those without explicit owner approval.

## Authoring conventions

- Scripts under `scripts/` ship as `.mjs` until the Vite/TS bootstrap
  task lands ([mvp.01-engine-core.02](../../tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md)).
- Tests under `scripts/__tests__/` are `.mjs` and run via
  `node --test`.
- After the bootstrap task lands, the runner becomes Vitest per
  [DEC-003](../../docs/planning/decision-log.md).
- Detail in
  [`testing-conventions.md` § 8](../../docs/architecture/testing-conventions.md).

## Bypasses are forbidden

Do **NOT** use any of the following to bypass a gate:

- `git commit --no-verify`, `git push --no-verify`
- `node -e "…"`, `python -c "…"`, `python3 -c "…"`
- shell redirection (`>`, `>>`, `tee`, `tee -a`, `sed -i`) into any
  restricted file

## Validate-* family

A script named `scripts/validate-<x>.mjs` is wired into a
`validate:<x>` npm script and into the `validate` aggregate. Every
new validator must:

1. Be invocable directly: `node scripts/validate-<x>.mjs`.
2. Exit non-zero on failure with actionable error output.
3. Be referenced from `package.json#scripts.validate` so it runs in CI.
4. Be referenced somewhere in the repo (otherwise
   [`scripts/check-unused-scripts.mjs`](../../scripts/check-unused-scripts.mjs)
   flags it as orphan).

## Structural gates produced here

- [`validate-duplication.mjs`](../../scripts/validate-duplication.mjs) — jscpd
- [`validate-smells.mjs`](../../scripts/validate-smells.mjs) — ESLint + sonarjs + unicorn
- [`validate-dead-code.mjs`](../../scripts/validate-dead-code.mjs) — knip
- [`validate-suppression-audit.mjs`](../../scripts/validate-suppression-audit.mjs) — anti-cheat for smells
- [`validate-knip-ignores.mjs`](../../scripts/validate-knip-ignores.mjs) — anti-cheat for dead-code

The doctrine is in
[`.claude/skills/structural-checks/SKILL.md`](../../.claude/skills/structural-checks/SKILL.md).
