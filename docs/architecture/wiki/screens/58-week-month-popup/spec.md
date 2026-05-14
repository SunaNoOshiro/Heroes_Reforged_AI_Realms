# Screen 58: Week / Month Popup

### Screen Package

- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description

Modal parchment popup raised by the calendar reducer at every week or
month boundary. Surfaces the rolled themed-week / month-creature
event, the visible growth modifiers, and the resource changes already
computed by `END_DAY`. OK acknowledges; clicking the EventIcon routes
to the creature info screen.

### Visual Direction

Original internal UI contract. Do not use third-party captures, copied
franchise art, or external product pixels as implementation input.

### Visual Contract

- Curation status: `curated-pass-6`.
- Z-Layer: `2500` per [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Fixed `800x600` adventure-map host; modal is `336x270`, centered, with ornate gold frame, parchment fill, and drop-shadow per `mockup.html`.
- Rendered above the standard adventure-map chrome (right panel, status bar, resource bar) without dimming the map.
- `mockup.html` is the visual reference only — logic, transitions, and timing live in the package's Markdown files.

### Component Tree

- `WeekMonthPopup` (modal root)
  - `CalendarHeader` — title (`"Week of …"` / `"Month of …"`) + `Month / Week / Day` line.
  - `EventIcon` — circular creature / event glyph; clickable affordance routes to `50-creature-info` (no separate button in the mockup).
  - `EffectList` — growth and resource lines; reads both `growthEffects` and `resourceEffects`.
  - `OkButton` — single dispatcher-bound control (`calendarPopup.ok`).

### State Bindings

| Element | Bound to | Notes |
| --- | --- | --- |
| `calendar` | `state.calendar.currentDate` | Month / week / day after the transition. |
| `eventRecord` | `state.calendar.pendingAnnouncement` | Week / month event; payload carries `eventId`, optional `themedWeekId`, optional creature ref for the EventIcon click target. |
| `growthEffects` | `selectors.calendar.visibleGrowthEffects` | Creature-growth modifiers rendered in `EffectList`. |
| `resourceEffects` | `selectors.calendar.visibleResourceEffects` | Resource / income changes rendered in `EffectList`. |
| `acknowledged` | `state.ui.calendarAnnouncement.acknowledged` | Local flag flipped after the dispatcher accepts `ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT`. |

### Mechanics Mapping

- The popup mounts only when `state.calendar.pendingAnnouncement` is non-null. The reducer that produced the record (the `WEEK_START` / `MONTH_START` event from [`event-schema.md`](../../../event-schema.md)) has already applied growth and resource changes; OK is observation-only.
- Themed-week records (when `eventRecord.themedWeekId` is set) are produced by [`phase-2.08-meta-systems.08-themed-week-roller`](../../../../../tasks/phase-2/08-meta-systems/08-themed-week-roller.md); the popup renders their localized description but does not re-roll.
- Costs, creatures, and resource IDs resolve through registries / content schemas — never hardcoded in this view.

### Animation Contract

- Mount: parchment unfurl (`modalIn` keyframe, ~180 ms), `EventIcon` pulse, growth-number sparkle (`floatUp`, ~1.8 s loop).
- Acknowledge: parchment fold-out, then route to `07-adventure-map`.
- `prefers-reduced-motion: reduce` skips unfurl / pulse / sparkle / fold and renders the final visible state immediately per [`autoplay-policy.md`](../../../autoplay-policy.md).
- Animations consume reducer / route results; they never decide gameplay outcomes.

### Acceptance Criteria

- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists every visible region and its authoritative state binding.
- Interactions cover OK, EventIcon click, Esc, disabled cases, and error paths.
- Architecture diagrams describe the screen's actual flow (no copied archetype boilerplate).
- Data contracts identify every schema, config, localization, asset, sound, VFX, save, and replay field needed to implement the screen.

### AI Implementation Notes

- Screen slug `week-month-popup`; system group `system`; curation marker `curated-pass-6`.
- Build the runtime component from this contract, not from third-party captures.
- The component dispatches one schema-backed command (`ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT`) and one local-ui route (`OPEN_CALENDAR_CREATURE_INFO`) — see `interactions.md` for the dispatch / routing matrix.
- Resolve presentation through asset IDs / manifests; never embed raw asset paths in gameplay records.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree and bindings match sibling [`architecture.md`](./architecture.md) State Inputs and [`data-contracts.md`](./data-contracts.md) Runtime State Selectors; the EventIcon-as-route-target affordance matches the single button (`calendarPopup.ok`) visible in `mockup.html`.
- **Schema: ⚠** — Schema [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) requires `{ kind, playerId, eventId, metadata }` for `ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT`; `eventId` is sourced from `eventRecord.eventId` per the State Bindings note above.
- **Tasks: ✔** — UI task [`phase-2.07-ui-screen-backlog.58-week-month-popup-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/58-week-month-popup-screen.md) lists this spec under Read First; engine acknowledgement owned by [`mvp.05-adventure-map.15-acknowledge-week-month-event-command`](../../../../../tasks/mvp/05-adventure-map/15-acknowledge-week-month-event-command.md); themed-week integration owned by [`phase-2.08-meta-systems.08-themed-week-roller`](../../../../../tasks/phase-2/08-meta-systems/08-themed-week-roller.md).

## ⚠ Issues

- **`OPEN_CALENDAR_CREATURE_INFO` is a UI-local routing token, not a deterministic command.** Per [`screen-command-coverage.json`](../../../screen-command-coverage.json) the `OPEN_` prefix is in `localUiPrefixes`; the original package treated it as a command in `interactions.md` / `data-contracts.md`. Now consistently described as a route in this spec; see those siblings for the same correction.
- **`state.ui.calendarAnnouncement.acknowledged` is a screen-introduced UI slice not declared in any sibling arch doc.** See `architecture.md` `## ⚠ Issues` for the same flag; surfaced here rather than rewritten because the slice path is load-bearing for the OK→ack→close handshake.
