# Screen 46: Hero Screen
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Hero management sheet: portrait, primary stats, specialty,
experience, secondary skills, equipment paper doll, backpack, army
row, minimap / sidebar context, and routes to spell book, quest log,
stack split, and dismiss confirmation.

### Animation contract (applies to every row below)
Artifact drag ghosts follow the cursor; legal equipment slots glow;
accepted artifacts snap into place; skill and stat tooltips fade in.
Per-row deviations are called out in the Animation / Audio column;
otherwise this contract applies. Reduced-motion handling lives in
sibling [`spec.md`](./spec.md) § Animation Contract.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Equip artifact | `hero.equipArtifact` | command | Current screen | `EQUIP_HERO_ARTIFACT` | Moves artifact from backpack to a legal slot. | Default (drag-ghost → glow → snap → tooltip fade). |
| Unequip artifact | `hero.unequipArtifact` | command | Current screen | `UNEQUIP_HERO_ARTIFACT` | Moves equipment to backpack when capacity allows. | Default. |
| Open spell book | `hero.openSpellBook` | navigation | `47-spell-book` | `OPEN_HERO_SPELLBOOK` | Routes with selected hero and spell context. | Default plus screen exit animation. |
| Open quest log | `hero.questLog` | navigation | `11-quest-log` | `OPEN_QUEST_LOG` | Routes to active quest list. | Default plus screen exit animation. |
| Split stack | `hero.splitStack` | navigation | `51-split-stack-dialog` | `OPEN_SPLIT_STACK_DIALOG` | Creates stack split draft. | Default plus modal-in animation. |
| Dismiss hero | `hero.dismiss` | navigation | `60-confirmation-dialog` | `REQUEST_DISMISS_HERO` | Requires explicit confirmation. | Default plus modal-in animation. |

Engine commands (`EQUIP_HERO_ARTIFACT`, `UNEQUIP_HERO_ARTIFACT`) are
defined in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
The `OPEN_*` / `REQUEST_*` routing tokens are UI-local per the
prefix lists in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
and never enter the deterministic command log.

### State Changes
- `state.heroes.selectedHeroId` → refreshes `hero.id` after the owning
  reducer or local UI draft changes.
- `state.heroes.byId[selected].stats` → refreshes `hero.primaryStats`.
- `state.heroes.byId[selected].secondarySkills` → refreshes
  `hero.skills`.
- `state.heroes.byId[selected].equipment` → refreshes
  `hero.equipment`.
- `state.heroes.byId[selected].backpack` → refreshes `hero.backpack`.
- `state.heroes.byId[selected].army` → refreshes `hero.army`.
- UI-only hover, focus, selected row, open tab, target cursor, drag
  ghost, and animation frame stay outside deterministic gameplay
  state.

### Navigation Outcomes
Each navigation row routes only after guard approval plus the exit
animation:

- Open spell book → `47-spell-book`.
- Open quest log → `11-quest-log`.
- Split stack → `51-split-stack-dialog`.
- Dismiss hero → `60-confirmation-dialog`.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route guards
  fail.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly per [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the current screen open, preserve local draft
  when useful, show localized error text, and play failure feedback.
- Error strings are produced by `formatUserError(err, locale)` from
  [`error-formatter.md`](../../../error-formatter.md); never
  construct toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each `command`-type action to its default surface. A row whose Notes
column reads `override` replaces the § 2 default; otherwise the
default applies. Specific error codes (e.g. `DISPATCHER_<token>`,
`STORAGE_<token>`) land alongside the engine reducer that owns each
command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Equip artifact (`EQUIP_HERO_ARTIFACT`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Unequip artifact (`UNEQUIP_HERO_ARTIFACT`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ⚠** — Action set matches sibling [`spec.md`](./spec.md) § Mechanics Mapping and [`data-contracts.md`](./data-contracts.md) § Commands And Events. The mockup ([`mockup.html`](./mockup.html)) renders only three visible buttons (`hero.questLog`, `hero.openSpellBook`, `hero.dismiss`); the equip / unequip / split-stack actions are drag- or context-driven and have no visible affordance — non-blocking but flagged so implementers wire the keyboard / hotkey paths. See sibling [`architecture.md`](./architecture.md) for the same observation on the component tree.
- **Schema: ✔** — `EQUIP_HERO_ARTIFACT` and `UNEQUIP_HERO_ARTIFACT` are defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json); the four `OPEN_*` / `REQUEST_*` routing tokens match the UI-local prefix list in [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — UI owner [`phase-2.07-ui-screen-backlog.46-hero-screen-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/46-hero-screen-screen.md) Reads First this file; engine equip / unequip commands are owned by [`phase-2.01-spells-artifacts.05a-equip-unequip-artifact-commands`](../../../../../tasks/phase-2/01-spells-artifacts/05a-equip-unequip-artifact-commands.md).

## ⚠ Issues

- **Drag- and context-only actions have no visible affordance in the mockup.** `hero.equipArtifact`, `hero.unequipArtifact`, and `hero.splitStack` are dispatched from drag-drop and (presumably) right-click context menus in [`mockup.html`](./mockup.html), but no button, label, or hotkey hint is rendered. Per Hard Prohibition B, this audit did not invent the affordance. Owner: [`phase-2.07-ui-screen-backlog.46-hero-screen-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/46-hero-screen-screen.md) decides whether to add visible hints (right-click prompt, keyboard hint) or document the gestures in [`ui-hotkeys.md`](../../../ui-hotkeys.md).
