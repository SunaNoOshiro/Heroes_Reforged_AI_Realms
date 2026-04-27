# Architecture Diagrams

Game-flow scenarios documented as standalone Mermaid diagrams. Each
file is a self-contained, AI-readable explanation of one runtime
behavior (e.g. how a castle is rendered for the chosen race, how a
battle attack animation is sequenced, how localization resolves a
string).

## Source Of Truth

- `index.json` — manifest listing every diagram, grouped into
  categories (Game Lifecycle, Town & Castle, Battle System, Asset
  Loading, Localization, Animation, Save & Load, Multiplayer).
- `<id>.md` — one diagram per file. The `id` matches the entry in
  `index.json`.

The `.md` files are the canonical artifacts. They are rendered into
the unified [`../architecture-wiki.html`](../architecture-wiki.html)
viewer (under the 🎯 Diagrams tab) — never edit the wiki directly.

## File Format

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

## Authoring Rules

- One diagram per file. Don't bundle multiple Mermaid blocks.
- The first paragraph of body text is treated as the description
  shown above the diagram in the viewer. Keep it tight.
- Use only Mermaid syntax types Mermaid v10 understands:
  `flowchart`, `sequenceDiagram`, `stateDiagram-v2`, `classDiagram`.
- Avoid HTML inside Mermaid labels — `<br/>` is the only safe break.
- Keep node labels short. Long sentences belong in the prose, not
  the diagram.

## Adding A New Diagram

1. Pick a kebab-case id, e.g. `27-encounter-resolution`.
2. Create `docs/architecture/diagrams/<id>.md` following the format
   above.
3. Add `<id>` to the appropriate category's `diagrams` array in
   `index.json`. (Add a new category if none fit.)
4. Run `npm run generate:wiki` to regenerate the offline viewer.
5. Open `../architecture-wiki.html`, switch to the 🎯 Diagrams tab,
   and verify the diagram renders.

## Editing An Existing Diagram

1. Edit the `.md` file.
2. Run `npm run generate:wiki` to refresh the bundled viewer.

No other files need updating. The wiki is regenerated from scratch
on every build.

## Why .md Files Instead Of A Single Big Doc

- AI agents can `Read` a single scenario file without scanning the
  whole architecture corpus.
- Diffs are small and reviewable when one diagram changes.
- New diagrams don't conflict with existing ones in version control.
- The bundled HTML is reproducible from the .md files at any commit.

## Companion Documents

- [`../README.md`](../README.md) — Architecture doc index
- [`../state-flow.md`](../state-flow.md) — Authoritative description
  of the command dispatcher these diagrams illustrate
- [`../command-schema.md`](../command-schema.md) — Canonical command
  shapes referenced in the battle and town flows
- [`../content-platform.md`](../content-platform.md) — Pack and
  asset rules referenced in the asset-loading flows
