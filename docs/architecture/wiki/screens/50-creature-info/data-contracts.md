# Screen 50: Creature Info
## Data Contracts

### Source Files

- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries

| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `unit.schema.json` | Creature record (`name`, `tier`, `stats`, `abilityIds`, `growth`, `cost`) read through `registries.creatures.byId[creatureId]`. | [`content-schema/schemas/unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) |
| `ability.schema.json` | Ability records (`name`, `description`, `effects`) resolved from each `abilityIds` entry and rendered in `AbilityList`. | [`content-schema/schemas/ability.schema.json`](../../../../../content-schema/schemas/ability.schema.json) |
| `effect.schema.json` | Closed effect records embedded inside abilities; consumed by `ModifierBreakdown` for the per-stat source rows. | [`content-schema/schemas/effect.schema.json`](../../../../../content-schema/schemas/effect.schema.json) |
| `ruleset.schema.json` | Deterministic formulas applied by `selectors.creatures.stackStatModifiers` (terrain bonus, ruleset overlays). | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `asset-index.schema.json` | Background, frame, portrait, ability icons, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |

Schema-matrix registrations: `Unit`, `Ability`, `Effect` — see
[`schema-matrix.md`](../../../schema-matrix.md).

### Runtime State Selectors

| UI Element | Selector | Notes |
| --- | --- | --- |
| `creatureId` | `state.ui.creatureInfo.creatureId` | Set by the caller route; cleared by `creatureInfo.close`. |
| `stackContext` | `state.ui.creatureInfo.stackContext` | Caller discriminator (`hero` / `combat` / `dwelling` / `reward` / `calendar`). |
| `baseStats` | `registries.creatures.byId[creatureId].stats` | `attack`, `defense`, `hp`, `speed`, `shots`, `damageMin`, `damageMax` per `unit.schema.json`. |
| `modifiers` | `selectors.creatures.stackStatModifiers` | Per-stat overlay derived from hero skills, active spells, equipped artifacts, terrain, and ruleset formulas. |
| `abilityIds` | `registries.creatures.byId[creatureId].abilityIds` | Resolved to ability records via the ability registry. |

### Commands And Tokens

All three tokens dispatched from this screen are **local-ui routes**
— none of them appears in [`command-schema.md`](../../../command-schema.md)
or [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
They match prefixes in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
`localUiPrefixes` and never enter the deterministic command log.

- `SHOW_CREATURE_ABILITY_DETAIL` from `creatureInfo.hoverAbility`
  (`SHOW_` prefix): updates the local ability-detail tooltip; no
  `state.*` write.
- `OPEN_CREATURE_UPGRADE_SOURCE` from `creatureInfo.openUpgrade`
  (`OPEN_` prefix): routes to `13-hill-fort` (when
  `stackContext = hero`) or `25-building-recruitment-dialog` (when
  `stackContext = dwelling`). The actual recruitment / upgrade
  schema command is dispatched by the destination screen.
- `CLOSE_CREATURE_INFO` from `creatureInfo.close` (`CLOSE_` prefix):
  clears `state.ui.creatureInfo.creatureId` (back to `null`) and
  returns to the caller.

### Config Keys

- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys

- `ui.creature-info.title`
- `ui.creature-info.subtitle` (e.g. "Base stats plus current stack modifiers")
- `ui.creature-info.actions.upgrade`, `ui.creature-info.actions.close`
- `ui.creature-info.status.*`
- `ui.creature-info.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs

- `ui.creature-info.background`, `ui.creature-info.frame`
- `ui.creature-info.icons.*` (stat icons, ability glyphs)
- `audio.ui.hover`, `audio.ui.click`
- `vfx.creature-info.portraitPulse`, `vfx.creature-info.abilityGlow`, `vfx.creature-info.statPulse`, `vfx.creature-info.panelFade`

### Save And Replay Fields

- **Nothing persists from this screen.** The panel is read-only,
  dispatches no schema command, and writes no draft.
- `state.ui.creatureInfo.{creatureId, stackContext}` is transient
  UI state and stays outside the save per
  [`persistence.md`](../../../persistence.md).
- Hover, focus, tooltip, scroll, drag ghost, cursor blink,
  animation frame, and pulse phase are excluded from replay.
- Replays consume the upstream caller's schema command log; this
  screen contributes no replay record.

### Validation And Fallback

- The panel mounts only when `state.ui.creatureInfo.creatureId`
  resolves to a record in `registries.creatures.byId`; otherwise it
  fails loudly per [`fail-loud.md`](../../../fail-loud.md) before
  any control becomes enabled.
- `selectors.creatures.stackStatModifiers` requires
  `state.ui.creatureInfo.stackContext` to be a valid discriminator;
  missing or unknown values fail loudly.
- Missing presentation assets fall back through the asset resolver
  per [`asset-loading.md`](../../../asset-loading.md).
- Missing gameplay records, invalid commands, and unresolved
  content IDs fail loudly before controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and token set match sibling [`spec.md`](./spec.md) State Bindings and [`interactions.md`](./interactions.md) Actions; the `state.ui.creatureInfo.*` write side is documented in [`58-week-month-popup/data-contracts.md`](../58-week-month-popup/data-contracts.md).
- **Schema: ✔** — Stat and ability field names track [`unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) (`attack`, `defense`, `hp`, `speed`, `shots`, `damageMin`, `damageMax`, `abilityIds`); `Unit`, `Ability`, `Effect` registered in [`schema-matrix.md`](../../../schema-matrix.md); no schema-command entry is required because all three tokens are local-ui.
- **Tasks: ✔** — UI screen owned by [`phase-2.07-ui-screen-backlog.50-creature-info-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/50-creature-info-screen.md); destination upgrade mutations owned by the `13-hill-fort` and `25-building-recruitment-dialog` screen packages; upstream caller writes covered by [`phase-2.07-ui-screen-backlog.58-week-month-popup-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/58-week-month-popup-screen.md).

## ⚠ Issues

- **Tokens were originally listed under "Commands And Events" as if dispatched commands.** Per [`screen-command-coverage.json`](../../../screen-command-coverage.json) `localUiPrefixes`, the `SHOW_` / `OPEN_` / `CLOSE_` prefixes are UI-local routing tokens, not schema commands. Now reclassified inline; same correction in sibling [`spec.md`](./spec.md) and [`interactions.md`](./interactions.md).
- **Schema field-name drift fixed inline.** Original binding used `registries.creatures.byId[creatureId].abilities`; [`unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) defines the field as `abilityIds`. Schema is canonical; rewrote bindings here and in sibling [`spec.md`](./spec.md) / [`interactions.md`](./interactions.md). No code change implied.
- **`state.ui.creatureInfo` slice path is screen-introduced and not yet declared in [`state-shape.md`](../../../state-shape.md).** The slice is transient (`state.ui.*`), so no [`data-inventory.md`](../../../data-inventory.md) row is required, but its shape (`{ creatureId: string \| null, stackContext: "hero" \| "combat" \| "dwelling" \| "reward" \| "calendar" }`) should be documented by the owning UI task. Skill did not add the entry itself (Hard Prohibition D).
