# Screen 46 Architecture: Hero Screen

System: hero
Screen ID: hero-screen
Visual Archetype: curated-hero
Curation Status: anchor-v1

## Purpose
Hero management sheet with portrait, primary stats, specialty, experience, secondary skills, equipment paper doll, backpack, army, minimap/sidebar context, and dismiss/quest/spell routes.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Hero Screen"]
  C0["HeroPortrait"]
  Root --> C0
  C1["PrimaryStats"]
  Root --> C1
  C2["SpecialtyPanel"]
  Root --> C2
  C3["SecondarySkills"]
  Root --> C3
  C4["PaperDoll"]
  Root --> C4
  C5["ArtifactSlots"]
  Root --> C5
  C6["Backpack"]
  Root --> C6
  C7["HeroArmyRow"]
  Root --> C7
  C8["SidebarContext"]
  Root --> C8
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Hero selector"] --> L1
  L1["Artifact registry"] --> L2
  L2["Skill registry"] --> L3
  L3["Army state"] --> L4
  L4["Hero view model"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Drag/click"] --> I1
  I1["Slot legality guard"] --> I2
  I2["Hero command"] --> I3
  I3["Reducer"] --> I4
  I4["Snap/refresh"]
```

## Animation Flow
```mermaid
sequenceDiagram
  participant UI
  participant Draft as UI Draft
  participant Guard
  participant Reducer
  participant VFX
  UI->>Draft: hover/select/preview
  Draft->>VFX: Drag ghost
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Tooltip fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Hero Screen"]
  Current --> T0["47-spell-book"]
  Current --> T1["11-quest-log"]
  Current --> T2["51-split-stack-dialog"]
  Current --> T3["60-confirmation-dialog"]
```

## State Inputs
- hero.id -> state.heroes.selectedHeroId
- hero.primaryStats -> state.heroes.byId[selected].stats
- hero.skills -> state.heroes.byId[selected].secondarySkills
- hero.equipment -> state.heroes.byId[selected].equipment
- hero.backpack -> state.heroes.byId[selected].backpack
- hero.army -> state.heroes.byId[selected].army

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
