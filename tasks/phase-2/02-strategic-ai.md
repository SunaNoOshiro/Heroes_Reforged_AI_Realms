# Module: Strategic AI Depth (M3)

Upgrade the heuristic AI to master-level strategic play: multi-hero coordination, resource deficit detection, and the "Grand Master" difficulty that plays as well as a strong human.

**Milestone**: M3 — Depth  
**Total Estimate**: ~22 hours  
**Exit Criteria**: "Grand Master" AI makes no obviously sub-optimal strategic decisions; wins consistently vs "Knight" AI in 100 headless games.

The AI runtime contract (input view, output, worker protocol,
per-turn budget table, cancellation, parallelism, decision log,
BotProvider, cheats) is the single source of truth in
[`docs/architecture/ai-contract.md`](../../docs/architecture/ai-contract.md).
M3 tasks below extend that contract additively (e.g. the Grand
Master row of the per-turn budget table); they do not redefine it.

The Grand Master row of the per-turn budget table per
[`ai-contract.md` § 4 Per-Turn Budget Table](../../docs/architecture/ai-contract.md#4-per-turn-budget-table):
per-turn budget 1 s, hard timeout 2 s, no-action fallback
`END_HERO_TURN`.

---

## Task Files

- [01-resource-deficit-detector.md](02-strategic-ai/01-resource-deficit-detector.md)
  🧠⚠️ Task 1: Resource deficit detector (~3h)
- [02-town-building-planner.md](02-strategic-ai/02-town-building-planner.md)
  🧠⚠️ Task 2: Town building planner (~4h)
- [03-multi-hero-role-assignment.md](02-strategic-ai/03-multi-hero-role-assignment.md)
  🧠 Task 3: Multi-hero role assignment (~4h)
- [04-long-horizon-path-planning-2-day-lookahead.md](02-strategic-ai/04-long-horizon-path-planning-2-day-lookahead.md)
  🧠⚠️ Task 4: Long-horizon path planning (2-day lookahead) (~5h)
- [05-grand-master-difficulty-plus-headless-evaluation.md](02-strategic-ai/05-grand-master-difficulty-plus-headless-evaluation.md)
  🤖 Task 5: Grand Master difficulty + headless evaluation (~3h)
- [06-spell-selection-in-tactical-ai.md](02-strategic-ai/06-spell-selection-in-tactical-ai.md)
  🤖 Task 6: Spell selection in tactical AI (~3h)
