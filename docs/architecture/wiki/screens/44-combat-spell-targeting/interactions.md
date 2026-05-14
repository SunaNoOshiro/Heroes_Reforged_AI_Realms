# Screen 44: Combat Spell Targeting
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Targeting overlay raised over [`38-combat-screen`](../38-combat-screen/)
once a combat spell is selected in
[`47-spell-book`](../47-spell-book/). Owns hover preview, cast guard,
and cancel routing.

### Actions
Shared animation/audio: legal hexes pulse, the previewed area locks on
hover, the spell glyph flares on confirm, and immune targets flash red
with status text on rejection.

| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Hover target | `combatSpell.hoverTarget` | local-ui | Current screen | `PREVIEW_COMBAT_SPELL_TARGET` | Updates target area preview and immune-marker status text. |
| Cast | `combatSpell.cast` | command | `38-combat-screen` | `CAST_COMBAT_SPELL` | Spends mana and applies spell effects on guard approval. |
| Cancel | `combatSpell.cancel` | navigation | `38-combat-screen` | `CANCEL_COMBAT_SPELL_TARGETING` | Discards target draft; returns to combat without casting. |

Command-coverage mapping (per
[`screen-command-coverage.json`](../../../screen-command-coverage.json)):
`CAST_COMBAT_SPELL` is an alias of `SPELL_CAST` (engine reducer);
`PREVIEW_COMBAT_SPELL_TARGET` and `CANCEL_COMBAT_SPELL_TARGETING`
resolve as UI-local through the `PREVIEW_` and `CANCEL_` prefixes.

### State Changes
- `state.ui.battle.selectedSpellId` refreshes `selectedSpell` when the
  owning reducer or local UI draft changes.
- `state.battle.activeHeroId` refreshes `casterHero`.
- `state.heroes.byId[caster].mana` refreshes `mana`.
- `state.battle.spellTargeting.legalTargets` refreshes `legalTargets`
  on hover.
- `state.battle.spellTargeting.immuneTargets` refreshes
  `immuneTargets` on hover.
- UI-only hover, focus, selected row, open tab, target cursor, drag
  ghost, and animation frame stay outside deterministic gameplay
  state.

### Navigation Outcomes
- Cast routes to `38-combat-screen` after guard approval and exit
  animation.
- Cancel routes to `38-combat-screen` after exit animation; no
  reducer mutation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route guards
  fail.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly.
- On rejection, keep the overlay open, preserve the local draft when
  useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each action whose `Type` column is `command` to its default surface
for this screen's dominant error domain. A row whose Notes column
reads `override` replaces the § 2 default for that action; otherwise
the default applies. Specific error codes (e.g. `DISPATCHER_<token>`,
`STORAGE_<token>`) land alongside the engine reducer that owns each
command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Cast (`CAST_COMBAT_SPELL`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs (`combatSpell.hoverTarget`, `combatSpell.cast`, `combatSpell.cancel`) match the bindings in sibling [`spec.md`](./spec.md) § State Bindings and the per-row animation summary in [`architecture.md`](./architecture.md) § 6 Animation Flow. The mockup ([`mockup.html`](./mockup.html)) draws Hover and renders the underlying `38-combat-screen` button strip; Cast/Cancel surface through the spell card.
- **Schema: ✔** — `CAST_COMBAT_SPELL` is an alias of `SPELL_CAST` in [`screen-command-coverage.json`](../../../screen-command-coverage.json#L7); `PREVIEW_COMBAT_SPELL_TARGET` and `CANCEL_COMBAT_SPELL_TARGETING` match the closed `localUiPrefixes` list there. Error surface follows [`error-ux.md`](../../../error-ux.md) § 2 DISPATCHER_*.
- **Tasks: ⚠** — Owning task [`phase-2.01-spells-artifacts.08-spell-casting-in-combat-ui`](../../../../../tasks/phase-2/01-spells-artifacts/08-spell-casting-in-combat-ui.md) depends on `phase-2.01-spells-artifacts.02-combat-spells` for live dispatch of `SPELL_CAST`; until that task is `done`, Cast follows the planned-task disabled-render rule cited in the owner task's Acceptance Criteria.

## ⚠ Issues

- **No discrete Cast button in the mockup.** The targeting overlay in [`mockup.html`](./mockup.html) renders Hover (legal hexes) and reuses the underlying `38-combat-screen` bottom-button strip (Spell, Wait, Defend, Auto, Retreat, End) — there is no dedicated `combatSpell.cast` / `combatSpell.cancel` affordance. The current encoding assumes that click-on-legal-hex IS the Cast gesture and Esc IS the Cancel gesture, consistent with [`ui-input-arbitration.md`](../../../ui-input-arbitration.md). Owner: the owning UI task should either add visible affordances or codify the gesture-only convention in `spec.md` § Component Tree. Flagged rather than silently rewritten because adding affordances would change `mockup.html` (Hard Prohibition B).
