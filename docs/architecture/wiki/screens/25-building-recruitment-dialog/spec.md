# Screen 25: Building / Recruitment Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Town dwelling recruitment dialog: dwelling list, creature portrait
and stats, quantity stepper with MAX, total cost, and a destination
army preview the recruits flow into.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-2`.
- Z-Layer: 1000 per
  [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Fixed 800×600 layout: town panorama dimmed behind a red-and-bronze
  service panel. Dwelling list on the left, creature portrait and
  stats centered, quantity / cost / destination army on the right.
- Dense classic fantasy strategy UI: ornate gold frame, red / brown /
  stone panels, compact icon slots, right-click detail affordances,
  bottom status / resource feedback.
- `mockup.html` defines visible UI regions only. Logic, transitions,
  command routing, and implementation notes live in the Markdown
  package files.

### Component Tree
- RecruitmentDialog
  - DwellingList
  - CreaturePortrait
  - CreatureStats
  - QuantityStepper
  - CostPanel
  - DestinationArmyPreview
  - ConfirmCancelButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `town.id` | `state.towns.selectedTownId` | Town providing dwelling stock. |
| `dwelling.stock` | `state.towns.byId[selected].dwellingStock` | Available creatures by dwelling. |
| `selectedDwelling` | `state.ui.town.selectedDwellingId` | Local recruitment selection (UI draft). |
| `recruitQuantity` | `state.ui.town.recruitQuantity` | Local quantity draft until confirmed. |
| `destinationArmy` | `state.townRecruit.destinationArmy` | Hero or garrison target slot set. |

### Mechanics Mapping
- `RECRUIT_UNITS` is the only gameplay command this screen dispatches;
  its payload (`heroId`, `townId`, `dwellingUnitId`, `quantity`) and
  validation rules are defined in
  [`docs/architecture/command-schema.md` § RECRUIT_UNITS](../../../command-schema.md).
- Before dispatch, the dialog must validate town ownership, built
  dwelling, available stock, resource cost, and army capacity (per
  the schema validation list).
- The other action IDs (`recruit.selectDwelling`, `recruit.changeQuantity`,
  `recruit.max`, `recruit.cancel`) are UI-local: they update draft
  state only, never the deterministic command log. See
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  `localUiPrefixes` for the `SELECT_` / `SET_` / `CLOSE_` rule.
- Costs, unit stats, dwellings, stacks, heroes, and towns resolve
  through registries and the schemas listed in `data-contracts.md`,
  not hardcoded view logic.

### Animation Contract
- Dwelling row highlights on selection; quantity counter ticks as the
  stepper changes; the MAX button fills the slider to its legal
  maximum; on accepted recruit, the new / merged stack slides into
  the destination army slot.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Error Handling
- Disabled controls and inline error text are produced by
  `formatUserError(err, locale)` declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error text inline.
- Per-surface routing for `RECRUIT_UNITS` rejections is in
  `interactions.md` § Error surfaces, anchored to
  [`docs/architecture/error-ux.md` § 2](../../../error-ux.md#2-default-code--surface-mapping).

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema / config / localization / asset /
  sound / VFX / save / replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `building-recruitment-dialog`; system group: `town`;
  curation marker: `curated-pass-2`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, state bindings, and animation contract are mutually consistent with sibling `interactions.md`, `data-contracts.md`, `architecture.md`, and the regions drawn in `mockup.html`.
- **Schema: ✔** — `RECRUIT_UNITS` exists in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) and is documented at [`command-schema.md` § RECRUIT_UNITS](../../../command-schema.md); the UI-local `SELECT_RECRUIT_DWELLING` / `SET_RECRUIT_QUANTITY` / `SET_MAX_RECRUIT_QUANTITY` / `CLOSE_RECRUITMENT_DIALOG` tokens are covered by the prefix rules in [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Owning task [`tasks/phase-2/07-ui-screen-backlog/25-building-recruitment-dialog-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/25-building-recruitment-dialog-screen.md) reads all four package files; Cancel route target `24-town-screen` exists.

## ⚠ Issues

- **Top-level `state.townRecruit` slice is unparalleled.** This package binds `destinationArmy` to `state.townRecruit.destinationArmy`, a top-level slice not used by the sibling town recruitment surface (screen `37-quick-recruit-window` exposes the destination via `selectors.towns.quickRecruitDestinationArmy`). Per [`state-flow.md`](../../../state-flow.md) the canonical home for town-scoped UI draft state is `state.ui.town.*`. The owning task `tasks/phase-2/07-ui-screen-backlog/25-building-recruitment-dialog-screen.md` should confirm whether `state.townRecruit` is intentional or should be renamed to `state.ui.town.recruit.destinationArmy`; flagging here rather than silently rewriting because the slice name is a runtime contract.
- **Mockup `data-action` attributes are partial.** `mockup.html` only declares `recruit.max`, `recruit.confirm`, and `recruit.cancel` on `<g class="button">`. The dwelling rows and quantity slider thumb are visually interactive (`slotHot` highlight) but carry no `data-action`. The owning UI task should add `data-action="recruit.selectDwelling"` on each dwelling row and `data-action="recruit.changeQuantity"` on the slider thumb when wiring the React component, so the mockup remains a faithful contract for automated coverage checks. This is a mockup gap, not a markdown gap — flagged here for the implementer; the spec already names both action IDs in `interactions.md`.
