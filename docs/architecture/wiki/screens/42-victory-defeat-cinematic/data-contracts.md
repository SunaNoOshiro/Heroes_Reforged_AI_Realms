# Screen 42: Victory / Defeat Cinematic
## Data Contracts

> Companion docs:
> [`spec.md`](./spec.md), [`interactions.md`](./interactions.md),
> [`architecture.md`](./architecture.md), [`mockup.html`](./mockup.html),
> [`command-schema.md`](../../../command-schema.md)
> (closed command vocabulary),
> [`screen-command-coverage.json`](../../../screen-command-coverage.json)
> (UI-local prefix list),
> [`data-inventory.md`](../../../data-inventory.md)
> (persistence registration),
> [`schema-matrix.md`](../../../schema-matrix.md) (schema registry).

## 1. Content Schemas And Registries

| Schema / Registry | Used For |
| --- | --- |
| [`asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) | Letterbox art, frames, icons, animation manifests. |
| [`localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) | Title, narration cues, action labels, status text, error keys. |
| [`scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json) | Scenario setup and outcome metadata consumed by the route guard. |
| [`ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) | Deterministic constants used by the upstream reducer (not by this screen). |
| Campaign carryover registry | Source for `state.campaign.carryoverDraft`; owned by the scenario-resolution runtime. |

## 2. Runtime State Selectors

| Binding | Selector | Notes |
| --- | --- | --- |
| `outcome` | `state.scenario.outcome` | Victory / defeat / campaign outcome (closed enum produced upstream). |
| `score` | `state.scenario.finalScore` | Final score breakdown. |
| `carryover` | `state.campaign.carryoverDraft` | Hero / artifact carryover summary. |
| `nextRoute` | `state.scenario.outcomeRoute` | `57-high-scores`, `01-main-menu`, or next-mission route token. |

## 3. Commands And Events

All three tokens are **UI-local routing events**, not engine commands.
They match the `CONTINUE_`, `SKIP_`, and `REQUEST_` entries in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
§ `localUiPrefixes`, so none enters the deterministic command log
defined in [`command-schema.md`](../../../command-schema.md).

| Token | Source | Effect |
| --- | --- | --- |
| `CONTINUE_FROM_OUTCOME` | `outcome.continue` | Route per `state.scenario.outcomeRoute`. |
| `SKIP_OUTCOME_NARRATION` | `outcome.skip` | Complete text typing and art pan immediately. |
| `REQUEST_BATTLE_REPLAY_VIEW` | `outcome.replay` | Open replay presentation when one is available. |

## 4. Config Keys

- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

## 5. Localization Keys

- `ui.victory-defeat-cinematic.title`
- `ui.victory-defeat-cinematic.actions.*`
- `ui.victory-defeat-cinematic.status.*`
- `ui.victory-defeat-cinematic.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

## 6. Asset, Audio, And VFX IDs

- `ui.victory-defeat-cinematic.background`
- `ui.victory-defeat-cinematic.frame`
- `ui.victory-defeat-cinematic.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.battle.*`
- `vfx.victory-defeat-cinematic.*`

## 7. Save And Replay Fields

- This screen reads already-finalized outcome / score / carryover
  state; it never writes save or replay rows.
- The upstream producing reducer is responsible for persisting
  whatever [`data-inventory.md`](../../../data-inventory.md) rows the
  outcome and carryover require.
- Replays use stable IDs and scalar command inputs — never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

## 8. Validation And Fallback

- The screen displays already-finalized outcome state and routes to
  high scores, next mission, main menu, or replay; it never changes
  battle or scenario results.
- Missing presentation assets may fall back through the asset resolver
  per [`fail-loud.md`](../../../fail-loud.md).
- Missing gameplay records, invalid route tokens, or unresolved
  content IDs fail loudly **before** controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and tokens match sibling [`spec.md`](./spec.md) § State Bindings and [`interactions.md`](./interactions.md) § Actions.
- **Schema: ✔** — Schema references resolve under `content-schema/schemas/`; the three action tokens are correctly UI-local per [`screen-command-coverage.json`](../../../screen-command-coverage.json) prefix rules and require no row in [`command-schema.md`](../../../command-schema.md).
- **Tasks: ⚠** — Owning task [`tasks/phase-2/07-ui-screen-backlog/42-victory-defeat-cinematic-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/42-victory-defeat-cinematic-screen.md) Reads First this file; the four selectors in § 2 lack rows in [`data-inventory.md`](../../../data-inventory.md). See `## ⚠ Issues`.

## ⚠ Issues

- **Selectors not registered in `data-inventory.md`.** `state.scenario.outcome`, `state.scenario.finalScore`, `state.campaign.carryoverDraft`, and `state.scenario.outcomeRoute` are read here but have no row in [`data-inventory.md`](../../../data-inventory.md). Per CLAUDE.md root contract, the scenario-resolution producer task (Phase-2) must add rows — or document the slices as session-only in-memory — before this screen can ship a live build. Suggested values: domain=`scenario` / `campaign`, persistence=`in-memory` unless save records persist them, retention=`session`. Not added here per Hard Prohibition D. Same gap surfaced by sibling [`architecture.md`](./architecture.md#⚠-issues) and [`spec.md`](./spec.md#⚠-issues).
