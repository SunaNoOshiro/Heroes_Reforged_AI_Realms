# Screen 12 Architecture: Creature Bank Loot

- System: `adventure`
- Screen ID: `creature-bank-loot`
- Visual Archetype: `curated-bank-loot`
- Curation Status: `curated-pass-3`

## Purpose
Post-combat creature-bank reward dialog: shows the cleared bank, hero
losses, the reward bundle, and the one-shot Collect action.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

## Visual Composition
```mermaid
flowchart TD
  Root["CreatureBankLootDialog"]
  Root --> C0["DefeatedGuardPanel"]
  Root --> C1["RewardBundleGrid"]
  Root --> C2["CasualtySummary"]
  Root --> C3["CollectButton"]
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Combat victory<br/>state.combat.lastResult"] --> L1
  L1["bankId from<br/>state.ui.adventure.pendingBankReward"] --> L2
  L2["selectors.creatureBanks.rewardBundle<br/>(neutral-stack-template)"] --> L3
  L3["state.heroes.byId[selected].army<br/>(post-combat casualties)"] --> L4
  L4["CreatureBankLootDialog mounted at Z-Layer 1000"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["COLLECT click<br/>(bankLoot.collect)"] --> I1
  I1{"visitedFlag truthy?"}
  I1 -->|yes| IX["Disable + tooltip<br/>(DISPATCHER_REJECTED)"]
  I1 -->|no| I2["Dispatch<br/>COLLECT_CREATURE_BANK_REWARD"]
  I2 --> I3["Reducer applies reward<br/>marks visitedBy"]
  I3 --> I4["Route to 07-adventure-map<br/>+ dim bank on map"]
```

## Animation Flow
```mermaid
sequenceDiagram
  participant UI as CreatureBankLootDialog
  participant Draft as UI Draft
  participant Guard as Route Guard
  participant Reducer as Bank-reward Reducer
  participant VFX
  UI->>Draft: hover / right-click inspect (UI-local)
  Draft->>VFX: chest pulse
  UI->>Guard: COLLECT confirm
  Guard->>Reducer: COLLECT_CREATURE_BANK_REWARD
  Reducer-->>UI: authoritative result
  UI->>VFX: chest open + coins + artifact glow + bank dim
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["12-creature-bank-loot"]
  Current --> T0["07-adventure-map<br/>(collect / close)"]
  Current --> T1["50-creature-info<br/>(right-click creature reward)"]
  Current --> T2["18-map-object-tooltip<br/>(right-click artifact/resource)"]
```

## State Inputs
- `bankId` ← `state.ui.adventure.pendingBankReward.bankId`
- `combatResult` ← `state.combat.lastResult`
- `rewardBundle` ← `selectors.creatureBanks.rewardBundle`
- `visitedFlag` ← `state.mapObjects.byId[bankId].visitedBy`
- `heroArmy` ← `state.heroes.byId[selected].army`

## Implementation Contract
- [`mockup.html`](./mockup.html) defines visible regions and data
  hooks only.
- [`spec.md`](./spec.md) defines the component / state contract.
- [`interactions.md`](./interactions.md) defines controls, timing,
  command routing, disabled states, and error behavior.
- [`data-contracts.md`](./data-contracts.md) defines schemas, config,
  localization, asset, audio, VFX, save, and replay references.
- The diagrams above are screen-specific summaries of the same
  contract and must not introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, state inputs, and route targets match
  sibling [`spec.md`](./spec.md) § Component Tree / State Bindings
  and [`interactions.md`](./interactions.md) § Navigation Outcomes.
- **Schema: ✔** — `COLLECT_CREATURE_BANK_REWARD` is the only
  schema-backed command on this screen; defined in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  `$defs.collectCreatureBankReward`. UI-local prefix events
  (`OPEN_REWARD_DETAILS`, `CLOSE_BANK_REWARD`) match
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Screen owned by
  `phase-2.07-ui-screen-backlog.12-creature-bank-loot-screen`;
  reducer owned by
  `mvp.05-adventure-map.14-collect-creature-bank-reward-command`.

## ⚠ Issues

- **Missing `command-schema.md` section for `COLLECT_CREATURE_BANK_REWARD`.**
  See sibling [`spec.md`](./spec.md) § Issues — aligned. Reducer task
  `mvp.05-adventure-map.14-collect-creature-bank-reward-command` is
  the suggested owner.
