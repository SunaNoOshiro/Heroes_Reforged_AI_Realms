---
id: "16-enter-battle"
title: "Enter Battle → What Loads"
category: "asset-loading"
short: "16. Enter Battle"
---

**Battle starts.** Both armies' creature assets pre-loaded. Battle terrain (matches map tile) loaded. Combat music starts. UI overlays (initiative, action bar) loaded. World map paused.

```mermaid
flowchart TD
    A[Combat triggered] --> B[Save world camera state]
    B --> C[Pause world music]
    C --> D[Identify both armies]
    D --> E[For each unique creature type]
    E --> F[Pre-load creature sprite]
    F --> G[Pre-load idle anim]
    G --> H[Pre-load walk anim]
    H --> I[Pre-load attack anim]
    I --> J[Pre-load death anim]
    J --> K[Pre-load creature sound]
    K --> L{All creatures loaded?}
    L -->|NO| E
    L -->|YES| M[Load battle terrain<br/>matching map tile]
    M --> N[Load combat UI overlays]
    N --> O[Start battle music]
    O --> P[Show battle intro animation]
    P --> Q[First turn begins]
    style A fill:#bbdefb
    style Q fill:#a5d6a7
```

## Pre-Load Optimization

All creature assets are loaded BEFORE the first frame is drawn. This avoids:

- Mid-battle stutter when an animation first plays
- Inconsistent frame timing
- Asset fetch errors during gameplay
