# Screen 37: Quick Recruit Window

### Screen Package
- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Interactions: [`interactions.md`](./interactions.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Description
Condensed town-wide recruitment window for buying available
creatures across all built dwellings in one pass.

### Visual Direction
Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

### Visual Contract
- Curation status: `curated-pass-4`.
- Z-Layer: 1000 per
  [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Fixed 800×600 layout: town panorama dimmed behind a red-and-bronze
  service panel. Seven-row recruitment ledger on the left
  (creature portrait, stock / max, checkbox), totals + action
  buttons on the right, destination army preview along the bottom.
- Dense classic fantasy strategy UI: ornate gold frame, red /
  brown / stone panels, compact icon slots, right-click detail
  affordances.
- [`mockup.html`](./mockup.html) defines visible UI regions only.
  Logic, transitions, command routing, and implementation notes
  live in the Markdown package files.

### Component Tree
- QuickRecruitWindow
  - DwellingRecruitRows
  - SelectionCheckboxes
  - TotalCostFooter
  - DestinationArmyPreview
  - RecruitAllButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `dwellingRows` | `selectors.towns.quickRecruitRows` | Built dwellings, stock, creature IDs, per-row cost. |
| `selectedRows` | `state.ui.quickRecruit.selectedDwellingIds` | Local checked rows (UI draft, not persisted). |
| `destinationArmy` | `selectors.towns.quickRecruitDestinationArmy` | Hero or town garrison target. |
| `totalCost` | `selectors.economy.quickRecruitTotalCost` | Aggregated cost across selected rows. |
| `rowGuards` | `selectors.towns.quickRecruitRowGuards` | Per-row localized disabled reason. |

### Mechanics Mapping
- The screen dispatches exactly one gameplay command:
  `quickRecruit.commit` → `QUICK_RECRUIT_CREATURES`, aliased to the
  canonical `RECRUIT_UNITS` in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
  Payload and validation rules live in
  [`command-schema.md` § RECRUIT_UNITS](../../../command-schema.md).
- Each checked row must pass: dwelling built, sufficient stock,
  affordable, growth available, destination capacity, and merge
  rules. Commit applies rows in deterministic order; the same
  guard list runs again per-row inside the reducer.
- The other action IDs (`quickRecruit.toggleRow`,
  `quickRecruit.selectAffordable`, `quickRecruit.close`) are
  UI-local: they update draft state only and never enter the
  deterministic command log. See `screen-command-coverage.json`
  `localUiPrefixes` for the `TOGGLE_` / `SELECT_` / `CLOSE_` rule.
- Costs, unit stats, dwellings, stacks, heroes, and towns resolve
  through registries and the schemas listed in
  [`data-contracts.md`](./data-contracts.md), not hardcoded view
  logic.

### Animation Contract
- Checked rows glow; total cost rolls up as rows toggle.
- On accepted Recruit, recruited stacks march into army slots.
- Unavailable / locked rows remain dim with a localized disabled
  reason from `rowGuards`.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Error Handling
- Disabled controls and inline error text are produced by
  `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error text inline.
- Per-surface routing for `QUICK_RECRUIT_CREATURES` rejections is
  in [`interactions.md`](./interactions.md) § Error surfaces,
  anchored to [`error-ux.md`](../../../error-ux.md) § 2.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema / config / localization / asset /
  sound / VFX / save / replay fields required to implement the
  screen.

### AI Implementation Notes
- Screen slug: `quick-recruit-window`; system group: `town`;
  curation marker: `curated-pass-4`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, state bindings, and animation contract are mutually consistent with sibling [`interactions.md`](./interactions.md), [`data-contracts.md`](./data-contracts.md), [`architecture.md`](./architecture.md), and the seven-row ledger drawn in [`mockup.html`](./mockup.html). Both outgoing transitions resolve to the existing [`24-town-screen`](../24-town-screen/spec.md).
- **Schema: ✔** — Only `RECRUIT_UNITS` reaches the engine (verified in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) and [`enums.snapshot.json`](../../../../../content-schema/enums.snapshot.json)); aliasing and the three UI-local tokens match [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Owning task [`tasks/phase-2/07-ui-screen-backlog/37-quick-recruit-window-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/37-quick-recruit-window-screen.md) reads all four package files; engine command owner is `mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild`.

## ⚠ Issues

- **Top-level `state.ui.quickRecruit` slice is unparalleled.** This package binds `selectedRows` to `state.ui.quickRecruit.selectedDwellingIds`; sibling town screen 25 binds equivalent town UI drafts under `state.ui.town.*` ([`25-building-recruitment-dialog/spec.md`](../25-building-recruitment-dialog/spec.md) State Bindings). Per [`state-flow.md`](../../../state-flow.md) the canonical home for town-scoped UI draft state is `state.ui.town.*`. The owning task should confirm whether the slice should be renamed to `state.ui.town.quickRecruit.selectedDwellingIds`; flagging rather than silently rewriting because the slice name is a runtime contract (Hard Prohibition A). Same flag in sibling [`data-contracts.md`](./data-contracts.md) and [`architecture.md`](./architecture.md).
