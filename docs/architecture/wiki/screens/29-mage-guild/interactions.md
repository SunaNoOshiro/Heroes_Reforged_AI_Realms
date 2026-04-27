# Screen 29: Mage Guild
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Mage guild spell learning screen with spell shelves by level, hero wisdom/magic-school eligibility, known spell state, and learn feedback.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select spell | `mageGuild.selectSpell` | local-ui | Current screen | `SELECT_GUILD_SPELL` | Updates spell detail and eligibility. | Eligible spell icons glow, learned spells stamp into the hero spell list, locked shelves remain dark. |
| Learn spell | `mageGuild.learnSpell` | command | Current screen | `LEARN_SPELL` | Adds spell to hero if eligible. | Eligible spell icons glow, learned spells stamp into the hero spell list, locked shelves remain dark. |
| Close | `mageGuild.close` | navigation | `24-town-screen` | `CLOSE_MAGE_GUILD` | Returns to town. | Eligible spell icons glow, learned spells stamp into the hero spell list, locked shelves remain dark. |

### State Changes
- `state.towns.byId[selected].mageGuildLevel` refreshes `town.mageGuildLevel` after the owning reducer or local UI draft changes.
- `state.towns.byId[selected].mageGuildSpells` refreshes `guildSpells` after the owning reducer or local UI draft changes.
- `state.adventure.visitingHeroId` refreshes `visitingHero` after the owning reducer or local UI draft changes.
- `state.heroes.byId[visiting].knownSpells` refreshes `hero.knownSpells` after the owning reducer or local UI draft changes.
- `state.heroes.byId[visiting].skills.wisdom` refreshes `hero.wisdom` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Close can route to `24-town-screen` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
