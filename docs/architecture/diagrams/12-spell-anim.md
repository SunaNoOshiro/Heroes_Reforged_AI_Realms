---
id: "12-spell-anim"
title: "Spell Casting Animation"
category: "battle"
short: "12. Spell Animation"
---

**Casting fireball at enemy stack.** Hero plays cast animation, particle VFX travel from hero to target, target stack plays hurt animation, area effect VFX expands, all affected stacks take damage.

```mermaid
sequenceDiagram
    participant Player
    participant Hero
    participant Spell
    participant VFX
    participant Targets
    participant DMG

    Player->>Hero: CAST_SPELL fireball<br/>target: hex(7,4)
    Hero->>Hero: play(cast-spell)
    Hero->>VFX: spawn projectile<br/>from hero hex
    VFX->>VFX: Travel to target hex
    Note over VFX: Bezier path<br/>~0.6 seconds
    VFX->>Spell: Arrived at target
    Spell->>Spell: Get effect targets<br/>(area: radius 1)
    Spell->>VFX: Play explosion VFX
    VFX->>VFX: Expand particles
    loop For each affected stack
        Spell->>DMG: calc damage with<br/>spellPower formula
        DMG-->>Spell: damage amount
        Spell->>Targets: apply damage
        Targets->>Targets: play(hurt)
    end
    Spell->>Spell: Apply burn status
    Note over Targets: Status icons appear<br/>over affected units
    Spell-->>Player: Spell complete
```

## Area Effect Resolution

For area spells, the engine:

1. Computes affected hexes from spell definition
2. Finds all stacks in those hexes
3. Applies damage formula per stack
4. Plays VFX once for visual effect
5. Plays hurt animation on each affected stack
