---
id: "24-save-flow"
title: "Save Game Flow"
category: "save-load"
short: "24. Save Flow"
---

**Save preserves complete game state for replay.** Game state serialized canonically. Pack hashes pinned. Command log included. Save file is small (state + commands, not assets).

```mermaid
flowchart TD
    A[Player: Save Game] --> B[Pause game]
    B --> C[Collect game state]
    C --> D[Snapshot pack hashes]
    D --> E[Capture command log<br/>since last checkpoint]
    E --> F[Canonicalize JSON]
    F --> G[Compute state hash]
    G --> H[Build save file]
    H --> I[Save object]
    I --> J[Compress gzip]
    J --> K[Write to disk]
    K --> L[Show: Saved ✓]
    style A fill:#bbdefb
    style L fill:#a5d6a7
```

## Save File Format

```json
{
  "saveVersion": 1,
  "state": { ... game state ... },
  "packHashes": {
    "baseline-ruleset": "a1b2c3...",
    "emberwild-faction": "d4e5f6..."
  },
  "commandLog": [
    { "kind": "MOVE_HERO", ... },
    { "kind": "RECRUIT_UNITS", ... }
  ],
  "stateHash": "x7y8z9...",
  "metadata": {
    "saveDate": "2026-04-25",
    "playerName": "...",
    "currentDay": 42
  }
}
```

Saves are typically ~50-200 KB compressed (no asset data inside).
