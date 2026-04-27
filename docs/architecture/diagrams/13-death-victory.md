---
id: "13-death-victory"
title: "Death & Victory Animations"
category: "battle"
short: "13. Death & Victory"
---

**When stack dies or battle ends.** Last unit in stack triggers death animation. Stack removed from grid. Battle checks if all enemies dead. Victory screen with replay option, loot distribution, hero XP gain.

```mermaid
flowchart TD
    A[Stack takes damage] --> B{HP <= 0?}
    B -->|NO| C[Continue battle]
    B -->|YES| D[Mark stack dead]
    D --> E[Play death animation]
    E --> F[Frame 0-3: fall]
    F --> G[Frame 4-5: fade]
    G --> H[Remove from grid]
    H --> I[Check victory condition]
    I --> J{All enemies dead?}
    J -->|NO| C
    J -->|YES| K[Battle ends]
    K --> L[Calculate results]
    L --> L1[Survivors → roster]
    L --> L2[Loot from defender]
    L --> L3[Hero XP gain]
    L1 --> M[Show victory screen]
    L2 --> M
    L3 --> M
    M --> N[Animate XP bar]
    N --> O{Hero leveled up?}
    O -->|YES| P[Show level-up panel]
    O -->|NO| Q[Return to map]
    P --> Q
    style K fill:#fff59d
    style M fill:#a5d6a7
    style Q fill:#bbdefb
```

## Battle Outcomes

- **Victory**: All enemy stacks dead. Loot distributed, XP awarded.
- **Defeat**: All player stacks dead. Hero defeated, possibly captured.
- **Retreat**: Player flees. Hero survives but loses army.
- **Surrender**: Player pays gold. Hero keeps army.
