# Screen 09 Architecture: Map Object Dialog

- System: `adventure`
- Screen ID: `map-object-dialog`
- Visual Archetype: `curated-map-object-dialog`
- Curation Status: `curated-pass-3`

## Purpose
Generic adventure object visit dialog for shrines, events, guarded
rewards, signs, one-shot pickups, and choice prompts. The diagrams
below summarize the contract owned by sibling `spec.md`,
`interactions.md`, and `data-contracts.md`; they must not introduce
behavior absent from those files.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

## Visual Composition
```mermaid
flowchart TD
  Root["MapObjectDialog"]
  Root --> C0["ObjectPortrait"]
  Root --> C1["ObjectMessage"]
  Root --> C2["RequirementPanel"]
  Root --> C3["RewardPreview"]
  Root --> C4["DialogButtons"]
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["MOVE_HERO arrival"] --> L1["state.mapObjects.byId[objectId]"]
  L1 --> L2["selectors.mapObjects.visitGuard"]
  L2 --> L3["selectors.mapObjects.previewVisitReward"]
  L3 --> L4["MapObjectDialog mount"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["ACCEPT click"] --> I1["visitGuard.eligible?"]
  I1 -- yes --> I2["dispatch VISIT_MAP_OBJECT"]
  I1 -- no --> IE["inline error.dispatcher.rejected.body"]
  I2 --> I3["reducer applies reward / visit flag"]
  I3 --> I4["clear pendingObjectVisit; return to 07-adventure-map"]
```

## Animation Flow
```mermaid
sequenceDiagram
  participant UI as MapObjectDialog
  participant Draft as UI Draft
  participant Guard as visitGuard
  participant Reducer as Engine
  participant VFX as VFX layer
  UI->>Draft: hover / preview
  Draft->>VFX: portrait glow, reward sparkle preview
  UI->>Guard: ACCEPT pressed
  Guard->>Reducer: VISIT_MAP_OBJECT (if eligible)
  Reducer-->>UI: authoritative result
  UI->>VFX: exit pop, map return
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["MapObjectDialog"]
  Current -->|ACCEPT or DECLINE| T0["07-adventure-map"]
  Current -->|right-click portrait| T1["18-map-object-tooltip"]
  Current -->|quest-source affordance| T2["11-quest-log"]
```

## State Inputs
| Binding | Source |
| --- | --- |
| `objectId` | `state.ui.adventure.pendingObjectVisit.objectId` |
| `heroId` | `state.adventure.selectedHeroId` |
| `visitRecord` | `state.mapObjects.byId[objectId]` |
| `rewardPreview` | `selectors.mapObjects.previewVisitReward` |
| `guardResult` | `selectors.mapObjects.visitGuard` |

## Implementation Contract
- `mockup.html` defines visible regions and data hooks only.
- `spec.md` owns the component / state contract.
- `interactions.md` owns controls, timing, command routing, disabled
  states, and error behavior.
- `data-contracts.md` enumerates schemas, config, localization,
  asset, sound, VFX, save, and replay references.
- These diagrams summarize the same contract and must not introduce
  hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree mirrors sibling `spec.md` § Component
  Tree; outgoing transitions match the Actions table in sibling
  `interactions.md` (`07-adventure-map`, `18-map-object-tooltip`,
  `11-quest-log`).
- **Schema: ✔** — The `VISIT_MAP_OBJECT` node in the Main Interaction
  Flow is the closed-enum kind defined in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  and documented in
  [`command-schema.md`](../../../command-schema.md#visit_map_object).
- **Tasks: ✔** — Owning task
  [`mvp.05-adventure-map.09-map-object-dialogs`](../../../../../tasks/mvp/05-adventure-map/09-map-object-dialogs.md)
  reads this file; the reducer for `VISIT_MAP_OBJECT` is owned by
  [`mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`](../../../../../tasks/mvp/05-adventure-map/21-map-object-visit-and-battle-initiation-commands.md).

## ⚠ Issues

_None._
