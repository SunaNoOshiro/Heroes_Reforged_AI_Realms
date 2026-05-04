# Screen 47: Spell Book
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Open spellbook view with school tabs, two-page spell grid, known/disabled spell states, mastery-derived details, mana cost, and cast/close controls.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select school | `spellbook.selectSchool` | local-ui | Current screen | `SELECT_SPELL_SCHOOL_TAB` | Changes local filter/page. | Book opens with page lift, school tabs flip pages, selected spell glows, disabled spell icons desaturate, Cast transitions into targeting overlay. |
| Turn page | `spellbook.turnPage` | local-ui | Current screen | `TURN_SPELLBOOK_PAGE` | Changes local page index. | Book opens with page lift, school tabs flip pages, selected spell glows, disabled spell icons desaturate, Cast transitions into targeting overlay. |
| Select spell | `spellbook.selectSpell` | local-ui | Current screen | `SELECT_SPELL` | Updates selected spell detail and cast enabled state. | Book opens with page lift, school tabs flip pages, selected spell glows, disabled spell icons desaturate, Cast transitions into targeting overlay. |
| Cast spell | `spellbook.cast` | navigation | `17-adventure-spell-targeting` or `44-combat-spell-targeting` | `BEGIN_SPELL_TARGETING` | Creates targeting draft if mana and context are valid. | Book opens with page lift, school tabs flip pages, selected spell glows, disabled spell icons desaturate, Cast transitions into targeting overlay. |
| Close | `spellbook.close` | navigation | `46-hero-screen` or previous screen | `CLOSE_SPELLBOOK` | Returns to owning screen. | Book opens with page lift, school tabs flip pages, selected spell glows, disabled spell icons desaturate, Cast transitions into targeting overlay. |

### State Changes
- `state.heroes.byId[selected].knownSpells` refreshes `hero.spells` after the owning reducer or local UI draft changes.
- `state.ui.spellbook.selectedSchool` refreshes `spellbook.school` after the owning reducer or local UI draft changes.
- `state.ui.spellbook.selectedSpellId` refreshes `selectedSpell` after the owning reducer or local UI draft changes.
- `state.heroes.byId[selected].mana` refreshes `mana` after the owning reducer or local UI draft changes.
- `state.ui.spellbook.castContext` refreshes `castContext` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Cast spell can route to `17-adventure-spell-targeting` or `44-combat-spell-targeting` after guard approval and exit animation.
- Close can route to `46-hero-screen` or previous screen after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
