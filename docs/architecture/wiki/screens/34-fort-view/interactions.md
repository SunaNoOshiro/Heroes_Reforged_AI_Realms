# Screen 34: Fort View
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Town fortification inspection view showing fort/citadel/castle tier, wall/tower battle bonuses, and siege readiness.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select segment | `fortView.selectSegment` | local-ui | Current screen | `SELECT_FORT_SEGMENT` | Updates bonus detail plaque. | Wall segments highlight in construction order, tower icons flare, gate opens on hover, and missing upgrades pulse as dark silhouettes. |
| Open build tree | `fortView.buildTree` | navigation | `30-build-tree` | `OPEN_BUILD_TREE_FOR_FORT` | Focuses next fortification upgrade. | Wall segments highlight in construction order, tower icons flare, gate opens on hover, and missing upgrades pulse as dark silhouettes. |
| Close | `fortView.close` | navigation | `24-town-screen` | `CLOSE_FORT_VIEW` | Returns to town. | Wall segments highlight in construction order, tower icons flare, gate opens on hover, and missing upgrades pulse as dark silhouettes. |

### State Changes
- `state.towns.byId[selected].fortificationLevel` refreshes `fortLevel` after the owning reducer or local UI draft changes.
- `selectors.towns.fortificationBattleLayout` refreshes `wallDefinition` after the owning reducer or local UI draft changes.
- `selectors.towns.fortificationGrowthBonus` refreshes `growthBonus` after the owning reducer or local UI draft changes.
- `selectors.towns.nextFortUpgradePrereqs` refreshes `buildPrereqs` after the owning reducer or local UI draft changes.
- `state.ui.fortView.selectedSegment` refreshes `selectedSegment` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Open build tree can route to `30-build-tree` after guard approval and exit animation.
- Close can route to `24-town-screen` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
