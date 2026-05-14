# Screen 63: Hotseat Turn Handoff
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Companion Docs
- Engine state machine: [`tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md`](../../../../../tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md)
- UI screen task: [`tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md)
- Command schema: [`docs/architecture/command-schema.md`](../../../command-schema.md)
- Data inventory: [`docs/architecture/data-inventory.md`](../../../data-inventory.md)
- Schema matrix: [`docs/architecture/schema-matrix.md`](../../../schema-matrix.md)

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment, and ownership selectors. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `faction.schema.json` | Faction identity, town roster, hero / unit references, and player-facing faction metadata. | [`content-schema/schemas/faction.schema.json`](../../../../../content-schema/schemas/faction.schema.json) |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |
| Screen-specific registries | Players, calendar, and queued start-of-turn announcements. | Loaded content / runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `nextPlayer` | `state.turn.activePlayerId` | Player whose turn is about to be shown. |
| `calendar` | `state.calendar.currentDate` | Current turn date. |
| `privacyCover` | `state.ui.hotseat.coverActive` | Map hidden state; presentation only. |
| `playerName` | `state.players.byId[next].displayName` | Localized or player-entered name. |
| `pendingAnnouncements` | `selectors.turn.pendingStartOfTurnAnnouncements` | Week / month / event popups dequeued after BEGIN. |

### Commands And Events
- `BEGIN_HOTSEAT_TURN` — fired by action ID `hotseat.begin`. Clears the privacy cover and routes to the next player view (`07-adventure-map` or a pending start-of-turn popup).
- `OPEN_OPTIONS_FROM_HANDOFF` — fired by action ID `hotseat.options`. Suspends the handoff so the next player can adjust presentation before reveal; routes to `56-options`.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.hotseat-turn-handoff.title`
- `ui.hotseat-turn-handoff.actions.*`
- `ui.hotseat-turn-handoff.status.*`
- `ui.hotseat-turn-handoff.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.hotseat-turn-handoff.background`
- `ui.hotseat-turn-handoff.frame`
- `ui.hotseat-turn-handoff.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.multiplayer.*`
- `vfx.hotseat-turn-handoff.*`

### Save And Replay Fields
- Persist only reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Mounts only after the previous seat's `END_DAY` commits. BEGIN reveals the next player view; no gameplay commands are accepted while the cover is active.
- Missing presentation assets may fall back through the asset resolver per [`fail-loud.md`](../../../fail-loud.md).
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.

---

## 🔍 Sync Check

- **UI: ⚠** — Selectors and commands match siblings [`spec.md`](./spec.md) and [`interactions.md`](./interactions.md). [`mockup.html`](./mockup.html) draws only the BEGIN button — the `OPEN_OPTIONS_FROM_HANDOFF` row above has no visible affordance; see issues.
- **Schema: ❌** — `BEGIN_HOTSEAT_TURN` and `OPEN_OPTIONS_FROM_HANDOFF` are **not present** in [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) and have no registration in [`command-schema.md`](../../../command-schema.md). `state.ui.hotseat.coverActive` is not registered in [`data-inventory.md`](../../../data-inventory.md). Schema-matrix rows for the referenced schemas are otherwise consistent.
- **Tasks: ❌** — Engine task [`07-hotseat-turn-state-machine.md`](../../../../../tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md) defines `BEGIN_HOTSEAT_HANDOFF` / `CONFIRM_HOTSEAT_HANDOFF` and forbids shadow state for the cover. UI task [`63-hotseat-turn-handoff-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md) requires every action ID to resolve through [`screen-command-coverage.json`](../../../screen-command-coverage.json), which has no row for screen 63.

## ⚠ Issues

- **Command-name drift versus engine task.** Commands listed (`BEGIN_HOTSEAT_TURN`, `OPEN_OPTIONS_FROM_HANDOFF`) do not match the canonical engine state machine ([`07-hotseat-turn-state-machine.md`](../../../../../tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md)), which defines `BEGIN_HOTSEAT_HANDOFF` (set up cover) and `CONFIRM_HOTSEAT_HANDOFF` (advance `activePlayerId`). Per CLAUDE.md "Stable IDs are public API", engine is canonical. Suggested rewrite: `BEGIN_HOTSEAT_TURN` → `CONFIRM_HOTSEAT_HANDOFF` (BEGIN button) and add `BEGIN_HOTSEAT_HANDOFF` as the mount-time set-up event. Skill did not rename (Hard Prohibition A). See sibling [`interactions.md`](./interactions.md) trailer — aligned.
- **Missing `command.schema.json` definitions.** Neither hotseat command is in [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json). Per CLAUDE.md hard constraints, schema-backed commands must be registered before dispatch. Owner: `phase-2.08-meta-systems.07-hotseat-turn-state-machine` (or its predecessor schema task). Skill did not add schema entries (Hard Prohibition D).
- **`OPEN_OPTIONS_FROM_HANDOFF` undefined and not visible in `mockup.html`.** No Options control is drawn; no matching command in the engine task or `command.schema.json`. Resolution requires either an updated mockup (owner approval) or removing this command from siblings. Skill did not edit `mockup.html` (reference-only).
- **Missing `data-inventory.md` row for `state.ui.hotseat.coverActive`.** Per CLAUDE.md root contract ("every persisted field is registered in `data-inventory.md`"), the slice must either gain an inventory row (transient UI state) or be removed in favor of the engine's `AdventureState.phase`. The engine task is explicit: "no shadow state stored elsewhere." Suggested values if kept: domain=`ui`, owner=`phase-2.08-meta-systems.07-hotseat-turn-state-machine`, persistence=`in-memory`, retention=`session`. Skill did not edit [`data-inventory.md`](../../../data-inventory.md) (Hard Prohibition D).
- **Missing `screen-command-coverage.json` row for `63-hotseat-turn-handoff`.** UI task acceptance criterion requires each action ID here to resolve through that file. Owner: `phase-2.07-ui-screen-backlog.63-hotseat-turn-handoff-screen`.
