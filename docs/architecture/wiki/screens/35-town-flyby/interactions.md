# Screen 35: Town Flyby — Interaction Map

> Source files: [`mockup.html`](./mockup.html) ·
> [`spec.md`](./spec.md) ·
> [`data-contracts.md`](./data-contracts.md) ·
> [`architecture.md`](./architecture.md)

## 1. Purpose

Optional cinematic town-entry / faction-panorama flyby before the
interactive [`24-town-screen`](../24-town-screen/). Presentation
only — no engine command emitted, no gameplay state mutated.

## 2. Actions

| UI element | Action ID | Type | Next screen | Token | Effect |
|---|---|---|---|---|---|
| Skip | `townFlyby.skip` | navigation | `24-town-screen` | `SKIP_TOWN_FLYBY` | Short-circuits the asset-warmup wait; routes to the town screen. |
| Flyby complete | `townFlyby.complete` | navigation | `24-town-screen` | `COMPLETE_TOWN_FLYBY` | Routes once `state.ui.assetWarmup.townScreen` reports ready. |
| Cancel load error | `townFlyby.errorBack` | navigation | `07-adventure-map` | `CANCEL_TOWN_ENTRY_AFTER_PRESENTATION_ERROR` | Returns to the adventure map when required town data fails to load. |

All three tokens are **local-ui** (prefix-matched in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
via `SKIP_` / `COMPLETE_` / `CANCEL_`). None enter the deterministic
command log.

## 3. State Changes

Updates flow one way — selectors → UI bindings. The flyby never
writes back into gameplay state.

| State path | Bound UI element |
|---|---|
| `state.towns.selectedTownId` | `townId` |
| `state.towns.byId[selected].factionId` | `factionId` |
| `state.ui.assetWarmup.townScreen` | `assetWarmup` |
| `selectors.presentation.townFlybyPath` | `cameraPath` |
| `config.ui.allowSkipCinematics` | `skipAvailable` |

UI-only hover, focus, drag-ghost, and animation-frame state stay
outside deterministic gameplay state.

## 4. Disabled And Error Cases

- **`skipAvailable === false`** — the Skip button is disabled with a
  localized reason; the flyby still completes via
  `COMPLETE_TOWN_FLYBY` once assets are ready.
- **Missing presentation assets** — resolver fallback per
  [`fail-loud.md`](../../../fail-loud.md).
- **Missing gameplay records or invalid content IDs** — fail loudly
  **before** any control is enabled. The user sees the error toast
  and the Cancel route becomes the only outcome.
- **Rejected route guard** — keep the current screen open, preserve
  local UI draft if present, surface the localized error.
- Error toast and modal text is produced by
  `formatUserError(err, locale)` per
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error text inline.

## 5. Animation Contract

- Camera eases across the skyline along
  `selectors.presentation.townFlybyPath`; parallax layers drift;
  faction crest fades in.
- Skip accelerates to the town reveal without mutating gameplay
  state.
- Reduced-motion mode (`config.ui.reducedMotion`) collapses the
  eased path to a static frame per
  [`animation-contract.md`](../../../animation-contract.md).

## 6. Navigation Outcomes

| From action | Route target | Guard |
|---|---|---|
| `townFlyby.skip` | `24-town-screen` | None — local-ui only. |
| `townFlyby.complete` | `24-town-screen` | `assetWarmup` ready. |
| `townFlyby.errorBack` | `07-adventure-map` | Triggered by error path. |

## 7. AI Implementation Notes

- This file owns per-control behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams mirror the same
  contract and must not introduce hidden behavior.
- [`data-contracts.md`](./data-contracts.md) owns schemas, config,
  localization keys, and asset IDs.

---

## 🔍 Sync Check

- **UI: ⚠** — Action IDs and tokens match sibling [`data-contracts.md`](./data-contracts.md) and [`architecture.md` § 6](./architecture.md#6-outgoing-transitions). The mockup shows only the SKIP button (the disabled / error paths have no rendered affordance in [`mockup.html`](./mockup.html)) — see sibling `architecture.md` § ⚠ Issues for the mockup label drift.
- **Schema: ✔** — Camera path resolves through `presentation.flybyCameraEasing` in [`town-presentation.schema.json`](../../../../../content-schema/schemas/town-presentation.schema.json); no engine schema is mutated.
- **Tasks: ✔** — Local-ui prefix coverage in [`screen-command-coverage.json`](../../../screen-command-coverage.json); owning task [`phase-2.07-ui-screen-backlog.35-town-flyby-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/35-town-flyby-screen.md) reads this file.

## ⚠ Issues

_None — see sibling `architecture.md` § ⚠ Issues for mockup-level drift not owned by this file._
