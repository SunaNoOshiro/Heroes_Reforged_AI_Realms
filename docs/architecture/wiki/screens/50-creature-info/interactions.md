# Screen 50: Creature Info
## Interaction Map

### Source Files

- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose

Read-only creature detail surface. Hover reveals ability copy,
`UPGRADE` routes to the surface that owns the upgrade mutation,
`CLOSE` returns to the caller. No schema command is dispatched
from this screen.

### Actions

| UI Element | Action ID | Type | Next Screen | Token | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Ability row (hover / focus) | `creatureInfo.hoverAbility` | local-ui | Current screen | `SHOW_CREATURE_ABILITY_DETAIL` (**local-ui token** — matches the `SHOW_` prefix in [`screen-command-coverage.json`](../../../screen-command-coverage.json) `localUiPrefixes`) | Updates the local ability-detail tooltip; no `state.*` write. | Ability-row glow, `audio.ui.hover`. |
| `UPGRADE` button | `creatureInfo.openUpgrade` | navigation | `13-hill-fort` or `25-building-recruitment-dialog` (per `stackContext`) | `OPEN_CREATURE_UPGRADE_SOURCE` (**local-ui route** — matches the `OPEN_` prefix in [`screen-command-coverage.json`](../../../screen-command-coverage.json) `localUiPrefixes`) | Routes only when the caller supports upgrades (`stackContext ∈ {hero, dwelling}`). | Panel fade-out, `audio.ui.click`. |
| `CLOSE` button / Esc | `creatureInfo.close` | navigation | Previous screen | `CLOSE_CREATURE_INFO` (**local-ui route** — matches the `CLOSE_` prefix in [`screen-command-coverage.json`](../../../screen-command-coverage.json) `localUiPrefixes`) | Clears `state.ui.creatureInfo.creatureId` (back to `null`); caller resumes. Esc precedence ladder per [`ui-input-arbitration.md`](../../../ui-input-arbitration.md). | Panel fade-out, `audio.ui.click`. |

### State Changes

- `state.ui.creatureInfo.creatureId` is **read** by this screen; it is **written** by the upstream caller route (see [`58-week-month-popup/interactions.md`](../58-week-month-popup/interactions.md) for one such caller) and cleared by `creatureInfo.close`.
- `state.ui.creatureInfo.stackContext` is **read** by this screen; written by the upstream caller route as one of `hero | combat | dwelling | reward | calendar`.
- `baseStats` (`registries.creatures.byId[creatureId].stats`) and `abilityIds` (`registries.creatures.byId[creatureId].abilityIds`) are static-registry reads — they do not refresh except when the active content pack changes.
- `modifiers` (`selectors.creatures.stackStatModifiers`) recomputes when its upstream slices (hero skills, active spells, equipped artifacts, terrain, ruleset) change.
- UI-only hover, focus, scroll position, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes

- `UPGRADE` → `13-hill-fort` when `stackContext = hero` (visiting Hill Fort with the stack); → `25-building-recruitment-dialog` when `stackContext = dwelling` (in-town recruitment row). Disabled for `combat` / `reward` / `calendar`.
- `CLOSE` / Esc → caller screen after the panel fade-out completes.
- Hover-ability stays on the current screen (no route).

### Disabled And Error Cases

- `UPGRADE` is disabled when `stackContext` does not support upgrades (`combat`, `reward`, `calendar`) or when the resolved creature has no upgrade target in the active pack.
- Missing presentation assets fall back through the asset resolver per [`asset-loading.md`](../../../asset-loading.md).
- Missing gameplay records, malformed `creatureId`, or unresolved content IDs fail loudly per [`fail-loud.md`](../../../fail-loud.md) before any control becomes enabled.
- On a route-guard rejection from `13-hill-fort` / `25-building-recruitment-dialog`, the panel stays mounted and surfaces a localized error.
- Errors are produced by `formatUserError(err, locale)` from [`error-formatter.md`](../../../error-formatter.md); never construct toast text inline.

### AI Implementation Notes

- This file owns behavior, routing, and timing.
- `spec.md` owns static regions and state bindings.
- `data-contracts.md` owns schema, asset, localization, and replay references.
- `architecture.md` diagrams must mirror these interactions, not invent new behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Action set matches the two buttons (`UPGRADE`, `CLOSE`) and the hover-able `AbilityList` rows in `mockup.html`; route targets match sibling [`spec.md`](./spec.md) Mechanics Mapping and [`architecture.md`](./architecture.md) Outgoing Transitions.
- **Schema: ✔** — All three tokens (`SHOW_CREATURE_ABILITY_DETAIL`, `OPEN_CREATURE_UPGRADE_SOURCE`, `CLOSE_CREATURE_INFO`) match prefixes in [`screen-command-coverage.json`](../../../screen-command-coverage.json) `localUiPrefixes` and are correctly classified as routes, not schema commands; no entry in [`command-schema.md`](../../../command-schema.md) is required for any of them.
- **Tasks: ✔** — UI screen owned by [`phase-2.07-ui-screen-backlog.50-creature-info-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/50-creature-info-screen.md); downstream upgrade mutation owned by `13-hill-fort` and `25-building-recruitment-dialog` screen packages (see their interactions for the actual schema command).

## ⚠ Issues

- **Original interactions table treated all three tokens as commands and copied a single Animation / Audio string into every row.** Now reclassified as local-ui routes per `screen-command-coverage.json`, and animation copy is split per row (hover-glow vs. panel-fade) to match `mockup.html`. Same correction appears in sibling [`data-contracts.md`](./data-contracts.md) and [`architecture.md`](./architecture.md).
- **`stackContext`-based `UPGRADE` enablement is not pinned by any schema.** The "disabled for `combat` / `reward` / `calendar`" rule above is the audited contract, but the literal `stackContext` set must be pinned in code or schema by the owning UI task [`phase-2.07-ui-screen-backlog.50-creature-info-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/50-creature-info-screen.md). Surfaced rather than rewritten; same gap noted in sibling [`spec.md`](./spec.md).
