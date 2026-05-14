# Screen 52: Artifact Combine Dialog — Data Contracts

## Source Files

- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Interactions: [`interactions.md`](./interactions.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

Cross-package references:
[`command-schema.md`](../../../command-schema.md),
[`screen-command-coverage.json`](../../../screen-command-coverage.json),
[`data-inventory.md`](../../../data-inventory.md),
[`error-ux.md`](../../../error-ux.md),
[`error-formatter.md`](../../../error-formatter.md).

## Content Schemas And Registries

| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `command.schema.json` | `COMBINE_ARTIFACTS` envelope (`heroId`, `artifactIds`, `metadata`) and validation gate. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |
| `artifact.schema.json` | Artifact records, equip slots, backpack rules, combination recipes, tooltip effects. | [`content-schema/schemas/artifact.schema.json`](../../../../../content-schema/schemas/artifact.schema.json) |
| `hero.schema.json` | Hero identity, ownership, equipped artifacts, backpack container. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `effect.schema.json` | Closed effect records embedded by the resulting combination artifact. | [`content-schema/schemas/effect.schema.json`](../../../../../content-schema/schemas/effect.schema.json) |
| `ruleset.schema.json` | Deterministic constants and recipe rules consumed by the guard. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error message keys. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |

## Runtime State Selectors

| UI Element | Selector | Notes |
| --- | --- | --- |
| `recipeId` | `state.ui.artifactCombine.recipeId` | Combination recipe being evaluated. |
| `components` | `selectors.artifacts.combineComponents` | Required pieces and ownership state. |
| `resultArtifact` | `registries.artifacts.byId[resultId]` | Result artifact record. |
| `destination` | `selectors.artifacts.combineDestination` | Equip slot or backpack target. |
| `combineGuard` | `selectors.artifacts.combineGuard` | Eligibility and disabled reason. |

Local drafts under `state.ui.artifactCombine.*` are session-only,
in-memory, and require no
[`data-inventory.md`](../../../data-inventory.md) row.

## Commands And Events

Resolution rules per
[`screen-command-coverage.json`](../../../screen-command-coverage.json):

| Action | Token | Resolution | Effect |
| --- | --- | --- | --- |
| `artifactCombine.inspectComponent` | `SELECT_COMBINE_COMPONENT` | UI-local (matches `SELECT_` prefix). | Updates the component detail focus on `state.ui.artifactCombine.*` (in-memory draft). |
| `artifactCombine.confirm` | `COMBINE_ARTIFACTS` | Schema-backed; dispatched through the shared command hook. | Removes the listed components from the hero, creates the result artifact, and equips it or sends it to the backpack per destination rules. |
| `artifactCombine.cancel` | `CANCEL_ARTIFACT_COMBINE` | UI-local (matches `CANCEL_` prefix); routes to [`46-hero-screen`](../46-hero-screen/). | Closes the dialog; clears the draft; no artifact change. |

Engine ownership:
[`tasks/phase-2/01-spells-artifacts/15-combine-artifacts-command.md`](../../../../../tasks/phase-2/01-spells-artifacts/15-combine-artifacts-command.md).

## Config Keys

- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

## Localization Keys

- `ui.artifact-combine-dialog.title`
- `ui.artifact-combine-dialog.actions.*`
- `ui.artifact-combine-dialog.status.*`
- `ui.artifact-combine-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`
- Error keys resolve through
  [`error-formatter.md`](../../../error-formatter.md) under the
  closed `errors.*` namespace.

## Asset, Sound, And VFX IDs

- `ui.artifact-combine-dialog.background`
- `ui.artifact-combine-dialog.frame`
- `ui.artifact-combine-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.artifact-combine-dialog.*`

## Save And Replay Fields

- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when named
  by the owning system.
- Do not persist hover, focus, tooltip, focused component, scroll,
  drag ghost, cursor blink, animation frame, or transient visual
  effects.
- Replays use stable IDs and scalar command inputs, never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

## Validation And Fallback

- The dispatcher validates `COMBINE_ARTIFACTS` against hero
  ownership, every component artifact ID, unique component IDs,
  locked / equipped state, recipe eligibility, destination-slot
  legality, and backpack capacity before the reducer removes the
  components and creates the result artifact.
- Missing presentation may fall back through the asset resolver
  (see [`asset-loading.md`](../../../asset-loading.md)).
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly per [`fail-loud.md`](../../../fail-loud.md) before
  controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors, command tokens, and asset / localization roots match [`spec.md` § State Bindings](./spec.md#state-bindings), [`interactions.md` § 1 Actions](./interactions.md#1-actions), and the modal regions in [`mockup.html`](./mockup.html).
- **Schema: ✔** — `COMBINE_ARTIFACTS` defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (line 1639) with required keys `kind`, `heroId`, `artifactIds`, `metadata`. `SELECT_COMBINE_COMPONENT` and `CANCEL_ARTIFACT_COMBINE` covered by the `SELECT_` / `CANCEL_` entries in [`screen-command-coverage.json`](../../../screen-command-coverage.json) `localUiPrefixes`. No persisted slice requires a [`data-inventory.md`](../../../data-inventory.md) row.
- **Tasks: ✔** — UI screen owned by [`phase-2.07-ui-screen-backlog.52-artifact-combine-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/52-artifact-combine-dialog-screen.md); reducer behavior owned by [`phase-2.01-spells-artifacts.15-combine-artifacts-command`](../../../../../tasks/phase-2/01-spells-artifacts/15-combine-artifacts-command.md), which names [`interactions.md`](./interactions.md) in Read First.

## ⚠ Issues

_None._
