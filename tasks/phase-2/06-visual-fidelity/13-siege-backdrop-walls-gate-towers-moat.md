# Siege Backdrop — Walls, Gate, Towers, Moat

Module: [Visual Fidelity — Overland Strategy Look & Feel (M1/M2)](../06-visual-fidelity.md)

Description:
When a hero attacks a town, the battle screen shows the town's
fortifications as a static backdrop: walls on the right side, a gate
in the center-right, towers at the wall endpoints, and optionally a
moat. The attacker starts on the left; the defender is behind the
walls.

Read First:
- [`docs/architecture/renderer-technology-choice.md`](../../../docs/architecture/renderer-technology-choice.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)

Inputs:
- Town fortification tier (None / Fort / Citadel / Keep)
- Town faction (affects wall art style; all art comes from the faction
  pack, not hard-coded)

Outputs:
- `src/renderer/siege-backdrop.ts`
- `loadSiegeBackdrop(fortTier, faction): Promise<SiegeBackdrop>`
- `SiegeBackdrop`: layered sprite with:
  - Base terrain (same as battlefield backdrop)
  - Wall sprites placed on specific hex columns (columns 9–11)
  - Gate sprite at centre-right position
  - Tower sprites at wall endpoints
  - Moat tiles (impassable for ground units) if Citadel+

Owned Paths:
- `src/renderer/siege-backdrop.ts`

Hex occupation rules for siege:
- Wall hexes: occupy columns 9–11 (centre and right side)
- Gate hex: column 10, row 6 (centre row) — destructible
- Towers: shoot every round (auto-attack on nearest enemy)
- Moat: hexes in column 8 deal damage if a non-flying unit enters

Dependencies:
- phase-2.06-visual-fidelity.12-battlefield-backdrop-terrain-backgrounds-per-terrain-type
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order

Acceptance Criteria:
- Fort tier shows a wooden palisade
- Citadel tier shows stone walls + towers
- Keep tier shows tall stone walls + two towers + moat
- Tower auto-attack fires each round (simple ranged attack)
- Gate destruction opens the wall hex (becomes passable)
- All wall/tower art is resolved through the asset registry by ID,
  not by relative path

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
