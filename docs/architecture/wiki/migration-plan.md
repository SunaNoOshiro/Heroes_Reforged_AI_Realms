# UI Screen Package Migration Plan

Historical record of the folder-shape migration that consolidated the
legacy `wireframes/` and `wireframes_v2/` sources into numbered screen
packages under [`screens/`](./screens/). Top-level migration is
complete; this file documents what was done and the shape contract
any new package must still satisfy. The live authoring rules are
owned by [`README.md`](./README.md) — defer to it on conflict.

> Companion docs:
>
> - [`README.md`](./README.md) — canonical folder shape, file-by-file
>   contracts, and screen-package authoring rules.
> - [`screen-curation-plan.md`](./screen-curation-plan.md) — batch
>   tracker for the curated rewrite of each package.
> - [`missing-states.md`](./missing-states.md) — variant-state queue
>   layered on top of the migrated shape.
> - [`screens/index.json`](./screens/index.json) — authoritative
>   group order and sidebar contract.

## 1. Final folder structure

```text
docs/architecture/wiki/
  README.md
  migration-plan.md
  missing-states.md
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
    24-town-screen/
      mockup.html
      spec.md
      interactions.md
      data-contracts.md
      architecture.md
    ...
```

Each folder is one numbered screen package. The number is shared by
the mockup, spec, interaction map, data contract, screen-architecture
diagram, wiki sidebar entry, and UI task references.
[`screens/index.json`](./screens/index.json) groups packages and must
list every screen exactly once.

## 2. Migration steps (completed)

1. Move each legacy visual source into
   `docs/architecture/wiki/screens/<nn-screen>/mockup.html`.
2. Move or rewrite each legacy Markdown spec into the matching
   `spec.md`.
3. Add `interactions.md` beside each mockup and spec, covering every
   control, hotkey, command, route, state update, animation, sound,
   disabled case, and error case.
4. Add `data-contracts.md` beside the interaction map, covering
   content schemas, selectors, configs, localization keys, asset IDs,
   save fields, replay fields, validation, and fallback rules.
5. Add `architecture.md` beside the data contract. Use small,
   screen-specific Mermaid diagrams for screen load, state refresh,
   important interactions, data updates, transitions, and
   deterministic / content rules.
6. Add each screen package to exactly one category in
   [`screens/index.json`](./screens/index.json).
7. Retire legacy `docs/architecture/wireframes/*.md` and
   `docs/architecture/wireframes_v2/*.html`; do not add new files
   there. (Both folders are now removed from the repo.)
8. Keep general architecture diagrams in
   [`../diagrams/`](../diagrams/). Do not mix global flows with
   screen-specific architecture diagrams.
9. Reference the relevant numbered screen package from UI task files
   so the implementer has the visual, behavior, data, and logic
   contract together.
10. Run `npm run generate:wiki` to merge architecture docs, general
    diagrams, and screen packages into
    [`../architecture-wiki.html`](../architecture-wiki.html).

## 3. Shape-contract notes

These constraints survived the migration and still bind any new
package. They restate clauses owned canonically by
[`README.md`](./README.md); that file wins on drift.

- Wiki top-level modes are **Docs**, **General Diagrams**, and
  **UI Screens**.
- [`screens/index.json`](./screens/index.json) assigns each package
  to one group. Package numbers follow group order, so the sidebar
  reads in natural numeric sequence.
- Each screen page exposes five tabs: **Mockup**, **Spec**,
  **Interactions**, **Data Contracts**, and **Architecture Diagrams**.
- The legacy `states/default.md` shape is retired. A single-state
  screen is represented by its screen package directly.

---

## 🔍 Sync Check

- **UI: ✔** — Folder shape matches [`screens/`](./screens/) (packages `01-main-menu` through `77-multiplayer-game` all present) and the five-tab contract matches [`README.md` § 1](./README.md#1-folder-structure). Legacy `wireframes/` and `wireframes_v2/` folders are gone, confirming step 7 is closed.
- **Schema: ✔** — No schema claims in this doc; folder shape only. Schema-bearing rules (hotkey, error-state, animation states) are owned by [`README.md` § 6.3](./README.md#63-schema-and-contract-pins).
- **Tasks: ✔** — No task coupling claimed; UI-task referencing is delegated to [`README.md` § 6.4](./README.md#64-task-coupling). No orphan tasks reference this file.

## ⚠ Issues

- **Doc reframed as historical, not active.** All ten steps in § 2 are complete: 77 numbered packages exist under [`screens/`](./screens/), and `docs/architecture/wireframes/` / `docs/architecture/wireframes_v2/` are absent from the tree. The intro and `(completed)` qualifier surface that explicitly; the imperative step list is preserved verbatim so the shape contract remains readable. Live queues (curation, variant states) stay owned by [`screen-curation-plan.md`](./screen-curation-plan.md) and [`missing-states.md`](./missing-states.md) — no scope shift implied.
- **`_templates/` folder not represented in the migration plan.** [`_templates/animation-states.md`](./_templates/animation-states.md) and [`_templates/contract-sweep.md`](./_templates/contract-sweep.md) post-date the folder-shape migration and are referenced by [`README.md` § 6.3](./README.md#63-schema-and-contract-pins), [`screen-curation-plan.md`](./screen-curation-plan.md), and [`missing-states.md`](./missing-states.md). Not added to the step list (out of scope for a historical migration record); surfaced here so a future reader knows the shape grew after migration closed.
