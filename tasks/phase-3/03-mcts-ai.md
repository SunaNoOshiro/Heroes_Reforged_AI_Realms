# Module: MCTS AI (M7)

Monte Carlo Tree Search for strategic and tactical play. Replaces the heuristic AI at "Lord" and "Immortal" difficulty settings. Backed by WASM-compiled hot paths for performance.

**Milestone**: M7 — Polish  
**Total Estimate**: ~28 hours  
**Exit Criteria**: "Lord" difficulty beats "Grand Master" heuristic AI in ≥ 60% of 50 headless games.

The AI runtime contract (input view, output, worker protocol,
per-turn budget table, cancellation, parallelism, decision log,
BotProvider, cheats) is the single source of truth in
[`docs/architecture/ai-contract.md`](../../docs/architecture/ai-contract.md).
M7 extends that contract additively for the Lord and Immortal
rows of the per-turn budget table; it does not redefine it.

Per
[`ai-contract.md` § 4 Per-Turn Budget Table](../../docs/architecture/ai-contract.md#4-per-turn-budget-table):

- Lord:     per-turn budget 2 s, hard timeout 4 s, no-action
  fallback "best-of-MCTS-rollouts so far, else `END_HERO_TURN`".
- Immortal: per-turn budget 3 s, hard timeout 6 s, no-action
  fallback "best-of-MCTS-rollouts so far, else `END_HERO_TURN`".

The 60 % vs Grand Master quality gate is verified continuously by
the bench harness owned by
[`tasks/mvp/10-heuristic-ai/11-ai-bench-harness.md`](../mvp/10-heuristic-ai/11-ai-bench-harness.md);
M7 is not a one-shot end-of-milestone check.

---

## Task Files

- [01a-mcts-tree-state-and-root-expansion.md](03-mcts-ai/01a-mcts-tree-state-and-root-expansion.md)
  🧠⚠️ Task 1a: MCTS tree state + root expansion (~4h)
- [01b-ucb1-search-loop-and-budgeted-runner.md](03-mcts-ai/01b-ucb1-search-loop-and-budgeted-runner.md)
  🧠⚠️ Task 1b: UCB1 search loop + budgeted runner (~4h)
- [02-heuristic-evaluator-no-random-rollouts.md](03-mcts-ai/02-heuristic-evaluator-no-random-rollouts.md)
  🧠⚠️ Task 2: Heuristic evaluator (no random rollouts) (~5h)
- [03-beam-search-for-strategic-layer.md](03-mcts-ai/03-beam-search-for-strategic-layer.md)
  🧠⚠️ Task 3: Beam search for strategic layer (~5h)
- [04-wasm-hot-path-compilation-assemblyscript.md](03-mcts-ai/04-wasm-hot-path-compilation-assemblyscript.md)
  ⚠️ Task 4: WASM hot path compilation (AssemblyScript) (~6h)
- [05-difficulty-levels-lord-and-immortal.md](03-mcts-ai/05-difficulty-levels-lord-and-immortal.md)
  🤖 Task 5: Difficulty levels — Lord and Immortal (~2h)
- [06-performance-benchmark-plus-headless-eval.md](03-mcts-ai/06-performance-benchmark-plus-headless-eval.md)
  🤖 Task 6: Performance benchmark + headless eval (~2h)
