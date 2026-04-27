# Screen 47 Architecture: Spell Book

System: hero
Screen ID: spell-book
Visual Archetype: curated-spellbook
Curation Status: anchor-v1

## Purpose
Open spellbook view with school tabs, two-page spell grid, known/disabled spell states, mastery-derived details, mana cost, and cast/close controls.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Spell Book"]
  C0["BookBackdrop"]
  Root --> C0
  C1["SchoolTabs"]
  Root --> C1
  C2["LeftPageSpellGrid"]
  Root --> C2
  C3["RightPageSpellGrid"]
  Root --> C3
  C4["SelectedSpellDetails"]
  Root --> C4
  C5["ManaFooter"]
  Root --> C5
  C6["CastCloseButtons"]
  Root --> C6
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Hero spells"] --> L1
  L1["Spell registry"] --> L2
  L2["Mastery rules"] --> L3
  L3["Mana selector"] --> L4
  L4["Spellbook view model"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["School/page/spell input"] --> I1
  I1["Cast guard"] --> I2
  I2["Targeting route"] --> I3
  I3["Spell command"] --> I4
  I4["Reducer result"]
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
  Draft->>VFX: Book open
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Targeting fade
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Spell Book"]
  Current --> T0["17-adventure-spell-targeting or 44-combat-spell-targeting"]
  Current --> T1["46-hero-screen or previous screen"]
```

## State Inputs
- hero.spells -> state.heroes.byId[selected].knownSpells
- spellbook.school -> state.ui.spellbook.selectedSchool
- selectedSpell -> state.ui.spellbook.selectedSpellId
- mana -> state.heroes.byId[selected].mana
- castContext -> state.ui.spellbook.castContext

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
