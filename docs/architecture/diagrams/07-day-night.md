---
id: "07-day-night"
title: "Day/Night Cycle in Town"
category: "town"
short: "7. Day/Night Cycle"
---

**Towns visually change with day count.** Each town has multiple presentation states. Lighting overlay shifts based on day phase. Some buildings only animate at certain phases (taverns at night, market in day).

```mermaid
flowchart LR
    A[Game day passes] --> B[gameState.dayPhase changes]
    B --> C{Day phase?}
    C -->|Dawn| D1[Tint: orange overlay<br/>Music: dawn theme]
    C -->|Day| D2[Tint: bright<br/>Music: day theme<br/>Market: animated]
    C -->|Dusk| D3[Tint: amber<br/>Music: dusk theme]
    C -->|Night| D4[Tint: blue overlay<br/>Music: night theme<br/>Tavern: animated<br/>Lights: glow]
    D1 --> E[Apply to town render]
    D2 --> E
    D3 --> E
    D4 --> E
    E --> F[Draw town with phase]
    style A fill:#bbdefb
    style C fill:#fff9c4
    style F fill:#a5d6a7
```

## Phase Triggers

- **Dawn**: 0% - 25% of game day
- **Day**: 25% - 60% of game day
- **Dusk**: 60% - 80% of game day
- **Night**: 80% - 100% of game day

Phase transitions trigger music crossfade and lighting tween.
