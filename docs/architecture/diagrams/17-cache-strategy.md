---
id: "17-cache-strategy"
title: "Asset Cache Strategy"
category: "asset-loading"
short: "17. Cache Strategy"
---

**Memory management.** Recently used assets stay cached. LRU eviction when memory tight. Critical assets (current hero, current town) pinned. Pre-fetch on transitions.

The percentage thresholds below trigger eviction; the **meaning** of
"total used" is the sum of the per-category memory budget pinned in
[`docs/architecture/performance.md` § 4](../performance.md#4-memory-budget).

- Reference tier total: **1 GB** (textures 400 MB, audio 150 MB,
  sim state 150 MB, save snapshots 50 MB, UI 100 MB,
  headroom 150 MB).
- Minimum-spec tier total: **500 MB** (every category halved).

```mermaid
flowchart LR
    A[Asset Cache] --> B[Pinned<br/>Current hero<br/>Current town<br/>UI elements]
    A --> C[Hot<br/>Used last 30s]
    A --> D[Warm<br/>Used last 5min]
    A --> E[Cold<br/>Used > 5min ago]

    F[Memory pressure] --> G{Total used?}
    G -->|< 70% of cap| H[Keep all]
    G -->|70-90% of cap| I[Evict Cold]
    G -->|> 90% of cap| J[Evict Cold + Warm]

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
| Warm | No | Evict at 90% of category cap |
| Cold | No | Evict at 70% of category cap |

"Category cap" is the per-category MB ceiling from
[`performance.md` § 4](../performance.md#4-memory-budget). The
texture / atlas cache sees the texture cap; the audio cache sees
the audio cap; etc. Crossing **any** category cap triggers
eviction within that category, independently of other categories.

## Per-Pack Accounting Bucket

Each cached asset is attributed to its owning `packId`. The cache
keeps a **per-pack residency bucket** in addition to the global
tier accounting. Eviction order:

1. **Per-pack LRU first.** If pack `P` exceeds
   `maxResidentBytesPerPack` (64 MB canonical / 32 MB sandboxed,
   per [`asset-loading.md` § 1.2](../asset-loading.md#12-per-pack-budgets)),
   evict the oldest non-Pinned asset belonging to `P` until the
   pack's bucket is back under cap, regardless of global pressure.
2. **Global tier eviction next.** Once every per-pack bucket is
   under cap, the global Cold/Warm/Pinned rules above run.

The per-pack first rule prevents one pack from monopolising the
Pinned tier — a common attack mode where a hostile pack pins
"current hero / town / UI" entries until the global LRU never
fires inside that pack.

Atlas-tracker bytes (renderer atlas pages) are likewise attributed
to the owning `packId` so a renderer-resident atlas counts against
the pack's bucket. Owning task:
[`tasks/mvp/06-renderer/`](../../../tasks/mvp/06-renderer/).
