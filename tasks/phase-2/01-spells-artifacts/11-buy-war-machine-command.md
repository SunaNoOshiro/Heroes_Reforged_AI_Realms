# Buy War Machine Command

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Implement purchase and assignment of war machines from factory screens.
War machines are content records referenced by stable IDs and applied to
hero battle loadouts without hard-coded equipment branches.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/14-war-machine-factory/interactions.md`

Inputs:
- Artifact/equipment content registry
- Hero inventory and battle loadout state
- Strategic resource state

Outputs:
- `src/engine/commands/war-machine-commands.ts`
- `BUY_WAR_MACHINE` reducer and validator

Owned Paths:
- `src/engine/commands/war-machine-commands.ts`

Dependencies:
- phase-2.01-spells-artifacts.05-artifact-paper-doll-system
- mvp.05-adventure-map.01-strategic-game-state-model

Acceptance Criteria:
- Purchase validates factory availability, hero ownership, slot
  compatibility, and resource cost
- A hero cannot equip duplicate exclusive war-machine slots
- Purchased records reference content IDs and never asset paths
- Screen 14 dispatches the command through the shared command hook

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
