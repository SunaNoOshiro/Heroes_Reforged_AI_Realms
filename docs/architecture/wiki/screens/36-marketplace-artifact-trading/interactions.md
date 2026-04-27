# Screen 36: Marketplace Artifact Trading
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Marketplace sub-service for exchanging artifacts between hero, backpack, market offer slots, and trade valuation rows.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select artifact | `artifactTrade.selectOffer` | local-ui | Current screen | `SELECT_ARTIFACT_TRADE_OFFER` | Places artifact on offer scale locally. | Artifact cards slide onto scales, valuation needle moves, accepted trade stamps the receipt, and rejected locked artifacts snap back. |
| Select quote | `artifactTrade.selectQuote` | local-ui | Current screen | `SELECT_ARTIFACT_TRADE_QUOTE` | Updates requested outcome. | Artifact cards slide onto scales, valuation needle moves, accepted trade stamps the receipt, and rejected locked artifacts snap back. |
| Trade | `artifactTrade.commit` | command | Current screen | `TRADE_ARTIFACT` | Moves/removes artifact and applies quote result. | Artifact cards slide onto scales, valuation needle moves, accepted trade stamps the receipt, and rejected locked artifacts snap back. |
| Close | `artifactTrade.close` | navigation | `26-marketplace` | `CLOSE_ARTIFACT_TRADING` | Returns to main marketplace. | Artifact cards slide onto scales, valuation needle moves, accepted trade stamps the receipt, and rejected locked artifacts snap back. |

### State Changes
- `state.heroes.byId[visiting].artifacts` refreshes `heroArtifacts` after the owning reducer or local UI draft changes.
- `state.ui.artifactTrading.offerArtifactId` refreshes `selectedOffer` after the owning reducer or local UI draft changes.
- `state.ui.artifactTrading.requestId` refreshes `selectedRequest` after the owning reducer or local UI draft changes.
- `selectors.economy.artifactTradeQuote` refreshes `quote` after the owning reducer or local UI draft changes.
- `selectors.economy.artifactTradeGuard` refreshes `tradeGuard` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Close can route to `26-marketplace` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
