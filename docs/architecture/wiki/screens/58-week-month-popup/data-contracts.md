# Screen 58: Week / Month Popup
## Data Contracts

### Source Files

- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries

| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `command.schema.json` (`$defs/acknowledgeCalendarAnnouncement`) | Schema for the only dispatched command (`ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT`). | `content-schema/schemas/command.schema.json` |
| `event.schema.json` (`WEEK_START` / `MONTH_START`) | Producer of `state.calendar.pendingAnnouncement`; carries `week`, optional `themedWeekId`, plus the creature ref consumed by the EventIcon. | `content-schema/schemas/event.schema.json` |
| `themed-week.schema.json` | Themed-week record resolved when `eventRecord.themedWeekId` is set. | `content-schema/schemas/themed-week.schema.json` |
| `unit.schema.json` | Creature record displayed by the EventIcon and routed to `50-creature-info`. | `content-schema/schemas/unit.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs in `selectors.calendar.visibleResourceEffects`. | `content-schema/schemas/resource-id.schema.json` |
| `asset-index.schema.json` | Background, frame, EventIcon glyph, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | Title, body, status, error strings. | `content-schema/schemas/localization.schema.json` |
| `ruleset.schema.json` | Calendar boundary constants and growth-modifier formulas consumed upstream of this screen. | `content-schema/schemas/ruleset.schema.json` |

### Runtime State Selectors

| UI Element | Selector | Notes |
| --- | --- | --- |
| `calendar` | `state.calendar.currentDate` | Month / week / day after the transition. |
| `eventRecord` | `state.calendar.pendingAnnouncement` | Single-record slice; carries `eventId`, optional `themedWeekId`, optional creature ref. Cleared by `ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT`. |
| `growthEffects` | `selectors.calendar.visibleGrowthEffects` | Creature-growth modifiers. |
| `resourceEffects` | `selectors.calendar.visibleResourceEffects` | Resource / income changes. |
| `acknowledged` | `state.ui.calendarAnnouncement.acknowledged` | Local UI flag flipped after the dispatcher accepts. |

### Commands And Events

- `ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT` (schema command) from `calendarPopup.ok` / Esc — payload `{ kind, playerId, eventId, metadata }` per [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json); `eventId` is `eventRecord.eventId`. Clears `state.calendar.pendingAnnouncement`.
- `OPEN_CALENDAR_CREATURE_INFO` (**local-ui route**, not a schema command — matches the `OPEN_` prefix in [`screen-command-coverage.json`](../../../screen-command-coverage.json) `localUiPrefixes`) from `calendarPopup.inspectCreature`. Sets `state.ui.creatureInfo.creatureId = eventRecord.creatureId` and routes to `50-creature-info`.

### Config Keys

- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys

- `ui.week-month-popup.title.week` / `ui.week-month-popup.title.month`
- `ui.week-month-popup.actions.ok`, `ui.week-month-popup.actions.inspectCreature`
- `ui.week-month-popup.status.*`
- `ui.week-month-popup.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs

- `ui.week-month-popup.background`
- `ui.week-month-popup.frame`
- `ui.week-month-popup.icons.*` (themed-week and creature glyphs)
- `audio.ui.hover`, `audio.ui.click`
- `vfx.week-month-popup.unfurl`, `vfx.week-month-popup.fold`, `vfx.week-month-popup.sparkle`, `vfx.week-month-popup.iconPulse`

### Save And Replay Fields

- Persist only the reducer-approved gameplay state that produced `state.calendar.pendingAnnouncement` (calendar slice; ACK envelope in the command log).
- Do not persist hover, focus, sparkle / pulse frame, or `state.ui.calendarAnnouncement.acknowledged`.
- Replays use stable IDs (`eventId`, `themedWeekId`, `creatureId`) and scalar command inputs — never raw paths, localized labels, or rendered positions.

### Validation And Fallback

- Popup mounts only when `state.calendar.pendingAnnouncement` is non-null and the calendar reducer has already advanced. OK acknowledges the visible record only.
- Missing presentation assets fall back through the asset resolver per [`asset-loading.md`](../../../asset-loading.md).
- Missing gameplay records, malformed `eventId`, or unresolved content IDs fail loudly per [`fail-loud.md`](../../../fail-loud.md) before controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and command set match sibling [`spec.md`](./spec.md) State Bindings and [`interactions.md`](./interactions.md) Actions; `state.ui.creatureInfo.*` write target matches the bindings in [`50-creature-info/data-contracts.md`](../50-creature-info/data-contracts.md).
- **Schema: ✔** — `ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT` payload exactly matches [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) `$defs/acknowledgeCalendarAnnouncement` (`required: kind, playerId, eventId, metadata`; `additionalProperties: false`); `WEEK_START` event with `themedWeekId?` payload matches [`event-schema.md`](../../../event-schema.md) line 67.
- **Tasks: ✔** — Engine command owned by [`mvp.05-adventure-map.15-acknowledge-week-month-event-command`](../../../../../tasks/mvp/05-adventure-map/15-acknowledge-week-month-event-command.md); themed-week record producer owned by [`phase-2.08-meta-systems.08-themed-week-roller`](../../../../../tasks/phase-2/08-meta-systems/08-themed-week-roller.md); UI screen owned by [`phase-2.07-ui-screen-backlog.58-week-month-popup-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/58-week-month-popup-screen.md).

## ⚠ Issues

- **`state.calendar.pendingAnnouncement` is not registered in [`data-inventory.md`](../../../data-inventory.md).** The slice is reducer-derived gameplay state and rides the save in the calendar slice, but no inventory row exists. Per CLAUDE.md root contract ("every persisted field is registered in `data-inventory.md`"), the owning engine task — [`mvp.05-adventure-map.15-acknowledge-week-month-event-command`](../../../../../tasks/mvp/05-adventure-map/15-acknowledge-week-month-event-command.md) — must register the slice, or [`state-shape.md`](../../../state-shape.md) must explicitly mark it as transient derived state. Skill did not add the row itself (Hard Prohibition D).
- **`themedWeekId` payload extension declared in the owning task is not yet in the schema.** [`phase-2.08-meta-systems.08-themed-week-roller`](../../../../../tasks/phase-2/08-meta-systems/08-themed-week-roller.md) states the ACK "payload carries the rolled themed-week id"; [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) `$defs/acknowledgeCalendarAnnouncement` has `additionalProperties: false` and no `themedWeekId` field. Either extend the schema additively per [`enum-lifecycle-policy.md`](../../../enum-lifecycle-policy.md) or carry `themedWeekId` on `eventRecord` (preferred — keeps the ACK envelope flat). Same issue surfaced in sibling [`interactions.md`](./interactions.md).
