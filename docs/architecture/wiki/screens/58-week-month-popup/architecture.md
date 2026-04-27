# Screen 58 Architecture: Week / Month Popup

System: system
Screen ID: week-month-popup
Visual Archetype: curated-week-month-popup
Curation Status: curated-pass-6

## Purpose
Start-of-week/month announcement popup for growth changes, plague, month creature, resource events, and calendar transition.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

## Visual Composition
```mermaid
flowchart TD
  Root["Week / Month Popup"]
  C0["CalendarHeader"]
  Root --> C0
  C1["EventIcon"]
  Root --> C1
  C2["EffectList"]
  Root --> C2
  C3["OkButton"]
  Root --> C3
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["Calendar reducer result"] --> L1
  L1["Event record"] --> L2
  L2["Growth/resource selectors"] --> L3
  L3["Announcement"] --> L4
  L4["Popup"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["OK/details input"] --> I1
  I1["Ack/detail route"] --> I2
  I2["UI announcement clear"] --> I3
  I3["Map or info route"] --> I4
  I4["Caller refresh"]
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
  Draft->>VFX: Unfurl
  UI->>Guard: confirm action
  Guard->>Reducer: accepted command or route
  Reducer-->>UI: authoritative result
  UI->>VFX: Parchment fold
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Week / Month Popup"]
  Current --> T0["07-adventure-map"]
  Current --> T1["50-creature-info"]
```

## State Inputs
- calendar -> state.calendar.currentDate
- eventRecord -> state.calendar.pendingAnnouncement
- growthEffects -> selectors.calendar.visibleGrowthEffects
- resourceEffects -> selectors.calendar.visibleResourceEffects
- acknowledged -> state.ui.calendarAnnouncement.acknowledged

## Implementation Contract
- Mockup defines visual regions and data hooks only.
- Spec defines the component/state contract.
- Interactions define controls, timing, command routing, disabled states, and error behavior.
- Data contracts define schemas, config, localization, asset, audio, VFX, save, and replay references.
- Diagrams are screen-specific summaries of the same contract and must not introduce hidden behavior.
