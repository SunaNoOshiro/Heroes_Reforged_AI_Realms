# Screen 17: Adventure Spell Targeting
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure-map targeting overlay for map spells (Town Portal,
Dimension Door, Fly, Water Walk, View Air, View Earth). Entered
from `47-spell-book` via `BEGIN_SPELL_TARGETING`.

### Actions
Shared animation/audio: legal tiles pulse, cursor rune rotates,
invalid targets flash red, an accepted cast draws a magic trail
then hands camera/hero movement to the reducer.

| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Hover target | `advSpell.hoverTarget` | local-ui | Current screen | `PREVIEW_ADVENTURE_SPELL_TARGET` | Updates target draft and status text. |
| Cast on target | `advSpell.cast` | command | `07-adventure-map` or target result screen | `CAST_ADVENTURE_SPELL` | Spends mana and applies spell result. |
| Open world view | `advSpell.viewWorld` | navigation | `16-view-world` | `OPEN_VIEW_WORLD_FROM_SPELL` | Post-cast route for View Air / View Earth; no visible button — fired by the reducer when the cast spell's scope is the world-view family. |
| Cancel | `advSpell.cancel` | navigation | `47-spell-book` or `07-adventure-map` | `CANCEL_SPELL_TARGETING` | Discards target draft. |

Command-coverage mapping (per
[`screen-command-coverage.json`](../../../screen-command-coverage.json)):
`CAST_ADVENTURE_SPELL` is an alias of `SPELL_CAST` (engine
reducer);
`PREVIEW_ADVENTURE_SPELL_TARGET`, `OPEN_VIEW_WORLD_FROM_SPELL`,
and `CANCEL_SPELL_TARGETING` resolve as UI-local through the
`PREVIEW_`, `OPEN_`, and `CANCEL_` prefixes.

### State Changes
- `state.ui.spellTargeting.spellId` refreshes `selectedSpell`
  when the owning reducer or local UI draft changes.
- `state.adventure.selectedHeroId` refreshes `casterHero`.
- `selectors.spells.adventureLegalTargets` refreshes
  `legalTargets`.
- `state.heroes.byId[caster].mana` refreshes `mana`.
- `state.ui.spellTargeting.hoverTarget` refreshes `targetDraft`.
- UI-only hover, focus, selected row, open tab, target cursor,
  drag ghost, and animation frame stay outside deterministic
  gameplay state.

### Navigation Outcomes
- `Cast on target` routes to `07-adventure-map` or a target-
  result screen after guard approval and exit animation.
- `Open world view` routes to `16-view-world` after the cast
  reducer accepts a View Air / View Earth spell.
- `Cancel` routes to `47-spell-book` (entry caller) or
  `07-adventure-map` (fallback) after exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route
  guards fail.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands
  fail loudly.
- On rejection, keep the current screen open, preserve local
  draft when useful, show localized error text, and play failure
  feedback.
- Errors are produced by `formatUserError(err, locale)` declared
  in [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions
  rather than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen
inherits the default code → surface mapping from § 2. The table
below maps each action whose `Type` column is `command` to its
default surface for this screen's dominant error domain. A row
whose Notes column reads `override` replaces the § 2 default for
that action; otherwise the default applies. Specific error codes
(e.g. `DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the
engine reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Cast on target (`CAST_ADVENTURE_SPELL`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs (`advSpell.hoverTarget`, `advSpell.cast`,
  `advSpell.viewWorld`, `advSpell.cancel`) align with the
  `data-action` attribute in [`mockup.html`](./mockup.html) and
  the bindings in sibling [`spec.md`](./spec.md) — aligned.
  Caller `47-spell-book` dispatches `BEGIN_SPELL_TARGETING` into
  this overlay (see
  [`../47-spell-book/interactions.md`](../47-spell-book/interactions.md)).
- **Schema: ✔** — `CAST_ADVENTURE_SPELL` is registered as an
  alias of `SPELL_CAST` in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json);
  the remaining three tokens match the closed `localUiPrefixes`
  list there. Error surface follows
  [`error-ux.md`](../../../error-ux.md) § 2 DISPATCHER_*.
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.17-adventure-spell-targeting-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/17-adventure-spell-targeting-screen.md)
  depends on `phase-2.01-spells-artifacts.03-adventure-map-spells`
  for live dispatch of `SPELL_CAST`; until that task is `done`,
  the cast control follows the planned-task disabled-render rule
  in the task's Acceptance Criteria.

## ⚠ Issues

- **`advSpell.viewWorld` has no visible affordance in the
  mockup.** The mockup ([`mockup.html`](./mockup.html)) shows
  only the `advSpell.cancel` button; the route to
  `16-view-world` is implicitly produced by the cast reducer for
  View Air / View Earth spells. The row is preserved here as a
  navigation outcome with `Type: navigation`, but the column
  semantics (a UI Element with a discrete control) are
  misleading. Owner: the owning UI task should either render a
  dedicated affordance or fold this row into the navigation
  outcomes list. Flagged rather than silently rewritten because
  removing the row would also drop the
  `OPEN_VIEW_WORLD_FROM_SPELL` token from command coverage.
