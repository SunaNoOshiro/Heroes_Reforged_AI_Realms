---
id: "03-race-castle"
title: "Race Selection → Castle Determination"
category: "lifecycle"
short: "3. Race → Castle"
---

**How the game knows which castle to render.** Each player has a chosen race ID. The town record references hero/faction. The faction's town presentation defines which sprites to show. **NO if/else for races - all data-driven.**

```mermaid
flowchart LR
    A[Player Town] -->|has| B[townId: t_player_1]
    B --> C[Town Record]
    C -->|factionId| D[faction:emberwild]
    D --> E[Faction Registry]
    E -->|townPresentation| F[Town Presentation Asset]
    F --> G[Castle assetId:<br/>emberwild:town:capital]
    G --> H[Asset Registry]
    H -->|resolves| I[Sprite path:<br/>towns/emberwild/capital.png]
    H -->|resolves| J[Animation:<br/>emberwild-town.anim.json]
    H -->|resolves| K[Music:<br/>emberwild-theme.ogg]
    I --> L[Renderer draws castle]
    J --> L
    K --> M[Audio plays theme]
    L --> N[Player sees correct castle]
    M --> N
    style A fill:#bbdefb
    style D fill:#ffe082
    style G fill:#fff59d
    style N fill:#a5d6a7
```

## Why This Matters

Adding a new race requires NO code changes. You just:

1. Create a new pack folder
2. Add a `faction.json` with `townPresentation` field
3. Provide castle sprite, animation, music files
4. Pack loads → castle works

No engine modification needed.
