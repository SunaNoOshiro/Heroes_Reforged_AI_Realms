---
id: "14-enter-map"
title: "Enter Map → What Loads"
category: "asset-loading"
short: "14. Enter Map"
---

**Walking the world map.** Currently visible tiles drive asset loading. Distant assets unloaded if memory tight. Hero/army assets stay loaded. Music for current biome plays.

```mermaid
flowchart TD
    A[Camera moves on map] --> B[Calculate visible tiles]
    B --> C[Check tile assets in cache]
    C --> D{Asset cached?}
    D -->|YES| E[Use cached]
    D -->|NO| F[Queue async load]
    F --> G[Load priority:<br/>1. Visible center<br/>2. Edges<br/>3. Predicted next]
    G --> H[Async fetch sprite]
    H --> I[Decode image]
    I --> J[Upload to GPU texture]
    J --> K[Add to cache]
    K --> E
    E --> L[Render tile]
    L --> M[Continue movement]

    A --> N[Update biome]
    N --> O{New biome?}
    O -->|YES| P[Crossfade music]
    O -->|NO| Q[Continue]
    P --> Q

    style A fill:#bbdefb
    style L fill:#a5d6a7
```

## Streaming Strategy

- Visible tiles: highest priority (loaded synchronously if cached)
- Adjacent tiles: medium priority (preloaded)
- Distant tiles: low priority (lazy)
- Out of FOV: candidates for eviction
