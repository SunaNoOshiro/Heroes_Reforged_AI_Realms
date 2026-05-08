# Right Panel — Secondary Skills Row + Army Stacks Row

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
Below the hero portrait, two rows of icon grids: the hero's secondary skills (up to 8 small icons) and the army stack slots (7 unit icons + count badges).

Visual direction: two compact rows of small icons showing skills and army units with readable count badges.

Read First:
- `docs/architecture/wiki/screens/46-hero-screen/spec.md`
- `docs/architecture/wiki/screens/46-hero-screen/interactions.md`
- `docs/architecture/wiki/screens/46-hero-screen/data-contracts.md`
- `docs/architecture/wiki/screens/46-hero-screen/architecture.md`
- `docs/architecture/wiki/screens/46-hero-screen/mockup.html`

Inputs:
- Selected hero state (skills + army), unit portraits
- Screen package `docs/architecture/wiki/screens/46-hero-screen/`

Outputs:
- `src/ui/components/HeroSkillsRow.tsx`
- 8 skill slot icons: each shows skill icon + level badge (B/A/E for Basic/Advanced/Expert)
- Empty skill slots: greyed-out placeholder icon
- Hover tooltip: skill name + level description

- `src/ui/components/ArmyStacksRow.tsx`
- 7 army stack slots: unit portrait icon + stack count number overlay
- Empty slots: greyed placeholder
- Clicking a stack: select it (for splitting or moving to different hero)
- Stack count shown as white number in bottom-right of icon

Owned Paths:
- `src/ui/components/HeroSkillsRow.tsx`
- `src/ui/components/ArmyStacksRow.tsx`

Dependencies:
- phase-2.06-visual-fidelity.09-right-panel-hero-portrait-plus-primary-stats
- mvp.07-ui-shell.05-hero-info-panel

Acceptance Criteria:
- Correct skills shown with correct level badges
- Army stacks show correct unit counts
- Clicking a stack slot in combat triggers that stack's action
- Empty slots render as styled placeholder cells (not blank space)
- Layout, bindings, and commands match `docs/architecture/wiki/screens/46-hero-screen/mockup.html`, `docs/architecture/wiki/screens/46-hero-screen/interactions.md`, and `docs/architecture/wiki/screens/46-hero-screen/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
