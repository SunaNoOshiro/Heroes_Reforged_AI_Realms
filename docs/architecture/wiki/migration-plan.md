# UI Screen Package Migration Plan

## Final Folder Structure

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

Each folder is one numbered screen package. The number is shared by the
visual mockup, component spec, interaction map, data contract, screen
architecture diagrams, wiki navigation entry, and UI task references.
`screens/index.json` groups those packages in the wiki sidebar and must
include every screen exactly once.

## Migration Steps

1. Move each legacy visual source into
   `docs/architecture/wiki/screens/<nn-screen>/mockup.html`.
2. Move or rewrite each legacy Markdown spec into the matching
   `spec.md`.
3. Add `interactions.md` beside each mockup and spec. Include every
   control, hotkey, command, route, state update, animation, sound,
   disabled case, and error case.
4. Add `data-contracts.md` beside the interaction map. Include content
   schemas, selectors, configs, localization keys, asset IDs, save
   fields, replay fields, validation, and fallback rules.
5. Add `architecture.md` beside the data contract. Include small
   screen-specific Mermaid diagrams for screen load, state refresh,
   important interactions, data updates, transitions, and
   deterministic/content rules.
6. Add each screen package to exactly one category in
   `docs/architecture/wiki/screens/index.json`.
7. Retire legacy `docs/architecture/wireframes/*.md` and
   `docs/architecture/wireframes_v2/*.html`; do not add new files there.
8. Keep general architecture diagrams in `docs/architecture/diagrams/`.
   Do not mix global flows with screen-specific architecture diagrams.
9. Reference the relevant numbered screen package from UI task files so
   an AI agent has the visual, behavior, data, and logic contract
   together.
10. Run `npm run generate:wiki` to merge architecture docs, general
   diagrams, and screen packages into
   `docs/architecture/architecture-wiki.html`.

## Compatibility Notes

- The wiki top-level modes are Docs, General Diagrams, and UI Screens.
- `screens/index.json` assigns each UI package to a group. Package
  numbers follow the same group order, and the wiki sidebar renders those
  groups directly so each section reads in natural numeric sequence.
- Each UI screen page uses five tabs: Mockup, Spec, Interactions, Data
  Contracts, and Architecture Diagrams.
- The old `states/default.md` shape is retired. A single-state screen is
  represented by its screen package directly.
