# Screen 12: Creature Bank Loot
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Post-combat creature-bank reward dialog: shows the cleared bank, hero
losses, the reward bundle, and the one-shot Collect action.

### Animation Contract (shared)
On any action that exits the dialog after a successful collection,
the screen plays a single composite animation: chest lids open, coins
sparkle, the artifact slot glows, reward numbers float upward, and
the bank object dims as the map regains focus. The `CLOSE` action
plays only the dim + dismiss tail (no chest opening) when the bank
has already been collected in a prior frame. Reduced-motion mode
replaces all of the above with static highlights and a localized
status line.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data updated | Audio |
| --- | --- | --- | --- | --- | --- | --- |
| `COLLECT` button | `bankLoot.collect` | command | `07-adventure-map` | `COLLECT_CREATURE_BANK_REWARD` (schema-backed; see [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) `$defs.collectCreatureBankReward`) | Applies reward records, marks `state.mapObjects.byId[bankId].visitedBy`, clears `state.ui.adventure.pendingBankReward`. Idempotent — second attempt fails loudly. | `audio.adventure.*` reward sting + `audio.ui.click` |
| Right-click reward slot | `bankLoot.inspectReward` | navigation | `50-creature-info` or `18-map-object-tooltip` | `OPEN_REWARD_DETAILS` (UI-local — `OPEN_` prefix in [`screen-command-coverage.json`](../../../screen-command-coverage.json)) | None — opens a detail view; selection state stays in route/draft. | `audio.ui.hover` |
| `CLOSE` button | `bankLoot.close` | navigation | `07-adventure-map` | `CLOSE_BANK_REWARD` (UI-local — `CLOSE_` prefix in [`screen-command-coverage.json`](../../../screen-command-coverage.json)) | None — route exit only; collection state must already be resolved (either collected or postponed). | `audio.ui.click` |

### State Changes
| Selector | When it refreshes |
| --- | --- |
| `state.ui.adventure.pendingBankReward.bankId` | Set by auto-resolve / tactical reducer on victory; cleared by `COLLECT_CREATURE_BANK_REWARD` or by `CLOSE_BANK_REWARD` after a prior collection. |
| `state.combat.lastResult` | Refreshed by the battle reducer. |
| `selectors.creatureBanks.rewardBundle` | Derived from `state.combat.lastResult` + `neutral-stack-template.schema.json` + the effect registry. |
| `state.mapObjects.byId[bankId].visitedBy` | Refreshed by `COLLECT_CREATURE_BANK_REWARD`. |
| `state.heroes.byId[selected].army` | Refreshed by the battle reducer when casualties resolve. |

UI-only hover, focus, selected row, open tab, target cursor, drag
ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- `bankLoot.collect` routes to `07-adventure-map` after the reducer
  accepts and the exit animation completes.
- `bankLoot.inspectReward` routes to `50-creature-info` (creature
  stacks) or `18-map-object-tooltip` (artifacts / resources) without
  closing the parent dialog.
- `bankLoot.close` routes to `07-adventure-map` and is enabled only
  after the reward state is resolved (`visitedBy` truthy).

### Disabled And Error Cases
- Disable controls when required selectors, registry records, target
  legality, ownership, phase, or route guards fail. `COLLECT` is also
  disabled when `visitedFlag` is already truthy.
- Missing presentation assets may use resolver fallback per
  [`fail-loud.md`](../../../fail-loud.md); missing gameplay records,
  invalid content IDs, or rejected commands fail loudly.
- On rejection: keep the dialog open, preserve local draft when
  useful, render the localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams must mirror these
  interactions rather than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each `Type: command` action to its default surface for this screen's
dominant error domain. A row whose Notes column reads `override`
replaces the § 2 default for that action; otherwise the default
applies. Specific error codes (e.g. `DISPATCHER_<token>`,
`STORAGE_<token>`) land alongside the engine reducer that owns each
command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| `bankLoot.collect` (`COLLECT_CREATURE_BANK_REWARD`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled button + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — `COLLECT` and `CLOSE` buttons match `mockup.html`
  (`data-action="bankLoot.collect"`, `data-action="bankLoot.close"`).
  Right-click inspect affordance is described by sibling
  [`spec.md`](./spec.md) § Visual Contract — no DOM hook in the
  mockup (right-click is gesture-only).
- **Schema: ✔** — `COLLECT_CREATURE_BANK_REWARD` is defined in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  (`$defs.collectCreatureBankReward`). `OPEN_REWARD_DETAILS` and
  `CLOSE_BANK_REWARD` are correctly UI-local per the
  `localUiPrefixes` list in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (`OPEN_`, `CLOSE_`).
- **Tasks: ✔** — Owning UI task
  `phase-2.07-ui-screen-backlog.12-creature-bank-loot-screen` lists
  this file in `Read First`; reducer task
  `mvp.05-adventure-map.14-collect-creature-bank-reward-command`
  reads this file as well.

## ⚠ Issues

- **Missing `command-schema.md` section for `COLLECT_CREATURE_BANK_REWARD`.**
  See sibling [`spec.md`](./spec.md) § Issues — aligned. Reducer task
  `mvp.05-adventure-map.14-collect-creature-bank-reward-command` is
  the suggested owner.
