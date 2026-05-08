# Equip Unequip Artifact Commands

Module: [Spells & Artifacts (P2)](../01-spells-artifacts.md)

Description:
Promote hero artifact equip and unequip mutations into deterministic
commands so the hero panel can manipulate the paper doll without
inventing UI-local state changes.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/46-hero-screen/interactions.md`

Inputs:
- Artifact schema and hero state
- Paper-doll rules from `phase-2.01-spells-artifacts.05-artifact-paper-doll-system`

Outputs:
- `src/engine/commands/artifact-commands.ts`
- `EQUIP_HERO_ARTIFACT` and `UNEQUIP_HERO_ARTIFACT` reducers

Owned Paths:
- `src/engine/commands/artifact-commands.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- phase-2.01-spells-artifacts.05-artifact-paper-doll-system

Acceptance Criteria:
- Equip validates hero ownership, artifact ownership, slot compatibility,
  and duplicate-slot conflicts
- Unequip validates occupied slots and moves artifacts back to inventory
- Artifact stat effects update computed hero stats through the same
  deterministic path as combat
- Commands are replay-safe and contain only stable IDs

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
