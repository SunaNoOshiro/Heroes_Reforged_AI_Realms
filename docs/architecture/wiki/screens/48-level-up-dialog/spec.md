# Screen 48: Level Up Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md` (this file)
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Hero level-up modal. Shows the resolved primary-stat gain, two
deterministic secondary-skill choices weighted by hero class, and
commits the result on confirm.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-5`.
- Modal `id` (closed enum): `48-level-up-dialog` per
  [`content-schema/schemas/modal-entry.schema.json` §`modalId`](../../../../../content-schema/schemas/modal-entry.schema.json).
- Z-Layer: `1000` (modal dialogs) per
  [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Stage: 800 × 600 fixed; ornate gold frame; the hero sheet dims
  behind a parchment modal containing portrait, stat-gain gem, two
  skill cards, XP progress bar, and the confirm button.
- Compact icon slots and bottom resource/date HUD remain visible
  beneath the modal (HUD layer `100`).
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in this Markdown package.

### Component Tree
- `LevelUpDialog`
  - `HeroPortrait`
  - `PrimaryStatGain`
  - `SkillChoiceCards` (renders two `SkillChoiceCard` children)
  - `ExperienceBar`
  - `ConfirmButton`

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `heroId` | `state.ui.levelUp.heroId` | Hero receiving the level. |
| `primaryGain` | `state.ui.levelUp.primaryStatGain` | Resolved deterministic stat gain. |
| `skillChoices` | `state.ui.levelUp.skillChoices` | Two legal secondary-skill options. |
| `selectedChoice` | `state.ui.levelUp.selectedChoiceId` | Local choice before confirmation. |
| `experience` | `state.heroes.byId[heroId].experience` | XP bar value and next-level threshold. |

`state.ui.levelUp.*` is a transient UI-draft slice (not persisted);
`state.heroes.byId[heroId].experience` is authoritative gameplay
state mutated by the `LEVEL_UP` command.

### Mechanics Mapping
- The two skill choices are produced deterministically from hero
  class, existing skills, ruleset weights, seed state, and per-skill
  max-mastery limits. Confirm commits exactly one level result.
- UI previews remain local until the confirm command or a route
  guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries and content schemas, never
  hard-coded view logic.

### Animation Contract
- XP bar fills toward the next-level mark; the primary-stat gem
  flashes; the two skill cards slide in from the left and right;
  the chosen card stamps into the hero sheet on confirm.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback (see sibling `interactions.md`
  for per-action timing).

### Acceptance Criteria
- Visual regions and authoritative bindings listed above match
  `mockup.html` and the data contracts.
- `interactions.md` covers every control, next screen, state
  update, animation, disabled case, and error path.
- `architecture.md` diagrams summarize this contract without adding
  hidden behavior.
- `data-contracts.md` lists every schema, config, localization,
  asset, audio, VFX, save, and replay field needed to implement the
  screen.

### AI Implementation Notes
- Screen slug: `level-up-dialog`; system group: `hero`; curation
  marker: `curated-pass-5`.
- Build the runtime component from this package, not from third-
  party captures.
- Resolve presentation through asset IDs and manifests; deterministic
  gameplay commands use stable IDs and scalar values.
- The owning implementation task is
  [`phase-2.07-ui-screen-backlog.48-level-up-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/48-level-up-dialog-screen.md).

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, regions, and state bindings match
  `mockup.html` (`Darkstorn` Level 5 Warlock portrait, `+1 Spell
  Power` stat gem, two skill cards, XP bar, accept button), sibling
  `interactions.md`, and `data-contracts.md`. Modal `id` and Z-Layer
  match the
  [Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract)
  and
  [`modal-entry.schema.json`](../../../../../content-schema/schemas/modal-entry.schema.json).
- **Schema: ✔** — `state.heroes.byId[heroId].experience` is owned
  by the hero record in
  [`hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json);
  class weighting for skill offers is owned by
  [`hero-class.schema.json` §`primaryStatGrowth`](../../../../../content-schema/schemas/hero-class.schema.json);
  the commit command is the canonical `LEVEL_UP` from
  [`command.schema.json` §`levelUp`](../../../../../content-schema/schemas/command.schema.json).
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.48-level-up-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/48-level-up-dialog-screen.md)
  Reads First this file; engine-side leveling is owned by
  [`phase-2.01-spells-artifacts.00-hero-leveling`](../../../../../tasks/phase-2/01-spells-artifacts/00-hero-leveling.md)
  (LEVEL_UP command + growth weights) and
  [`phase-2.01-spells-artifacts.09-leveling-up-hero-gains-skills-and-stats`](../../../../../tasks/phase-2/01-spells-artifacts/09-leveling-up-hero-gains-skills-and-stats.md)
  (offers two valid skill choices).

## ⚠ Issues

- **`state.ui.levelUp.*` is not registered in
  [`data-inventory.md`](../../../data-inventory.md).** The slice is
  declared transient UI-draft (not persisted) by sibling
  `data-contracts.md` § Save And Replay Fields, so the omission is
  intentional under the CLAUDE.md root contract ("every persisted
  field is registered in data-inventory.md"). Flagged here so a
  future audit does not silently promote the slice to persisted
  state without adding a row. Owner if persistence ever changes:
  [`phase-2.07-ui-screen-backlog.48-level-up-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/48-level-up-dialog-screen.md).
