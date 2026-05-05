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
    A[Player: Load Game] --> Sz{Size <= 4 MiB?}
    Sz -->|NO| Stl[Reject: too large]
    Sz -->|YES| B[Read save file]
    B --> Bm{Ratio <= 1:200?<br/>see pack-trust.md § Resource Limits}
    Bm -->|NO| Sbomb[Reject: bomb]
    Bm -->|YES| C[Decompress]
    C --> D{Schema valid?<br/>save.schema.json}
    D -->|NO| E[Show error: invalid]
    D -->|YES| Vrange{Schema version<br/>in range?}
    Vrange -->|too-new| Vnew[Reject: ui.save-import.reject.too-new]
    Vrange -->|in-range| Mig{Migration<br/>available?}
    Vrange -->|below-min| Mig
    Mig -->|NO| Vnomig[Reject: ui.save-import.reject.no-migration]
    Mig -->|YES| MigA[Run migration registry chain<br/>see 08-migration-registry]
    MigA --> Q1[Quarantine staging<br/>see pack-trust.md § Save Quarantine]
    Q1 --> F[Check pack hashes]
    F --> G{All packs match?}
    G -->|NO| H[Warn: pack-skew<br/>continue or abort?]
    G -->|YES| I[Load required packs]
    I --> J{Latest verified<br/>snapshot present?}
    J -->|YES| J1[Hydrate from snapshot<br/>see 07-snapshot-rebase]
    J -->|NO| J2[Restore initial state from seed]
    J1 --> K[Replay tail commands<br/>since snapshot]
    J2 --> K2[Replay full command log]
    K --> O[Verify state hash]
    K2 --> O
    O --> P{Hash matches?}
    P -->|NO| Qtam[Tamper: terminal,<br/>no continue]
    P -->|YES| R[Switch to game view]
    R --> S[Resume play]
    style A fill:#bbdefb
    style S fill:#a5d6a7
    style E fill:#ef5350,color:#fff
    style Stl fill:#ef5350,color:#fff
    style Sbomb fill:#ef5350,color:#fff
    style Vnew fill:#ef5350,color:#fff
    style Vnomig fill:#ef5350,color:#fff
    style Qtam fill:#ef5350,color:#fff
```

The size and ratio pre-checks, the four schema-validate terminals
(`schema_invalid`, `too-new`, `no-migration`, `tamper`), and the
quarantine staging step are all owned by
[`pack-trust.md`](../pack-trust.md). The full table of parser caps
(`maxCompressedBytes`, `maxUncompressedBytes`,
`maxDecompressionRatio`, `maxDepth`, `maxStringLength`,
`maxArrayLength`, `maxObjectKeys`, `maxNumericMagnitude`) and the
closed rejection vocabulary (`OVER_COMPRESSED`, `OVER_RATIO`,
`OVER_DEPTH`, ...) are pinned in
[`parser-hardening.md`](../parser-hardening.md); the size and ratio
nodes in this diagram are the first two caps from that table.
Compatibility is reported as a discriminated union
(`ok | skew | tamper | unsupported`) so screen 55 and screen 70
surface skew vs. tamper distinctly. Pre-replay command-log
validation (per Plan 27 Critical Fix 3) runs between the migration
chain and the reducer replay so a malformed command surfaces at a
clean rejection point with full context, not mid-replay.

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
