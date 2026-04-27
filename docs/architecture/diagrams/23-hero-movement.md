---
id: "23-hero-movement"
title: "Hero Movement Animation"
category: "animation"
short: "23. Hero Movement"
---

**Hero walks across the map.** When player issues MOVE_HERO, the engine computes the path. Hero plays walk animation while moving along path interpolation. Camera follows. Footstep sounds play.

```mermaid
sequenceDiagram
    participant Player
    participant Cmd
    participant Path as Pathfinder
    participant Hero
    participant Anim
    participant Audio
    participant Camera

    Player->>Cmd: MOVE_HERO target=tile(x,y)
    Cmd->>Path: Compute path from current
    Path-->>Cmd: tiles array (deterministic)
    Cmd->>Hero: Start movement
    Hero->>Anim: play(walk)
    Anim->>Anim: Loop walk frames
    loop For each tile in path
        Hero->>Hero: Interpolate position
        Hero->>Camera: Update target
        Camera->>Camera: Smooth follow
        Hero->>Audio: Play footstep
        Audio->>Audio: Vary by terrain<br/>(grass/sand/snow)
    end
    Hero->>Anim: play(idle)
    Hero->>Hero: Snap to final tile
    Hero->>Cmd: Movement complete
    Cmd->>Cmd: Check tile object
    alt Object on tile (mine, artifact, etc.)
        Cmd->>Cmd: Trigger interaction
    end
```

## Movement Costs

Movement points consumed per tile depend on terrain:
- Road: 0.75 MP
- Grass: 1.0 MP
- Sand: 1.5 MP
- Snow: 2.0 MP
- Swamp: 2.0 MP

Hero stops if MP runs out. Pathfinding uses these costs.
