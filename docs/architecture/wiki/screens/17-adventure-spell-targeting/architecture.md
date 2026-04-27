# Screen 17 Architecture: Adventure Spell Targeting

System: adventure
Screen ID: adventure-spell-targeting
Visual Archetype: curated-adventure-spell-targeting
Curation Status: curated-pass-3

## Purpose
Adventure map targeting overlay for map spells such as Town Portal, Dimension Door, Fly, Water Walk, View Air, and View Earth.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Adventure Spell Targeting"]
  C0["SpellBanner"]
  Root --> C0
  C1["LegalTargetOverlay"]
  Root --> C1
  C2["InvalidTargetMarkers"]
  Root --> C2
  C3["ManaCostPanel"]
  Root --> C3
  C4["CancelButton"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Spellbook choice"] --> L1
  L1["Caster hero"] --> L2
  L2["Mana selector"] --> L3
  L3["Target rules"] --> L4
  L4["Target overlay"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Target input"] --> I1
  I1["Spell legality guard"] --> I2
  I2["Cast command"] --> I3
  I3["Reducer applies spell"] --> I4
  I4["Map/caller route"]
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
  Draft->>VFX: Rune cursor
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Magic trail
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Adventure Spell Targeting"]
  Current --> T0["07-adventure-map or target result screen"]
  Current --> T1["16-view-world"]
  Current --> T2["47-spell-book or 07-adventure-map"]
```

## State Inputs
- selectedSpell -> state.ui.spellTargeting.spellId
- casterHero -> state.adventure.selectedHeroId
- legalTargets -> selectors.spells.adventureLegalTargets
- mana -> state.heroes.byId[caster].mana
- targetDraft -> state.ui.spellTargeting.hoverTarget

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
