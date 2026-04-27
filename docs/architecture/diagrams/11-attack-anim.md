---
id: "11-attack-anim"
title: "Attack Animation Sequence"
category: "battle"
short: "11. Attack Animation"
---

**From command to damage number.** Attacker plays attack animation, projectile spawns (if ranged), defender plays hurt animation, damage number floats up, retaliation triggers if applicable.

```mermaid
sequenceDiagram
    participant Cmd as Command
    participant Attacker
    participant Anim as AnimController
    participant VFX
    participant Defender
    participant DMG as DamageCalc
    participant UI

    Cmd->>Attacker: BATTLE_ATTACK
    Attacker->>Anim: play(attack)
    Anim->>Anim: Frame 0-2 (windup)
    Anim->>Anim: Frame 3 (DAMAGE_FRAME)
    Anim->>DMG: calculateDamage()
    DMG->>DMG: Apply formula (deterministic)
    DMG-->>Anim: damage = 47
    Anim->>VFX: Play hit VFX
    Anim->>Defender: play(hurt)
    Defender->>Defender: Reduce HP
    Anim->>UI: Show floating "47"
    UI-->>UI: Animate up + fade
    Anim->>Anim: Frame 4-5 (recovery)
    Anim->>Attacker: play(idle)
    alt Defender alive AND can retaliate
        Defender->>Anim: play(retaliate-attack)
        Anim->>DMG: calculate retaliation
        DMG-->>Anim: damage to attacker
        Anim->>Attacker: play(hurt)
    end
    Anim-->>Cmd: Action complete
```

## DAMAGE_FRAME Mechanic

Each animation declares which frame is the "damage frame" — the moment when damage is actually applied. This synchronizes the damage event with the visual impact (e.g., sword strike).
