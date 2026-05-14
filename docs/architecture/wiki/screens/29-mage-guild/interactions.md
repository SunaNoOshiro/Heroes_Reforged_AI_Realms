# Screen 29: Mage Guild — Interactions

This file owns control behavior, dispatch, and disabled/error timing
for the Mage Guild screen. `spec.md` owns static layout and state
bindings; `architecture.md` diagrams must mirror this file rather
than introduce hidden behavior.

### Screen Package
- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Purpose
Hero-driven spell learning at a town's Mage Guild: select an eligible
spell, learn it via the deterministic `LEARN_SPELL` command, or close
back to the town screen.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select spell icon | `mageGuild.selectSpell` | local-ui | (current) | `SELECT_GUILD_SPELL` | Updates selected-spell draft + status row. | Eligible icons glow; locked shelves stay dark. |
| `LEARN` button | `mageGuild.learnSpell` | command | (current) | `LEARN_SPELL` | Adds spell to hero spellbook on accept; failed attempts stay on screen. | Spell stamps into the hero spell list on accept. |
| `CLOSE` button | `mageGuild.close` | navigation | [`24-town-screen`](../24-town-screen/) | `CLOSE_MAGE_GUILD` | None (returns to town). | Book-close exit transition. |

Coverage rules (per
[`command-schema.md` § Screen interaction tokens](../../../command-schema.md)
and
[`screen-command-coverage.json`](../../../screen-command-coverage.json)):

- `LEARN_SPELL` is a schema-backed command and dispatches through the
  shared command hook.
- `SELECT_GUILD_SPELL` and `CLOSE_MAGE_GUILD` are UI-local tokens
  (covered by the `SELECT_` / `CLOSE_` prefixes in
  `localUiPrefixes`); they stay in route/draft state and never enter
  the deterministic command log.

### State Changes
- `state.towns.byId[selected].mageGuildLevel` → refreshes the
  `town.mageGuildLevel` projection (read-only here).
- `state.towns.byId[selected].mageGuildSpells` → refreshes the
  `guildSpells` per-shelf list (read-only here).
- `state.adventure.visitingHeroId` → refreshes the `visitingHero`
  binding when the visiting hero changes (read-only here).
- `state.heroes.byId[visiting].knownSpells` → updates after a
  successful `LEARN_SPELL`; drives the known-spell marker overlay.
- `state.heroes.byId[visiting].skills.wisdom` → eligibility input
  for higher-shelf icons (read-only here).
- UI-only hover, focus, selected-row, drag ghost, animation frame,
  and other transient flags stay outside the deterministic state
  slice.

### Navigation Outcomes
- `CLOSE` routes to [`24-town-screen`](../24-town-screen/) after the
  exit animation.
- `LEARN_SPELL` keeps the screen mounted regardless of accept/reject;
  the visitor may queue additional learns or close manually.

### Disabled And Error Cases
- Disable the `LEARN` button when the selected spell fails any of:
  required selectors loaded, hero present in the town, Wisdom-mastery
  threshold met for the spell's level, spell not already known,
  spell-registry scope.
- Disable shelves whose level exceeds `town.mageGuildLevel`; render
  them dark with no hover affordance.
- Missing presentation assets resolve through the asset-resolver
  fallback. Missing gameplay records, invalid content IDs, and
  unresolved schemas fail loudly before any control becomes enabled
  (per [`fail-loud.md`](../../../fail-loud.md)).
- On dispatcher rejection, keep the modal open, preserve the local
  selection draft, render a localized inline error, and play failure
  audio feedback.
- All player-facing error strings come from `formatUserError(err,
  locale)` declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct toast/inline text inline.

### AI Implementation Notes
- This file owns behavior and timing; `spec.md` owns static regions;
  `architecture.md` diagrams summarize, not replace, the rules here.

## Error surfaces

Per [`error-ux.md` § 5](../../../error-ux.md#5-per-screen-wiring), the
screen inherits the default code → surface mapping from § 2. The row
below maps the only schema-backed command on this screen
(`LEARN_SPELL`) to its default surface. Specific codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land with the engine reducer
that owns each command and trigger
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Learn spell (`LEARN_SPELL`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled `LEARN` button + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — `LEARN` and `CLOSE` button copy, the per-shelf icon
  affordance, and the side plaque match
  [`mockup.html`](./mockup.html); the bindings, animation cues, and
  next-screen target align with sibling [`spec.md`](./spec.md) and
  [`architecture.md`](./architecture.md).
- **Schema: ⚠** — `LEARN_SPELL` payload matches
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  and is gated by
  [`command-schema.md` § `LEARN_SPELL`](../../../command-schema.md#learn_spell)
  (`Knowledge`); this screen package consistently names `Wisdom`.
  Detail mirrored in sibling
  [`spec.md ⚠ Issues`](./spec.md#-issues).
- **Tasks: ⚠** — Owning task
  [`phase-2/07-ui-screen-backlog/29-mage-guild-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/29-mage-guild-screen.md)
  Reads First this file. State paths listed under § State Changes
  rely on selectors that the strategic state model does not yet
  expose; see [`spec.md ⚠ Issues`](./spec.md#-issues).

## ⚠ Issues

- **Wisdom vs Knowledge gate (mirror).** See sibling
  [`spec.md ⚠ Issues`](./spec.md#-issues) — same root cause; the
  `LEARN_SPELL` row above and the disabled-control wording inherit
  the screen package's `Wisdom` name pending resolution by the MVP
  task
  [`mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild`](../../../../../tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md).
- **State-path selectors not in `AdventureState` (mirror).** The
  five paths under § State Changes reference projections
  (`Town.mageGuildLevel`, `state.adventure.visitingHeroId`,
  `Hero.knownSpells`, `Hero.skills.wisdom`) that the strategic state
  model does not yet expose. Owner: state-model task or a sibling
  UI-selector task. Full detail in
  [`spec.md ⚠ Issues`](./spec.md#-issues).
