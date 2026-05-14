# Screen 36: Marketplace Artifact Trading
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
| `ruleset.schema.json` | Deterministic constants, valuation formula, and guard rules consumed by `TRADE_ARTIFACT`. | `content-schema/schemas/ruleset.schema.json` |
| `artifact.schema.json` | Artifact inventory, equipment slots, locked flags, and tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by quote outcomes and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | `TRADE_ARTIFACT` payload dispatched on commit. | `content-schema/schemas/command.schema.json` |
| Runtime registries | Heroes, towns, artifacts, and market state read via the runtime store. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `heroArtifacts` | `state.heroes.byId[visiting].artifacts` | Equipped + backpack artifacts. |
| `selectedOffer` | `state.ui.artifactTrading.offerArtifactId` | Local artifact being offered. |
| `selectedRequest` | `state.ui.artifactTrading.requestId` | Local requested gold / resource / artifact outcome. |
| `quote` | `selectors.economy.artifactTradeQuote` | Deterministic trade valuation. |
| `tradeGuard` | `selectors.economy.artifactTradeGuard` | Eligibility, lock, capacity, affordability. |

### Commands And Events
| Action ID | Token | Type | Effect |
| --- | --- | --- | --- |
| `artifactTrade.selectOffer` | `SELECT_ARTIFACT_TRADE_OFFER` | local-ui (`SELECT_` prefix) | Places artifact on the offer scale locally. |
| `artifactTrade.selectQuote` | `SELECT_ARTIFACT_TRADE_QUOTE` | local-ui (`SELECT_` prefix) | Updates the requested outcome locally. |
| `artifactTrade.commit` | `TRADE_ARTIFACT` | schema command | Moves / removes the artifact and applies the quote result. |
| `artifactTrade.close` | `CLOSE_ARTIFACT_TRADING` | local-ui (`CLOSE_` prefix) | Returns to the main marketplace. |

Local-UI prefixes are listed in
[`screen-command-coverage.json`](../../../screen-command-coverage.json);
`TRADE_ARTIFACT` is defined in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
(see `## ⚠ Issues` for the payload-shape gap).

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.marketplace-artifact-trading.title`
- `ui.marketplace-artifact-trading.actions.*`
- `ui.marketplace-artifact-trading.status.*`
- `ui.marketplace-artifact-trading.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.marketplace-artifact-trading.background`
- `ui.marketplace-artifact-trading.frame`
- `ui.marketplace-artifact-trading.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.marketplace-artifact-trading.*`

### Save And Replay Fields
- Persist only reducer-approved gameplay state, setup records,
  content hashes, command inputs, and explicit draft records named
  by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag-ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- `TRADE_ARTIFACT` validates artifact ownership, locked equipped
  slots, trade eligibility, market availability, valuation
  formula, backpack capacity, and gold / resource outcomes before
  mutating state.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, or unresolved
  content IDs fail loudly per
  [`fail-loud.md`](../../../fail-loud.md) before controls become
  enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors, action IDs, and command tokens match sibling [`spec.md`](./spec.md) and [`interactions.md`](./interactions.md) row-for-row.
- **Schema: ❌** — `TRADE_ARTIFACT` is defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) but with a **hero-to-hero** payload (`fromHeroId`, `toHeroId`, `artifactId`), not the marketplace artifact → gold / resource / artifact flow this screen requires. Single canonical entry in sibling [`spec.md`](./spec.md) `## ⚠ Issues`.
- **Tasks: ✔** — Owning UI task [`tasks/phase-2/07-ui-screen-backlog/36-marketplace-artifact-trading-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/36-marketplace-artifact-trading-screen.md) and engine command task [`tasks/phase-2/01-spells-artifacts/17-trade-artifact-command.md`](../../../../../tasks/phase-2/01-spells-artifacts/17-trade-artifact-command.md) both Read-First this package.

## ⚠ Issues

- **`TRADE_ARTIFACT` payload shape.** Cross-references sibling [`spec.md`](./spec.md) `## ⚠ Issues`; owner is [`phase-2.01-spells-artifacts.17-trade-artifact-command`](../../../../../tasks/phase-2/01-spells-artifacts/17-trade-artifact-command.md). Not edited here per Hard Prohibition D.
- **No `state.ui.artifactTrading.*` row in [`data-inventory.md`](../../../data-inventory.md).** The UI draft slice is transient (local-ui drafts cleared on close) so registration may not be required, but [`data-inventory.md`](../../../data-inventory.md) is the single source of truth for "persisted" classification. Per CLAUDE.md root contract ("every persisted field is registered in data-inventory.md"), the owning UI task should confirm `state.ui.artifactTrading.*` is in-memory only and either skip registration or add an `in-memory` row. Flag-only.
