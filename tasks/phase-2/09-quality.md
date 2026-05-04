# Module: Quality (M-Quality)

Phase-2 quality bar that the depth layer (M3+) leans on. Adds
fuzz / property tests for numeric saturation, drain semantics, and
state-shape invariants pinned by the edge-cases policy.

**Milestone**: Phase 2 — Depth quality gates
**Total Estimate**: ~3 hours
**Exit Criteria**: Saturation, overflow, and drain-clamp invariants
have CI-enforced fuzz coverage.

---

## Task Files

- [01-overflow-fuzz.md](09-quality/01-overflow-fuzz.md)
  🤖 Overflow / saturation fuzz target (~3h)
