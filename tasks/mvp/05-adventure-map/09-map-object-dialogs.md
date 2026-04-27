# Map Object Dialogs

Status: planned

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Implement the adventure-map interaction surfaces for object clicks,
object hover details, and mine visits. These screens bridge deterministic
map-object commands with UI affordances without embedding presentation
paths in gameplay records.

Read First:
- `docs/architecture/wiki/screens/09-map-object-dialog/spec.md`
- `docs/architecture/wiki/screens/09-map-object-dialog/interactions.md`
- `docs/architecture/wiki/screens/09-map-object-dialog/data-contracts.md`
- `docs/architecture/wiki/screens/09-map-object-dialog/architecture.md`
- `docs/architecture/wiki/screens/09-map-object-dialog/mockup.html`
- `docs/architecture/wiki/screens/18-map-object-tooltip/spec.md`
- `docs/architecture/wiki/screens/18-map-object-tooltip/interactions.md`
- `docs/architecture/wiki/screens/18-map-object-tooltip/data-contracts.md`
- `docs/architecture/wiki/screens/18-map-object-tooltip/architecture.md`
- `docs/architecture/wiki/screens/18-map-object-tooltip/mockup.html`
- `docs/architecture/wiki/screens/20-mine-visit-dialog/spec.md`
- `docs/architecture/wiki/screens/20-mine-visit-dialog/interactions.md`
- `docs/architecture/wiki/screens/20-mine-visit-dialog/data-contracts.md`
- `docs/architecture/wiki/screens/20-mine-visit-dialog/architecture.md`
- `docs/architecture/wiki/screens/20-mine-visit-dialog/mockup.html`

Inputs:
- Screen package `docs/architecture/wiki/screens/09-map-object-dialog/`
- Screen package `docs/architecture/wiki/screens/18-map-object-tooltip/`
- Screen package `docs/architecture/wiki/screens/20-mine-visit-dialog/`
- Map object interaction state from Tasks 3 and 4
- UI dispatch hook from `mvp.07-ui-shell.06-command-hook-ui-dispatch-re-render`

Outputs:
- `src/ui/components/MapObjectDialog.tsx`
- `src/ui/components/MapObjectTooltip.tsx`
- `src/ui/components/MineVisitDialog.tsx`
- Command wiring for object visit, reward confirmation, and mine capture
- Explicit dialog command set:
  - `VISIT_MAP_OBJECT` for accepted visit interactions
  - `CAPTURE_MINE` via the screen alias `CLAIM_MINE`
  - `INITIATE_BATTLE` via the screen alias `START_MINE_GUARD_BATTLE`
  - local UI handling for tooltip open/close, reward details, and
    cancelled visits

Owned Paths:
- `src/ui/components/MapObjectDialog.tsx`
- `src/ui/components/MapObjectTooltip.tsx`
- `src/ui/components/MineVisitDialog.tsx`

Dependencies:
- mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands
- mvp.05-adventure-map.03-hero-movement
- mvp.05-adventure-map.04-resource-mine-capture-plus-daily-income
- mvp.07-ui-shell.06-command-hook-ui-dispatch-re-render

Acceptance Criteria:
- Layout, bindings, and commands match `docs/architecture/wiki/screens/09-map-object-dialog/mockup.html`, `docs/architecture/wiki/screens/09-map-object-dialog/interactions.md`, and `docs/architecture/wiki/screens/09-map-object-dialog/data-contracts.md`
- Tooltip behavior matches `docs/architecture/wiki/screens/18-map-object-tooltip/interactions.md`
- Mine visit behavior matches `docs/architecture/wiki/screens/20-mine-visit-dialog/interactions.md`
- Object rewards and mine capture dispatch deterministic commands; hover
  state remains presentation-only
- Command names are resolved through
  `docs/architecture/screen-command-coverage.json`, and unsupported
  object actions render disabled reasons instead of adding reducers here
- Each interaction token whose owning engine task is `done` MUST dispatch live
  (no stub fallback). Tokens whose owning task is still `planned` may render
  disabled with a localized reason that cites the planned task ID.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
