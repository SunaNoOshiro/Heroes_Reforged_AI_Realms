# Screen 04: Campaign Inter-Mission Narrative
## Interaction Map

### Source Files
- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Purpose
Behaviour and timing for the campaign briefing parchment: which
bonus is staged, what `START` dispatches, what `BACK` dispatches,
and how the screen reacts to rejected commands.

### Actions

`narrative.selectBonus` and `narrative.back` are UI-local per the
`localUiPrefixes` allowlist (`SELECT_` / `CLOSE_`) in
[`screen-command-coverage.json`](../../../screen-command-coverage.json).
`START_CAMPAIGN_MISSION` is registered there as `outOfScope` and is
owned by
[`phase-2.08-meta-systems.02-campaign-runner`](../../../../../tasks/phase-2/08-meta-systems/02-campaign-runner.md);
the button renders disabled with a localized reason that cites the
owning task until that runtime ships, per the acceptance criteria of
[`phase-2.07-ui-screen-backlog.04-campaign-narrative-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/04-campaign-narrative-screen.md).

| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Bonus slot (`Gold` / `Archers` / `Spell`) | `narrative.selectBonus` | local-ui | Current screen | `SELECT_CAMPAIGN_BONUS` | `state.ui.campaignNarrative.selectedBonus` draft. |
| `START` (`data-action="narrative.start"`) | `narrative.start` | navigation | `59-loading-screen` | `START_CAMPAIGN_MISSION` | Creates the mission setup from `campaignNode`. |
| `BACK` (`data-action="narrative.back"`) | `narrative.back` | navigation | `03-campaign-selection` | `CLOSE_CAMPAIGN_BRIEFING` | Returns to selection; preserves the bonus draft. |

Shared animation / audio: narrative text types in, the portrait
fades from sepia, the selected bonus seal stamps, and `START`
transitions through the loading screen. Reduced-motion mode
preserves visible state changes with static highlights and
localized feedback in place of the type-in and seal-stamp
animations.

### State Changes
- `state.campaign.currentNodeId` refreshes `campaignNode` when the
  campaign-runner advances the active node.
- `localization.campaign[node].briefing` refreshes `storyText` when
  the locale or active node changes.
- `registries.scenarios.byId[mission].objectives` refreshes
  `objectives` when the active scenario changes.
- `state.ui.campaignNarrative.selectedBonus` refreshes `bonusChoices`
  on `SELECT_CAMPAIGN_BONUS`.
- `selectors.campaigns.currentCarryover` refreshes `carryover` when
  upstream profile / runner state changes.
- Hover, focus, selected row, drag ghost, and animation frame stay
  outside deterministic gameplay state.

### Navigation Outcomes
- `START` routes to [`59-loading-screen`](../59-loading-screen/)
  after the campaign-runner accepts the launch and the exit
  animation finishes.
- `BACK` routes to
  [`03-campaign-selection`](../03-campaign-selection/) after guard
  approval and exit animation (sibling
  [`interactions.md`](../03-campaign-selection/interactions.md)
  routes in via `campaign.begin`).

### Disabled And Error Cases
- Disable `START` while
  [`phase-2.08-meta-systems.02-campaign-runner`](../../../../../tasks/phase-2/08-meta-systems/02-campaign-runner.md)
  is `planned` (out-of-scope token) or whenever required selectors,
  registry records, the carry-over preview, or route guards fail.
- Disable a bonus slot whose underlying record is missing from the
  scenario registry.
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
  [`mockup.html`](./mockup.html) (`narrative.start`,
  `narrative.back`); `narrative.selectBonus` corresponds to the
  three `data-item` bonus slots described in sibling
  [`spec.md`](./spec.md).
- **Schema: ⚠** — `SELECT_CAMPAIGN_BONUS` and `CLOSE_CAMPAIGN_BRIEFING`
  satisfy the `localUiPrefixes` rule in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  and need no closed-`Command`-enum row in
  [`command-schema.md`](../../../command-schema.md);
  `START_CAMPAIGN_MISSION` is registered there as `outOfScope` with
  the campaign-runner as owner.
- **Tasks: ✔** — Behavior is consumed by
  [`phase-2.07-ui-screen-backlog.04-campaign-narrative-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/04-campaign-narrative-screen.md);
  runtime owner of `START_CAMPAIGN_MISSION` is
  [`phase-2.08-meta-systems.02-campaign-runner`](../../../../../tasks/phase-2/08-meta-systems/02-campaign-runner.md).

## ⚠ Issues

- **No bonus-select control in
  [`mockup.html`](./mockup.html).** The `narrative.selectBonus` row
  stays in the table because `state.ui.campaignNarrative.selectedBonus`
  is consumed by `START_CAMPAIGN_MISSION` payload composition in
  [`phase-2.08-meta-systems.02-campaign-runner`](../../../../../tasks/phase-2/08-meta-systems/02-campaign-runner.md),
  but no SVG region triggers it — the active slot is the preselected
  `Gold` `slotHot` only. Either the mockup must add a clickable
  bonus surface or the bonus selection must be deferred and the
  binding marked read-only at v1. Owner:
  [`phase-2.07-ui-screen-backlog.04-campaign-narrative-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/04-campaign-narrative-screen.md).
  Same issue is mirrored in sibling [`spec.md`](./spec.md) § Issues.
