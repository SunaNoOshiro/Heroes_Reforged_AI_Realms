# Multi-Hero Role Assignment

Module: [Strategic AI Depth (M3)](../02-strategic-ai.md)

Description:
When the AI has multiple heroes, assign each a role to avoid duplicated effort. Roles: army-builder (recruits and fights), scout (explores quickly), defender (guards key town).

Read First:
- [`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- AI's hero list, threat map (`10-heuristic-ai.md` Task 1)

Outputs:
- `src/ai/bots/hero-roles.ts`
- `assignHeroRoles(heroes, state, threat): Map<HeroId, HeroRole>`
- `HeroRole`: `"army_builder" | "scout" | "defender" | "support"`
- Scout role: hero with highest Scouting skill or fastest speed; pursues fog exploration
- Defender role: hero assigned to highest-threat town; does not leave garrison radius

Owned Paths:
- `src/ai/bots/hero-roles.ts`

Dependencies:
- mvp.10-heuristic-ai.01-threat-map-bfs-strategic-danger-gradients
- mvp.10-heuristic-ai.02-wants-engine-strategic-action-prioritization
- mvp.10-heuristic-ai.03-action-scorer-priority-weights-plus-tie-breaking

Acceptance Criteria:
- With 3 heroes and 1 threatened town: 1 defender, 1 army builder, 1 scout
- Scout hero does not compete for units with army builder
- Role reassignment fires when threat map changes significantly (new enemy hero appears)

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
