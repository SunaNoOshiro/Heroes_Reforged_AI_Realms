---
id: "13-death-victory"
title: "Death & Victory Animations"
category: "battle"
short: "13. Death & Victory"
---

**When stack dies or battle ends.** The engine resolves death and
victory synchronously and emits `UNIT_DIED` / `BATTLE_RESOLVED`
events into the event log. The renderer reads those events and plays
the matching death and victory animations. Animation completion does
not gate the engine's state transitions; it only delays the next
visible step on the renderer side. See
[`../animation-contract.md` § Mid-Anim Destruction](../animation-contract.md#mid-anim-destruction).

```mermaid
flowchart TD
    A[Stack takes damage] --> B{HP <= 0?}
    B -->|NO| C[Continue battle]
    B -->|YES| D[Engine: mark stack dead]
    D --> D1[Engine: emit UNIT_DIED<br/>into event log]
    D1 --> E[Renderer: play death animation]
    E --> F[Frame 0-3: fall]
    F --> G[Frame 4-5: fade]
    G --> H[Renderer: detach status + fx tracks<br/>Engine: stack already removed from grid]
    H --> I[Engine: check victory condition]
    I --> J{All enemies dead?}
    J -->|NO| C
    J -->|YES| K[Engine: emit BATTLE_RESOLVED]
    K --> L[Engine: calculate results]
    L --> L1[Survivors → roster]
    L --> L2[Loot from defender]
    L --> L3[Hero XP gain]
    L1 --> M[Renderer: show victory screen]
    L2 --> M
    L3 --> M
    M --> N[Renderer: animate XP bar]
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

> **Renderer purity.** Removing the dead stack from the grid is an
> engine action emitted as part of `UNIT_DIED`. The renderer's death
> animation is purely cosmetic — it cannot block or alter the
> grid-removal step. Status and fx tracks attached to the dead unit
> are detached when the renderer finishes the `dying` clip; if the
> renderer drops frames, the engine's grid-state is unaffected.
