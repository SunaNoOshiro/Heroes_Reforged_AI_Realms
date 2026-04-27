---
id: "04-map-loading"
title: "Map Loading Pipeline"
category: "lifecycle"
short: "4. Map Loading"
---

**Loading a scenario map.** The map file references a world pack (terrain, biomes), spawned objects (mines, neutrals), and starting heroes (which determine race). Assets load progressively as the camera moves.

```mermaid
sequenceDiagram
    participant Game
    participant Scenario
    participant World
    participant Faction
    participant Asset
    participant Render

    Game->>Scenario: Load map_01.scenario.json
    Scenario->>World: Load referenced world pack
    World->>World: Load terrain definitions
    World->>World: Load biome assets (lazy)
    World-->>Scenario: World ready
    Scenario->>Scenario: Parse hero placements
    loop For each starting hero
        Scenario->>Faction: Load hero faction pack
        Faction->>Asset: Load town/unit assets
        Asset-->>Faction: Assets ready
    end
    Scenario->>Scenario: Place neutral stacks
    Scenario->>Scenario: Place mines/objects
    Scenario->>Game: Game state initialized
    Game->>Render: Render visible tiles only
    Render->>Asset: Stream tile assets (FOV)
    Asset-->>Render: Sprites cached
    Render-->>Game: First frame drawn
```

## Notes

- World pack provides terrain types and biome assets
- Each starting hero brings their faction's assets
- Tiles outside field of view aren't loaded (memory savings)
- Camera movement triggers progressive asset streaming
