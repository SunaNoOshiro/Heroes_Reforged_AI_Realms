# Launch Checklist + Final Smoke Test

Module: [Polish (M7)](../04-polish.md)

Description:
Pre-launch verification. Run the full end-to-end smoke test covering every feature from M0 to M7. Fix any regressions found.

Read First:
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)

Inputs:
- All modules complete

Outputs:
- `scripts/smoke-test.sh` — headless smoke test script
- Launch checklist (markdown) covering:
  - [ ] Fuzz harness passes (CI green)
  - [ ] Emberwild vs Necropolis: Wilson 95 % lower bound ≤ 65 % both ways over 200 games
  - [ ] Multiplayer: 2-player match completes on LAN
  - [ ] AI generation: 3 factions generated without errors
  - [ ] Save/load: 7-day game saves and loads with identical hash
  - [ ] Mod system: reference content bundle installs and plays
  - [ ] MCTS: Lord beats Grand Master ≥ 60%
  - [ ] Performance: 60 fps on target hardware
  - [ ] Accessibility: keyboard navigation works end-to-end

Owned Paths:
- `scripts/smoke-test.sh`

Dependencies:
- phase-3.04-polish.01a-renderer-capability-detection-and-adapter
- phase-3.04-polish.01b-webgpu-map-renderer-parity
- phase-3.04-polish.01c-webgpu-particles-fallback-and-benchmark
- phase-3.04-polish.02-sound-system-event-log-driven
- phase-3.04-polish.03-ranked-play-elo-ladder-plus-ai-pack-sandbox
- phase-3.04-polish.04-tournament-mode-ui
- phase-3.04-polish.05a-engine-performance-profiling
- phase-3.04-polish.05b-renderer-performance-profiling
- phase-3.04-polish.05c-ai-performance-profiling
- phase-3.04-polish.05d-content-loader-performance-profiling
- phase-3.04-polish.06-accessibility-pass

Acceptance Criteria:
- All checklist items pass
- Zero TypeScript errors, zero ESLint violations
- CI is green on `main` branch
- Zero open P0 bugs in issue tracker

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
