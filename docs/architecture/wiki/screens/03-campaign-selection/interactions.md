# Screen 03: Campaign Selection
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Behaviour and timing for the campaign-book selection surface: which
campaign is highlighted, what `BEGIN` dispatches, what `BACK`
dispatches, and how the screen reacts to rejected commands.

### Actions

All four tokens are UI-local (per the `localUiPrefixes` allowlist in
[`screen-command-coverage.json`](../../../screen-command-coverage.json));
they drive route / draft state and do **not** enter the deterministic
engine command log. A unified animation contract is described below
the table to avoid repetition.

| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Select campaign (shield row) | `campaign.select` | local-ui | Current screen | `SELECT_CAMPAIGN` | `state.ui.campaign.selectedCampaignId`, refreshes map / medal / carry-over preview. |
| Change difficulty (deferred control) | `campaign.difficulty` | local-ui | Current screen | `SET_CAMPAIGN_DIFFICULTY` | `state.ui.campaign.difficulty` draft. |
| Begin (`data-action="campaign.begin"`) | `campaign.begin` | navigation | `04-campaign-narrative` | `OPEN_CAMPAIGN_BRIEFING` | Creates the campaign run draft and opens the briefing. |
| Back (`data-action="campaign.back"`) | `campaign.back` | navigation | `02-new-game-setup` | `CLOSE_CAMPAIGN_SELECTION` | Returns to setup; preserves the local draft. |

Shared animation / audio: book pages turn between campaigns, the
selected shield glints, locked campaign chains rattle, and `BEGIN`
fades into the briefing parchment. Reduced-motion mode uses static
highlights and localized feedback in place of the page-turn and
chain-rattle animations.

### State Changes
- `selectors.campaigns.availableCampaigns` → `campaigns` refreshes
  whenever the owning reducer or local UI draft changes.
- `state.ui.campaign.selectedCampaignId` → `selectedCampaign` refreshes
  on `SELECT_CAMPAIGN`.
- `state.profile.campaignUnlocks` → `unlockState` refreshes when the
  campaign-runner mutates unlock progress.
- `state.ui.campaign.difficulty` → `difficulty` refreshes on
  `SET_CAMPAIGN_DIFFICULTY` (UI-local draft).
- `selectors.campaigns.carryoverPreview` → `carryoverPreview` refreshes
  whenever `selectedCampaignId` or `unlockState` changes.
- Hover, focus, selected row, drag ghost, and animation frame stay
  outside deterministic gameplay state.

### Navigation Outcomes
- `BEGIN` routes to `04-campaign-narrative` after guard approval and
  exit animation; sibling
  [`04-campaign-narrative/interactions.md`](../04-campaign-narrative/interactions.md)
  routes back to this screen via `narrative.back`.
- `BACK` routes to `02-new-game-setup` after guard approval and exit
  animation.

### Disabled And Error Cases
- Disable `BEGIN` when no campaign is selected, when
  `state.profile.campaignUnlocks` marks the campaign locked, or when
  required selectors / registry records / route guards fail.
- Disable shield rows whose unlock state is `locked` for the active
  profile; the row shows a localized reason and plays the
  chain-rattle feedback.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, and rejected commands fail
  loudly per [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the current screen open, preserve the local
  draft when useful, show localized error text, and play failure
  feedback.
- Errors are produced by `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams mirror these
  interactions; they must not introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Action rows match the `data-action` affordances in
  [`mockup.html`](./mockup.html) (`campaign.begin`, `campaign.back`),
  and the shield-list / medals / map-preview regions named in
  sibling [`spec.md`](./spec.md).
- **Schema: ✔** — All four interaction tokens (`SELECT_CAMPAIGN`,
  `SET_CAMPAIGN_DIFFICULTY`, `OPEN_CAMPAIGN_BRIEFING`,
  `CLOSE_CAMPAIGN_SELECTION`) satisfy the `localUiPrefixes` rule in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (`SELECT_`, `SET_`, `OPEN_`, `CLOSE_`) and therefore do not need
  closed-`Command`-enum rows in
  [`command-schema.md`](../../../command-schema.md).
- **Tasks: ✔** — Behavior is consumed by
  [`phase-2.07-ui-screen-backlog.03-campaign-selection-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/03-campaign-selection-screen.md);
  the upstream campaign-graph dependency is
  [`phase-2.08-meta-systems.01-campaign-graph-schema`](../../../../../tasks/phase-2/08-meta-systems/01-campaign-graph-schema.md).

## ⚠ Issues

- **`campaign.difficulty` control is not visible in
  [`mockup.html`](./mockup.html).** The action stays in the table
  for forward compatibility (the draft binding survives in
  sibling [`spec.md`](./spec.md) and
  [`data-contracts.md`](./data-contracts.md)), but no SVG region
  triggers it. Owner:
  `phase-2.07-ui-screen-backlog.03-campaign-selection-screen` —
  must either add the difficulty surface to `mockup.html` or
  defer the action and its sibling state binding. Surfaced here
  rather than silently dropped because the binding is load-bearing
  for the carryover rules in
  [`phase-2.08-meta-systems.01-campaign-graph-schema`](../../../../../tasks/phase-2/08-meta-systems/01-campaign-graph-schema.md).
