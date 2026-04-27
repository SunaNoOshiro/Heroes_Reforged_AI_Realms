---
id: "06-town-animations"
title: "Town Building Animations"
category: "town"
short: "6. Town Building Anims"
---

**Buildings have idle, construction, and active animations.** When player enters town, all buildings load their idle animations. New construction triggers construction animation. Production buildings (e.g., kennels) show creature animations on schedule.

```mermaid
stateDiagram-v2
    [*] --> NotBuilt
    NotBuilt --> UnderConstruction: Player builds it
    UnderConstruction --> UnderConstruction: Play construct anim<br/>(loops 1 day)
    UnderConstruction --> Idle: Day ends
    Idle --> Idle: Loop idle anim<br/>(smoke, banners)
    Idle --> Active: New week<br/>(creatures spawn)
    Active --> Active: Play active anim<br/>(creatures emerge)
    Active --> Idle: Animation done
    Idle --> Upgraded: Player upgrades
    Upgraded --> Idle: New idle anim
    Idle --> Damaged: Town attacked
    Damaged --> Idle: Town repaired
```

## Animation Timing

| State | Trigger | Duration | Loops? |
|-------|---------|----------|--------|
| UnderConstruction | BUILD_BUILDING command | Until next day | Yes |
| Idle | Default state | Continuous | Yes |
| Active | Weekly tick | 2-4 seconds | No |
| Upgraded | UPGRADE_BUILDING command | One-time transition | No |
| Damaged | Town attacked | Until repaired | Yes |
