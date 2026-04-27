# Architecture Wiki Sources

This folder contains the source files consumed by `npm run generate:wiki`.
The generated wiki is a read-only viewer; the files below are the
canonical implementation contracts.

## Folder Structure

```text
docs/architecture/wiki/
  README.md
  migration-plan.md
  missing-states.md
  screen-curation-plan.md
  screens/
    index.json
    01-main-menu/
      mockup.html
      spec.md
      interactions.md
      data-contracts.md
      architecture.md
    02-new-game-setup/
      mockup.html
      spec.md
      interactions.md
      data-contracts.md
      architecture.md
    ...
```

## Source Of Truth

- Visual state: `docs/architecture/wiki/screens/<nn-screen>/mockup.html`
- Components and state bindings: `docs/architecture/wiki/screens/<nn-screen>/spec.md`
- Per-control behavior: `docs/architecture/wiki/screens/<nn-screen>/interactions.md`
- Schema, config, localization, save/replay, and asset links: `docs/architecture/wiki/screens/<nn-screen>/data-contracts.md`
- Screen data flow and command flow diagrams: `docs/architecture/wiki/screens/<nn-screen>/architecture.md`
- Screen group order: `docs/architecture/wiki/screens/index.json`
- Curation tracker: `docs/architecture/wiki/screen-curation-plan.md`
- General architecture diagrams: `docs/architecture/diagrams/*.md`
- Human browser: `docs/architecture/architecture-wiki.html`, generated only

Each screen package uses the same number and folder name for all five
screen-specific sources. The wiki generator loads those files together
and renders the screen tabs as Mockup, Spec, Interactions, Data
Contracts, and Architecture Diagrams.
The screen index assigns every UI package to one group. Package numbers
follow the same group order, and the wiki sidebar renders those groups
directly so each section reads in natural numeric sequence. General
diagrams stay separate under `docs/architecture/diagrams/`.

## UI Evolution Policy

UI layout, visual style, panel composition, navigation flow, component
structure, tooltips, modals, and other presentation details may evolve
after implementation. The screen package is the source of truth for
those changes: update the relevant `mockup.html`, `spec.md`,
`interactions.md`, `data-contracts.md`, and `architecture.md` files
before changing runtime UI code.

Runtime UI remains a presentation boundary. It reads gameplay through
selectors, stores transient UI-only state outside deterministic gameplay
state, and emits commands through the shared dispatch path. UI redesigns
must not directly mutate engine state, change command semantics, rename
stable IDs, alter save/replay contracts, or add raw asset paths to
gameplay records. If a better UI needs new gameplay data, add it through
an explicit schema, selector, command, migration, or task-owned contract
change.

## Authoring Rules

- Treat `screen-curation-plan.md` as the work queue for replacing
  scaffold-level packages with manually curated, screen-specific
  contracts.
- Add one numbered folder per screen package, e.g.
  `screens/48-level-up-dialog/`.
- Keep the number stable. It controls navigation order and makes task
  references unambiguous.
- Add the screen folder name to exactly one category in
  `screens/index.json`. The generator fails if the index references a
  missing screen, repeats a screen, or omits a screen.
- Put the visual contract in `mockup.html`. Annotate important elements
  with `data-component`, `data-state`, `data-action`, `data-i18n`, and
  `data-asset` where useful. Do not put explanatory specs or behavior
  prose in the HTML.
- Put component tree, state bindings, mechanics mapping, acceptance
  criteria, and AI implementation notes in `spec.md`.
- Put every button, hotkey, route, command, data update, animation,
  sound, disabled case, and error case in `interactions.md`.
- Put content schema, runtime selector, config, localization, asset,
  save/replay, and fallback references in `data-contracts.md`.
- Put small screen-specific Mermaid diagrams in `architecture.md`.
  Prefer separate diagrams for load, binding refresh, important
  interactions, data updates, and route transitions instead of one large
  diagram.
- Use an additional numbered package for a materially different UI state
  only when it needs its own visual, spec, and architecture contract.
- Do not put raw asset paths in gameplay state examples; use IDs.
- UI implementation tasks should list the relevant
  `docs/architecture/wiki/screens/<nn-screen>/` package in their Inputs
  and acceptance criteria.
- Run `npm run generate:wiki` after changing any screen package, general
  diagram, or architecture doc.
- Do not run `scripts/rework-legacy-screen-packages.mjs` for final UI
  work. It is guarded as a scaffold-only migration helper and can only
  run with `--write-scaffold`.
