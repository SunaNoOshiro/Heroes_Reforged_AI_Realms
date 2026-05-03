# Module: Heuristic AI (M2)

The CPU opponent. Two tiers: a strategic AI (adventure map decisions) and a tactical AI (combat moves). Both run in a Web Worker to keep the UI responsive. Target difficulty: "Knight" is challenging for a new player.

**Milestone**: M2 — Tactical Combat  
**Total Estimate**: ~52 hours  
**Exit Criteria**: AI plays a full game without illegal moves; "Knight" difficulty provides meaningful opposition; Knight wins ≥ 80 % vs random over the bench harness; the runtime contract in [`docs/architecture/ai-contract.md`](../../docs/architecture/ai-contract.md) is fully implemented.

The runtime contract (input view, output, worker protocol,
per-turn budget table, cancellation, parallelism, decision log,
BotProvider, cheats) is the single source of truth in
[`docs/architecture/ai-contract.md`](../../docs/architecture/ai-contract.md).
M2 tasks below implement that contract; they do not redefine it.

---

## Task Files

- [01-threat-map-bfs-strategic-danger-gradients.md](10-heuristic-ai/01-threat-map-bfs-strategic-danger-gradients.md)
  🧠⚠️ Task 1: Threat-map BFS (strategic danger gradients) (~5h)
- [02-wants-engine-strategic-action-prioritization.md](10-heuristic-ai/02-wants-engine-strategic-action-prioritization.md)
  🧠 Task 2: Wants engine — strategic action prioritization (~5h)
- [03-action-scorer-priority-weights-plus-tie-breaking.md](10-heuristic-ai/03-action-scorer-priority-weights-plus-tie-breaking.md)
  🧠 Task 3: Action scorer — priority weights + tie-breaking (~4h)
- [04-tactical-evaluator-combat-move-scoring.md](10-heuristic-ai/04-tactical-evaluator-combat-move-scoring.md)
  🧠⚠️ Task 4: Tactical evaluator — combat move scoring (~6h)
- [05-difficulty-levels-pawn-and-knight.md](10-heuristic-ai/05-difficulty-levels-pawn-and-knight.md)
  🤖 Task 5: Difficulty levels — Pawn and Knight (~2h)
- [06-run-ai-in-web-worker.md](10-heuristic-ai/06-run-ai-in-web-worker.md)
  🤖 Task 6: Run AI in Web Worker (~3h)
- [07-ai-player-view-projection.md](10-heuristic-ai/07-ai-player-view-projection.md)
  🤖 Task 7: AI player-view projection (~4h)
- [08-ai-inspector-dev-screen.md](10-heuristic-ai/08-ai-inspector-dev-screen.md)
  🤖 Task 8: AI inspector — dev-only screen (~6h)
- [09-ai-decision-log-channel.md](10-heuristic-ai/09-ai-decision-log-channel.md)
  🤖 Task 9: AI decision-log side channel (~4h)
- [10-bot-provider-interface.md](10-heuristic-ai/10-bot-provider-interface.md)
  🤖 Task 10: BotProvider interface (~4h)
- [11-ai-bench-harness.md](10-heuristic-ai/11-ai-bench-harness.md)
  🤖 Task 11: AI bench harness — continuous quality gate (~5h)
