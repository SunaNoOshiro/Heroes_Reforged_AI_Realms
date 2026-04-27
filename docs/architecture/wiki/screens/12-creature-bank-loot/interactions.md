# Screen 12: Creature Bank Loot
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Post-combat creature bank reward dialog showing cleared bank state, losses, reward bundles, and collection result.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Collect | `bankLoot.collect` | command | `07-adventure-map` | `COLLECT_CREATURE_BANK_REWARD` | Applies rewards and visited flag once. | Chest lids open, coins sparkle, artifact slot glows, reward numbers float upward, and the bank object dims on return to map. |
| Inspect reward | `bankLoot.inspectReward` | navigation | `50-creature-info` or `18-map-object-tooltip` | `OPEN_REWARD_DETAILS` | Shows creature/artifact/resource detail. | Chest lids open, coins sparkle, artifact slot glows, reward numbers float upward, and the bank object dims on return to map. |
| Close after collected | `bankLoot.close` | navigation | `07-adventure-map` | `CLOSE_BANK_REWARD` | Returns after reward state is resolved. | Chest lids open, coins sparkle, artifact slot glows, reward numbers float upward, and the bank object dims on return to map. |

### State Changes
- `state.ui.adventure.pendingBankReward.bankId` refreshes `bankId` after the owning reducer or local UI draft changes.
- `state.combat.lastResult` refreshes `combatResult` after the owning reducer or local UI draft changes.
- `selectors.creatureBanks.rewardBundle` refreshes `rewardBundle` after the owning reducer or local UI draft changes.
- `state.mapObjects.byId[bankId].visitedBy` refreshes `visitedFlag` after the owning reducer or local UI draft changes.
- `state.heroes.byId[selected].army` refreshes `heroArmy` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Collect can route to `07-adventure-map` after guard approval and exit animation.
- Inspect reward can route to `50-creature-info` or `18-map-object-tooltip` after guard approval and exit animation.
- Close after collected can route to `07-adventure-map` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
