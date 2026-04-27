---
id: "05-castle-render"
title: "Castle Rendering For Different Races"
category: "town"
short: "5. Castle Per Race"
---

**Same code path, different visuals.** The town renderer just asks 'what's this town's faction?' and asks the asset registry for its sprites. Each race's pack provides its own castle art. Adding a new race means adding a pack — no code changes.

```mermaid
flowchart TD
    A[Town renderer called] --> B[Get town.factionId]
    B --> C{Which faction?}
    C -->|emberwild| D[Asset:<br/>emberwild:town:fortress]
    C -->|necropolis| E[Asset:<br/>necropolis:town:necropolis]
    C -->|dragonborn| F[Asset:<br/>dragonborn:town:lair]
    C -->|user-mod| G[Asset:<br/>my-race:town:custom]
    D --> H[Load sprite atlas]
    E --> H
    F --> H
    G --> H
    H --> I[Get town animation]
    I --> J[Play building anims]
    J --> K[Render to canvas]
    style A fill:#bbdefb
    style C fill:#fff9c4
    style G fill:#ff9800,color:#fff
    style K fill:#a5d6a7
```

## Architecture Principle

The "switch on faction" is **handled by data lookup**, not code. The renderer never has hardcoded if/else branches per race. New races become available the moment their pack is loaded.
