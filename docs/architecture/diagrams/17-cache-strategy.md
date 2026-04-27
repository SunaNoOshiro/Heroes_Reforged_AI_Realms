---
id: "17-cache-strategy"
title: "Asset Cache Strategy"
category: "asset-loading"
short: "17. Cache Strategy"
---

**Memory management.** Recently used assets stay cached. LRU eviction when memory tight. Critical assets (current hero, current town) pinned. Pre-fetch on transitions.

```mermaid
flowchart LR
    A[Asset Cache] --> B[Pinned<br/>Current hero<br/>Current town<br/>UI elements]
    A --> C[Hot<br/>Used last 30s]
    A --> D[Warm<br/>Used last 5min]
    A --> E[Cold<br/>Used > 5min ago]

    F[Memory pressure] --> G{Total used?}
    G -->|< 70%| H[Keep all]
    G -->|70-90%| I[Evict Cold]
    G -->|> 90%| J[Evict Cold + Warm]

    K[New asset request] --> L{In cache?}
    L -->|YES| M[Promote to Hot]
    L -->|NO| N[Load + add as Hot]

    style B fill:#ef5350,color:#fff
    style C fill:#ff9800,color:#fff
    style D fill:#ffeb3b
    style E fill:#bdbdbd
```

## Eviction Rules

| Tier | Pinned | Eviction Behavior |
|------|--------|-------------------|
| Pinned | Yes | Never evicted |
| Hot | No | Last to evict |
| Warm | No | Evict at 90% memory |
| Cold | No | Evict at 70% memory |
