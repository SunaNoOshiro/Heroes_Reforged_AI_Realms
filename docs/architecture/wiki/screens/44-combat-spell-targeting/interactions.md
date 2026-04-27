# Screen 44: Combat Spell Targeting
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Combat spell targeting overlay with selected spell, mana cost, area-of-effect shape, legal hexes, immune targets, and cancel/confirm controls.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Hover target | `combatSpell.hoverTarget` | local-ui | Current screen | `PREVIEW_COMBAT_SPELL_TARGET` | Updates target area preview. | Valid hexes pulse, selected area locks, spell glyph flares, rejected immune targets flash red with status text. |
| Cast | `combatSpell.cast` | command | `38-combat-screen` | `CAST_COMBAT_SPELL` | Spends mana and applies spell effects. | Valid hexes pulse, selected area locks, spell glyph flares, rejected immune targets flash red with status text. |
| Cancel | `combatSpell.cancel` | navigation | `38-combat-screen` | `CANCEL_COMBAT_SPELL_TARGETING` | Returns to combat without casting. | Valid hexes pulse, selected area locks, spell glyph flares, rejected immune targets flash red with status text. |

### State Changes
- `state.ui.battle.selectedSpellId` refreshes `selectedSpell` after the owning reducer or local UI draft changes.
- `state.battle.activeHeroId` refreshes `casterHero` after the owning reducer or local UI draft changes.
- `state.heroes.byId[caster].mana` refreshes `mana` after the owning reducer or local UI draft changes.
- `state.battle.spellTargeting.legalTargets` refreshes `legalTargets` after the owning reducer or local UI draft changes.
- `state.battle.spellTargeting.immuneTargets` refreshes `immuneTargets` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Cast can route to `38-combat-screen` after guard approval and exit animation.
- Cancel can route to `38-combat-screen` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
