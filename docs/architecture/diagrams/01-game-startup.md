---
id: "01-game-startup"
title: "Game Startup Sequence"
category: "lifecycle"
short: "1. Game Startup"
---

**What happens when you launch the game.** Engine boots, validates packs, builds registries, and shows the main menu. Asset packs are discovered but not loaded yet (lazy loading).

```mermaid
sequenceDiagram
    participant User
    participant Boot
    participant Pack
    participant Reg as Registries
    participant UI
    User->>Boot: Launch game
    Boot->>Boot: Init seeded RNG
    Boot->>Boot: Init fixed-point math
    Boot->>Pack: Discover all packs
    Pack->>Pack: Read manifests only
    Pack->>Pack: Validate manifest schemas
    Pack-->>Boot: Pack list (NOT loaded)
    Boot->>Reg: Build empty registries
    Boot->>Pack: Load core packs
    Note over Pack: baseline-ruleset<br/>shared-library<br/>UI assets
    Pack-->>Reg: Register core content
    Boot->>UI: Show main menu
    UI-->>User: Ready to play
```

## Notes

- RNG is seeded deterministically for replay support
- Pack validation rejects invalid manifests early
- Only core packs (ruleset, shared library, UI) load at startup
- Faction packs load when player picks a race
- Scenario packs load when player picks a map
