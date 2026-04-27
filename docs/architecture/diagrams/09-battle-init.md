---
id: "09-battle-init"
title: "Battle Initialization (Two Armies)"
category: "battle"
short: "9. Battle Init"
---

**When two armies meet.** A battle scenario is constructed from both heroes' armies. Hex grid is generated. Units placed on starting positions. All creature assets for both sides are loaded before first frame.

```mermaid
sequenceDiagram
    participant World
    participant Battle as BattleSystem
    participant Asset as AssetLoader
    participant Init as BattleInit
    participant Render

    World->>Battle: INITIATE_BATTLE<br/>(attacker, defender)
    Battle->>Battle: Create 11x15 hex grid
    Battle->>Asset: Pre-load attacker creatures
    Asset->>Asset: Load creature sprites
    Asset->>Asset: Load creature animations
    Asset->>Asset: Load attack VFX
    Asset->>Asset: Load combat sounds
    Asset-->>Battle: Attacker assets ready
    Battle->>Asset: Pre-load defender creatures
    Asset-->>Battle: Defender assets ready
    Battle->>Init: Place units
    Init->>Init: Attacker stacks → cols 1-2
    Init->>Init: Defender stacks → cols 13-14
    Init->>Init: Apply terrain background
    Init->>Init: Compute initiative queue
    Init-->>Battle: Battle state ready
    Battle->>Render: Show battle screen
    Render->>Render: Play intro animation
    Render-->>Battle: First turn starts
```

## Hex Grid Layout

The battle grid is 11 columns × 15 rows. Attacker stacks start in columns 1-2, defender in columns 13-14. Center columns (5-9) are open battlefield.
