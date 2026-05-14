# Screen 31: Grail Building
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md` (components, state bindings, animation contract)
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Town grail-building ceremony. The visiting hero delivers the grail
artifact; the player confirms construction of the faction-specific
wonder, which permanently buffs the town/player.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Build grail (`ConfirmBuildButton`) | `grail.build` | command | `24-town-screen` | `BUILD_GRAIL_STRUCTURE` | Consumes the grail delivery, adds the faction grail building to the town, applies bonuses. | Ceremony VFX per `spec.md` § Animation Contract (relic rise, wonder beam, plaques illuminate, hotspot glow). |
| Inspect bonuses (`TownBonusList` row) | `grail.inspect` | local-ui | Current screen | `SELECT_GRAIL_BONUS` (local UI event, `SELECT_` prefix per `screen-command-coverage.json`; never enters the command log) | Local UI focus only — no deterministic state change. | Highlight on the focused bonus plaque only; no ceremony VFX. |
| Cancel (`CancelButton`) | `grail.cancel` | navigation | `24-town-screen` | `CLOSE_GRAIL_BUILDING_DIALOG` (local UI event, `CLOSE_` prefix per `screen-command-coverage.json`; never enters the command log) | Leaves the grail delivery unresolved; no town/player mutation. | Panel exits; town panorama restores. |

### State Changes
- `state.towns.selectedTownId` refreshes `townId` after the owning
  reducer accepts the build, or when the player switches town from
  the parent shell.
- `state.adventure.visitingHeroId` refreshes `deliveringHero` after
  the visit reducer (`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`)
  registers the hero on the town tile.
- `state.scenario.grail` refreshes `grailRecord` after the obelisk /
  delivery reducer mutates it.
- `selectors.towns.factionGrailBuilding` and
  `selectors.towns.grailBonusPreview` recompute on any of the above.
- UI-only hover, focused plaque, button highlight, and animation
  frame stay outside deterministic gameplay state.

### Navigation Outcomes
- `grail.build` routes to `24-town-screen` after `BUILD_GRAIL_STRUCTURE`
  is accepted and the ceremony VFX completes (or skipped under
  reduced-motion mode).
- `grail.cancel` routes to `24-town-screen` immediately; no
  deterministic state change.
- `grail.inspect` does not change screen.

### Disabled And Error Cases
- Disable `ConfirmBuildButton` when the dispatcher rejects the
  preview (no grail in delivery state, town not owned, or grail
  building already constructed). The disabled-control tooltip
  resolves the localization key listed under `Error surfaces`
  below.
- Missing presentation assets may use resolver fallback (per
  [`asset-policy.md`](../../../asset-policy.md)). Missing gameplay
  records, invalid content IDs, or rejected commands fail loudly per
  [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the dialog open, preserve the local focus
  state, show the localized error string, and play the failure
  audio cue.
- Errors are produced by `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.

### AI Implementation Notes
- This file owns control behavior, command routing, navigation
  timing, and disabled / error rules.
- `spec.md` owns visible regions, state bindings, and the animation
  contract.
- `architecture.md` diagrams must mirror this contract — they do not
  introduce hidden behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each `command`-typed action to its default surface. A row whose
Notes column reads `override` replaces the § 2 default for that
action; otherwise the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Build grail (`BUILD_GRAIL_STRUCTURE`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |

`grail.inspect` is `local-ui` and `grail.cancel` is `navigation`;
neither dispatches a fallible command, so neither carries an error-
surface row.

---

## 🔍 Sync Check

- **UI: ⚠** — Buttons in the Actions table match
  `mockup.html` (`data-action="grail.build"`, `data-action="grail.cancel"`).
  `grail.inspect` has no mockup affordance — see sibling `spec.md`
  `## ⚠ Issues` for the cross-package gap.
- **Schema: ✔** — `BUILD_GRAIL_STRUCTURE` resolves to
  [`command.schema.json` `$defs.buildGrailStructure`](../../../../../content-schema/schemas/command.schema.json)
  (`kind`, `townId`, `grailArtifactId`, `metadata`).
  `SELECT_GRAIL_BONUS` and `CLOSE_GRAIL_BUILDING_DIALOG` are local-
  UI events (prefixes `SELECT_` and `CLOSE_` are listed in
  [`screen-command-coverage.json` `localUiPrefixes`](../../../screen-command-coverage.json));
  they are deliberately not in `command.schema.json`.
- **Tasks: ✔** — UI owner
  [`phase-2.07-ui-screen-backlog.31-grail-building-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/31-grail-building-screen.md)
  Reads-First this file; engine owner
  [`phase-2.05-mod-system.07-build-grail-structure-command`](../../../../../tasks/phase-2/05-mod-system/07-build-grail-structure-command.md)
  Reads-First this file. Acceptance criterion of the UI task already
  requires that "every interaction token whose owning engine task is
  `done` MUST dispatch live."

## ⚠ Issues

- **Animation column was templated across all three rows.** The
  prior revision applied the full ceremony description to
  `grail.build`, `grail.inspect`, and `grail.cancel` identically —
  inconsistent with `spec.md` § Animation Contract, which scopes
  the ceremony to the build action. This rewrite replaces the
  inspect / cancel rows with their per-action behavior (focus
  highlight, panel exit) consistent with the spec. No new feature is
  introduced.
- **`grail.inspect` requires a mockup affordance to ship.** Cross-
  package consistency gap surfaced in sibling `spec.md`
  `## ⚠ Issues`; closing it is the responsibility of UI task
  [`phase-2.07-ui-screen-backlog.31-grail-building-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/31-grail-building-screen.md).
