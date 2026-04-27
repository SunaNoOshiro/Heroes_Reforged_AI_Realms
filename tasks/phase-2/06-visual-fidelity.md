# Module: Visual Fidelity — Overland Strategy Look & Feel (M1/M2)

The goal of this module is to make the game **feel** like a classic
overland-strategy / turn-based-battle game. Technical correctness
(Task 1 of `06-renderer.md`) is not enough — art layering, UI chrome,
terrain blending, and decorative density all need to land together.
Visual direction is defined by internal screen packages and original
asset briefs; external captures are not implementation inputs.

**Status**: moved from `mvp/06b-visual-fidelity` to `phase-2/` on
2026-04-22 per
[`audit-2026-04-22-full-repo`](../../docs/planning/audits/audit-2026-04-22-full-repo.md)
item I5. The solo-build-lane defers this module in full, and keeping
the "b" suffix in the MVP index kept confusing linear readers.

**Milestone**: phase-2 (pulled earlier only if a later MVP task
explicitly depends on it)
**Total Estimate**: ~46 hours
**Exit Criteria**: A player familiar with the genre recognizes the
layout and visual structure immediately.
**Lint Tags**: renderer-primitive

---

## Task Files

- [01-terrain-transition-tiles-blending-between-terrain-types.md](06-visual-fidelity/01-terrain-transition-tiles-blending-between-terrain-types.md)
  🧠⚠️ Task 1: Terrain transition tiles — blending between terrain types (~6h)
- [02-pseudo-isometric-depth-sorting-objects-overlap-correctly.md](06-visual-fidelity/02-pseudo-isometric-depth-sorting-objects-overlap-correctly.md)
  🧠 Task 2: Pseudo-isometric depth sorting — objects overlap correctly (~4h)
- [03-decorative-scatter-objects-rocks-trees-mushrooms-campfires.md](06-visual-fidelity/03-decorative-scatter-objects-rocks-trees-mushrooms-campfires.md)
  🤖 Task 3: Decorative scatter objects — rocks, trees, mushrooms, campfires (~4h)
- [04-road-sprites-stone-path-tiles-with-directional-variants.md](06-visual-fidelity/04-road-sprites-stone-path-tiles-with-directional-variants.md)
  🤖 Task 4: Road sprites — stone path tiles with directional variants (~3h)
- [05-river-water-animated-tiles.md](06-visual-fidelity/05-river-water-animated-tiles.md)
  🤖 Task 5: River / water animated tiles (~3h)
- [06-ornate-ui-frame-full-screen-medieval-border-chrome.md](06-visual-fidelity/06-ornate-ui-frame-full-screen-medieval-border-chrome.md)
  🧠 Task 6: Ornate UI frame — the full-screen medieval border chrome (~4h)
- [07-right-panel-mini-map-with-compass-rose.md](06-visual-fidelity/07-right-panel-mini-map-with-compass-rose.md)
  🧠 Task 7: Right panel — mini-map with compass rose (~3h)
- [08-right-panel-town-building-icon-grid.md](06-visual-fidelity/08-right-panel-town-building-icon-grid.md)
  🧠 Task 8: Right panel — town building icon grid (~3h)
- [09-right-panel-hero-portrait-plus-primary-stats.md](06-visual-fidelity/09-right-panel-hero-portrait-plus-primary-stats.md)
  🧠 Task 9: Right panel — hero portrait + primary stats (~3h)
- [10-right-panel-secondary-skills-row-plus-army-stacks-row.md](06-visual-fidelity/10-right-panel-secondary-skills-row-plus-army-stacks-row.md)
  🤖 Task 10: Right panel — secondary skills row + army stacks row (~3h)
- [11-bottom-bar-7-resources-plus-info-text-strip-plus-date-counter.md](06-visual-fidelity/11-bottom-bar-7-resources-plus-info-text-strip-plus-date-counter.md)
  🤖 Task 11: Bottom bar — 7 resources + info text strip + date counter (~3h)
- [12-battlefield-backdrop-terrain-backgrounds-per-terrain-type.md](06-visual-fidelity/12-battlefield-backdrop-terrain-backgrounds-per-terrain-type.md)
  🧠⚠️ Task 12: Battlefield backdrop — terrain backgrounds per terrain type (~3h)
- [13-siege-backdrop-walls-gate-towers-moat.md](06-visual-fidelity/13-siege-backdrop-walls-gate-towers-moat.md)
  🧠⚠️ Task 13: Siege backdrop — walls, gate, towers, moat (~5h)
- [14-unit-stack-count-badges-purple-number-overlays.md](06-visual-fidelity/14-unit-stack-count-badges-purple-number-overlays.md)
  🤖 Task 14: Unit stack count badges — purple number overlays (~2h)
- [15-hex-grid-overlay-semi-transparent-highlight-system.md](06-visual-fidelity/15-hex-grid-overlay-semi-transparent-highlight-system.md)
  🤖 Task 15: Hex grid overlay — semi-transparent highlight system (~2h)
