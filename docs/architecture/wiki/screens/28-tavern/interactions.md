# Screen 28: Tavern — Interaction Map

## Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

## Purpose
Tavern recruitment and rumor screen with two weekly hero offers,
inline hire costs, rumor parchment, and entries to the Thieves
Guild and back to the town screen.

## Actions
| UI Element | Action ID | Type | Next Screen | Token | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select hero offer | `tavern.selectHero` | local-ui | (this screen) | `SELECT_TAVERN_HERO` | `state.ui.tavern.selectedHeroId` draft. | Hero card lifts on hover. |
| Hire hero | `tavern.hireHero` | command | (this screen) | `HIRE_TAVERN_HERO` | Spends gold; adds hero to the town/roster; refreshes the offer slot. | Hired card slides toward roster; coin click. |
| Open thieves guild | `tavern.thievesGuild` | navigation | `27-thieves-guild` | `OPEN_THIEVES_GUILD` (local-ui prefix) | Routes to the intelligence screen. | Thieves-guild entry glows on focus. |
| Close | `tavern.close` | navigation | `24-town-screen` | `CLOSE_TAVERN` (local-ui prefix) | Returns to town. | Rumor parchment unfurls (entry); fade-out on exit. |

`SELECT_`, `OPEN_`, `CLOSE_` are `localUiPrefixes` in
[`screen-command-coverage.json`](../../../screen-command-coverage.json),
so only `HIRE_TAVERN_HERO` enters the deterministic command log.
The remaining three tokens stay in route/draft state.

## State Changes
- `state.tavern.weeklyHeroOffers` — reducer-only, refreshes after
  `HIRE_TAVERN_HERO` or weekly tick.
- `state.players.active.resources.gold` — reducer-only, decremented
  by `HIRE_TAVERN_HERO`.
- `state.ui.tavern.selectedHeroId` — local UI draft, written by
  `tavern.selectHero`, never persisted.
- `state.tavern.currentRumorId` — reducer-only, set by the tavern
  reducer on weekly refresh.
- Hover, focus, drag ghost, animation frame, and cursor blink stay
  outside deterministic gameplay state.

## Navigation Outcomes
- `tavern.thievesGuild` routes to `27-thieves-guild` after route
  guard and exit animation.
- `tavern.close` routes to `24-town-screen` after route guard and
  exit animation.

## Disabled And Error Cases
- HIRE is disabled when any of: required selectors are missing,
  `state.players.active.resources.gold` is below `offer.cost`,
  town or hero capacity is full, or weekly refresh rules forbid
  hire on this offer.
- Missing presentation assets use resolver fallback per
  [`asset-policy.md`](../../../asset-policy.md). Missing gameplay
  records, invalid content IDs, or rejected commands fail loudly
  per [`fail-loud.md`](../../../fail-loud.md).
- On rejection, the screen stays open, the selected offer draft is
  preserved, localized error text is shown inline, and failure
  audio plays.
- Errors are produced by `formatUserError(err, locale)` in
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.

## AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams mirror these interactions and never
  introduce hidden behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen
inherits the default code → surface mapping from § 2. The table
below maps each action whose `Type` is `command` to its default
surface for this screen's dominant error domain. A row whose
Notes column reads `override` replaces the § 2 default for that
action; otherwise the default applies. Specific error codes
(e.g. `DISPATCHER_<token>`, `STORAGE_<token>`) trigger
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if their row is missing.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Hire hero (`HIRE_TAVERN_HERO`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled HIRE + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs match `data-action` attributes in `mockup.html` (`tavern.hireHero`, `tavern.thievesGuild`, `tavern.close`) and sibling [`spec.md`](./spec.md) § Component Tree; outgoing transitions to `27-thieves-guild` and `24-town-screen` agree with sibling [`architecture.md`](./architecture.md) § Outgoing Transitions and with [`24-town-screen/interactions.md`](../24-town-screen/interactions.md) `town.tavern` row.
- **Schema: ✔** — `HIRE_TAVERN_HERO` resolves to `hireTavernHero` in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) line 891; the other three tokens correctly stay `local-ui` per the `SELECT_` / `OPEN_` / `CLOSE_` prefixes in [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Engine reducer owner [`mvp.05-adventure-map.11-hire-tavern-hero-command`](../../../../../tasks/mvp/05-adventure-map/11-hire-tavern-hero-command.md) reads this file in its Read First; UI owner [`phase-2.07-ui-screen-backlog.28-tavern-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/28-tavern-screen.md) lists it as a Read First and Acceptance Criterion source.

## ⚠ Issues

_None._
