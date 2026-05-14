# Screen 04: Campaign Inter-Mission Narrative

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Inter-mission briefing parchment shown between campaign missions:
typed narrative copy, speaker portrait, victory / loss objectives,
carry-over preview, three bonus-choice slots (one preselected), and
`START` / `BACK` buttons. Authoritative behavior lives in
`interactions.md`.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Fixed 800x600 layout, ornate gold frame, red / brown / stone
  panels.
- Mockup regions (see `mockup.html`):
  - Title bar: "Briefing".
  - **SpeakerPortrait** (left red panel, name `Aurelia`).
  - **StoryScroll** (centre parchment) holds the typed briefing copy
    and the **ObjectivePlaques** (Victory + Loss rows).
  - **BonusChoiceSlots** (three slots: `Gold`, `Archers`, `Spell`;
    the active slot uses `slotHot`).
  - **StartMissionButton** (`START`) and **BackButton** (`BACK`) at
    the bottom of the parchment.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in this package's Markdown files; the
  authoritative behavior table is `interactions.md`.

### Component Tree
- CampaignNarrative
  - StoryScroll
  - SpeakerPortrait
  - ObjectivePlaques
  - BonusChoiceSlots
  - StartMissionButton
  - BackButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `campaignNode` | `state.campaign.currentNodeId` | Current campaign mission node; persisted by the campaign-runner (see `## ⚠ Issues`). |
| `storyText` | `localization.campaign[node].briefing` | Localized briefing / inter-mission text. |
| `objectives` | `registries.scenarios.byId[mission].objectives` | Victory and loss objective records. |
| `bonusChoices` | `state.ui.campaignNarrative.selectedBonus` | UI-only bonus draft consumed by `START_CAMPAIGN_MISSION`. |
| `carryover` | `selectors.campaigns.currentCarryover` | Heroes / artifacts / resources carried into the mission. |

### Mechanics Mapping
- Loads campaign node data, localized narrative, objective records,
  bonus choices, carry-over preview, and selected difficulty before
  the campaign-runner accepts `START_CAMPAIGN_MISSION`.
- UI previews stay local until the campaign-runner or a route guard
  accepts them.
- Scenarios, objectives, factions, and localized strings resolve
  through registries / content schemas, not hardcoded view logic.

### Animation Contract
- Narrative text types in, portrait fades from sepia, objective
  seals stamp, and `START` transitions through the loading screen.
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
- Screen slug: `campaign-narrative`; system group: `menus`; curation
  marker: `curated-pass-6`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree matches the SVG regions in
  [`mockup.html`](./mockup.html) including the previously omitted
  `BackButton` row that backs the `data-action="narrative.back"`
  affordance.
- **Schema: ⚠** — `campaignNode` ultimately consumes campaign records
  authored against the planned `campaign.schema.json`
  ([`mvp.02-content-schemas.17-campaign-schema`](../../../../../tasks/mvp/02-content-schemas/17-campaign-schema.md));
  full detail in sibling [`data-contracts.md`](./data-contracts.md).
- **Tasks: ✔** — Consumer is
  [`phase-2.07-ui-screen-backlog.04-campaign-narrative-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/04-campaign-narrative-screen.md);
  runtime owner of `START_CAMPAIGN_MISSION` and the campaign-node
  slice is
  [`phase-2.08-meta-systems.02-campaign-runner`](../../../../../tasks/phase-2/08-meta-systems/02-campaign-runner.md).

## ⚠ Issues

- **No bonus-select affordance in
  [`mockup.html`](./mockup.html).** The `Gold` slot is preselected
  (`slotHot`), but no SVG control fires `narrative.selectBonus` to
  cycle the draft. Either the mockup must add a click-target on each
  bonus slot or the bonus selection must be deferred and the
  binding marked read-only at v1. Owner:
  [`phase-2.07-ui-screen-backlog.04-campaign-narrative-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/04-campaign-narrative-screen.md).
  Flagged rather than silently rewritten because the bonus draft is
  load-bearing for `START_CAMPAIGN_MISSION` payload composition in
  [`phase-2.08-meta-systems.02-campaign-runner`](../../../../../tasks/phase-2/08-meta-systems/02-campaign-runner.md).
- **`state.campaign.currentNodeId` is unregistered in
  [`data-inventory.md`](../../../data-inventory.md).** Detail and
  suggested row in sibling [`data-contracts.md`](./data-contracts.md)
  § Issues to avoid duplicating the canonical statement.
