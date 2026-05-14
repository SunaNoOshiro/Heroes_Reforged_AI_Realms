# Screen 35: Town Flyby — Data Contracts

> Source files: [`mockup.html`](./mockup.html) ·
> [`spec.md`](./spec.md) ·
> [`interactions.md`](./interactions.md) ·
> [`architecture.md`](./architecture.md)

## 1. Content Schemas And Registries

| Schema / Registry | Used For | Canonical Source |
|---|---|---|
| `asset-index.schema.json` | Background, frame, icon, and audio asset IDs. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | Title, action labels, status text, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `town-presentation.schema.json` | Town flyby camera easing (`presentation.flybyCameraEasing`) and town panorama layers (`backgroundLayers`). | [`content-schema/schemas/town-presentation.schema.json`](../../../../../content-schema/schemas/town-presentation.schema.json) |
| `faction.schema.json` | Faction identity, crest art, and signature audio cue. | [`content-schema/schemas/faction.schema.json`](../../../../../content-schema/schemas/faction.schema.json) |
| `building.schema.json` | Town silhouette / skyline composition (presentation-only references). | [`content-schema/schemas/building.schema.json`](../../../../../content-schema/schemas/building.schema.json) |
| `ruleset.schema.json` | `config.ui.allowSkipCinematics` reads through the ruleset pipeline. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |

## 2. Runtime State Selectors

| UI element | Selector | Notes |
|---|---|---|
| `townId` | `state.towns.selectedTownId` | Town being entered. |
| `factionId` | `state.towns.byId[selected].factionId` | Faction visuals and music. |
| `assetWarmup` | `state.ui.assetWarmup.townScreen` | Presentation loading state. |
| `cameraPath` | `selectors.presentation.townFlybyPath` | Deterministic flyby path derived from `town-presentation.schema.json#presentation.flybyCameraEasing`. |
| `skipAvailable` | `config.ui.allowSkipCinematics` | Gates the skip button. |

None of the five slices persists; no
[`data-inventory.md`](../../../data-inventory.md) row is required.

## 3. Commands And Events

All three tokens are **local-ui** (prefix-matched in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
via `SKIP_` / `COMPLETE_` / `CANCEL_`). None enter the deterministic
command log; the engine reducer is untouched.

| Action ID | Token | Effect |
|---|---|---|
| `townFlyby.skip` | `SKIP_TOWN_FLYBY` | Completes the presentation transition early; routes to `24-town-screen`. |
| `townFlyby.complete` | `COMPLETE_TOWN_FLYBY` | Routes to `24-town-screen` once `assetWarmup` reports ready. |
| `townFlyby.errorBack` | `CANCEL_TOWN_ENTRY_AFTER_PRESENTATION_ERROR` | Routes to `07-adventure-map` when required town data fails to load. |

## 4. Config Keys

- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.ui.allowSkipCinematics`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

## 5. Localization Keys

- `ui.town-flyby.title`
- `ui.town-flyby.actions.*`
- `ui.town-flyby.status.*`
- `ui.town-flyby.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

Error toasts and modals route through `formatUserError(err, locale)`
per [`error-formatter.md`](../../../error-formatter.md); see
[`interactions.md` § 4](./interactions.md#4-disabled-and-error-cases).

## 6. Asset, Sound, And VFX IDs

- `ui.town-flyby.background`
- `ui.town-flyby.frame`
- `ui.town-flyby.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.town-flyby.*`

## 7. Save And Replay

- Nothing on this screen persists: every binding above is either
  transient UI state or read-only config.
- Replays use stable IDs and scalar command inputs only; never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.
- UI-only hover, focus, drag-ghost, and animation-frame state stay
  outside deterministic gameplay state per
  [`state-flow.md`](../../../state-flow.md).

## 8. Validation And Fallback

- Missing presentation assets MAY use resolver fallback per
  [`fail-loud.md`](../../../fail-loud.md).
- Missing gameplay records, invalid content IDs, or rejected route
  guards fail loudly **before** the flyby's controls become
  enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs, tokens, and routing targets match sibling [`interactions.md`](./interactions.md) and [`spec.md`](./spec.md); aligned with sibling `architecture.md` § 6 (Outgoing Transitions).
- **Schema: ✔** — `town-presentation.schema.json#presentation.flybyCameraEasing` exists and backs the `cameraPath` selector; `faction.schema.json`, `asset-index.schema.json`, `localization.schema.json`, `ruleset.schema.json`, and `building.schema.json` resolve as listed.
- **Tasks: ✔** — Coverage for the three tokens is satisfied via the local-ui prefix list in [`screen-command-coverage.json`](../../../screen-command-coverage.json); owning task [`phase-2.07-ui-screen-backlog.35-town-flyby-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/35-town-flyby-screen.md) reads this file.

## ⚠ Issues

_None — see sibling `architecture.md` § ⚠ Issues for mockup-level drift not owned by this file._
