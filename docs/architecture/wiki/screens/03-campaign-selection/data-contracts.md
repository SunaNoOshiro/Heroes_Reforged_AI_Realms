# Screen 03: Campaign Selection
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `scenario.schema.json` | Per-mission scenario setup, starting state, victory / loss conditions, save / load metadata. | [`content-schema/schemas/scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json) |
| `world.schema.json` | World terrain, biome, underground, generator, and map setup records for the campaign map preview. | [`content-schema/schemas/world.schema.json`](../../../../../content-schema/schemas/world.schema.json) |
| `faction.schema.json` | Faction identity, town roster, hero / unit references, and player-facing faction metadata for the shield art. | [`content-schema/schemas/faction.schema.json`](../../../../../content-schema/schemas/faction.schema.json) |
| `campaign.schema.json` (planned) | Campaign metadata, scenario chain, branching rules, carry-over policy, and narrative slots — feeds `selectors.campaigns.availableCampaigns` and `selectors.campaigns.carryoverPreview`. | Owned by planned task [`mvp.02-content-schemas.17-campaign-schema`](../../../../../tasks/mvp/02-content-schemas/17-campaign-schema.md); wired into the runtime by [`phase-2.08-meta-systems.01-campaign-graph-schema`](../../../../../tasks/phase-2/08-meta-systems/01-campaign-graph-schema.md). See `## ⚠ Issues`. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `campaigns` | `selectors.campaigns.availableCampaigns` | Campaign records visible under installed packs. |
| `selectedCampaign` | `state.ui.campaign.selectedCampaignId` | UI-only local selection. |
| `unlockState` | `state.profile.campaignUnlocks` | Locked / unlocked / completed medals; persisted (see `## ⚠ Issues`). |
| `difficulty` | `state.ui.campaign.difficulty` | Campaign difficulty draft; UI-only, no visible control in v1. |
| `carryoverPreview` | `selectors.campaigns.carryoverPreview` | Hero / artifact / resource carry-over preview for the selected campaign. |

### Commands And Events
All four tokens are UI-local per the `localUiPrefixes` allowlist in
[`screen-command-coverage.json`](../../../screen-command-coverage.json);
they do **not** enter the deterministic engine command log. Sibling
[`interactions.md`](./interactions.md) is canonical for routing and
disabled-state behavior.

- `SELECT_CAMPAIGN` from `campaign.select` — updates the selected
  campaign id, map, medals, and briefing preview.
- `SET_CAMPAIGN_DIFFICULTY` from `campaign.difficulty` — updates the
  difficulty draft.
- `OPEN_CAMPAIGN_BRIEFING` from `campaign.begin` — creates the
  campaign run draft and routes to `04-campaign-narrative`.
- `CLOSE_CAMPAIGN_SELECTION` from `campaign.back` — returns to
  `02-new-game-setup`.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.campaign-selection.title`
- `ui.campaign-selection.actions.*`
- `ui.campaign-selection.status.*`
- `ui.campaign-selection.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.campaign-selection.background`
- `ui.campaign-selection.frame`
- `ui.campaign-selection.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.menus.*`
- `vfx.campaign-selection.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when named
  by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Reads campaign definitions, the unlock state, previous progress,
  the selected difficulty, and carry-over rules before opening the
  first briefing.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly per [`fail-loud.md`](../../../fail-loud.md) before
  controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selector / command rows align with sibling
  [`spec.md`](./spec.md) and [`interactions.md`](./interactions.md);
  asset / VFX prefixes match the `data-screen="03-campaign-selection"`
  namespace in [`mockup.html`](./mockup.html).
- **Schema: ⚠** — `asset-index`, `localization`, `ruleset`,
  `scenario`, `world`, and `faction` schemas exist under
  `content-schema/schemas/`; `campaign.schema.json` is **planned**
  ([`mvp.02-content-schemas.17-campaign-schema`](../../../../../tasks/mvp/02-content-schemas/17-campaign-schema.md))
  and is the canonical source for the campaign records this screen
  consumes. Detail in `## ⚠ Issues`.
- **Tasks: ✔** — Token coverage satisfied by `localUiPrefixes` in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json);
  consumer task is
  [`phase-2.07-ui-screen-backlog.03-campaign-selection-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/03-campaign-selection-screen.md);
  runtime-wire task is
  [`phase-2.08-meta-systems.01-campaign-graph-schema`](../../../../../tasks/phase-2/08-meta-systems/01-campaign-graph-schema.md).

## ⚠ Issues

- **`campaign.schema.json` is referenced but not yet authored.**
  This file lists it as the canonical source for campaign metadata,
  but no schema exists under `content-schema/schemas/` today. Owner
  task [`mvp.02-content-schemas.17-campaign-schema`](../../../../../tasks/mvp/02-content-schemas/17-campaign-schema.md)
  must land the schema (and a `schema-matrix.md` row) before
  [`phase-2.08-meta-systems.01-campaign-graph-schema`](../../../../../tasks/phase-2/08-meta-systems/01-campaign-graph-schema.md)
  or this screen can be implemented end-to-end. Flagged rather than
  silently removed because the gap is the source of truth for
  campaign records.
- **`state.profile.campaignUnlocks` is unregistered in
  [`data-inventory.md`](../../../data-inventory.md).** The slice is
  bound here as `unlockState` and persisted under the
  `state.profile.*` namespace, but no inventory row exists. Per
  CLAUDE.md root contract ("every persisted field is registered in
  `data-inventory.md`"), the campaign-runner owner
  [`phase-2.08-meta-systems.02-campaign-runner`](../../../../../tasks/phase-2/08-meta-systems/02-campaign-runner.md)
  must add the row. Suggested values:
  Field=`campaign unlock state`,
  State path=`state.profile.campaignUnlocks`,
  Medium=`IndexedDB (hr-profile.profile)`,
  Sensitivity=`low`,
  Retention=`until user-deleted`,
  Wipe scope=`WIPE_LOCAL_DATA scope=profile|all`,
  Notes=`per-campaign locked / unlocked / completed medal state`.
- **"Screen-specific registries" boilerplate dropped.** The
  prior generic row ("Heroes, towns, spells, artifacts, armies,
  map objects, battles, saves, or shell state… Loaded
  content/runtime registries") was not consumed by this screen and
  was identical across sibling packages; it has been replaced with
  the concrete `world` / `faction` / `campaign` rows the campaign
  preview actually consumes. No semantic change — recorded here per
  Hard Prohibition F (no silent section deletion).
