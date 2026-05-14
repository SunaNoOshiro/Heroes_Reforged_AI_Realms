# Screen 41: Surrender Cost Dialog

### Screen Package
- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Interactions: [`interactions.md`](./interactions.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Description
Modal that confirms surrendering the active tactical battle. Shows
the ransom cost in gold, available gold, surviving-army value, the
hero's post-surrender outcome, and Accept / Decline controls.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-2`.
- Z-Layer: `1000` per
  [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Fixed 800×600 layout, ornate gold frame, parchment modal over the
  active battlefield, dense classic-fantasy panel chrome with the
  large gold cost plaque, survivor summary, and Accept / Decline
  buttons.
- `mockup.html` is the visible-only reference. Logic, transitions,
  and timing live in the sibling Markdown files.

### Component Tree
- `SurrenderCostDialog`
  - `GoldCostPlaque` — ransom-cost readout (e.g. `4500 Gold`)
  - `SurvivorSummary` — surviving-army value rollup
  - `AvailableGold` — current player gold (affordability cue)
  - `OutcomeText` — hero post-surrender outcome string
  - `AcceptDeclineButtons` — `Accept` + `Decline` controls

### State Bindings
| Element | Bound to | Notes |
| --- | --- | --- |
| `survivingArmyValue` | `state.battle.surrender.armyValue` | Cost basis. |
| `surrenderCost` | `state.battle.surrender.cost` | Computed ransom (gold). |
| `availableGold` | `state.players.active.resources.gold` | Affordability guard. |
| `heroOutcome` | `state.battle.surrender.heroOutcome` | Hero survival and return route. |

### Mechanics Mapping
- `surrenderCost` derives from `survivingArmyValue` and ruleset
  constants; Accept spends `surrenderCost` gold and resolves the
  battle as a surrender with the declared hero outcome. Reducer
  owned by
  [`mvp.09-tactical-combat.13-retreat-and-surrender-commands`](../../../../../tasks/mvp/09-tactical-combat/13-retreat-and-surrender-commands.md).
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, hero state, and army stacks resolve through registries and
  content schemas — never hardcoded view logic.

### Animation Contract
- Gold cost plaque pulses; the Accept button glows only when
  affordable; the accepted modal folds into the battle-result route.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and its authoritative state
  binding.
- Interactions covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify every schema, config, localization, asset,
  audio, VFX, save, and replay field required to implement the
  screen.

### AI Implementation Notes
- Screen slug: `surrender-cost-dialog`; system group: `battle`;
  curation marker: `curated-pass-2`.
- Build runtime components from this package contract — never from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs / manifests; deterministic
  gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check
- **UI: ✔** — Component tree and state bindings match `mockup.html`
  regions (`surrender.accept`, `surrender.decline` actions) and the
  sibling [`interactions.md`](./interactions.md) / [`data-contracts.md`](./data-contracts.md).
- **Schema: ⚠** — `ACCEPT_BATTLE_SURRENDER` is defined in
  [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json);
  however the four `state.battle.surrender.*` slices referenced
  here are missing from
  [`docs/architecture/data-inventory.md`](../../../data-inventory.md).
  See Issues.
- **Tasks: ✔** — Owning UI task
  [`tasks/phase-2/07-ui-screen-backlog/41-surrender-cost-dialog-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/41-surrender-cost-dialog-screen.md)
  lists every file in this package under `Read First`; the surrender
  reducer is owned by
  [`mvp.09-tactical-combat.13-retreat-and-surrender-commands`](../../../../../tasks/mvp/09-tactical-combat/13-retreat-and-surrender-commands.md).

## ⚠ Issues
- **Missing `data-inventory.md` rows for `state.battle.surrender.*`.**
  Spec, interactions, data-contracts, and architecture all bind
  `state.battle.surrender.armyValue`, `state.battle.surrender.cost`,
  and `state.battle.surrender.heroOutcome`, but no rows exist in
  [`data-inventory.md`](../../../data-inventory.md). Per CLAUDE.md
  root contract ("every persisted field is registered in
  data-inventory.md"), the reducer owner
  [`mvp.09-tactical-combat.13-retreat-and-surrender-commands`](../../../../../tasks/mvp/09-tactical-combat/13-retreat-and-surrender-commands.md)
  must add the rows before this screen ships. Suggested values:
  domain=`battle`, owner=`mvp.09-tactical-combat.13`,
  persistence=`indexeddb`, retention=`battle-scope`.
