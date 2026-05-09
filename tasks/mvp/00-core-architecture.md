# Module: Core Architecture Contracts (M0)

The contracts that the deterministic engine, command dispatcher,
multi-engine harness, and renderer all hand off to one another.
These tasks formalize the cross-module contract gaps in this module.

No runtime engine code is shipped here — only documentation, JSON
schemas, and CI-side checks that future engine, AI, and net tasks can
implement against.

**Milestone**: M0 — Skeleton  
**Total Estimate**: ~22 hours  
**Exit Criteria**: All cross-module contract gaps in this module are
closed in docs / schemas / CI; `npm run validate` passes including
the new `validate:arch` step.

---

## Self-Contained Brief

- **Purpose**: Formalize the cross-module contracts (state shape,
  RNG streams, ID allocator, command dispatcher, multi-engine
  harness) every other deterministic module hands off to.
- **Public surface**: [`src/contracts/rng.ts`](../../src/contracts/rng.ts),
  [`src/contracts/clock.ts`](../../src/contracts/clock.ts),
  [`src/contracts/id-allocator.ts`](../../src/contracts/id-allocator.ts),
  [`src/contracts/command-bus.ts`](../../src/contracts/command-bus.ts).
- **Side effects**: row "src/contracts/" in
  [`docs/architecture/side-effect-matrix.md`](../../docs/architecture/side-effect-matrix.md)
  (pure, types-only).
- **NFR**: NFR-LAT-03, NFR-PERF-04 in
  [`docs/architecture/non-functional-requirements.md`](../../docs/architecture/non-functional-requirements.md).
- **Exit criteria**: see header.

---

## Task Files

- [arch-state-shape.md](00-core-architecture/arch-state-shape.md)
  🧠⚠️ Top-level GameState shape + JSON schema + canonical example (~3h)
- [det-rng-streams.md](00-core-architecture/det-rng-streams.md)
  🧠⚠️ Named PCG32 sub-stream catalogue (~2h)
- [det-id-allocator.md](00-core-architecture/det-id-allocator.md)
  🧠⚠️ Mid-game entity-ID allocator format (~2h)
- [cmd-nonce.md](00-core-architecture/cmd-nonce.md)
  🧠⚠️ Command nonce / dedup contract + schema update (~3h)
- [cmd-dispatcher-queue.md](00-core-architecture/cmd-dispatcher-queue.md)
  🧠⚠️ Bounded FIFO queue + overflow policy (~2h)
- [cmd-cross-actor-ordering.md](00-core-architecture/cmd-cross-actor-ordering.md)
  🧠⚠️ Cross-actor command-ordering rule (~2h)
- [det-seed-source.md](00-core-architecture/det-seed-source.md)
  🤖 Fresh-session seed-source precedence (~2h)
- [arch-multi-engine-harness.md](00-core-architecture/arch-multi-engine-harness.md)
  🧠⚠️ Multi-engine harness factory contract (~2h)
- [arch-module-graph.md](00-core-architecture/arch-module-graph.md)
  🤖 Module-graph fitness check (custom Node script, zero deps) (~3h)
- [perf-frame-budget.md](00-core-architecture/perf-frame-budget.md)
  🤖 Frame-time budget &amp; degradation policy (~3h)
