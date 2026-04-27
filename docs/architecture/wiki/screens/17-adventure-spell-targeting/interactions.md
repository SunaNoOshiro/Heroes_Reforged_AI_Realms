# Screen 17: Adventure Spell Targeting
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure map targeting overlay for map spells such as Town Portal, Dimension Door, Fly, Water Walk, View Air, and View Earth.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Hover target | `advSpell.hoverTarget` | local-ui | Current screen | `PREVIEW_ADVENTURE_SPELL_TARGET` | Updates target draft and status text. | Legal tiles pulse, cursor rune rotates, invalid target flashes red, accepted cast draws a magic trail and then resolves camera/hero movement. |
| Cast on target | `advSpell.cast` | command | `07-adventure-map` or target result screen | `CAST_ADVENTURE_SPELL` | Spends mana and applies spell result. | Legal tiles pulse, cursor rune rotates, invalid target flashes red, accepted cast draws a magic trail and then resolves camera/hero movement. |
| Open world view | `advSpell.viewWorld` | navigation | `16-view-world` | `OPEN_VIEW_WORLD_FROM_SPELL` | Routes for View Air/View Earth style spells. | Legal tiles pulse, cursor rune rotates, invalid target flashes red, accepted cast draws a magic trail and then resolves camera/hero movement. |
| Cancel | `advSpell.cancel` | navigation | `47-spell-book` or `07-adventure-map` | `CANCEL_SPELL_TARGETING` | Discards target draft. | Legal tiles pulse, cursor rune rotates, invalid target flashes red, accepted cast draws a magic trail and then resolves camera/hero movement. |

### State Changes
- `state.ui.spellTargeting.spellId` refreshes `selectedSpell` after the owning reducer or local UI draft changes.
- `state.adventure.selectedHeroId` refreshes `casterHero` after the owning reducer or local UI draft changes.
- `selectors.spells.adventureLegalTargets` refreshes `legalTargets` after the owning reducer or local UI draft changes.
- `state.heroes.byId[caster].mana` refreshes `mana` after the owning reducer or local UI draft changes.
- `state.ui.spellTargeting.hoverTarget` refreshes `targetDraft` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Cast on target can route to `07-adventure-map` or target result screen after guard approval and exit animation.
- Open world view can route to `16-view-world` after guard approval and exit animation.
- Cancel can route to `47-spell-book` or `07-adventure-map` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
