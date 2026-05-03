---
id: "12-spell-anim"
title: "Spell Casting Animation"
category: "battle"
short: "12. Spell Animation"
---

**Casting fireball at enemy stack.** The engine resolves the spell
synchronously when `CAST_SPELL` is applied: it computes affected
hexes, applies damage per affected stack, applies status effects, and
emits one `SPELL_CAST` event plus one `UNIT_ATTACKED` per affected
unit (each carrying its own `eventFrame`) into the event log. The
renderer reads those events and plays the cast pose, projectile
travel, impact VFX, and per-unit hurt anims. The renderer never calls
back into rules. See
[`../animation-contract.md` § DAMAGE_FRAME Ownership](../animation-contract.md#damage_frame-ownership).

```mermaid
sequenceDiagram
    participant Player
    participant Engine
    participant Spell
    participant DMG
    participant Log as EventLog
    participant Hero
    participant VFX
    participant Targets

    Player->>Engine: CAST_SPELL fireball<br/>target: hex(7,4)
    Engine->>Spell: resolve(spellId, targetHex)
    Spell->>Spell: Get effect targets (area: radius 1)
    loop For each affected stack
        Spell->>DMG: calc damage with spellPower formula
        DMG-->>Spell: damage amount
        Spell->>Spell: apply damage + burn status
    end
    Spell-->>Engine: result { affected: [...], damages: [...] }
    Engine->>Log: emit SPELL_CAST { spellId, casterId, targetHex, vfxId, eventFrame }
    loop For each affected stack
        Engine->>Log: emit UNIT_ATTACKED { target, damage, eventFrame, animId: "hurt" }
        Engine->>Log: emit STATUS_APPLIED { target, statusId: "burn" }
    end
    Engine-->>Player: command applied (state already mutated)

    Note over Hero,Targets: Renderer side — pure consumer, no callbacks into engine
    Log-->>Hero: read SPELL_CAST
    Hero->>Hero: play(cast-spell)
    Hero->>VFX: spawn projectile from hero hex
    VFX->>VFX: Travel to target hex
    Note over VFX: Bezier path<br/>~0.6 seconds
    VFX->>VFX: impact phase: expand particles
    loop For each affected stack
        Targets->>Targets: play(hurt) at eventFrame
    end
    Note over Targets: Status icons appear<br/>over affected units<br/>(driven by STATUS_APPLIED)
```

## Area Effect Resolution

For area spells, the engine:

1. Computes affected hexes from spell definition
2. Finds all stacks in those hexes
3. Applies damage formula per stack and mutates state
4. Emits one `SPELL_CAST` event plus one `UNIT_ATTACKED` per affected
   unit, each carrying its own `eventFrame`
5. The renderer plays VFX once and per-unit hurt animations on the
   `eventFrame` of the corresponding `UNIT_ATTACKED` event
