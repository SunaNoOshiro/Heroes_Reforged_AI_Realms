---
id: "25-load-flow"
title: "Load Game Flow"
category: "save-load"
short: "25. Load Flow"
---

**Load reconstructs the world by replay.** Verify all referenced packs
exist with same hashes. Load assets. Hydrate from the latest verified
snapshot if present, otherwise from seed. Replay commands from the
snapshot or seed. Verify state hash matches. Resume play.

```mermaid
flowchart TD
    A[Player: Load Game] --> B[Read save file]
    B --> C[Decompress]
    C --> D{Valid format?}
    D -->|NO| E[Show error]
    D -->|YES| Mig{saveVersion<br/>current?}
    Mig -->|NO| MigA[Run migration registry chain<br/>see 08-migration-registry]
    Mig -->|YES| F
    MigA --> F[Check pack hashes]
    F --> G{All packs match?}
    G -->|NO| H[Warn: pack mismatch<br/>continue or abort?]
    G -->|YES| I[Load required packs]
    I --> J{Latest verified<br/>snapshot present?}
    J -->|YES| J1[Hydrate from snapshot<br/>see 07-snapshot-rebase]
    J -->|NO| J2[Restore initial state from seed]
    J1 --> K[Replay tail commands<br/>since snapshot]
    J2 --> K2[Replay full command log]
    K --> O[Verify state hash]
    K2 --> O
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
3. Optionally save verified snapshots every K turns / M commands
4. On load: hydrate from the latest verified snapshot if present
   (else from seed) and replay the tail
5. Verify hash matches → proves no tampering or pack drift

This makes saves small AND tamper-evident. The contract:

> Replay from `(snapshot, log_since_snapshot)` is **bit-identical**
> to replay from `(seed, full_log)` for any verified snapshot.

See
[`tasks/mvp/08-persistence/07-snapshot-rebase.md`](../../../tasks/mvp/08-persistence/07-snapshot-rebase.md)
for the rebase semantics and the 1 MB compressed cap, and
[`tasks/mvp/08-persistence/08-migration-registry.md`](../../../tasks/mvp/08-persistence/08-migration-registry.md)
for the schema migration step that runs before the pack-hash gate.
