# Screen 03: Campaign Selection

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Curated leather campaign book: pick a campaign from a list of shields,
review the campaign map and progress medals, and route to the
inter-mission briefing or back to setup. Difficulty is held as a
local draft in `state.ui.campaign.difficulty`; no visible difficulty
control ships in the v1 mockup (see `## ⚠ Issues`).

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Fixed 800x600 layout, ornate gold frame, red/brown/stone panels.
- Mockup regions (see `mockup.html`):
  - Title bar: "Campaigns".
  - **CampaignBook** (left, leather panel) holds
    **CampaignShieldList** with four campaign rows
    (`Long Live`, `Dungeons`, `Spoils`, `Liberation`); the selected
    row glows (`slotHot`).
  - **CampaignMapPreview** (centre parchment) shows the route for the
    selected campaign.
  - **ProgressMedals** (right column) shows gold / silver / bronze
    medal slots (`G` / `S` / `B`); earned medals glow.
  - **BeginBackButtons** (`BEGIN`, `BACK`) at the bottom of the
    parchment.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in this package's Markdown files; the
  authoritative behavior table is `interactions.md`.

### Component Tree
- CampaignSelection
  - CampaignBook
  - CampaignShieldList
  - CampaignMapPreview
  - ProgressMedals
  - BeginBackButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `campaigns` | `selectors.campaigns.availableCampaigns` | Campaign records visible under installed packs. |
| `selectedCampaign` | `state.ui.campaign.selectedCampaignId` | Local selection; UI-only. |
| `unlockState` | `state.profile.campaignUnlocks` | Locked / unlocked / completed medals; persisted (see `## ⚠ Issues`). |
| `difficulty` | `state.ui.campaign.difficulty` | Campaign difficulty draft; UI-only, no visible control in v1. |
| `carryoverPreview` | `selectors.campaigns.carryoverPreview` | Hero / artifact / resource carryover preview for the selected campaign. |

### Mechanics Mapping
- Reads campaign definitions, the unlock state, previous progress,
  the selected difficulty, and carry-over rules before opening the
  first briefing.
- UI previews (highlighted shield, map route, medal glow,
  carry-over preview) stay local until a listed command or route
  guard accepts them.
- Campaigns, scenarios, factions, and localized strings resolve
  through registries / content schemas, not hardcoded view logic.

### Animation Contract
- Book pages turn between campaigns, faction shield glints, locked
  campaign chains rattle, and Begin routes to the briefing
  parchment.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema / config / localization / asset /
  sound / VFX / save / replay fields required to implement the
  screen.

### AI Implementation Notes
- Screen slug: `campaign-selection`; system group: `menus`; curation
  marker: `curated-pass-6`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree matches the SVG regions in `mockup.html`
  (`CampaignBook`, `CampaignShieldList`, `CampaignMapPreview`,
  `ProgressMedals`, `BeginBackButtons`); button affordances
  `data-action="campaign.begin"` and `data-action="campaign.back"`
  are reflected in [`interactions.md`](./interactions.md).
- **Schema: ⚠** — The canonical campaign records consumed by
  `selectors.campaigns.availableCampaigns` live in `campaign.schema.json`,
  which is still owned by the planned task
  [`mvp.02-content-schemas.17-campaign-schema`](../../../../../tasks/mvp/02-content-schemas/17-campaign-schema.md);
  sibling [`data-contracts.md`](./data-contracts.md) currently elides it.
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.03-campaign-selection-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/03-campaign-selection-screen.md)
  lists this file under Read First and depends on
  `phase-2.08-meta-systems.01-campaign-graph-schema`.

## ⚠ Issues

- **No difficulty control in `mockup.html`.** Spec, sibling
  [`interactions.md`](./interactions.md), and
  [`data-contracts.md`](./data-contracts.md) all bind
  `state.ui.campaign.difficulty` and dispatch
  `SET_CAMPAIGN_DIFFICULTY` from `campaign.difficulty`, but the SVG
  has no visible difficulty slot. Either the mockup must add the
  control or the binding / command must be deferred. Owner:
  `phase-2.07-ui-screen-backlog.03-campaign-selection-screen` —
  flagged rather than silently rewritten because the binding is
  load-bearing for the carryover rules in
  [`phase-2.08-meta-systems.01-campaign-graph-schema`](../../../../../tasks/phase-2/08-meta-systems/01-campaign-graph-schema.md).
- **`state.profile.campaignUnlocks` is unregistered in
  [`data-inventory.md`](../../../data-inventory.md).** The slice is
  bound here as `unlockState`, named in sibling
  [`data-contracts.md`](./data-contracts.md) and
  [`architecture.md`](./architecture.md), and persisted under the
  `state.profile.*` namespace. Per CLAUDE.md root contract ("every
  persisted field is registered in `data-inventory.md`"), the
  campaign-runner owner
  [`phase-2.08-meta-systems.02-campaign-runner`](../../../../../tasks/phase-2/08-meta-systems/02-campaign-runner.md)
  must add the row before the slice can ship. Suggested values:
  Field=`campaign unlock state`,
  State path=`state.profile.campaignUnlocks`,
  Medium=`IndexedDB (hr-profile.profile)`, Sensitivity=`low`,
  Retention=`until user-deleted`,
  Wipe scope=`WIPE_LOCAL_DATA scope=profile|all`,
  Notes=`per-campaign locked / unlocked / completed medal state;
  populated by phase-2.08-meta-systems.02-campaign-runner`.
