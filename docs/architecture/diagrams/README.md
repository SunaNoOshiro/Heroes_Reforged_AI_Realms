# Architecture Diagrams

Game-flow scenarios as standalone Mermaid diagrams. Each `<id>.md`
is a self-contained, AI-readable explanation of one runtime behavior
(e.g. how a castle is rendered for the chosen race, how an attack
animation is sequenced, how localization resolves a string).

## Companion docs

- [`../README.md`](../README.md) — architecture doc index
- [`../state-flow.md`](../state-flow.md) — command dispatcher these
  diagrams illustrate
- [`../command-schema.md`](../command-schema.md) — canonical command
  shapes referenced in the battle and town flows
- [`../content-platform.md`](../content-platform.md) — pack and asset
  rules referenced in the asset-loading flows

## 1. Normative status

**Diagrams are normatively secondary to task acceptance criteria.**
If a diagram and the cited task spec disagree, the task wins — patch
the diagram to match.

The CI gate
[`scripts/check-diagram-task-parity.mjs`](../../../scripts/check-diagram-task-parity.mjs)
catches the previously-observed divergence patterns:

- **save-flow** showing a `state` blob alongside the log
  ([`24-save-flow.md`](./24-save-flow.md) is log-only per
  [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../../tasks/mvp/08-persistence/02-log-only-save-format.md))
