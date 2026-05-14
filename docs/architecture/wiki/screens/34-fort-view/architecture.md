# Screen 34 Architecture: Fort View

- System: `town`
- Screen ID: `fort-view`
- Visual archetype: `curated-fort-view`
- Curation status: `curated-pass-4`

### Companion Files

- Spec: [`spec.md`](./spec.md)
- Interactions: [`interactions.md`](./interactions.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Mockup: [`mockup.html`](./mockup.html)

## Purpose

Town fortification inspection view. Surfaces the built fort /
citadel / castle tier, per-wall and per-tower battle bonuses, gate
and moat presence, growth bonus, and the next upgrade's
prerequisites. The screen is read-only on gameplay state — no schema
commands originate here.

## Visual Direction

- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

## Visual Composition

```mermaid
flowchart TD
  Root["FortView"]
  C0["FortificationCutaway"]
  Root --> C0
  C1["WallSegmentList"]
  Root --> C1
  C2["TowerSlots"]
  Root --> C2
  C3["SiegeBonusChecklist"]
  Root --> C3
  C4["CloseButton"]
  Root --> C4
```

## Screen Load And Data Resolution

```mermaid
flowchart LR
  L0["Town buildings"] --> L1
  L1["Fort rules"] --> L2
  L2["Battle layout"] --> L3
  L3["Growth selector"] --> L4
  L4["Fort view"]
```

## Main Interaction Flow

```mermaid
flowchart TD
  I0["Segment / build input"] --> I1
  I1["Build prerequisite guard"] --> I2
  I2["Local focus or route"] --> I3
  I3["Town / battle bonus preview"] --> I4
  I4["Town return"]
```

## Animation Flow

```mermaid
sequenceDiagram
  participant UI
  participant Draft as UI Draft
  participant Guard
  participant Reducer
  participant VFX
  UI->>Draft: hover / select / preview
  Draft->>VFX: wall highlight
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: silhouette pulse
```

## Outgoing Transitions

```mermaid
flowchart LR
  Current["Fort view"]
  Current --> T0["30-build-tree"]
  Current --> T1["24-town-screen"]
```

## State Inputs

- `fortLevel` → `state.towns.byId[selected].fortificationLevel`
- `wallDefinition` → `selectors.towns.fortificationBattleLayout`
- `growthBonus` → `selectors.towns.fortificationGrowthBonus`
- `buildPrereqs` → `selectors.towns.nextFortUpgradePrereqs`
- `selectedSegment` → `state.ui.fortView.selectedSegment`

## Implementation Contract

- `mockup.html` defines visual regions and data hooks only.
- [`spec.md`](./spec.md) defines the component / state contract.
- [`interactions.md`](./interactions.md) defines controls, timing,
  routing of local-ui tokens, disabled states, and error behavior.
- [`data-contracts.md`](./data-contracts.md) defines schemas, config,
  localization, asset, audio, VFX, save, and replay references.
- These diagrams are screen-specific summaries of the same contract;
  they must not introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Visual composition (5 components) matches sibling [`spec.md § Component Tree`](./spec.md); outgoing transitions to `30-build-tree` and `24-town-screen` match sibling [`interactions.md § Navigation Outcomes`](./interactions.md) and the `data-action="fortView.buildTree"` / `data-action="fortView.close"` hooks in [`mockup.html`](./mockup.html).
- **Schema: ✔** — State inputs match sibling [`spec.md § State Bindings`](./spec.md) and [`data-contracts.md § Runtime State Selectors`](./data-contracts.md) verbatim. The Animation-Flow sequence diagram still shows a `Reducer` participant — kept verbatim because the original asserts it, but note that in practice only routing / local-ui tokens leave this screen (the `Reducer` participant fires only when the routed-to screen later dispatches a real command).
- **Tasks: ⚠** — Owning UI task [`phase-2.07-ui-screen-backlog.34-fort-view-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/34-fort-view-screen.md) lists this file in Read First. The engine source of `selectors.towns.fortification*` is not named in any task's Outputs (see sibling `spec.md § ⚠ Issues`).

## ⚠ Issues

- **`Reducer` participant in `Animation Flow` is slightly misleading.** This screen dispatches no schema commands, so the `Guard → Reducer → UI` arc fires only after the user routes out to `30-build-tree` and that screen dispatches `BUILD_STRUCTURE`. Meaning is preserved by leaving the diagram verbatim (Hard Prohibition A), but a future pass could simplify it to `Guard → Router → UI` for clarity. Not auto-applied because no canonical source explicitly disallows the current shape.
- See sibling [`spec.md § ⚠ Issues`](./spec.md) and [`data-contracts.md § ⚠ Issues`](./data-contracts.md) for the missing `data-inventory.md` row for `state.towns.byId[].fortificationLevel` and the implicit selector ownership — both are flagged once at the spec to avoid duplication.
