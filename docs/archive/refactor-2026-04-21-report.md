# Refactor Report — 2026-04-21 (Follow-up Pass)

Follow-up hygiene pass that runs after
[`audit-2026-04-21-implementation-report.md`](./audit-2026-04-21-implementation-report.md).
That report's **Remaining Risks** section listed six items; this pass
closes the cheap ones without pulling any runtime code forward.

Every change below is applied in the working tree and passes
`npm run validate` + `npm test`.

---

## 1. Updated File Structure (delta only)

```
+ CONTRIBUTING.md                                 (new — cookbook)
+ docs/planning/refactor-2026-04-21-report.md     (this file)
- docs/planning/executable-backlog.md             (deleted — was a pointer)
~ docs/planning/README.md                         (updated index)
~ docs/planning/implementation-log.md             (logged the deletion + gitignore)
~ README.md                                       (links CONTRIBUTING.md)
~ .gitignore                                      (ignores tasks/task-registry.json)
- tasks/task-registry.json                        (no longer tracked; still generated)
```

The rest of the repo layout is unchanged from the 2026-04-21 audit
implementation report.

---

## 2. What Changed And Why

### 2.1 Generated task registry is no longer committed

**Symptom.** The audit remaining-risk #5 (and audit #N3) flagged
`tasks/task-registry.json` — a generated 6,745-line JSON — as a
source of diff noise that would balloon every PR.

**Change.**
- Added `tasks/task-registry.json` to [`.gitignore`](../../.gitignore).
- `git rm --cached tasks/task-registry.json`.
- `npm run validate` regenerates it before any contract check, so
  nothing downstream breaks.
- CI runs `npm run validate`
  ([`.github/workflows/validate.yml`](../../.github/workflows/validate.yml))
  which already starts with `generate:task-registry`, so the
  validator's required-path check (`tasks/task-registry.json`) still
  finds the file at validation time.
- Tests (`scripts/__tests__/task-registry.test.mjs`) consume the
  in-memory registry via `buildTaskRegistry()`, so they do not
  depend on the file existing either.

**Effect.** PRs that touch tasks now show a minimal Markdown diff
instead of ±1000-line JSON churn.

### 2.2 Deleted `executable-backlog.md`

**Symptom.** The previous pass reduced this file to a 10-line
pointer. A pointer file is index-like navigation cruft — another
place to drift.

**Change.**
- Removed [`docs/planning/executable-backlog.md`](./)
  (deleted from index and working tree).
- Updated [`docs/planning/README.md`](../README.md) to link
  `tasks/README.md` directly and to list the refreshed planning
  doc set.
- Logged the removal in
  [`implementation-log.md`](../planning/implementation-log.md).
- Historical audit docs are left untouched — they correctly
  describe the state at the time they were written.

**Effect.** One fewer indirection. `tasks/README.md` is now the
unambiguous single source of truth for execution order.

### 2.3 Added `CONTRIBUTING.md` cookbook

**Symptom.** Audit nice-to-have #N2 called for a cookbook. Without
one, every AI agent re-derives "how do I add an effect kind" from
scattered schema/task files.

**Change.** Created [`CONTRIBUTING.md`](../../CONTRIBUTING.md) with
four cookbook sections:
- Add a new schema (file suffix mapping, example record, schema
  matrix update, validation rules).
- Add a new effect kind (closed discriminated union, handler
  exhaustiveness, docs, example).
- Add a new task file (sizing, placement, registry regen).
- Modify a formula (AST-only, closed opcode set, fixed-point math,
  no `eval`).
- Plus a Definition-of-Done checklist that mirrors the CI gates.

[`README.md`](../../README.md) now links to it in the "Use these
when needed" section.

**Effect.** New contributors (human or agent) land on a step-by-step
path with clickable links to every supporting file, instead of
reverse-engineering conventions.

---

## 3. What Was Evaluated And Deferred

The following were considered as part of this pass and intentionally
*not* applied. Each is recorded here so a future pass doesn't
re-evaluate them cold.

### 3.1 Merging `06b-visual-fidelity` into `06-renderer`

Audit #N6 called this out. Inspection showed
`tasks/mvp/06b-visual-fidelity/` contains **15 sized task files**,
not a stub. Merging is real scope-shuffling, not hygiene, and it
would churn cross-references across the module index, the task
registry, and the implementation log. Defer to a dedicated module-
reorganization pass.

### 3.2 Renaming `02b-asset-pipeline`

The "b" suffix in `02b-asset-pipeline` mirrors `06b-visual-fidelity`
but is load-bearing: task 10 of that module
(`10-migrate-emberwild-pack-to-this-structure.md`) owns the canonical
pack layout migration and is referenced from
`docs/architecture/pack-contract.md`. Don't rename until the
canonical pack layout actually ships.

### 3.3 Pulling runtime work forward

Remaining-risks 1–3 (runtime code, cross-record invariants,
content-hash computation) are all by-design deferred to the engine-
core execution pass. A paper-only pass cannot safely close them.

---

## 4. CI Gate Status After This Pass

Run on 2026-04-21:

- `npm run validate` — **pass**
  - `generate:task-registry` — 167 tasks, 21 modules
  - `validate:links` — all Markdown links resolve
  - `validate:contracts` — all example records validate; no
    forbidden-pattern hits; all required paths present
- `npm test` — **3 / 3 tests pass**

No change in counts vs. the previous pass — this was hygiene, not
content.

---

## 5. Remaining Risks (revised)

Carrying forward from the implementation report's list with status
updates. Items marked **[closed]** are now resolved.

1. **Runtime code does not exist yet.** Unchanged. This is structural
   and only closes when `src/` starts shipping code.
2. **Schemas describe shape, not cross-record invariants.** Unchanged.
   Coherence-check task lives in phase-3.
3. **Content-hash is only reserved, not computed.** Unchanged. Closes
   when [`01-engine-core/07b-canonical-json.md`](../../tasks/mvp/01-engine-core/07b-canonical-json.md)
   lands.
4. **Forbidden-pattern regex rules can regress.** Unchanged. Future
   vendored content may need an explicit allowlist in
   [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs).
5. ~~`tasks/task-registry.json` is committed generated output.~~
   **[closed]** — now gitignored; regenerated by CI.
6. **Baseline corridor is authored, not measured.** Unchanged. Closes
   when the auto-balancer produces real Wilson CIs at scale.

New risks introduced by this pass: none identified.

---

## 6. How To Verify

```bash
npm install
npm run validate
npm test
```

Expected output: `Wrote 167 tasks and 21 modules to
tasks/task-registry.json`, `All Markdown links resolve.`, `Repo
contract checks passed.`, and `pass 3 / fail 0`.
