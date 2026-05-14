# Screen 49: Hero Meeting — Interaction Map

## Source Files

- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

## Purpose

Adventure-map meeting modal between two friendly heroes on the same
or adjacent tile. Used to exchange army stacks and artifacts.

## 1. Actions

Animation column references § 3. Tokens are resolved per
[`data-contracts.md` § Commands And Events](./data-contracts.md#commands-and-events).

| UI Element | Action ID | Type | Next Screen | Token | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Drag stack | `heroMeeting.dragStack` | local-ui | Current | `START_HERO_MEETING_DRAG` | Creates drag draft on `state.ui.heroMeeting.dragDraft`. |
| Drop stack | `heroMeeting.dropStack` | command | Current | `TRANSFER_HERO_ARMY_STACK` | Moves, merges, swaps, or rejects the stack transfer. |
| Move artifact | `heroMeeting.moveArtifact` | command | Current | `TRANSFER_HERO_ARTIFACT` | Moves artifact between heroes when slot / backpack rules allow. |
| Close | `heroMeeting.close` | navigation | [`07-adventure-map`](../07-adventure-map/) | `CLOSE_HERO_MEETING` | Returns to the adventure map. |

## 2. State Changes

- `state.ui.heroMeeting.leftHeroId` refreshes `leftHero` when the
  meeting is opened or the owning reducer updates it.
- `state.ui.heroMeeting.rightHeroId` refreshes `rightHero` when the
  meeting is opened or the owning reducer updates it.
- `state.heroes.byId[left].army` refreshes `leftArmy` after a
  reducer-accepted transfer.
- `state.heroes.byId[right].army` refreshes `rightArmy` after a
  reducer-accepted transfer.
- `state.ui.heroMeeting.dragDraft` refreshes `dragDraft` on
  drag-start, drag-move, drag-end, and reset.
- UI-only hover, focus, selected row, drag ghost, and animation
  frame stay outside deterministic gameplay state.

## 3. Animation Contract

Drag/drop interactions only — close uses a route transition.

- Stack and artifact drag ghosts follow the cursor between panels.
- Legal target slots glow; illegal slots stay dim.
- Accepted swaps crossfade between source and target.
- Rejected drops snap back with a dull thud.
- Reduced-motion mode replaces continuous animation with static
  highlights and localized text feedback.

## 4. Navigation Outcomes

- `heroMeeting.close` routes to
  [`07-adventure-map`](../07-adventure-map/) after guard approval
  and exit animation.

## 5. Disabled And Error Cases

- Disable controls when required selectors, registry records, target
  legality, ownership, phase, or route guards fail.
- Missing presentation assets use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly per [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the modal open, preserve the local draft when
  useful, show localized error text, and play failure feedback.
- Error strings are produced by `formatUserError(err, locale)`
  declared in [`error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

## 6. Error Surfaces

Per [`error-ux.md` § 5](../../../error-ux.md#5-per-screen-wiring),
this screen inherits the default code → surface mapping from § 2.
The table below covers each action whose `Type` is `command`. A row
whose `Notes` reads `override` replaces the § 2 default; otherwise
the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Drop stack (`TRANSFER_HERO_ARMY_STACK`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |
| Move artifact (`TRANSFER_HERO_ARTIFACT`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |

## 7. AI Implementation Notes

- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams mirror these
  interactions and must not introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs match the `data-action` attribute set in [`mockup.html`](./mockup.html) (only `heroMeeting.close` is wired in the SVG; drag/drop tokens are spec-level affordances per [`spec.md` § Component Tree](./spec.md#component-tree)). Aligned with sibling [`spec.md` § State Bindings](./spec.md#state-bindings) and [`architecture.md` § 3 Main Interaction Flow](./architecture.md#3-main-interaction-flow).
- **Schema: ✔** — `TRANSFER_HERO_ARMY_STACK` and `TRANSFER_HERO_ARTIFACT` defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (lines 1516, 1611); `START_HERO_MEETING_DRAG` and `CLOSE_HERO_MEETING` resolve as UI-local via the `START_` / `CLOSE_` `localUiPrefixes` in [`screen-command-coverage.json`](../../../screen-command-coverage.json). Error code prefix `DISPATCHER_*` matches the regex in [`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs).
- **Tasks: ✔** — UI dispatch wiring owned by [`phase-2.07-ui-screen-backlog.49-hero-meeting-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/49-hero-meeting-screen.md); reducer behavior owned by [`mvp.05-adventure-map.18-transfer-stack-commands`](../../../../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md) (stacks) and [`phase-2.01-spells-artifacts.05b-transfer-hero-artifact-command`](../../../../../tasks/phase-2/01-spells-artifacts/05b-transfer-hero-artifact-command.md) (artifacts). Both reducer tasks name this file in Read First.

## ⚠ Issues

- **Mockup only wires `heroMeeting.close`; drag/drop / move-artifact `data-action` attributes are not yet emitted in the SVG.** [`mockup.html`](./mockup.html) shows the army rows and exchange arrow but only the `CLOSE` button carries a `data-action`. This is a visual-reference gap, not a spec violation — drag/drop is a contract-level affordance and the mockup is allowed to be simpler than the spec per the package's source-files contract. Suggested follow-up for the owning UI task: emit `data-action="heroMeeting.dragStack"` on stack slots and `data-action="heroMeeting.moveArtifact"` on artifact slots so the screen-coverage extractor reports the same token set the UI dispatches at runtime.
