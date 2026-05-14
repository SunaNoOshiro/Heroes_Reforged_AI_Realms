# Screen 26: Marketplace
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | `content-schema/schemas/localization.schema.json` |
| `ruleset.schema.json` | Deterministic constants and formulas consumed by rate computation. | `content-schema/schemas/ruleset.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `marketplace-rate-table.schema.json` | Owned-marketplace and skill modifiers feeding the rate plaque. | `content-schema/schemas/marketplace-rate-table.schema.json` |
| `artifact.schema.json` | Inherited template row (artifact inventory, equipment slots, rewards, merchants, combinations, tooltip effects). Not exercised by this screen — see Issues. | `content-schema/schemas/artifact.schema.json` |
| `command.schema.json` | `TRADE_RESOURCES` payload dispatched by `market.trade`. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Loaded content/runtime registries (resources, owned marketplaces, rate tables). | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `player.resources` | `state.players.active.resources` | Current resource balances. |
| `market.rates` | `state.marketplace.currentRates` | Rates derived from owned marketplace count and ruleset. |
| `selectedOffer` | `state.ui.marketplace.offerResource` | Local offered resource draft. |
| `selectedReceive` | `state.ui.marketplace.receiveResource` | Local received resource draft. |
| `tradeAmount` | `state.ui.marketplace.amount` | Local amount draft before confirm. |

### Commands And Events
- `SELECT_MARKET_OFFER_RESOURCE` from `market.selectOffer` — local-ui; updates rate preview and valid receive targets.
- `SELECT_MARKET_RECEIVE_RESOURCE` from `market.selectReceive` — local-ui; updates output preview.
- `SET_MARKET_TRADE_AMOUNT` from `market.changeAmount` — local-ui; updates draft quantity and result.
- `TRADE_RESOURCES` from `market.trade` — schema-backed in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json); commits the resource exchange. Required fields: `kind`, `playerId`, `fromResource`, `toResource`, `amount`, `metadata`; optional `marketplaceId`.
- `CLOSE_MARKETPLACE` from `market.close` — local-ui; returns to `24-town-screen`.

The `SELECT_`, `SET_`, and `CLOSE_` prefixes are listed under
`localUiPrefixes` in [`screen-command-coverage.json`](../../../screen-command-coverage.json);
they do not enter the deterministic command log.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.marketplace.title`
- `ui.marketplace.actions.*`
- `ui.marketplace.status.*`
- `ui.marketplace.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.marketplace.background`
- `ui.marketplace.frame`
- `ui.marketplace.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.marketplace.*`

### Save And Replay Fields
- Persist only reducer-approved gameplay state, setup records,
  content hashes, command inputs, and explicit draft records named
  by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs; never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- Trade rates derive from owned marketplaces and ruleset constants;
  only confirmed trades mutate player resources.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved
  content IDs fail loudly before controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and command IDs match `spec.md` § State Bindings and `interactions.md` § Actions; selector paths align with `architecture.md` § State Inputs.
- **Schema: ⚠** — `TRADE_RESOURCES` is defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json#L835). However, its `fromResource`/`toResource` enums (plural `gems`) drift from [`resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) (singular `gem`). Detail in Issues.
- **Tasks: ✔** — Owning content tables: [`tasks/mvp/02-content-schemas/19-tavern-and-marketplace-tables.md`](../../../../../tasks/mvp/02-content-schemas/19-tavern-and-marketplace-tables.md) defines `marketplace-rate-table.schema.json`; reducer: [`tasks/mvp/05-adventure-map/10-trade-resources-command.md`](../../../../../tasks/mvp/05-adventure-map/10-trade-resources-command.md).

## ⚠ Issues

- **Resource enum mismatch between `resource-id.schema.json` and `command.schema.json`.** Singular `gem` in `resource-id.schema.json` vs plural `gems` in `command.schema.json` `tradeResources.fromResource`/`toResource`. Per [`enum-lifecycle-policy.md`](../../../enum-lifecycle-policy.md), one is canonical and the other should alias. Owners: `mvp.02-content-schemas` (content) + `mvp.05-adventure-map.10-trade-resources-command` (command). Skill did not edit either schema (Hard Prohibition D).
- **`marketplaceId` not declared in selectors.** [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) `tradeResources` accepts `marketplaceId: string | null`; no `state.ui.marketplace.marketplaceId` (or equivalent town-context selector) is listed here. Per `mvp.05-adventure-map.10-trade-resources-command` Acceptance Criteria, the UI must source the visiting town's marketplace ID. Suggested: add a row `marketplaceId → state.ui.modalStack[top].callerRoute.marketplaceId` after the contract sweep adds modal-entry bindings (see [`contract-sweep.md`](../../_templates/contract-sweep.md)).
- **`data-inventory.md` row missing for `state.ui.marketplace.*`.** [`data-inventory.md`](../../../data-inventory.md) has no row for the three local UI draft fields. Local drafts can stay session-scoped, but per CLAUDE.md root contract every persisted field is registered there; the owning UI task `phase-2.07-ui-screen-backlog.26-marketplace-screen` should add a `persistence: ephemeral` row or confirm the field stays out of `state.ui` storage. Skill did not edit (Hard Prohibition D).
- **`artifact.schema.json` row is inherited template.** This screen exchanges resources only (per `mockup.html` + `spec.md` § Component Tree). The row is preserved per Hard Prohibition A (never strip link targets); if the owning task confirms artifacts are not surfaced here, drop the row in a follow-up. Artifact trading is owned by sibling screen [`36-marketplace-artifact-trading`](../36-marketplace-artifact-trading/).
- **Sibling-aligned** with `spec.md` § State Bindings and `interactions.md` § State Changes (same five selectors).