- **multiplayer-sync** showing "resync from last good state" without
  citing the bisect → report → quit ladder
  ([`26-multiplayer-sync.md`](./26-multiplayer-sync.md) shows the
  three-step ladder per
  [`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md))
- **DAMAGE_FRAME** drawn as an engine→renderer callback (the
  contract is engine-emit-only, owned by
  [`animation-contract.md` § DAMAGE_FRAME Ownership](../animation-contract.md#2-damage_frame-ownership))

## 2. Source of truth

- `index.json` — manifest listing every diagram, grouped into
  categories. Current categories: Game Lifecycle, Town & Castle,
  Battle System, Asset Loading, Localization, Animation, Save &
  Load, Multiplayer, UI Input.
- `<id>.md` — one diagram per file. The `id` matches the entry in
  `index.json`.

The `.md` files are canonical. They are rendered into the unified
[`../architecture-wiki.html`](../architecture-wiki.html) viewer
(under the 🎯 Diagrams tab) — never edit the wiki directly.

## 3. File format

Each diagram file uses the same shape so AI agents and humans can
parse it the same way:

```markdown
---
id: "03-race-castle"
title: "Race Selection → Castle Determination"
category: "lifecycle"
short: "3. Race → Castle"
---

**One-line summary in bold at the top.** Then a short paragraph
explaining when this flow runs and why it exists.

` ` `mermaid
flowchart LR
    ...
` ` `

## Notes

Free-form prose: implementation hints, edge cases, gotchas.
```

Frontmatter fields:

| Field | Required | Purpose |
|-------|----------|---------|
| `id` | yes | Must match the `<id>` in `index.json` and the filename |
| `title` | yes | Shown as the diagram heading in the viewer |
| `category` | yes | Must match a category id in `index.json` |
| `short` | no | Short label used in the sidebar; falls back to `title` |

## 4. Authoring rules

- One diagram per file. Don't bundle multiple Mermaid blocks.
- The first body paragraph is treated as the description shown
  above the diagram in the viewer — keep it tight.
- Use only Mermaid syntax types Mermaid v10 understands:
  `flowchart`, `sequenceDiagram`, `stateDiagram-v2`, `classDiagram`.
- Avoid HTML inside Mermaid labels; `<br/>` is the only safe break.
- Keep node labels short. Long sentences belong in the prose, not
  the diagram.

## 5. Adding a new diagram

1. Pick a kebab-case id, e.g. `32-encounter-resolution` (use the
   next free numeric prefix).
2. Create `docs/architecture/diagrams/<id>.md` following § 3.
3. Add `<id>` to the appropriate category's `diagrams` array in
   `index.json`. Add a new category there if none fit.
4. Run `npm run generate:wiki` to regenerate the offline viewer.
5. Open `../architecture-wiki.html`, switch to the 🎯 Diagrams tab,
   and verify the diagram renders.

## 6. Editing an existing diagram

1. Edit the `.md` file.
2. Run `npm run generate:wiki` to refresh the bundled viewer.

No other files need updating. The wiki is regenerated from scratch
on every build.

## 7. Why one file per diagram

- AI agents can `Read` a single scenario without scanning the whole
  architecture corpus.
- Diffs are small and reviewable when one diagram changes.
- New diagrams don't conflict with existing ones in version control.
- The bundled HTML is reproducible from the `.md` files at any
  commit.

---

## 🔍 Sync Check

- **UI: ✔** — No UI-spec claims in the target; the wiki viewer
  reference resolves
  ([`../architecture-wiki.html`](../architecture-wiki.html)) and
  `npm run generate:wiki` maps to
  [`scripts/generate-architecture-wiki.mjs`](../../../scripts/generate-architecture-wiki.mjs)
  in `package.json`.
- **Schema: ⚠** — `index.json`'s registered categories include `UI
  Input`, which the prior list omitted (now corrected inline). Four
  on-disk diagrams (`26-pointer-event-routing`,
  `27-component-resolution`, `28-loading-orchestration`,
  `trust-zones`) are not registered in `index.json`; see ⚠ Issues.
- **Tasks: ✔** — Both task IDs cited in § 1 resolve:
  [`tasks/mvp/08-persistence/02-log-only-save-format.md`](../../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  and
  [`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md);
  the DAMAGE_FRAME anchor now matches the canonical
  [`animation-contract.md` § 2](../animation-contract.md#2-damage_frame-ownership)
  form used by
  [`renderer-technology-choice.md`](../renderer-technology-choice.md)
  and [`16-enter-battle.md`](./16-enter-battle.md).

## ⚠ Issues

- **Orphan diagrams not registered in `index.json`.** Four diagram
  files exist on disk but no row in
  [`index.json`](./index.json) lists them:
  `26-pointer-event-routing.md` and `27-component-resolution.md`
  (frontmatter `category: "ui"`),
  `28-loading-orchestration.md` (`category: "system"`), and
  `trust-zones.md` (no frontmatter — uses `# Diagram — Trust Zones`
  prose form, owner-doc
  [`../trust-boundaries.md`](../trust-boundaries.md)). Per § 2 of
  this file ("`<id>.md` … matches the entry in `index.json`") and
  § 5 step 3, every diagram must be registered. The fix belongs in
  `index.json` (the cross-checked file), not here. Suggested values:
  add a `ui` category (entries `26-pointer-event-routing`,
  `27-component-resolution`) and a `system` category (entry
  `28-loading-orchestration`); decide whether `trust-zones.md`
  becomes a numbered diagram with frontmatter or is excluded by
  filename convention in
  [`generate-architecture-wiki.mjs`](../../../scripts/generate-architecture-wiki.mjs).
- **Numeric-prefix collision on `26-`.** Both
  [`26-multiplayer-sync.md`](./26-multiplayer-sync.md) (registered)
  and `26-pointer-event-routing.md` (orphan, above) share the `26-`
  prefix. The kebab-case ids themselves differ so the
  `index.json`-vs-filename contract still holds for the registered
  one, but the duplicate prefix violates the implicit "next free
  numeric prefix" convention in § 5 and will confuse future
  authors. Resolve by renaming the orphan when it is registered
  (e.g. `32-pointer-event-routing.md`).
- **Frontmatter `category` vs `index.json` category id.**
  [`29-input-arbitration.md`](./29-input-arbitration.md) declares
  `category: "ui"` in its frontmatter, but
  [`index.json`](./index.json) groups it under category id
  `ui-input`. § 3's frontmatter table says `category` "Must match a
  category id in `index.json`" — one of the two sides is wrong.
  Decision belongs to whoever owns the wiki generator
  ([`generate-architecture-wiki.mjs`](../../../scripts/generate-architecture-wiki.mjs)):
  either change the frontmatter to `ui-input` or rename the
  `index.json` category to `ui`. Skill did not touch either file
  (Hard Prohibition D).
