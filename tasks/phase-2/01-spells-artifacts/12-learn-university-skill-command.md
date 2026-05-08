# Learn University Skill Command

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Implement university skill purchase. The command validates offer tables,
hero skill capacity, prerequisites, and resource cost, then applies the
same skill roster mutation path used by level-up skill assignment.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/53-university/interactions.md`

Inputs:
- University skill table schema from `mvp.02-content-schemas.20-university-skill-table`
- Skill assignment command from Task 1a
- Strategic resource state

Outputs:
- `src/engine/commands/university-commands.ts`
- `LEARN_UNIVERSITY_SKILL` reducer and validator

Owned Paths:
- `src/engine/commands/university-commands.ts`

Dependencies:
- mvp.02-content-schemas.20-university-skill-table
- phase-2.01-spells-artifacts.01a-hero-skill-assignment

Acceptance Criteria:
- Hero can buy only skills listed by the current university table
- Skill capacity, tier prerequisites, and existing roster rules match
  `ASSIGN_SKILL`
- Cost uses integer resources and fails atomically when unaffordable
- Screen 53 does not invent a parallel skill mutation path

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
