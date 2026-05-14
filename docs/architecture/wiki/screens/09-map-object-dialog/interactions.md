# Screen 09: Map Object Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Generic adventure object visit dialog for shrines, events, guarded
rewards, signs, one-shot pickups, and choice prompts.

### Actions
| UI Element | Action ID | Type | Token | Next Screen | Data Updated |
| --- | --- | --- | --- | --- | --- |
| `ACCEPT` button | `mapObject.accept` | schema command | `VISIT_MAP_OBJECT` | `07-adventure-map` | Applies reward, visit flag, teleport, quest hook, or event result via the engine reducer. |
| `DECLINE` button | `mapObject.decline` | local-ui | `CANCEL_MAP_OBJECT_VISIT` | `07-adventure-map` | Clears `state.ui.adventure.pendingObjectVisit`; never mutates gameplay state. |
| Right-click portrait | `mapObject.details` | local-ui | `OPEN_OBJECT_TOOLTIP` | `18-map-object-tooltip` | Opens the public object detail tooltip; gameplay state unchanged. |
| Quest-source affordance | `mapObject.quest` | local-ui | `OPEN_RELATED_QUEST` | `11-quest-log` | Focuses the related quest entry when the object is a quest source. |

Tokens prefixed `CANCEL_` / `OPEN_` are local-UI routing per
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
`localUiPrefixes`; only `VISIT_MAP_OBJECT` enters the deterministic
command log (defined in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json),
documented in
[`command-schema.md`](../../../command-schema.md#visit_map_object)).

### Animation Cues
- Dialog pops from the object's map position (`modalIn` keyframe in
  `mockup.html`).
- `ObjectPortrait` glows on hover; `RewardPreview` icons sparkle on
  accepted visits.
- `ObjectMessage` parchment shakes on a rejected visit.
- All cues honor `prefers-reduced-motion`.

### State Changes
Bindings in `spec.md` § State Bindings refresh whenever the owning
reducer or local-UI draft updates them. `ACCEPT` advances
`state.mapObjects.byId[objectId]` (visit flags, owner, cooldown) and
clears `state.ui.adventure.pendingObjectVisit`. `DECLINE` clears
`pendingObjectVisit` only. Hover, focus, target cursor, drag ghost,
and animation frame remain UI-local and never enter deterministic
state.

### Navigation Outcomes
- `ACCEPT` → `07-adventure-map` after `VISIT_MAP_OBJECT` is accepted
  by the dispatcher and the exit animation completes.
- `DECLINE` → `07-adventure-map` immediately after the dialog dismiss
  animation.
- Right-click portrait → `18-map-object-tooltip` (modal popover; the
  underlying dialog stays mounted).
- Quest-source affordance → `11-quest-log` with the related quest
  entry focused.

### Disabled And Error Cases
- Controls disable when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route guards
  fail. `selectors.mapObjects.visitGuard` carries the disabled
  reason.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, and rejected commands fail
  loudly per [`fail-loud.md`](../../../fail-loud.md).
- On dispatcher rejection: keep the screen open, preserve any local
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
| `ACCEPT` (`VISIT_MAP_OBJECT`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Action labels (`ACCEPT`, `DECLINE`) and the four action
  rows match sibling `spec.md` § Visual Contract and `mockup.html`;
  animation cues mirror the keyframes in the mockup `<style>` block.
- **Schema: ✔** — `VISIT_MAP_OBJECT` is a closed-enum kind in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json);
  `CANCEL_*` and `OPEN_*` tokens are recognized local-UI prefixes in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Owning task
  [`mvp.05-adventure-map.09-map-object-dialogs`](../../../../../tasks/mvp/05-adventure-map/09-map-object-dialogs.md)
  reads this file first; the `VISIT_MAP_OBJECT` reducer is owned by
  [`mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`](../../../../../tasks/mvp/05-adventure-map/21-map-object-visit-and-battle-initiation-commands.md),
  which back-references this `interactions.md`.

## ⚠ Issues

- **Action `Type` column clarified, not changed.** The prior version
  typed `mapObject.decline` / `.details` / `.quest` as `navigation`.
  Their tokens (`CANCEL_MAP_OBJECT_VISIT`, `OPEN_OBJECT_TOOLTIP`,
  `OPEN_RELATED_QUEST`) match the `localUiPrefixes` in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json),
  so the rewrite labels them `local-ui` to match the canonical
  classification. Navigation-side effects (next screen) are preserved
  unchanged. No code or registry change is implied.
