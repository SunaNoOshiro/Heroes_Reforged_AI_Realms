---
id: "22-building-loop"
title: "Building Animation Loop"
category: "animation"
short: "22. Building Loop"
---

**Buildings have continuously looping idle animations.** Smoke from chimneys, banners waving, water flowing. Animation player updates every frame. Different buildings have different cycle lengths.

```mermaid
sequenceDiagram
    participant Engine
    participant Animator
    participant Buildings
    participant Renderer

    loop Every frame (60 FPS)
        Engine->>Animator: tick(deltaTime)
        Animator->>Buildings: For each visible building
        loop Each building
            Buildings->>Buildings: elapsed += deltaTime
            alt elapsed >= frameDuration
                Buildings->>Buildings: currentFrame = (currentFrame + 1) % totalFrames
                Buildings->>Buildings: elapsed = 0
            end
        end
        Animator->>Renderer: Submit frame indices
        Renderer->>Renderer: Sample sprite atlas<br/>at correct UV coords
        Renderer->>Renderer: Draw quad per building
    end
    Note over Engine,Renderer: All animation is data-driven<br/>Different buildings have<br/>different speeds and frames
```

## Performance Notes

- One quad per visible building (~10-30 quads per town)
- All sprites in one atlas texture (1 GPU draw call possible)
- Animation state updated CPU-side, rendered GPU-side
- Off-screen buildings skip animation update
