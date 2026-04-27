# Acknowledge Week Month Event Command

Status: planned

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Implement acknowledgement of calendar announcements. Week and month
events are deterministic queue entries created by turn advancement; the
command marks a queued entry as seen for the active player.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- `docs/architecture/wiki/screens/58-week-month-popup/interactions.md`

Inputs:
- Turn structure and calendar state from Task 2
- Ruleset event tables and localization IDs

Outputs:
- `src/engine/commands/calendar-commands.ts`
- `ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT` reducer and validator

Owned Paths:
- `src/engine/commands/calendar-commands.ts`

Dependencies:
- mvp.05-adventure-map.02-turn-structure

Acceptance Criteria:
- Calendar events are queued by `END_DAY` and shown once per player
- Acknowledgement marks only the matching event ID as seen
- Unknown or already-seen event IDs return `ValidationError`
- Screen 58 can close only after accepted acknowledgement or local UI
  dismissal for non-gameplay announcements

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
