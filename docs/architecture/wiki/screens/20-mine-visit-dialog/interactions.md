# Screen 20: Mine Visit Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Companion Docs
- [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  — alias map: `CLAIM_MINE` → `CAPTURE_MINE`,
  `START_MINE_GUARD_BATTLE` → `INITIATE_BATTLE`; `CLOSE_*` and
  `OPEN_*` tokens are local-UI via prefix.
- [`command-schema.md` § CAPTURE_MINE](../../../command-schema.md#capture_mine)
  — payload `{ mineId, heroId, playerId }` and validation rules.
- [`error-ux.md` § 5](../../../error-ux.md#5-per-screen-wiring) —
  per-screen surface mapping inherited from § 2.

### Purpose
Mine capture or visit dialog showing resource type, current owner,
guard state, daily income, and the flagging outcome of a successful
claim.

### Actions
| UI Element | Action ID | Type | Token | Next Screen | Data Updated |
| --- | --- | --- | --- | --- | --- |
| `CLAIM` button (guard cleared) | `mine.claim` | schema command | `CLAIM_MINE` → `CAPTURE_MINE` | `07-adventure-map` | Reducer transfers `mineRecord.ownerId` to `activePlayer` and adds the mine's daily yield to player income; clears `state.ui.adventure.pendingMineVisit`. |
| `CLAIM` button (guard live) | `mine.fightGuard` | navigation | `START_MINE_GUARD_BATTLE` → `INITIATE_BATTLE` | `40-pre-battle-dialog` | Hands control to pre-battle; the destination dispatches `INITIATE_BATTLE` after the player confirms. No mutation on this screen. |
| `LEAVE` button / `Esc` | `mine.leave` | local-ui | `CLOSE_MINE_DIALOG` | `07-adventure-map` | Clears `state.ui.adventure.pendingMineVisit`; never mutates gameplay state. |
| Right-click resource portrait | `mine.resourceInfo` | local-ui | `OPEN_RESOURCE_TOOLTIP` | `18-map-object-tooltip` | Opens the public resource detail tooltip; gameplay state unchanged. |

Tokens prefixed `CLOSE_` / `OPEN_` are local-UI routing per
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
`localUiPrefixes`. `CLAIM_MINE` and `START_MINE_GUARD_BATTLE` are
**screen aliases** for the canonical kinds `CAPTURE_MINE` and
`INITIATE_BATTLE`, both defined in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
The `CLAIM` button picks between the two paths based on
`guardState`.

### Animation Cues
- Modal `modalIn` keyframe on mount (`mockup.html` `<style>`); the
  red title bar fades in with the parchment body.
- `OwnerFlag` pulses in the active player color while the dialog is
  open (`pulse` keyframe, 1.4 s loop).
- On accepted `CAPTURE_MINE`: flag cloth unfurls fully in the player
  color, the portrait resource icon sparkles, and `IncomePreview`
  ticks upward.
- On dialog close (any path), the underlying map sprite recolors to
  the new owner.
- Audio: `audio.ui.hover` on button hover, `audio.ui.click` on
  `CLAIM` / `LEAVE` press, `audio.adventure.*` on flag unfurl. No
  audio on a tooltip open.
- Reduced-motion replaces pulses and unfurls with static state
  changes; bindings are unchanged.

### State Changes
Bindings in `spec.md` § State Bindings refresh whenever the owning
reducer or local-UI draft updates them.

- Accepted `CAPTURE_MINE` advances `state.mapObjects.byId[mineId]`
  (`ownerId`, guard cleared flag) and adds the mine's daily yield to
  the active player's resource selectors; the reducer clears
  `state.ui.adventure.pendingMineVisit` on completion.
- `mine.fightGuard` does not mutate state here; `40-pre-battle-dialog`
  dispatches `INITIATE_BATTLE` and owns the transition.
- `mine.leave` and `mine.resourceInfo` clear or open UI-draft slices
  only; deterministic gameplay state is unchanged.
- Hover, focus, target cursor, drag ghost, and animation frame remain
  UI-local and never enter deterministic state.

### Navigation Outcomes
- `mine.claim` (guard cleared) → `07-adventure-map` after the
  dispatcher accepts `CAPTURE_MINE` and the flag-unfurl + recolor
  animations complete.
- `mine.fightGuard` (guard live) → `40-pre-battle-dialog`; the
  destination handles its own confirmation and routes back to
  `07-adventure-map` on `INITIATE_BATTLE` acceptance.
- `mine.leave` → `07-adventure-map` immediately after the dialog
  dismiss animation.
- `mine.resourceInfo` → `18-map-object-tooltip` (modal popover; the
  underlying dialog stays mounted).

### Disabled And Error Cases
- Controls disable when required selectors, registry records, target
  legality, ownership, phase, or route guards fail.
  `selectors.mapObjects.mineGuardState` carries the
  `CLAIM` / `Fight guard` branch decision; a missing or unresolved
  mine record disables both.
- Missing presentation assets may use the resolver fallback. Missing
  gameplay records, invalid content IDs, and rejected commands fail
  loudly per [`fail-loud.md`](../../../fail-loud.md).
- On dispatcher rejection: keep the screen open, preserve the local
  draft, show localized error text on the disabled control, and play
  failure feedback.
- Error toast / inline text is produced by
  `formatUserError(err, locale)` per
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error copy inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams mirror this contract; they do not
  introduce hidden behavior.

## Error surfaces

Per [`error-ux.md` § 5](../../../error-ux.md#5-per-screen-wiring),
this screen inherits the default code → surface mapping from § 2.
The table maps each `command`-type action to its default surface for
this screen's dominant error domain. A row whose Notes column reads
`override` replaces the § 2 default. Specific codes (e.g.
`DISPATCHER_<TOKEN>`, `STORAGE_<TOKEN>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| `CLAIM` (`CAPTURE_MINE`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled `CLAIM` button + tooltip on rejection. |

`mine.fightGuard` routes to `40-pre-battle-dialog` and does not
dispatch from this screen; its dispatcher errors are owned by
sibling screen 40's error-surfaces table.

---

## 🔍 Sync Check

- **UI: ✔** — Action labels (`CLAIM`, `LEAVE`) and the four action
  rows match sibling `spec.md` § Visual Contract and `mockup.html`
  `data-action` attributes (`mine.claim`, `mine.leave`); animation
  cues mirror the `modalIn` / `pulse` keyframes in the mockup
  `<style>` block.
- **Schema: ✔** — `CAPTURE_MINE` and `INITIATE_BATTLE` are closed-enum
  kinds in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json);
  the screen-side aliases `CLAIM_MINE` and `START_MINE_GUARD_BATTLE`,
  plus `CLOSE_*` / `OPEN_*` local-UI prefixes, are registered in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Owning task
  [`mvp.05-adventure-map.09-map-object-dialogs`](../../../../../tasks/mvp/05-adventure-map/09-map-object-dialogs.md)
  reads this file; the `CAPTURE_MINE` and `INITIATE_BATTLE` reducers
  are owned by
  [`mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`](../../../../../tasks/mvp/05-adventure-map/21-map-object-visit-and-battle-initiation-commands.md),
  which back-references this `interactions.md`.

## ⚠ Issues

- **Action `Type` column clarified, not changed.** The prior version
  typed every row identically and gave each one the same animation
  cell. Token classification now follows
  [`screen-command-coverage.json`](../../../screen-command-coverage.json):
  `mine.claim` is `schema command` (alias `CLAIM_MINE` →
  canonical `CAPTURE_MINE`); `mine.fightGuard` is `navigation` to
  `40-pre-battle-dialog`, which dispatches `INITIATE_BATTLE` itself
  (the screen-side alias `START_MINE_GUARD_BATTLE` is registered
  here for coverage but does not enter the command log from this
  surface); `mine.leave` is `local-ui` (`CLOSE_` prefix); and
  `mine.resourceInfo` is `local-ui` (`OPEN_` prefix). Navigation
  side-effects (next screen) are preserved unchanged. No code or
  registry change is implied.
