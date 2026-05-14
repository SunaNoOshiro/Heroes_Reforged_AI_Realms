# Screen 53: University

System group: `hero` · Screen slug: `university` · Curation:
`curated-pass-5`.

### Screen Package
- Mockup: [`mockup.html`](./mockup.html)
- Spec: `spec.md`
- Interactions: [`interactions.md`](./interactions.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Description
University skill-learning service. A visiting hero buys one of the
offered secondary skills when capacity, mastery, and gold are
legal. The only deterministic mutation is `LEARN_UNIVERSITY_SKILL`;
selection and exit are UI-local.

### Visual Direction
Original internal UI contract. Do **not** use third-party captures,
copied franchise art, or external product pixels as implementation
input.

### Visual Contract
- Fixed 800 × 600 dialog over the dimmed hero / adventure context;
  ornate gold outer frame, red/brown stone inner panels.
- Four skill offer cards (mockup: `Wisdom`, `Logistics`, `Earth`,
  `Archery`, each tagged `2000g`); the selected card glows.
- Bottom status row carries the selected-offer summary (mockup:
  `"Selected Logistics: open skill slot, gold available."`).
- Wisdom-style eligibility wording (open slot, gold available,
  mastery legal) drives the status text.
- Two right-side buttons: `LEARN`, `CLOSE`.
- `mockup.html` carries visible UI only. Logic, transitions,
  timing, and asset hooks live in the four Markdown package files.

### Component Tree
- `UniversityDialog`
  - `SkillOfferCards` — four columnar offer cards with embedded
    name + cost.
  - `HeroSkillRow` — destination row for the learned-skill slide
    animation. See `## ⚠ Issues`.
  - `PricePlaque` — selected-offer summary and price feedback.
    See `## ⚠ Issues`.
  - `LearnButton` — dispatches `LEARN_UNIVERSITY_SKILL`.
  - `CloseButton` — UI-local close back to the caller.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `universityId` | `state.ui.university.sourceId` | Visited adventure-map university or town-bound source object. |
| `offeredSkills` | `state.mapObjects.byId[universityId].offeredSkills` | Skill offer IDs for this source. |
| `heroSkills` | `state.heroes.byId[selected].skills` | Current hero secondary-skill set, read-only. |
| `selectedSkill` | `state.ui.university.selectedSkillId` | Local UI draft; never persisted. |
| `learnGuard` | `selectors.heroes.universityLearnGuard` | Aggregate legality + affordability selector. |

### Mechanics Mapping
- `LEARN_UNIVERSITY_SKILL` validates hero ownership, an open or
  upgradeable secondary-skill slot, the offered skill record, the
  max skill count, current mastery, the price, and player gold.
  Engine owner:
  [`phase-2.01-spells-artifacts.12-learn-university-skill-command`](../../../../../tasks/phase-2/01-spells-artifacts/12-learn-university-skill-command.md);
  it shares the skill-roster mutation path with `ASSIGN_SKILL`.
- Selection and close stay in UI draft / route state until a guard
  or the dispatcher accepts them.
- Skills, costs, offer tables, and source objects resolve through
  registries and content schemas, never inline view logic.

### Animation Contract
- Hovered offer card glows; the selected card stays highlighted.
- On `LEARN_UNIVERSITY_SKILL` accept: the selected skill book opens,
  gold ticks down, and the learned skill slides into the hero skill
  row.
- Locked or unaffordable offers stay dim; rejected learns keep the
  modal open and surface the inline error.
- Reduced-motion mode (`prefers-reduced-motion: reduce` in
  `mockup.html`) preserves state changes with static highlights and
  localized text feedback only; animation never decides gameplay
  outcomes.

### Acceptance Criteria
- The mockup is visually distinct from other screens and follows
  this screen's internal visual direction.
- This spec lists every visible region and its authoritative state
  binding.
- [`interactions.md`](./interactions.md) covers every primary
  control, next screen, state update, animation, disabled case, and
  error path.
- [`architecture.md`](./architecture.md) diagrams are
  screen-specific and do not invent behavior absent from this file
  or [`interactions.md`](./interactions.md).
- [`data-contracts.md`](./data-contracts.md) names every
  schema / config / localization / asset / sound / VFX / save /
  replay field required to implement the screen.

### AI Implementation Notes
- Build the React component from this package; do not infer layout
  from third-party captures or external product pixels.
- Resolve presentation through asset IDs and manifests; dispatch
  `LEARN_UNIVERSITY_SKILL` through the shared command hook so the
  gate runs in the engine reducer, not in the view.
- UI-local tokens (`university.selectSkill`, `university.close`)
  stay in route / draft state and never enter the deterministic
  command log.

---

## 🔍 Sync Check

- **UI: ⚠** — Card grid, status row, `LEARN`/`CLOSE` buttons, and
  outer hero context match [`mockup.html`](./mockup.html); sibling
  [`interactions.md`](./interactions.md),
  [`data-contracts.md`](./data-contracts.md), and
  [`architecture.md`](./architecture.md) carry the same five
  bindings and the same three actions (aligned). `HeroSkillRow` and
  `PricePlaque` in the component tree do not have distinct mockup
  regions — detail in `## ⚠ Issues`.
- **Schema: ⚠** — `LEARN_UNIVERSITY_SKILL` payload
  `{ heroId, universityId, skillId }` matches
  [`command.schema.json#/$defs/learnUniversitySkill`](../../../../../content-schema/schemas/command.schema.json)
  (line 1256). `SELECT_UNIVERSITY_SKILL` and `CLOSE_UNIVERSITY` are
  UI-local per the `SELECT_` / `CLOSE_` prefixes in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
  Canonical `university-skill-table.schema.json` named by the
  content task is not yet on disk — detail in `## ⚠ Issues`.
- **Tasks: ⚠** — UI owner
  [`phase-2.07-ui-screen-backlog.53-university-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/53-university-screen.md)
  Reads First all four package files. Engine owner
  [`phase-2.01-spells-artifacts.12-learn-university-skill-command`](../../../../../tasks/phase-2/01-spells-artifacts/12-learn-university-skill-command.md)
  Reads First [`interactions.md`](./interactions.md). State paths
  above target projections the strategic state model does not yet
  expose — detail in `## ⚠ Issues`.

## ⚠ Issues

- **`HeroSkillRow` and `PricePlaque` not present in `mockup.html`.**
  The component tree above (and sibling
  [`architecture.md`](./architecture.md) § Visual Composition) lists
  `HeroSkillRow` and `PricePlaque` as direct children of
  `UniversityDialog`. `mockup.html` renders the price inline on
  each `SkillOfferCard` (`2000g` text under the icon) and shows
  the hero army row in the outer hero context pane outside the
  modal — neither region exists as a modal-owned child. Per Hard
  Prohibition B (never invent features) the audit kept both nodes
  rather than silently dropping them. Owner:
  [`phase-2.07-ui-screen-backlog.53-university-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/53-university-screen.md).
  Suggested values: either fold price into each offer card and
  reuse the bottom status bar as the selection plaque (then drop
  both nodes from the component tree and sibling
  [`architecture.md`](./architecture.md) § Visual Composition), or
  add the two regions to `mockup.html`. Decide in the UI task, not
  here.
- **State selectors not in `AdventureState`.**
  The five rows in § State Bindings target
  `state.mapObjects.byId[universityId].offeredSkills`,
  `state.ui.university.sourceId`, `state.ui.university.selectedSkillId`,
  `state.heroes.byId[selected].skills`, and
  `selectors.heroes.universityLearnGuard`.
  [`mvp.05-adventure-map.01-strategic-game-state-model`](../../../../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md)
  defines `objects: MapObject[]` (not a normalized `mapObjects.byId`),
  `heroes: Hero[]` with `secondarySkills: SkillEntry[]` (not
  `heroes.byId` and not `.skills`), and carries no `state.ui.*`
  slice or `universityLearnGuard` selector. Owner: the state-model
  task or a sibling UI-selector task must expose the normalized
  projections (or this package must rebind to the array shapes)
  before the UI task can ship. Skill did not silently swap the
  bindings (Hard Prohibition A).
- **`university-skill-table.schema.json` missing on disk.**
  Engine task
  [`phase-2.01-spells-artifacts.12-learn-university-skill-command`](../../../../../tasks/phase-2/01-spells-artifacts/12-learn-university-skill-command.md)
  and content task
  [`mvp.02-content-schemas.20-university-skill-table`](../../../../../tasks/mvp/02-content-schemas/20-university-skill-table.md)
  both name `content-schema/schemas/university-skill-table.schema.json`
  as canonical, but the file is not present in
  [`content-schema/schemas/`](../../../../../content-schema/schemas/),
  and sibling [`data-contracts.md`](./data-contracts.md) sources
  offers through `skill.schema.json` as a working stand-in. Owner:
  `mvp.02-content-schemas.20-university-skill-table`. Suggested
  values: land the schema, then add a `university-skill-table`
  row to sibling [`data-contracts.md`](./data-contracts.md) §
  Content Schemas And Registries. Skill did not create the schema
  (Hard Prohibition D).
