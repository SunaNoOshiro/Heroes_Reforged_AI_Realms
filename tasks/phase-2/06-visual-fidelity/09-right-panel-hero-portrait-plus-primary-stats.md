# Right Panel — Hero Portrait + Primary Stats

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
The middle section of the right panel shows the selected hero's portrait and their four primary stats. This is visible at all times during the player's turn.

Visual direction: hero portrait with ATK/DEF/POW/KNW values and sword/shield/magic/book iconography.

Read First:
- `docs/architecture/wiki/screens/46-hero-screen/spec.md`
- `docs/architecture/wiki/screens/46-hero-screen/interactions.md`
- `docs/architecture/wiki/screens/46-hero-screen/data-contracts.md`
- `docs/architecture/wiki/screens/46-hero-screen/architecture.md`
- `docs/architecture/wiki/screens/46-hero-screen/mockup.html`

Inputs:
- Selected hero state from Zustand, hero primary stats
- Screen package `docs/architecture/wiki/screens/46-hero-screen/`

Outputs:
- `src/ui/components/HeroPortraitPanel.tsx`
- Hero portrait: 58×64px portrait image in a styled border
- Hero name below portrait (serif font matching the baseline overland style)
- Four stat rows, each with: icon + value
  - ⚔️ Attack (sword icon)
  - 🛡️ Defense (shield icon)
  - 🎩 Spell Power (hat/crown icon)
  - 📖 Knowledge (open book icon)
- Clicking portrait opens full hero screen

Owned Paths:
- `src/ui/components/HeroPortraitPanel.tsx`

Dependencies:
- phase-2.06-visual-fidelity.06-ornate-ui-frame-full-screen-medieval-border-chrome
- mvp.07-ui-shell.05-hero-info-panel

Acceptance Criteria:
- Correct stats shown for the selected hero
- Stats update immediately after artifacts are equipped
- "No hero selected" state shows a placeholder (empty portrait + dashes for stats)
- Portrait border color matches hero faction
- Layout, bindings, and commands match `docs/architecture/wiki/screens/46-hero-screen/mockup.html`, `docs/architecture/wiki/screens/46-hero-screen/interactions.md`, and `docs/architecture/wiki/screens/46-hero-screen/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
