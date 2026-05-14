# Docs

Top-level index for project documentation. Each subfolder owns one
concern; pick the one whose question you are answering.

## Subfolders

- [`architecture/`](architecture/README.md) — system design, pack
  model, schema strategy, command schema, and the curated reading
  map at [`architecture/INDEX.md`](architecture/INDEX.md). Decide
  *how* the system should work here.
- [`planning/`](planning/README.md) — roadmap, milestones, solo
  build lane, current-state implementation log, decision log, and
  deferred register. Decide *what to build first and in what order*
  here.
- [`operations/`](operations/rollback-playbook.md) — runtime
  operations rules and runbooks (rollback playbook, error envelope,
  free-tier deploy, pack signing key, services runtime rules).
- [`legal/`](legal/compliance.md) — compliance posture, DPA
  checklist, erasure process, and processor inventory.
- [`archive/`](archive/) — historical audit, refactor, and
  implementation reports kept for context; not rewritten
  retroactively (moved out of `planning/` on 2026-04-22).

## Viewers

- [`architecture-wiki.html`](architecture-wiki.html) — read-only
  symlinked viewer for architecture docs, diagrams, and numbered UI
  screen packages. Open via `file://`; rebuild with
  `npm run generate:wiki` after editing source files.

---

## 🔍 Sync Check

- **UI: ✔** — Only structural link to the wiki viewer; the canonical description of its tabs and rebuild step lives in [`architecture/README.md`](architecture/README.md), and this file just points at it.
- **Schema: ✔** — File makes no schema, enum, or field claims; it is a directory index.
- **Tasks: ✔** — No task IDs are referenced. All `architecture/`, `planning/`, `operations/`, `legal/`, `archive/` and `architecture-wiki.html` link targets resolve on disk.

## ⚠ Issues

- **Subfolders without their own README.** [`operations/`](operations/), [`legal/`](legal/), and [`archive/`](archive/) have no `README.md`; this index links them via a representative file (or the folder itself for `archive/`), matching the convention used by [`architecture/README.md`](architecture/README.md) when pointing at `../operations/rollback-playbook.md`. If the docs owner wants a uniform `subdir/README.md` entry pattern across `docs/`, three small index files would close the gap; this skill cannot add them (Hard Prohibition D — never edit cross-checked files).
