# Screen 44 Architecture: Combat Spell Targeting

System: battle
Screen ID: combat-spell-targeting
Visual Archetype: curated-combat-spell-targeting
Curation Status: curated-pass-2

## Purpose
Combat spell targeting overlay with selected spell, mana cost, area-of-effect shape, legal hexes, immune targets, and cancel/confirm controls.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Combat Spell Targeting"]
  C0["BattlefieldDimmer"]
  Root --> C0
  C1["SpellCard"]
  Root --> C1
  C2["AreaOverlay"]
  Root --> C2
  C3["ImmuneMarkers"]
  Root --> C3
  C4["ManaCost"]
  Root --> C4
  C5["ConfirmCancelButtons"]
  Root --> C5
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Selected spell"] --> L1
  L1["Caster hero"] --> L2
  L2["Mana selector"] --> L3
  L3["Targeting rules"] --> L4
  L4["Target overlay"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Hover/click hex"] --> I1
  I1["Spell target guard"] --> I2
  I2["CAST_COMBAT_SPELL"] --> I3
  I3["Reducer spell effects"] --> I4
  I4["Combat view"]
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
  Draft->>VFX: Hex pulse
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Error flash
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Combat Spell Targeting"]
  Current --> T0["38-combat-screen"]
  Current --> T1["38-combat-screen"]
```

## State Inputs
- selectedSpell -> state.ui.battle.selectedSpellId
- casterHero -> state.battle.activeHeroId
- mana -> state.heroes.byId[caster].mana
- legalTargets -> state.battle.spellTargeting.legalTargets
- immuneTargets -> state.battle.spellTargeting.immuneTargets

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
