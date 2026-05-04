# Module: AI Tournament Harness (M3+)

Single reusable bracket runner used by every headless-evaluation task
that compares two AI bots. Lives inside Phase-2 because the first
consumer is
[`phase-2/02-strategic-ai/05`](./02-strategic-ai/05-grand-master-difficulty-plus-headless-evaluation.md).

Before this module, evaluation appeared ad-hoc in four separate tasks
(`phase-2/02-strategic-ai/05`, `phase-2/03-second-faction/06`,
`phase-3/03-mcts-ai/06`, plus the user-facing
`phase-3/04-polish/`). Each invented its own loop, its own metric,
and its own pass/fail threshold. The shared harness keeps the loop
and the metrics in one place; consumer tasks keep their own pass/
fail thresholds.

The full contract — input shape, output shape, reproducibility rule
— lives in
[`docs/architecture/testing/ai-tournament-harness.md`](../../docs/architecture/testing/ai-tournament-harness.md).

**Milestone**: M3+ — shared evaluation infrastructure
**Total Estimate**: ~4 hours
**Exit Criteria**: Every downstream consumer task imports the runner
instead of authoring its own bracket loop; the metrics struct
serializes byte-stably through the canonical-JSON path.

---

## Task Files

- [01-ai-tournament-harness.md](10-ai-tournament-harness/01-ai-tournament-harness.md)
  🤖 Task 1: Shared bracket runner + metrics schema (~4h)
