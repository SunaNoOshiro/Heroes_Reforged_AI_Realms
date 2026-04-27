# Screen 12: Creature Bank Loot

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Post-combat creature bank reward dialog showing cleared bank state, losses, reward bundles, and collection result.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- A dark treasure vault panel overlays the map with defeated guards at left, reward chests and artifacts center, and surviving hero army summary at right.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- CreatureBankLootDialog
  - DefeatedGuardPanel
  - RewardBundleGrid
  - CasualtySummary
  - CollectButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| bankId | state.ui.adventure.pendingBankReward.bankId | Cleared bank object. |
| combatResult | state.combat.lastResult | Victory result and casualties from battle reducer. |
| rewardBundle | selectors.creatureBanks.rewardBundle | Gold, resources, artifacts, and creatures to collect. |
| visitedFlag | state.mapObjects.byId[bankId].visitedBy | Determines if reward was already claimed. |
| heroArmy | state.heroes.byId[selected].army | Post-combat army summary. |

### Mechanics Mapping
- Rewards are granted only after the linked combat reducer returns victory. Collection marks the bank visited, applies reward records, and returns to adventure.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Chest lids open, coins sparkle, artifact slot glows, reward numbers float upward, and the bank object dims on return to map.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `creature-bank-loot`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
