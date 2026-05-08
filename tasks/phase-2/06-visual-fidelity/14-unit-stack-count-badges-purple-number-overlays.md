# Unit Stack Count Badges — Purple Number Overlays

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
Each unit stack on the battlefield shows a small purple/blue badge with the stack count number, positioned at the bottom-center of the hex. This is one of the genre's most iconic visual details.

Visual direction: every living unit hex has a small purple/blue badge with a white stack-count number.

Read First:
- [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- `BattleState` stack sizes, hex positions

Outputs:
- `src/renderer/stack-badges.ts`
- `renderStackBadges(gl, stacks: UnitStack[], camera: Camera): void`
- Badge: small rounded rectangle, dark purple/blue fill, white bold number
- Positioned at bottom-center of unit's hex (not centered on unit sprite)
- Updates in real time as stacks take casualties
- Badge hidden when stack count is 0 (dead)

Badge color coding (optional enhancement):
- Count ≥ 1000: gold badge
- Count 100–999: purple badge
- Count 10–99: blue badge
- Count 1–9: default badge

Owned Paths:
- `src/renderer/stack-badges.ts`

Dependencies:
- mvp.06-renderer.05-1115-tactical-battlefield-renderer

Acceptance Criteria:
- All living stacks show badges with correct count
- Badge count updates immediately when a stack takes casualties (after animation)
- Badge is legible at all zoom levels (minimum 12px font equivalent)
- Dead stacks (count=0) have no badge

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
