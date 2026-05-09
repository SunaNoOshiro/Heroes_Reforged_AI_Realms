# Frame-time budget &amp; degradation policy

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
60 FPS is aspirational; without a frame-time budget and degradation
table, renderer regressions ship invisibly until users complain. This
task pins the four-tier degradation table (Green / Amber / Orange /
Red), the rolling-average measurement window, and the Canvas 2D
fallback trigger.

Read First:
- [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)

Inputs:

Outputs:
- "Frame-Time Budget &amp; Degradation" subsection in
  [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)
- "Frame-time tier" entry in
  [`docs/architecture/glossary.md`](../../../docs/architecture/glossary.md)

Owned Paths:
- (none — additive sections inside renderer-technology-choice, the core-architecture audit, the performance audit, and the glossary; no net-new files)

Dependencies:
- None

Acceptance Criteria:
- Tier table covers Green (≤16.7 ms), Amber (16.8–25 ms), Orange
  (25–40 ms), Red (>40 ms sustained 1 s) with the prescribed action
  per tier.
- Tier entry uses a 60-frame rolling average; tier exit also requires
  a rolling-average drop; Red can escalate on a single bad frame.
- Telemetry rule documented: tier transitions surface via a debug
  overlay; uploads are opt-in.
- Audit Q4 in `01-core-architecture.md` flips from ❌ UNKNOWN to
  ✔ Defined.
- `glossary.md` has a "frame-time tier" entry.

Verify:
- npm run validate

Estimated Time:
- 3 hours
