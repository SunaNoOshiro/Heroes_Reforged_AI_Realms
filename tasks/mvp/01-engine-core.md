# Module: Engine Core (M0)

The non-negotiable foundation. Everything else in the project depends on the determinism stack being rock-solid before a single line of game logic is written. Do not skip or rush these tasks.

**Milestone**: M0 — Skeleton  
**Total Estimate**: ~45 hours  
**Exit Criteria**: Replay-determinism fuzz test passes on every PR in CI.

---

## Task Files

- [01-initialize-root-workspace-and-module-layout.md](01-engine-core/01-initialize-root-workspace-and-module-layout.md)
  🤖 Task 1: Initialize root workspace and module layout (~2h)
- [02-set-up-vite-plus-typescript-strict-mode-per-module.md](01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md)
  🤖 Task 2: Set up Vite + TypeScript strict mode per module (~2h)
- [03-implement-pcg32-prng-with-named-sub-streams.md](01-engine-core/03-implement-pcg32-prng-with-named-sub-streams.md)
  🧠⚠️ Task 3: Implement PCG32 PRNG with named sub-streams (~4h)
- [04-implement-fixed-point-math-library.md](01-engine-core/04-implement-fixed-point-math-library.md)
  🧠⚠️ Task 4: Implement fixed-point math library (~4h)
- [05-eslint-rule-ban-math-random-and-floats-in-src-engine.md](01-engine-core/05-eslint-rule-ban-math-random-and-floats-in-src-engine.md)
  🤖 Task 5: ESLint rule — ban Math.random() and floats in `src/engine` (~2h)
- [06-command-dispatcher.md](01-engine-core/06-command-dispatcher.md)
  🧠⚠️ Task 6: Command dispatcher (~6h)
- [06b-extend-command-schema-coverage-checklist.md](01-engine-core/06b-extend-command-schema-coverage-checklist.md)
  🤖 Task 6b: Extend command schema coverage checklist (~2h)
- [07-state-serializer-plus-xxh64-hash.md](01-engine-core/07-state-serializer-plus-xxh64-hash.md)
  🧠⚠️ Task 7: State serializer + xxh64 hash (~4h)
- [07b-canonical-json.md](01-engine-core/07b-canonical-json.md)
  🧠⚠️ Task 7b: Canonical JSON + content hash (~3h)
- [08-replay-api.md](01-engine-core/08-replay-api.md)
  🤖 Task 8: Replay API (~4h)
- [09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md)
  🤖 Task 9: Fuzz harness — 1000-command AI-vs-AI determinism test (~4h)
- [10-github-actions-ci.md](01-engine-core/10-github-actions-ci.md)
  🤖 Task 10: GitHub Actions CI — lint + type-check + fuzz on every PR (~2h)
- [11-no-wall-clock-lint.md](01-engine-core/11-no-wall-clock-lint.md)
  🤖 Task 11: ESLint rule — `no-wall-clock` in deterministic paths (~2h)
