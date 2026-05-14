# Screen 61: AI Turn Indicator — Data Contracts

## 1. Screen Package

- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Interactions: [`interactions.md`](./interactions.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

## 2. Content Schemas And Registries

| Schema / registry | Used for | Canonical source |
|---|---|---|
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants and guard rules consumed by AI command resolution. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `hero.schema.json` | Hero identity, stats, army, and ownership selectors used while replaying AI hero moves. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `faction.schema.json` | Faction identity, town roster, and player-facing faction metadata for the active AI color. | [`content-schema/schemas/faction.schema.json`](../../../../../content-schema/schemas/faction.schema.json) |
| Runtime registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, and shell state referenced by the AI command batch. | Loaded content / runtime registries. |

## 3. Runtime State Selectors

| UI element | Selector | Notes |
|---|---|---|
| `aiPlayer` | `state.turn.activePlayerId` | AI player currently acting. |
| `aiPhase` | `state.ai.currentPhase` | Enum: `planning`, `moving`, `combat`, `town`, `done`. |
| `commandBatch` | `state.ai.visibleCommandBatch` | Commands currently being replayed. |
| `speed` | `config.ui.aiTurnSpeed` | Presentation speed only. |
| `interruptGuard` | `selectors.ai.canFastForwardOrPause` | Pause / fast-forward availability. |

All selectors are read through the store or a boundary adapter, not
by reaching into sim internals (per the owning task's acceptance
criteria).

## 4. Commands And Events

| Command | Action ID | Type | Effect |
|---|---|---|---|
| `SET_AI_TURN_SPEED` | `aiTurn.speed` | local-ui | Writes `config.ui.aiTurnSpeed`; presentation only. |
| `FAST_FORWARD_AI_TURN_PRESENTATION` | `aiTurn.fastForward` | local-ui | Skips non-essential animation; no gameplay effect. |
| `COMPLETE_AI_TURN_PRESENTATION` | `aiTurn.complete` | navigation | Returns control to the next human player. |

All three are presentation-side; none are defined in
[`command-schema.md`](../../../command-schema.md) (correctly — the
schema lists deterministic gameplay commands only).

## 5. Config Keys

- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.ui.aiTurnSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

## 6. Localization Keys

- `ui.ai-turn-indicator.title`
- `ui.ai-turn-indicator.actions.*`
- `ui.ai-turn-indicator.status.*`
- `ui.ai-turn-indicator.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

## 7. Asset, Sound, And VFX IDs

- Assets: `ui.ai-turn-indicator.background`,
  `ui.ai-turn-indicator.frame`,
  `ui.ai-turn-indicator.icons.*`.
- Audio: `audio.ui.hover`, `audio.ui.click`, `audio.system.*`.
- VFX: `vfx.ai-turn-indicator.*`.

## 8. Save And Replay Fields

- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records **only** when
  named by the owning system.
- Do **not** persist hover, focus, tooltip, scroll, drag ghost,
  cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

## 9. Validation And Fallback

- The overlay observes AI command generation and replay; it never
  decides outcomes. Deterministic AI commands are applied through
  the same command bus as human commands.
- Missing presentation may fall back through the asset resolver per
  [`asset-loading.md`](../../../asset-loading.md).
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly per
  [`fail-loud.md`](../../../fail-loud.md) **before** controls
  become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Command IDs and selectors match sibling
  [`interactions.md`](./interactions.md) and
  [`spec.md`](./spec.md) exactly.
- **Schema: ✔** — Each schema cell links to a file under
  [`content-schema/schemas/`](../../../../../content-schema/schemas/).
  No enum drift detected against
  `state.ai.currentPhase` (`planning | moving | combat | town |
  done`) — the values are screen-package internal and consistent
  across siblings.
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.61-ai-turn-indicator-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/61-ai-turn-indicator-screen.md)
  requires every selector listed here to be read through the store
  or a boundary adapter.

## ⚠ Issues

- **No data-inventory rows for AI replay state.** Neither
  `state.ai.currentPhase` nor `state.ai.visibleCommandBatch`
  appears in
  [`data-inventory.md`](../../../data-inventory.md). Per CLAUDE.md
  root contract, registration is required only for **persisted**
  fields; these are treated as session-transient here. If a future
  feature persists either slice (e.g. mid-turn save), the AI runtime
  owner (`mvp.10-heuristic-ai.*`) must add the row before merge.
  Skill did not edit `data-inventory.md` (Hard Prohibition D).
- **`config.ui.aiTurnSpeed` not explicitly listed in
  data-inventory.md.** The umbrella row `state.ui.options`
  (IndexedDB `hr-profile.options`, retention "until user-deleted")
  covers volume / language / hotkeys / reduced-motion. If
  `aiTurnSpeed` is persisted under the same umbrella, no new row is
  needed; if it is session-only, it stays out of the inventory.
  Owning task should confirm and amend
  [`data-inventory.md`](../../../data-inventory.md) if persistence
  is required.
- **Mockup-versus-spec gap.** See sibling `spec.md` § ⚠ Issues —
  aligned. `aiTurn.speed` and `aiTurn.complete` have no
  `data-action` hook in [`mockup.html`](./mockup.html). All three
  commands are nevertheless documented here so the implementer has
  a single canonical contract surface.
