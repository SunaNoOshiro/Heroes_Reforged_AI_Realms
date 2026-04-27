---
id: "02-new-game-flow"
title: "New Game - Race Selection"
category: "lifecycle"
short: "2. New Game Flow"
---

**Player clicks 'New Game'.** Available factions are listed from the registry. When player picks a race, that faction's pack is loaded and its assets prepared. Map options are filtered to those compatible with the chosen race.

```mermaid
flowchart TD
    A[Player clicks New Game] --> B[Show race selection screen]
    B --> C[Query ContentRegistry for available factions]
    C --> D[Display: Emberwild, Necropolis, Dragonborn]
    D --> E[Player selects race]
    E --> F[Load faction pack]
    F --> F1[Load faction.json]
    F --> F2[Load hero classes]
    F --> F3[Load town buildings]
    F --> F4[Load creature definitions]
    F1 --> G[Faction registered]
    F2 --> G
    F3 --> G
    F4 --> G
    G --> H[Show map selection]
    H --> I[Filter maps by compatible factions]
    I --> J[Player picks map]
    J --> K[Load scenario pack]
    K --> L[Initialize game state with chosen race]
    L --> M[Game starts]
    style A fill:#bbdefb
    style E fill:#ffe082
    style F fill:#c5e1a5
    style L fill:#a5d6a7
    style M fill:#81c784
```

## Notes

- Faction list comes from registry (mod-friendly)
- Each faction pack is self-contained
- Map selection filtered by faction compatibility
- Scenario pack pins required pack hashes for replay safety
