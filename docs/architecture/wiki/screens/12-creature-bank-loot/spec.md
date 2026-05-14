# Screen 12: Creature Bank Loot

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Post-combat creature-bank reward dialog: shows the cleared bank, hero
losses, the reward bundle, and the one-shot Collect action.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Z-Layer: `1000` (modal dialog) per
  [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- 800×600 modal overlays the adventure map: a 524-wide treasure-vault
  panel with the title bar `Creature Bank Cleared` and the subline
  `Victory reward is ready to collect`.
- Three columns inside the panel: **Guards** (defeated stacks, left,
  red panel), **Reward** (chest + Gold / creature / Artifact slots,
  centre, pulsing chest slot), **Losses** (hero casualties + `Visited`
  flag, right, dark status panel).
- Bottom action row: `COLLECT` primary button, `CLOSE` secondary.
- Right chrome (minimap, hero strip, hero summary) and bottom
  resource/date bar are the shared adventure-map chrome — owned by
  screens `07-adventure-map` and `19-status-bar`, rendered here only
  because the modal does not blank the map.
- Use dense classic fantasy strategy UI: ornate gold frame, red /
  brown / stone panels, compact icon slots, right-click detail
  affordances, localized bottom status.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in the Markdown package files.

### Component Tree
- `CreatureBankLootDialog`
  - `DefeatedGuardPanel` — read-only guard stacks (Guards column).
  - `RewardBundleGrid` — chest + Gold / creature / artifact slots.
  - `CasualtySummary` — hero losses + `Visited` flag (Losses column).
  - `CollectButton` — single-flight COLLECT action.

### State Bindings
| Element | Bound to | Notes |
| --- | --- | --- |
| `bankId` | `state.ui.adventure.pendingBankReward.bankId` | Cleared bank object id; set by the auto-resolve / tactical reducer on victory. |
| `combatResult` | `state.combat.lastResult` | Victory record + hero casualties from the battle reducer. |
| `rewardBundle` | `selectors.creatureBanks.rewardBundle` | Gold, resources, artifacts, and creatures to collect — derived from `neutral-stack-template.schema.json` and the effect registry. |
| `visitedFlag` | `state.mapObjects.byId[bankId].visitedBy` | Determines whether the reward was already claimed; once truthy, COLLECT disables. |
| `heroArmy` | `state.heroes.byId[selected].army` | Post-combat army summary shown in the right-chrome hero panel. |

UI-only hover, focus, selected row, open tab, target cursor, drag
ghost, and animation frame stay outside deterministic gameplay state.

### Mechanics Mapping
- Rewards are granted only after the linked combat reducer returns
  victory. `COLLECT_CREATURE_BANK_REWARD` is the single schema-backed
  command (see [`data-contracts.md`](./data-contracts.md)); it marks
  the bank visited, applies reward records via the effect registry,
  and returns to the adventure map.
- Collection is idempotent — a second attempt fails loudly per the
  owning reducer task `mvp.05-adventure-map.14`.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas, not hardcoded
  view logic.
- UI previews stay local until a listed command or route guard
  accepts them.

### Animation Contract
- On COLLECT: chest lids open, coins sparkle, the artifact slot
  glows, reward numbers float upward, and the bank object dims on
  return to the map.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback per the `prefers-reduced-motion`
  rule in `mockup.html`.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- Interactions file covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify the schema, config, localization, asset,
  sound, VFX, save, and replay fields required to implement the
  screen.

### AI Implementation Notes
- Screen slug: `creature-bank-loot`; system group: `adventure`;
  curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, state bindings, and copy strings match
  `mockup.html` (title `Creature Bank Cleared`, subline, `COLLECT` /
  `CLOSE` buttons) and the sibling [`interactions.md`](./interactions.md).
- **Schema: ✔** — `COLLECT_CREATURE_BANK_REWARD` is defined in
  [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  (`$defs.collectCreatureBankReward`); reward bundles flow from
  [`neutral-stack-template.schema.json`](../../../../../content-schema/schemas/neutral-stack-template.schema.json).
- **Tasks: ✔** — UI screen owned by
  `phase-2.07-ui-screen-backlog.12-creature-bank-loot-screen`; reducer
  owned by `mvp.05-adventure-map.14-collect-creature-bank-reward-command`;
  both reference this package in their `Read First`.

## ⚠ Issues

- **`command-schema.md` lacks a row for `COLLECT_CREATURE_BANK_REWARD`.**
  The command kind is defined in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  (`$defs.collectCreatureBankReward`, fields `heroId`, `bankId`,
  `rewardId`, `metadata`) and is the only non-UI-local action this
  screen dispatches, but
  [`command-schema.md`](../../../command-schema.md) has no matching
  `### COLLECT_CREATURE_BANK_REWARD` section under Adventure Map
  Commands. Per CLAUDE.md root contract (commands are public API), the
  reducer task
  [`mvp.05-adventure-map.14-collect-creature-bank-reward-command`](../../../../../tasks/mvp/05-adventure-map/14-collect-creature-bank-reward-command.md)
  should add the canonical row. Suggested heading position: between
  `### CAPTURE_MINE` (line 227) and `### INITIATE_BATTLE` (line 253).
  Skill did not add the section itself (Hard Prohibition D).
