# Screen 04: Campaign Inter-Mission Narrative
## Data Contracts

### Source Files
- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Interactions: [`interactions.md`](./interactions.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | Briefing copy, labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `scenario.schema.json` | Per-mission scenario setup, starting state, victory / loss conditions, save / load metadata. | [`content-schema/schemas/scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json) |
| `campaign.schema.json` (planned) | Campaign metadata, scenario chain, branching rules, carry-over policy, and narrative slots — feeds `state.campaign.currentNodeId` and `selectors.campaigns.currentCarryover`. | Owned by planned task [`mvp.02-content-schemas.17-campaign-schema`](../../../../../tasks/mvp/02-content-schemas/17-campaign-schema.md); wired into the runtime by [`phase-2.08-meta-systems.02-campaign-runner`](../../../../../tasks/phase-2/08-meta-systems/02-campaign-runner.md). See `## ⚠ Issues`. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `campaignNode` | `state.campaign.currentNodeId` | Current campaign mission node; persisted by the campaign-runner (see `## ⚠ Issues`). |
| `storyText` | `localization.campaign[node].briefing` | Localized briefing / inter-mission text. |
| `objectives` | `registries.scenarios.byId[mission].objectives` | Victory and loss objective records. |
| `bonusChoices` | `state.ui.campaignNarrative.selectedBonus` | UI-only bonus draft consumed by `START_CAMPAIGN_MISSION`. |
| `carryover` | `selectors.campaigns.currentCarryover` | Heroes / artifacts / resources carried into the mission. |

### Commands And Events
Sibling [`interactions.md`](./interactions.md) is canonical for
routing, disabled states, and animation. Coverage classification
per [`screen-command-coverage.json`](../../../screen-command-coverage.json):

- `SELECT_CAMPAIGN_BONUS` from `narrative.selectBonus` — local-ui
  (`SELECT_` prefix); updates the bonus draft.
- `START_CAMPAIGN_MISSION` from `narrative.start` — **outOfScope**
  in the coverage map; the campaign-runner owns mission launch and
  the screen renders the button disabled with a localized reason
  until that runtime ships.
- `CLOSE_CAMPAIGN_BRIEFING` from `narrative.back` — local-ui
  (`CLOSE_` prefix); returns to
  [`03-campaign-selection`](../03-campaign-selection/).

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.campaign-narrative.title`
- `ui.campaign-narrative.actions.*`
- `ui.campaign-narrative.status.*`
- `ui.campaign-narrative.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.campaign-narrative.background`
- `ui.campaign-narrative.frame`
- `ui.campaign-narrative.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.menus.*`
- `vfx.campaign-narrative.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when named
  by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Loads the campaign node, localized narrative, objective records,
  bonus draft, carry-over preview, and selected difficulty before
  the campaign-runner accepts `START_CAMPAIGN_MISSION`.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly per [`fail-loud.md`](../../../fail-loud.md) before
  controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selector / command rows align with sibling
  [`spec.md`](./spec.md) and [`interactions.md`](./interactions.md);
  asset / VFX prefixes match the `data-screen="04-campaign-narrative"`
  namespace in [`mockup.html`](./mockup.html).
- **Schema: ⚠** — `asset-index`, `localization`, `ruleset`, and
  `scenario` schemas exist under `content-schema/schemas/`;
  `campaign.schema.json` is **planned** per
  [`mvp.02-content-schemas.17-campaign-schema`](../../../../../tasks/mvp/02-content-schemas/17-campaign-schema.md)
  and is the canonical source for the campaign records this screen
  consumes. Detail in `## ⚠ Issues`.
- **Tasks: ⚠** — `SELECT_CAMPAIGN_BONUS` and `CLOSE_CAMPAIGN_BRIEFING`
  are covered by `localUiPrefixes` in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json);
  `START_CAMPAIGN_MISSION` is registered there as `outOfScope` with
  owner
  [`phase-2.08-meta-systems.02-campaign-runner`](../../../../../tasks/phase-2/08-meta-systems/02-campaign-runner.md).
  Consumer screen task is
  [`phase-2.07-ui-screen-backlog.04-campaign-narrative-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/04-campaign-narrative-screen.md).

## ⚠ Issues

- **`campaign.schema.json` is referenced but not yet authored.**
  This file lists it as the canonical source for campaign-node
  metadata, but no schema exists under `content-schema/schemas/`
  today and no row is registered in
  [`schema-matrix.md`](../../../schema-matrix.md). Owner task
  [`mvp.02-content-schemas.17-campaign-schema`](../../../../../tasks/mvp/02-content-schemas/17-campaign-schema.md)
  must land the schema (and a `schema-matrix.md` row) before
  [`phase-2.08-meta-systems.02-campaign-runner`](../../../../../tasks/phase-2/08-meta-systems/02-campaign-runner.md)
  or this screen can be implemented end-to-end. Flagged rather than
  silently dropped because the gap is the source of truth for
  campaign records.
- **`state.campaign.currentNodeId` is unregistered in
  [`data-inventory.md`](../../../data-inventory.md).** The slice is
  bound here as `campaignNode`, named in sibling
  [`spec.md`](./spec.md), [`interactions.md`](./interactions.md),
  and [`architecture.md`](./architecture.md), and persisted under
  the `state.campaign.*` namespace by the campaign-runner. Per
  CLAUDE.md root contract ("every persisted field is registered in
  `data-inventory.md`"), the runtime owner
  [`phase-2.08-meta-systems.02-campaign-runner`](../../../../../tasks/phase-2/08-meta-systems/02-campaign-runner.md)
  must add the row before the slice can ship. Suggested values:
  Field=`current campaign node`,
  State path=`state.campaign.currentNodeId`,
  Medium=`IndexedDB (hr-profile.campaign)`,
  Sensitivity=`low`,
  Retention=`until user-deleted`,
  Wipe scope=`WIPE_LOCAL_DATA scope=profile|all`,
  Notes=`active campaign mission node; written by
  phase-2.08-meta-systems.02-campaign-runner on
  START_CAMPAIGN_MISSION acceptance`.
- **Generic "Screen-specific registries" boilerplate dropped.** The
  prior generic row ("Heroes, towns, spells, artifacts, armies,
  map objects, battles, saves, or shell state… Loaded
  content/runtime registries") was identical across sibling
  packages and was not consumed by this screen; replaced with the
  concrete `campaign.schema.json` row this briefing actually needs.
  No semantic change — recorded here per Hard Prohibition F
  (no silent section deletion).
