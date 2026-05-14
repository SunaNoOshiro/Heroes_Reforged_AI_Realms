# Screen 58: Week / Month Popup
## Interaction Map

### Source Files

- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose

Acknowledge the week / month boundary announcement raised by the
calendar reducer. Dispatches a single schema-backed command and
optionally routes to the creature info screen.

### Actions

| UI Element | Action ID | Type | Next Screen | Command / Token | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| OK button | `calendarPopup.ok` | navigation | `07-adventure-map` | `ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT` (schema command; payload `{ playerId, eventId }` where `eventId = eventRecord.eventId`) | Clears `state.calendar.pendingAnnouncement`; flips `state.ui.calendarAnnouncement.acknowledged = true` once the dispatcher accepts. | Parchment fold-out, `audio.ui.click`. |
| EventIcon (clickable creature glyph) | `calendarPopup.inspectCreature` | navigation | `50-creature-info` | `OPEN_CALENDAR_CREATURE_INFO` (local-ui; matches `OPEN_` prefix in [`screen-command-coverage.json`](../../../screen-command-coverage.json)) | Sets `state.ui.creatureInfo.creatureId = eventRecord.creatureId` and `state.ui.creatureInfo.stackContext = "calendar"`. | EventIcon pulse continues, `audio.ui.click`. |
| Esc / Backdrop dismiss | _(implicit)_ | navigation | `07-adventure-map` | Same `ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT` as OK, per the Esc precedence ladder in [`ui-input-arbitration.md`](../../../ui-input-arbitration.md). | Same as OK. | Parchment fold-out. |

### State Changes

- `state.calendar.pendingAnnouncement` clears after `ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT` is accepted; the popup unmounts on the next render.
- `state.ui.calendarAnnouncement.acknowledged` flips `true` after the dispatcher accepts, then resets when the next pending announcement arrives.
- `state.ui.creatureInfo.{creatureId,stackContext}` is set by the EventIcon route and read by `50-creature-info` per [`50-creature-info/data-contracts.md`](../50-creature-info/data-contracts.md).
- `state.calendar.currentDate`, `selectors.calendar.visibleGrowthEffects`, and `selectors.calendar.visibleResourceEffects` are read-only here; they refresh from their owning reducers / selectors.
- UI-only hover, focus, sparkle frame, and pulse phase stay outside deterministic gameplay state.

### Navigation Outcomes

- OK / Esc → `07-adventure-map` after the dispatcher accepts the ACK and the fold-out animation completes.
- EventIcon click → `50-creature-info` after the local-ui route writes `state.ui.creatureInfo.*`; control returns to `58-week-month-popup` until the user dismisses, since `state.calendar.pendingAnnouncement` is still non-null.

### Disabled And Error Cases

- OK is disabled until `state.calendar.pendingAnnouncement` resolves to a record whose `eventId` matches the schema (`stringId`). Missing or malformed records fail loudly per [`fail-loud.md`](../../../fail-loud.md).
- EventIcon is disabled when `eventRecord.creatureId` is absent (week/month events without a featured creature, e.g. resource-only weeks).
- `OPEN_CALENDAR_CREATURE_INFO` requires that `50-creature-info` route guards approve the resolved `creatureId`; on failure, the popup stays mounted and surfaces a localized error.
- On a dispatcher rejection (e.g. `ENTITY_NOT_FOUND` for an unknown `eventId` per [`command-schema.md` § ValidationError taxonomy](../../../command-schema.md#validationerror-taxonomy)), keep the popup open and surface localized error text.
- Errors are produced by `formatUserError(err, locale)` from [`error-formatter.md`](../../../error-formatter.md); never construct toast text inline.

### AI Implementation Notes

- This file owns behavior, command routing, and timing.
- `spec.md` owns static regions and state bindings.
- `data-contracts.md` owns schema, asset, localization, and replay references.
- `architecture.md` diagrams must mirror these interactions, not invent new behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Action set matches the single button (`calendarPopup.ok`) and the clickable `EventIcon` in `mockup.html`; downstream route to `50-creature-info` matches the `creatureInfo.creatureId` / `creatureInfo.stackContext` bindings in [`50-creature-info/data-contracts.md`](../50-creature-info/data-contracts.md).
- **Schema: ✔** — `ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT` payload `{ kind, playerId, eventId, metadata }` matches [`command.schema.json` `$defs/acknowledgeCalendarAnnouncement`](../../../../../content-schema/schemas/command.schema.json); `OPEN_CALENDAR_CREATURE_INFO` is correctly classified as local-ui per the `OPEN_` prefix in [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Engine ACK owned by [`mvp.05-adventure-map.15-acknowledge-week-month-event-command`](../../../../../tasks/mvp/05-adventure-map/15-acknowledge-week-month-event-command.md); UI screen owned by [`phase-2.07-ui-screen-backlog.58-week-month-popup-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/58-week-month-popup-screen.md); themed-week payload extension owned by [`phase-2.08-meta-systems.08-themed-week-roller`](../../../../../tasks/phase-2/08-meta-systems/08-themed-week-roller.md).

## ⚠ Issues

- **Themed-week payload extension is described in the owning task but not in `command.schema.json`.** Per [`phase-2.08-meta-systems.08-themed-week-roller`](../../../../../tasks/phase-2/08-meta-systems/08-themed-week-roller.md), the ACK payload "carries the rolled themed-week id" — the schema's `acknowledgeCalendarAnnouncement` definition has no `themedWeekId` field today (`additionalProperties: false`). The themed-week task must either extend the schema additively (per [`enum-lifecycle-policy.md`](../../../enum-lifecycle-policy.md)) or push `themedWeekId` into the `pendingAnnouncement` record so ACK can stay flat. Skill did not modify the schema (Hard Prohibition D).
