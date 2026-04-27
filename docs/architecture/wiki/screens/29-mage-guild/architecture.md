# Screen 29 Architecture: Mage Guild

System: town
Screen ID: mage-guild
Visual Archetype: curated-mage-guild
Curation Status: curated-pass-2

## Purpose
Mage guild spell learning screen with spell shelves by level, hero wisdom/magic-school eligibility, known spell state, and learn feedback.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Mage Guild"]
  C0["SpellLevelShelves"]
  Root --> C0
  C1["SpellIconGrid"]
  Root --> C1
  C2["HeroEligibilityPlaque"]
  Root --> C2
  C3["KnownSpellMarkers"]
  Root --> C3
  C4["LearnCloseButtons"]
  Root --> C4
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Town guild level"] --> L1
  L1["Guild spell records"] --> L2
  L2["Hero wisdom"] --> L3
  L3["Known spells"] --> L4
  L4["Mage guild view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Select spell"] --> I1
  I1["Eligibility guard"] --> I2
  I2["LEARN_SPELL"] --> I3
  I3["Hero spell update"] --> I4
  I4["Known marker"]
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
  Draft->>VFX: Shelf glow
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Close book
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Mage Guild"]
  Current --> T0["24-town-screen"]
```

## State Inputs
- town.mageGuildLevel -> state.towns.byId[selected].mageGuildLevel
- guildSpells -> state.towns.byId[selected].mageGuildSpells
- visitingHero -> state.adventure.visitingHeroId
- hero.knownSpells -> state.heroes.byId[visiting].knownSpells
- hero.wisdom -> state.heroes.byId[visiting].skills.wisdom

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
