# Screen 27: Thieves Guild
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Read-only intelligence ranking. The screen never enters the
deterministic command log: all three actions are `local-ui`
(routing, selection, sort) per
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
`localUiPrefixes` (`SELECT_`, `SORT_`, `CLOSE_`).

### Shared Animation
All actions share the same visual response: intelligence columns
reveal left-to-right based on guild level, the selected player row
glows, and unavailable cells stay covered.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Select player | `thieves.selectPlayer` | local-ui | Current screen | `SELECT_THIEVES_GUILD_ROW` | Highlights row and detail footer. |
| Change sort | `thieves.sort` | local-ui | Current screen | `SORT_THIEVES_GUILD_COLUMN` | Changes local sort order only. |
| Close | `thieves.close` | navigation | `24-town-screen` | `CLOSE_THIEVES_GUILD` | Returns to tavern / town context. |

### State Changes
- `state.players.all` refreshes `players` after the owning reducer
  or local UI draft changes.
- `state.townServices.thievesGuildLevel` refreshes `intelligenceLevel`
  after the owning reducer or local UI draft changes.
- `state.intelligence.rankings` refreshes `rankings` after the
  owning reducer or local UI draft changes.
- `state.ui.thievesGuild.selectedPlayerId` refreshes `selectedPlayer`
  after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor,
  drag ghost, and animation frame stay outside deterministic
  gameplay state.

### Navigation Outcomes
- `thieves.close` routes to `24-town-screen` after guard approval
  and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route
  guards fail.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, and rejected commands
  fail loudly.
- On rejection, keep the current screen open, preserve local draft
  when useful, show localized error text, and play failure feedback.
- Error toast text is produced by `formatUserError(err, locale)`
  declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error text inline.

### Error Surfaces
No `Type=command` rows on this screen — every action is `local-ui`
or `navigation`, so the error-ux coverage gate
([`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs))
has no command-surface rows to enforce. Any future command added
here must add a row per [`error-ux.md`](../../../error-ux.md) § 5.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs, next-screen targets, and animation copy match sibling `spec.md` § Animation Contract and `mockup.html` (single `CLOSE` button, column / row grid).
- **Schema: ✔** — All three command tokens are local-UI routing per [`screen-command-coverage.json`](../../../screen-command-coverage.json) `localUiPrefixes`; none requires a `command.schema.json` entry. Sibling `data-contracts.md` § Commands And Events agrees.
- **Tasks: ✔** — Owning task `phase-2.07-ui-screen-backlog.27-thieves-guild-screen` ([`tasks/phase-2/07-ui-screen-backlog/27-thieves-guild-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/27-thieves-guild-screen.md)) AC requires each token resolve through `screen-command-coverage.json`, which matches the table above.

## ⚠ Issues

_None._
