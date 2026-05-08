# Right Panel — Town Building Icon Grid

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
Below the mini-map, the right panel shows icons for the selected town's built structures — a grid of building icons in a styled panel. Clicking a building icon opens the town screen. If no town is selected, this area shows town icons for all player-owned towns.

Visual direction: a 2x3 grid of building/structure icons below the
mini-map, styled as an original compact town-summary panel.

Read First:
- `docs/architecture/wiki/screens/24-town-screen/spec.md`
- `docs/architecture/wiki/screens/24-town-screen/interactions.md`
- `docs/architecture/wiki/screens/24-town-screen/data-contracts.md`
- `docs/architecture/wiki/screens/24-town-screen/architecture.md`
- `docs/architecture/wiki/screens/24-town-screen/mockup.html`

Inputs:
- Selected town state from Zustand, town building data
- Screen package `docs/architecture/wiki/screens/24-town-screen/`

Outputs:
- `src/ui/components/TownPanel.tsx`
- Grid of up to 6 building icons (most important buildings selected automatically)
- Built buildings: colored icon; unbuilt: greyed-out silhouette
- Hover tooltip: building name
- Click: opens town screen for that town
- If no town selected: shows overview icons for each owned town

Building icon priority order (what to show in the 6 slots):
1. Fortification tier (Fort/Citadel/Keep)
2. Capitol/Hall chain level
3. Mage Guild level
4. Highest-tier dwelling built
5. Special faction building
6. Marketplace/Blacksmith

Owned Paths:
- `src/ui/components/TownPanel.tsx`

Dependencies:
- phase-2.06-visual-fidelity.06-ornate-ui-frame-full-screen-medieval-border-chrome
- mvp.07-ui-shell.04-town-screen-modal

Acceptance Criteria:
- Icons update when a new building is constructed
- Greyed-out buildings are visually distinct but recognizable
- Clicking any town icon in "overview mode" opens that town's screen
- Layout, bindings, and commands match `docs/architecture/wiki/screens/24-town-screen/mockup.html`, `docs/architecture/wiki/screens/24-town-screen/interactions.md`, and `docs/architecture/wiki/screens/24-town-screen/data-contracts.md`.
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
