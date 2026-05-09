# Heroes Reforged AI Realms

A deterministic turn-based strategy game with extensible content
packs. Three contracts dominate every change here:

1. **Determinism.** Saves, replays, and multiplayer must be byte-
   identical for the same inputs.
2. **Content packs are the extension boundary.** New factions, worlds,
   spells, artifacts, and animations enter as pack content — not
   engine branches.
3. **Stable IDs are public API.** Renaming an ID requires a migration.

For the architecture map, see
[`docs/architecture/INDEX.md`](docs/architecture/INDEX.md). For
per-area rules, see [`.claude/rules/`](.claude/rules/) (loads on
demand). For decisions, see
[`docs/planning/decision-log.md`](docs/planning/decision-log.md).

## Hard constraints (CI-enforced)

- Gameplay records never embed raw asset paths; runtime consumes IDs,
  manifests, and registries.
- Every persisted field is registered in
  [`docs/architecture/data-inventory.md`](docs/architecture/data-inventory.md).
  New persistent slices without an inventory row fail CI.
- All persisted state lives in IndexedDB unless
  [`persistence.md`](docs/architecture/persistence.md) exempts it.
  `localStorage` and `document.cookie` are banned in `src/`.
- OS / browser API usage is bounded by
  [`permissions.md`](docs/architecture/permissions.md). New APIs
  require an architecture amendment.
- Schema evolution is additive-first; alias before remove. The
  lifecycle is in
  [`enum-lifecycle-policy.md`](docs/architecture/enum-lifecycle-policy.md).
- Missing presentation may fall back; missing gameplay requirements
  must fail loudly per
  [`fail-loud.md`](docs/architecture/fail-loud.md).
- Information secrecy is **not** provided by symmetric input-only
  lockstep. Multiplayer features that depend on hidden information
  must be gated per
  [`security-model.md`](docs/architecture/security-model.md).
- Every byte from a peer browser, DataChannel, WebSocket frame, pack
  archive, save file, AI prompt, AI completion, or worker
  `postMessage` is **adversarial input** until validated by a named
  gate per
  [`trust-boundaries.md`](docs/architecture/trust-boundaries.md).
- The repo license is MIT (see [LICENSE](LICENSE)). New deps must
  satisfy
  [`dependency-policy.md`](docs/architecture/dependency-policy.md).

## Restricted files (do not edit)

The canonical list is in
[`.agents/settings.json#permissions.deny`](.agents/settings.json) and
[`.agents/codex.config.toml`](.agents/codex.config.toml). Both are
read by their respective harnesses and enforced at the tool layer.
**Do not edit any path on those lists** without explicit owner
approval — surface the proposed diff first.

Bypasses are forbidden:

- `git commit --no-verify`, `git push --no-verify`
- `node -e "…"`, `python -c "…"`, `python3 -c "…"`
- shell redirection (`>`, `>>`, `tee`, `tee -a`, `sed -i`) into any
  restricted file

## Workflow

```
npm run tasks:next            # ready queue (--phase=mvp for autonomous loop)
npm run tasks:show -- <id>    # one task's full spec
npm run tasks:start -- <id>   # mark in-progress, regen registry
… implement, staying within Owned Paths …
npm run tasks:done -- <id>    # runs verifyCommands; flips status only on success
```

Status lives **only** in
[`tasks/task-status.json`](tasks/task-status.json) (the ledger);
per-task `.md` files no longer carry a `Status:` field. Hand-edits
to the ledger fail `validate:status-ledger`.

For code-path tasks, `verifyCommands` runs (in order):

1. `npm run validate` — repo-wide invariants.
2. `npm test` — script unit tests.
3. **structural pre-checks** — `validate:duplication`,
   `validate:smells`, `validate:dead-code`.
4. `npm run test:coverage` — measure coverage.
5. `npm run test:mutation:changed` — measure mutation score.
6. **mutation gate** — `validate:mutation-score`,
   `validate:coverage-floor`.

The trust anchor is the GitHub Actions `Validate Repo Contracts`
workflow at
[`.github/workflows/validate.yml`](.github/workflows/validate.yml),
which re-runs `npm run validate` on a fresh checkout. Branch
protection on `main` must require it as a status check; without that
toggle the gate is honor-system only.

