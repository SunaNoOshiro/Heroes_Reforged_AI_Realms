# Transfer Hero Artifact Command

Status: planned

Module: [Spells & Artifacts (P2)](../01-spells-artifacts.md)

Description:
Implement artifact transfer between heroes as a deterministic command.
The reducer validates hero ownership, adjacency, artifact ownership,
paper-doll/backpack capacity, and equipment slot legality before moving
the artifact by stable ID.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/49-hero-meeting/interactions.md`
- `docs/architecture/wiki/screens/32-artifact-merchant-black-market/interactions.md`

Inputs:
- Hero artifact state from `phase-2.01-spells-artifacts.05-artifact-paper-doll-system`
- Hero adjacency and ownership from `AdventureState`
- `TRANSFER_HERO_ARTIFACT` payload from `command.schema.json`

Outputs:
- `src/engine/commands/transfer-hero-artifact.ts`
- `TRANSFER_HERO_ARTIFACT` reducer and semantic validator
- Extension note for later artifact merchant flows that use the same
  artifact-location validation helpers

Owned Paths:
- `src/engine/commands/transfer-hero-artifact.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.03-hero-movement
- phase-2.01-spells-artifacts.05-artifact-paper-doll-system
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- `TRANSFER_HERO_ARTIFACT` validates both heroes, active player
  ownership, same-tile or adjacent meeting legality, and artifact
  ownership
- The command moves the artifact to the target hero backpack unless a
  later caller supplies an explicit legal slot extension
- Artifact stat effects are recomputed through the same deterministic
  computed-stats path as equip/unequip
- Invalid transfers return `ValidationError` and leave both heroes
  byte-identical
- Screen 49 can dispatch the command through the shared command hook

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
