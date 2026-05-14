# Screen 39: Battle Results
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | `content-schema/schemas/localization.schema.json` |
| `ruleset.schema.json` | Deterministic constants and formulas consumed by the producing reducer (XP curves, casualty math). | `content-schema/schemas/ruleset.schema.json` |
| `hero.schema.json` | Hero identity, stats, army, and XP receiver. | `content-schema/schemas/hero.schema.json` |
| `unit.schema.json` | Unit stats and stack records for casualty rendering. | `content-schema/schemas/unit.schema.json` |
| `artifact.schema.json` | Captured-artifact records in spoils. | `content-schema/schemas/artifact.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs in spoils. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Closed engine `Command` enum; this screen consumes the result of `BATTLE_RESOLVED`. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, units, artifacts, and resource records resolved by the screen at render time. | Loaded content / runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `battle.outcome` | `state.battle.result.outcome` | Closed enum: `win` / `loss` / `retreat` / `surrender`. |
| `experience` | `state.battle.result.experienceGained` | Hero XP reward (integer ≥ 0). |
| `casualties` | `state.battle.result.casualties` | Lost stacks per side (`attacker` / `defender`). |
| `spoils` | `state.battle.result.spoils` | Resources and captured-artifact records. |
| `nextRoute` | `state.battle.result.returnRoute` | Route token consumed on continue: `adventure-map`, `victory-cinematic`, `defeat-cinematic`, or `campaign`. |
| `selectedRow` (UI-only) | `state.ui.battleResults.selectedRow` | Casualty inspect highlight. |
| `selectedSpoil` (UI-only) | `state.ui.battleResults.selectedSpoil` | Spoils tooltip target. |

`state.battle.result.*` and the `state.ui.battleResults.*` UI-local
slices are not yet modeled in
[`state-shape.md`](../../../state-shape.md) or registered in
[`data-inventory.md`](../../../data-inventory.md); see `## ⚠ Issues`.

### Tokens And Coverage
| Token | Type | Source | Effect |
| --- | --- | --- | --- |
| `ACKNOWLEDGE_BATTLE_RESULT` | local-ui | `battleResults.continue` | Dismiss overlay; route per `returnRoute`. |
| `SELECT_BATTLE_RESULT_ROW` | local-ui | `battleResults.inspectCasualties` | Update casualty inspect highlight. |
| `SELECT_BATTLE_SPOILS_ITEM` | local-ui | `battleResults.inspectSpoils` | Update spoils tooltip target. |

All three are `local-ui` by prefix per
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
(`ACKNOWLEDGE_`, `SELECT_`). They do not enter the deterministic
command log. The engine-side finalization of the battle outcome is
`BATTLE_RESOLVED` per
[`command-schema.md` § BATTLE_RESOLVED](../../../command-schema.md);
this screen reads its product, not the command itself.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.battle-results.title`
- `ui.battle-results.actions.*` (continue, inspect, close).
- `ui.battle-results.status.*` (perspective labels:
  "Your losses" / "Enemy losses"; outcome labels: VICTORY / DEFEAT /
  RETREAT / SURRENDER).
- `ui.battle-results.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.battle-results.background`
- `ui.battle-results.frame`
- `ui.battle-results.icons.*` (casualty slot, spoils slot, XP bar).
- `audio.ui.hover`, `audio.ui.click`, `audio.battle.*` (banner drop,
  experience fill, continue glow).
- `vfx.battle-results.*` (banner drop-in, XP fill, slot reveal,
  continue glow).

### Save And Replay Fields
- This screen does not write to save records. Engine result fields
  on `state.battle.result.*` persist only as part of the parent save
  record (`hr-saves.slots`) per
  [`persistence.md`](../../../persistence.md); no standalone IndexedDB
  store.
- Replays use stable IDs and scalar command inputs only — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.
- Hover, focus, tooltip, scroll, drag ghost, cursor blink, animation
  frame, and transient visual effects are never persisted.

### Validation And Fallback
- The engine applies the battle outcome exactly once via
  `BATTLE_RESOLVED`: surviving stacks, hero experience, captured
  artifacts, spoils, retreat / surrender flags, and victory-condition
  triggers. This screen is read-only on that result.
- Missing presentation assets may fall back through the asset
  resolver.
- Missing gameplay records (no `state.battle.result` after a battle
  ends), invalid commands, or unresolved content IDs fail loudly
  before the continue control becomes enabled, per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and tokens match
  [`spec.md`](./spec.md) and
  [`interactions.md`](./interactions.md).
- **Schema: ⚠** — Schemas referenced exist under
  `content-schema/schemas/`. `BATTLE_RESOLVED` is defined in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json);
  the `state.battle.result.*` sub-shape it produces is not yet
  modeled in [`state-shape.md`](../../../state-shape.md) and is not
  registered in [`schema-matrix.md`](../../../schema-matrix.md).
- **Tasks: ❌** — Consumer task
  [`tasks/phase-2/07-ui-screen-backlog/39-battle-results-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/39-battle-results-screen.md)
  lists this file as a Read First; no row in
  [`data-inventory.md`](../../../data-inventory.md) covers the
  selectors above. Same gap is noted in sibling
  [`38-combat-screen/data-contracts.md`](../38-combat-screen/data-contracts.md).

## ⚠ Issues

- **`state.battle.result.*` not registered in `data-inventory.md` or
  modeled in `state-shape.md`.** Five selectors above read under
  `state.battle.result.*`, but
  [`state-shape.md` § 1](../../../state-shape.md) only documents
  in-battle keys (`battleId`, `battleStacks`, `battlefield`,
  `initiativeQueue`, `log`, `events`, `tacticsPlacement`).
  `BATTLE_RESOLVED` in
  [`command-schema.md`](../../../command-schema.md) transitions the
  phase out of battle and updates winner / loser armies but does not
  name a `result` payload destination. Per CLAUDE.md root contract,
  the BATTLE_RESOLVED producer task must add the sub-shape and the
  inventory row. Suggested values: domain=`battle`, persistence=`save
  records only`, retention=`session`. Not rewritten here per Hard
  Prohibition D.
- **`state.ui.battleResults.*` UI-local slices undocumented.**
  Selected-row and selected-spoil drafts are needed for tooltip
  behavior in [`interactions.md`](./interactions.md). They are
  presentation-only and need not appear in `data-inventory.md`, but
  the UI-state taxonomy in
  [`ui-state-contract.md`](../../../ui-state-contract.md) expects all
  draft sub-shapes to be enumerated. Owner: the screen's owning UI
  task `tasks/phase-2/07-ui-screen-backlog/39-battle-results-screen.md`
  when it lands the draft schema.
- **Outcome enum unfclosed.** `state.battle.result.outcome` carries
  `win | loss | retreat | surrender` but no closed enum exists.
  Owner: same producer task. Suggested registration per
  [`enum-lifecycle-policy.md`](../../../enum-lifecycle-policy.md).
