# Screen 46: Hero Screen
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Hero management sheet with portrait, primary stats, specialty, experience, secondary skills, equipment paper doll, backpack, army, minimap/sidebar context, and dismiss/quest/spell routes.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Equip artifact | `hero.equipArtifact` | command | Current screen | `EQUIP_HERO_ARTIFACT` | Moves artifact from backpack to legal slot. | Artifact drag ghosts follow cursor, legal equipment slots glow, accepted artifacts snap into place, skill and stat tooltips fade in. |
| Unequip artifact | `hero.unequipArtifact` | command | Current screen | `UNEQUIP_HERO_ARTIFACT` | Moves equipment to backpack if capacity allows. | Artifact drag ghosts follow cursor, legal equipment slots glow, accepted artifacts snap into place, skill and stat tooltips fade in. |
| Open spell book | `hero.openSpellBook` | navigation | `47-spell-book` | `OPEN_HERO_SPELLBOOK` | Routes with selected hero and spell context. | Artifact drag ghosts follow cursor, legal equipment slots glow, accepted artifacts snap into place, skill and stat tooltips fade in. |
| Open quest log | `hero.questLog` | navigation | `11-quest-log` | `OPEN_QUEST_LOG` | Routes to active quest list. | Artifact drag ghosts follow cursor, legal equipment slots glow, accepted artifacts snap into place, skill and stat tooltips fade in. |
| Split stack | `hero.splitStack` | navigation | `51-split-stack-dialog` | `OPEN_SPLIT_STACK_DIALOG` | Creates stack split draft. | Artifact drag ghosts follow cursor, legal equipment slots glow, accepted artifacts snap into place, skill and stat tooltips fade in. |
| Dismiss hero | `hero.dismiss` | navigation | `60-confirmation-dialog` | `REQUEST_DISMISS_HERO` | Requires explicit confirmation. | Artifact drag ghosts follow cursor, legal equipment slots glow, accepted artifacts snap into place, skill and stat tooltips fade in. |

### State Changes
- `state.heroes.selectedHeroId` refreshes `hero.id` after the owning reducer or local UI draft changes.
- `state.heroes.byId[selected].stats` refreshes `hero.primaryStats` after the owning reducer or local UI draft changes.
- `state.heroes.byId[selected].secondarySkills` refreshes `hero.skills` after the owning reducer or local UI draft changes.
- `state.heroes.byId[selected].equipment` refreshes `hero.equipment` after the owning reducer or local UI draft changes.
- `state.heroes.byId[selected].backpack` refreshes `hero.backpack` after the owning reducer or local UI draft changes.
- `state.heroes.byId[selected].army` refreshes `hero.army` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Open spell book can route to `47-spell-book` after guard approval and exit animation.
- Open quest log can route to `11-quest-log` after guard approval and exit animation.
- Split stack can route to `51-split-stack-dialog` after guard approval and exit animation.
- Dismiss hero can route to `60-confirmation-dialog` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