Treat `Owned Paths`, `Owned Paths (shared)`, and `Dependencies` as
separate contracts. Dependencies are scheduling constraints only;
they do **not** grant write permission to the dependency task's
files.

## Skills (auto-trigger)

These skills under [`.agents/skills/`](.agents/skills/) own the gate
doctrine. They are the single source of truth for the gates; this
file points to them, never duplicates them.

- **task-tdd** — red → green → refactor cycle for new tasks. Hands
  off to `mutation-test` once green.
- **structural-checks** — fix `validate:duplication`,
  `validate:smells`, `validate:dead-code` failures. Right-fix shapes
  per category, anti-cheat rules A–E.
- **mutation-test** — kill mutants by ADDING test assertions only.
  Anti-cheat A–H. Hands back to `task-tdd` when a refactor is
  required.

## Engineering boundaries

- TypeScript with `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`.
- React in `src/ui/`; deterministic engine in `src/engine/`; rules in
  `src/rules/`; schemas in `src/content-schema/`; pack runtime in
  `src/content-runtime/`.
- `src/contracts/` is **generated** from `content-schema/schemas/` by
  `npm run generate:contracts`. Do not hand-edit.
- Side effects allowed per module are listed in
  [`side-effect-matrix.md`](docs/architecture/side-effect-matrix.md).
  Engine and rules are pure-function only.
- Cross-module imports are bounded by
  [`module-graph.md`](docs/architecture/module-graph.md). CI catches
  violations via `npm run validate:arch`.

For per-module rules, see
[`.claude/rules/{engine,ui,content,services,tasks,scripts}.md`](.claude/rules/).

## After editing

| Touched | Run |
|---|---|
| Any `enum: […]` array or `const:` value in a schema | `npm run generate:enum-snapshot`, commit diff |
| Schema with TS counterpart in `src/contracts/` | `npm run generate:contracts`, commit diff |
| Anything broad | `npm run validate` (CI re-runs it on every PR) |

Scripts under `scripts/` ship as `.mjs` until the Vite/TS bootstrap
task lands; after that the runner becomes Vitest. The locked runner
+ mutation-gate values (Vitest 4.x, StrykerJS 9.x, per-module
thresholds) live in
[`testing-conventions.md` § 9](docs/architecture/testing-conventions.md).

## Folder map

- [`content-schema/`](content-schema/) — canonical JSON schemas
- [`src/`](src/) — runtime code (engine, rules, ui, contracts, …)
- [`services/`](services/) — backend adapters (signaling, AI gateway)
- [`docs/architecture/`](docs/architecture/) — design rules; see
  [`INDEX.md`](docs/architecture/INDEX.md)
- [`docs/planning/`](docs/planning/) — milestones, decision log
- [`tasks/`](tasks/) — implementation work files (one per task)
- [`resources/`](resources/) — packs and assets
- [`research/`](research/) — internal baselines for balance work

## Patterns

**Prefer:** composition over inheritance, `type` / `kind`
discriminated unions, declarative effect arrays, registries and lookup
tables over switch-heavy code, pure functions in deterministic code,
adapters at boundaries (pack loader, schema validator, renderer asset
resolver).

**Avoid:** deep inheritance trees, hidden magic fallbacks, raw asset
paths in gameplay data, hardcoded first-party content in engine code,
god-objects mixing sim / UI / content / render.

## Agent config layout

Per-tool harness configuration is single-sourced in
[`.agents/`](.agents/), with tool-specific directories holding
symlinks back to the canonical files:

- [`.agents/settings.json`](.agents/settings.json) ↔
  `.claude/settings.json` (Claude Code permissions)
- [`.agents/skills/`](.agents/skills/) ↔ `.claude/skills/`
- [`.agents/rules/`](.agents/rules/) ↔ `.claude/rules/`
- [`.agents/codex.config.toml`](.agents/codex.config.toml) ↔
  `.codex/config.toml` (Codex CLI permissions)

<!-- Maintainer notes: this file targets <200 lines per Anthropic's
     CLAUDE.md guidance (code.claude.com/docs/en/memory#write-effective-instructions).
     Per-module detail moved to .claude/rules/<area>.md (path-scoped,
     loads on demand). Architecture index moved to
     docs/architecture/INDEX.md (loads on demand).
     Restricted-files list is now single-sourced in
     .agents/settings.json#permissions.deny — no markdown duplicate
     to drift. -->
