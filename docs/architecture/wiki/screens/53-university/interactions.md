# Screen 53: University — Interaction Map

This file owns control behavior, dispatch, and disabled / error
timing for the University screen. [`spec.md`](./spec.md) owns the
static layout and state bindings; [`architecture.md`](./architecture.md)
diagrams must mirror this file rather than introduce hidden
behavior.

### Screen Package
- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Purpose
Hero-driven secondary-skill purchase at a university: select an
eligible offer, learn it via the deterministic
`LEARN_UNIVERSITY_SKILL` command, or close back to the caller.

### Actions
| UI Element | Action ID | Type | Next Screen | Token | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select skill card | `university.selectSkill` | local-ui | (this screen) | `SELECT_UNIVERSITY_SKILL` | `state.ui.university.selectedSkillId` draft; refreshes price + legality preview. | Card glow on hover and select. |
| `LEARN` button | `university.learn` | command | (this screen) | `LEARN_UNIVERSITY_SKILL` | Spends gold; adds or upgrades the selected secondary skill on the visiting hero. | Selected skill book opens, gold ticks down, learned skill slides into the hero skill row. |
| `CLOSE` button | `university.close` | navigation | [`07-adventure-map`](../07-adventure-map/) or [`24-town-screen`](../24-town-screen/) | `CLOSE_UNIVERSITY` (local-ui prefix) | Returns to caller. | Modal fade-out on exit. |

`SELECT_` and `CLOSE_` are `localUiPrefixes` in
[`screen-command-coverage.json`](../../../screen-command-coverage.json),
so only `LEARN_UNIVERSITY_SKILL` enters the deterministic command
log; the other two tokens stay in route / draft state.

### State Changes
- `state.ui.university.sourceId` — local UI draft, set when the
  caller opens the screen; never persisted.
- `state.mapObjects.byId[universityId].offeredSkills` — reducer-only,
  refreshed by the source-object reducer (see `## ⚠ Issues`).
- `state.heroes.byId[selected].skills` — reducer-only, mutated by
  `LEARN_UNIVERSITY_SKILL` accept.
- `state.ui.university.selectedSkillId` — local UI draft, written
  by `university.selectSkill`, never persisted.
- `selectors.heroes.universityLearnGuard` — derived selector;
  refreshes when its inputs change.
- Hover, focus, drag ghost, cursor blink, and animation frame stay
  outside deterministic gameplay state.

### Navigation Outcomes
- `university.close` routes to
  [`07-adventure-map`](../07-adventure-map/) when the source is an
  adventure-map university object, or to
  [`24-town-screen`](../24-town-screen/) when entered from a town
  context; the active source is recorded in
  `state.ui.university.sourceId`. Routing fires after guard
  approval and exit animation.

### Disabled And Error Cases
- The `LEARN` button is disabled when any of: required selectors or
  registry records are missing, the selected offer is not legal for
  this hero (no open / upgradeable skill slot, mastery rejected,
  max skill count reached), or
  `state.players.active.resources.gold` is below the offer cost.
- Missing presentation assets fall back through the asset resolver
  per [`asset-policy.md`](../../../asset-policy.md). Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly per [`fail-loud.md`](../../../fail-loud.md).
- On dispatcher rejection, the modal stays open, the local
  selection draft is preserved, a localized inline error renders,
  and failure audio plays.
- All player-facing error strings come from
  `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never
  construct toast or inline text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams mirror these
  interactions and never introduce hidden behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The row below maps the
only schema-backed command on this screen (`LEARN_UNIVERSITY_SKILL`)
to its default surface for this screen's dominant error domain. A
row whose Notes column reads `override` replaces the § 2 default;
otherwise the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land with the engine
reducer that owns each command and trigger
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if their row is missing.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Learn (`LEARN_UNIVERSITY_SKILL`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled `LEARN` button + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — `LEARN` and `CLOSE` button copy, the four offer
  cards, and the bottom status row match
  [`mockup.html`](./mockup.html) `data-action="university.learn"` /
  `university.close`; the bindings, animation cues, and next-screen
  targets align with sibling [`spec.md`](./spec.md) and
  [`architecture.md`](./architecture.md).
- **Schema: ⚠** — `LEARN_UNIVERSITY_SKILL` payload
  `{ heroId, universityId, skillId }` matches
  [`command.schema.json#/$defs/learnUniversitySkill`](../../../../../content-schema/schemas/command.schema.json)
  (line 1256). `SELECT_UNIVERSITY_SKILL` and `CLOSE_UNIVERSITY`
  correctly stay `local-ui` per the `SELECT_` / `CLOSE_` prefixes
  in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
  Canonical `university-skill-table.schema.json` is not yet on
  disk — see sibling [`spec.md ⚠ Issues`](./spec.md#-issues).
- **Tasks: ⚠** — Engine reducer owner
  [`phase-2.01-spells-artifacts.12-learn-university-skill-command`](../../../../../tasks/phase-2/01-spells-artifacts/12-learn-university-skill-command.md)
  Reads First this file; UI owner
  [`phase-2.07-ui-screen-backlog.53-university-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/53-university-screen.md)
  lists it as a Read First and Acceptance Criterion source. State
  paths under § State Changes rely on projections the strategic
  state model does not yet expose — see sibling
  [`spec.md ⚠ Issues`](./spec.md#-issues).

## ⚠ Issues

- **State-path projections not in `AdventureState` (mirror).**
  The five paths under § State Changes reference projections
  (`state.mapObjects.byId[universityId].offeredSkills`,
  `state.ui.university.sourceId`,
  `state.ui.university.selectedSkillId`,
  `state.heroes.byId[selected].skills`,
  `selectors.heroes.universityLearnGuard`) the strategic state
  model does not yet expose. Owner:
  [`mvp.05-adventure-map.01-strategic-game-state-model`](../../../../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md)
  or a sibling UI-selector task. Full detail in sibling
  [`spec.md ⚠ Issues`](./spec.md#-issues).
