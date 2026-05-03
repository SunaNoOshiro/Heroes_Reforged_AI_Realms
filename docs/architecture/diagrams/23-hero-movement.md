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

All values are MP-cost ×100 integers (no floats anywhere on the
deterministic path):

- Road: 75
- Grass: 100
- Sand: 150
- Snow: 200
- Swamp: 200
- Water: 9999 (impassable)
- Mountain: 9999 (impassable)

Hero stops if MP runs out. Pathfinding uses these integer costs and
breaks ties on equal-cost paths by axial coord ascending: `q` first,
then `r`. See
[`tasks/mvp/05-adventure-map/03-hero-movement.md`](../../../tasks/mvp/05-adventure-map/03-hero-movement.md)
for the canonical table and tie-break rule.
