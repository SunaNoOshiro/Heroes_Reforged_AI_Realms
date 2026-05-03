# Adventure Skill Appliers

Status: planned

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Implement deterministic runtime appliers for secondary skills that
modify adventure-map movement, visibility, capacity, or neutral-stack
interaction. This task intentionally excludes combat damage and magic
economy behavior.

Read First:
- [`research/deep-research-report.md`](../../../research/deep-research-report.md) (Section "Secondary Skills")
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Skill runtime contract from
  `phase-2.01-spells-artifacts.07a-skill-runtime-contract-and-id-normalization`
- Adventure map state, pathfinder, fog-of-war state, and map-object
  visit hooks
- Skill records from the active content registry

Outputs:
- `src/engine/skills/adventure-skill-appliers.ts`
- Appliers for Pathfinding, Logistics, Scouting, Navigation, Diplomacy,
  and Smuggling
- Deterministic test vectors for movement, sight, and neutral-stack
  interaction hooks

Owned Paths:
- `src/engine/skills/adventure-skill-appliers.ts`

Dependencies:
- phase-2.01-spells-artifacts.07a-skill-runtime-contract-and-id-normalization
- phase-2.01-spells-artifacts.04a-baseline-skill-pack
- mvp.03-map-system.04-a-pathfinder-with-terrain-cost-plus-zoc
- mvp.03-map-system.05-fog-of-war
- mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands

Acceptance Criteria:
- Adventure-skill stat deltas (e.g. capacity, sight) are emitted in the
  canonical pipeline shape pinned by
  [`docs/architecture/stat-composition-order.md`](../../../docs/architecture/stat-composition-order.md);
  no applier mutates hero stats directly
- Pathfinding and Navigation adjust movement cost deterministically
  before movement validation consumes MP
- Logistics adjusts adventure capacity through a stable, replayed
  derived-stat path
- Scouting updates sight radius without revealing hidden data outside
  deterministic fog rules
- Diplomacy and Smuggling expose explicit hooks and validation outcomes;
  any deferred negotiation or stealth behavior is documented rather than
  invented as an unregistered effect kind
- Effects are replay-safe and use stable IDs only

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
