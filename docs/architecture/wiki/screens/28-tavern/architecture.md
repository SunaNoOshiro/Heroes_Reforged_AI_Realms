# Screen 28 Architecture: Tavern

System: town
Screen ID: tavern
Visual Archetype: curated-tavern
Curation Status: curated-pass-2

## Purpose
Tavern recruitment and rumor screen with two hero offer cards, hire cost, weekly hero pool, rumor text, and thieves guild entry.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Tavern"]
  C0["HeroOfferCardA"]
  Root --> C0
  C1["HeroOfferCardB"]
  Root --> C1
  C2["RumorParchment"]
  Root --> C2
  C3["HireCostPanel"]
  Root --> C3
  C4["ThievesGuildButton"]
  Root --> C4
  C5["CloseButton"]
  Root --> C5
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Town tavern"] --> L1
  L1["Hero pool"] --> L2
  L2["Player gold"] --> L3
  L3["Rumor localization"] --> L4
  L4["Tavern view"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Select/hire"] --> I1
  I1["Gold and slot guard"] --> I2
  I2["HIRE_TAVERN_HERO"] --> I3
  I3["Reducer roster update"] --> I4
  I4["Refresh offers"]
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
  Draft->>VFX: Card lift
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Rumor unfurl
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Tavern"]
  Current --> T0["27-thieves-guild"]
  Current --> T1["24-town-screen"]
```

## State Inputs
- heroPool -> state.tavern.weeklyHeroOffers
- playerGold -> state.players.active.resources.gold
- selectedOffer -> state.ui.tavern.selectedHeroId
- rumor -> state.tavern.currentRumorId

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
