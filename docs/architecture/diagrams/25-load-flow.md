---
id: "25-load-flow"
title: "Load Game Flow"
category: "save-load"
short: "25. Load Flow"
---

**Load reconstructs the world.** Verify all referenced packs exist with same hashes. Load assets. Replay commands from save. Verify state hash matches. Resume play.

```mermaid
flowchart TD
    A[Player: Load Game] --> B[Read save file]
    B --> C[Decompress]
    C --> D{Valid format?}
    D -->|NO| E[Show error]
    D -->|YES| F[Check pack hashes]
    F --> G{All packs match?}
    G -->|NO| H[Warn: pack mismatch<br/>continue or abort?]
    G -->|YES| I[Load required packs]
    I --> J[Restore initial state]
    J --> K[Replay command log]
    K --> L[For each command]
    L --> M[Apply to state<br/>same as live game]
    M --> N{More commands?}
    N -->|YES| L
    N -->|NO| O[Verify state hash]
    O --> P{Hash matches?}
    P -->|NO| Q[Save corrupt!]
    P -->|YES| R[Switch to game view]
    R --> S[Resume play]
    style A fill:#bbdefb
    style S fill:#a5d6a7
    style E fill:#ef5350,color:#fff
    style Q fill:#ef5350,color:#fff
```

## Why Replay Commands?

Saving the full game state is large and brittle. Instead:

1. Save initial scenario state (small)
2. Save command log (compact, deterministic)
3. On load: replay commands to reach current state
4. Verify hash matches → proves no tampering or pack drift

This makes saves small AND tamper-evident.
