---
id: "15-enter-town"
title: "Enter Town → What Loads"
category: "asset-loading"
short: "15. Enter Town"
---

**Player visits a town.** Town's faction assets all loaded. Building animations start. Town music plays. Heroes in town are shown. Garrison creature thumbnails loaded.

```mermaid
sequenceDiagram
    participant Player
    participant World
    participant Town
    participant Asset
    participant Audio
    participant Render

    Player->>World: Move hero to town
    World->>World: Detect VISIT_TOWN
    World->>Town: Open town view
    Town->>Asset: Load town's faction pack<br/>(if not already)
    Asset->>Asset: Load castle sprite
    Asset->>Asset: Load all building sprites
    Asset->>Asset: Load building animations
    Asset->>Asset: Load creature thumbnails
    Asset->>Asset: Load hero portraits
    Asset-->>Town: Assets ready
    Town->>Audio: Stop world music
    Audio->>Audio: Crossfade to town theme
    Town->>Render: Draw town backdrop
    Render->>Render: Layer buildings
    Render->>Render: Start idle animations
    Render->>Render: Add ambient particles<br/>(smoke, banners)
    Town-->>Player: Town view ready
```

## What Gets Loaded

- Castle sprite atlas (single PNG with all buildings)
- Building animation definitions
- Creature thumbnails (for recruit panel)
- Hero portraits (for hero panel)
- Town music (per faction)
- Ambient particle definitions
