# Screen 47: Spell Book
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Open-spellbook view for the selected hero: school tabs, two-page
spell grid, known / disabled spell states, mastery-derived
details, mana cost, and cast / close controls. Entered from
`46-hero-screen` (or the previous caller); routes into
`17-adventure-spell-targeting` or `44-combat-spell-targeting` on
cast.

### Actions
Shared animation / audio: the book opens with a page lift, school
tabs flip pages, the selected spell icon glows, disabled spell
icons desaturate, and Cast transitions into the targeting overlay
with a parchment-fade. Reduced-motion mode replaces transitions
with static highlights.

| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Select school | `spellbook.selectSchool` | local-ui | Current screen | `SELECT_SPELL_SCHOOL_TAB` | Changes local school filter and refreshes the page grids. |
| Turn page | `spellbook.turnPage` | local-ui | Current screen | `TURN_SPELLBOOK_PAGE` | Changes the local page index for the active school. |
| Select spell | `spellbook.selectSpell` | local-ui | Current screen | `SELECT_SPELL` | Updates `SelectedSpellDetails` and the Cast enabled state. |
| Cast spell | `spellbook.cast` | navigation | `17-adventure-spell-targeting` or `44-combat-spell-targeting` | `BEGIN_SPELL_TARGETING` | Creates the targeting draft when mana and `castContext` are valid; routes to the matching targeting overlay. |
| Close | `spellbook.close` | navigation | `46-hero-screen` or previous screen | `CLOSE_SPELLBOOK` | Returns to the owning caller; discards local draft. |

Command-coverage mapping (per
[`screen-command-coverage.json`](../../../screen-command-coverage.json)):
this screen dispatches **no engine reducer commands**. All five
tokens resolve as UI-local through the `SELECT_`, `TURN_`,
`BEGIN_`, and `CLOSE_` prefixes; the actual `SPELL_CAST` (engine
reducer) is dispatched downstream by
`17-adventure-spell-targeting` or `44-combat-spell-targeting`
once the player confirms a target.

### State Changes
- `state.heroes.byId[selected].knownSpells` refreshes
  `hero.spells` after the engine reducer changes it (e.g. spell
  learning).
- `state.ui.spellbook.selectedSchool` refreshes
  `spellbook.school` on `spellbook.selectSchool`.
- `state.ui.spellbook.selectedSpellId` refreshes `selectedSpell`
  on `spellbook.selectSpell`.
- `state.heroes.byId[selected].mana` refreshes `mana` after the
  engine reducer changes it.
- `state.ui.spellbook.castContext` refreshes `castContext` from
  the route entry (`adventure` or `combat`) supplied by the
  caller.
- UI-only hover, focus, selected row, open tab, target cursor,
  drag ghost, and animation frame stay outside deterministic
  gameplay state.

### Navigation Outcomes
Each navigation row routes only after guard approval plus the
exit animation:

- Cast spell → `17-adventure-spell-targeting` when
  `castContext === 'adventure'`; →
  `44-combat-spell-targeting` when `castContext === 'combat'`.
- Close → `46-hero-screen` (entry caller) or the previous screen
  on the route stack.

### Disabled And Error Cases
- Cast is disabled when the selected spell is unknown, locked
  by wisdom / mastery, costs more than current mana, has no
  legal targets in the active `castContext`, or fails any route
  guard. Disabled icons desaturate; the Cast button shows a
  localized tooltip reason.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands
  fail loudly per [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the spellbook open, preserve the local
  draft when useful, show localized error text, and play failure
  feedback.
- Error strings are produced by `formatUserError(err, locale)`
  declared in [`error-formatter.md`](../../../error-formatter.md);
  never construct toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions
  rather than inventing new behavior.

### Error surfaces
Per [`error-ux.md`](../../../error-ux.md) § 5, this screen
inherits the default code → surface mapping from § 2. Because
this screen dispatches no engine reducer commands, the only
rejection surfaces are local route guards (validation /
dispatcher fall-through from the downstream targeting overlay).
Disabled controls render with a tooltip; toasts use the formatter
above.

---

## 🔍 Sync Check

- **UI: ⚠** — Action IDs (`spellbook.selectSchool`,
  `spellbook.selectSpell`, `spellbook.cast`, `spellbook.close`)
  align with the `data-action` attribute in
  [`mockup.html`](./mockup.html) and the bindings in sibling
  [`spec.md`](./spec.md) § State Bindings — aligned. The mockup
  has no `data-action="spellbook.turnPage"` element — see
  `## ⚠ Issues`. Routing into `17-adventure-spell-targeting`
  matches that screen's entry note in
  [`../17-adventure-spell-targeting/interactions.md`](../17-adventure-spell-targeting/interactions.md).
- **Schema: ✔** — All five action tokens match the closed
  `localUiPrefixes` list in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (`SELECT_`, `TURN_`, `BEGIN_`, `CLOSE_`); none requires a
  registration in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
  Downstream `SPELL_CAST` is owned by the targeting screens.
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.47-spell-book-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/47-spell-book-screen.md)
  depends on
  `phase-2.01-spells-artifacts.01b-spell-school-loader-plus-mastery-scaling`
  and `phase-2.01-spells-artifacts.08-spell-casting-in-combat-ui`;
  until those are `done`, the Cast control follows the
  planned-task disabled-render rule in that task's Acceptance
  Criteria.

## ⚠ Issues

- **`spellbook.turnPage` has no affordance in the mockup.**
  [`mockup.html`](./mockup.html) renders school tabs, 24 spell
  slots (12 per page), `SelectedSpellDetails`, `ManaFooter`, and
  Cast / Close buttons — there is no page-turn ribbon, corner
  arrow, or page-number control. The row is preserved here per
  Hard Prohibition B, but either the mockup needs a dedicated
  affordance or the action / `TURN_SPELLBOOK_PAGE` token should
  be removed from this file and sibling
  [`data-contracts.md`](./data-contracts.md) § Commands And
  Events. Owner:
  [`phase-2.07-ui-screen-backlog.47-spell-book-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/47-spell-book-screen.md);
  the mockup is not editable by this audit (skill § 9 prohibition
  D).
