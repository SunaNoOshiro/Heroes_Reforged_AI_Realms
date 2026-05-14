# Screen 40: Pre-Battle Dialog
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment, and ownership selectors. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `unit.schema.json` | Unit stats, stack counts, recruitment options, and combat previews. | [`content-schema/schemas/unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) |
| `artifact.schema.json` | Artifact inventory and tooltip effects shown on hover. | [`content-schema/schemas/artifact.schema.json`](../../../../../content-schema/schemas/artifact.schema.json) |
| `neutral-stack-template.schema.json` | Neutral stack composition, guard encounters, creature-bank defenders, and attitude (when the defender is a neutral stack). | [`content-schema/schemas/neutral-stack-template.schema.json`](../../../../../content-schema/schemas/neutral-stack-template.schema.json) |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched by this screen. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |
| Screen-specific registries | Heroes, units, artifacts, stacks, map objects, terrain, and battles loaded by the content runtime. | Loaded content / runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `attacker` | `state.pendingBattle.attacker` | Attacking hero record plus army stacks. |
| `defender` | `state.pendingBattle.defender` | Defending hero, neutral stack template, or town garrison. |
| `terrain` | `state.pendingBattle.terrainId` | Battlefield terrain id from the terrain registry. |
| `tacticsAvailable` | `state.pendingBattle.tacticsAvailable` | `true` ⇒ Fight routes through `45-tactics-phase`. |
| `retreatAllowed` | `state.pendingBattle.retreatAllowed` | Retreat button guard. |

The `state.pendingBattle.*` slice is currently undocumented in
[`state-shape.md`](../../../state-shape.md) and
[`data-inventory.md`](../../../data-inventory.md); gap flagged in
`## ⚠ Issues`.

### Commands And Events
| Action ID | Token | Resolution |
| --- | --- | --- |
| `preBattle.fight` | `START_TACTICAL_BATTLE` | Alias of `INITIATE_BATTLE` per [`screen-command-coverage.json` § commandAliases](../../../screen-command-coverage.json). Creates deterministic battle state; the reducer routes to `45-tactics-phase` or `38-combat-screen`. |
| `preBattle.autoResolve` | `AUTO_RESOLVE_BATTLE` | Canonical `Command` kind in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json); runs deterministic auto-resolve and emits `BATTLE_RESOLVED`. |
| `preBattle.retreat` | `RETREAT_BEFORE_BATTLE` | Canonical `Command` kind; cancels the encounter when `retreatAllowed === true`. |
| `preBattle.inspectArmy` | `SELECT_PRE_BATTLE_STACK` | UI-local (matches `SELECT_` prefix in [`screen-command-coverage.json` § localUiPrefixes](../../../screen-command-coverage.json)); shows a stack-detail tooltip without entering the command log. |

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.pre-battle-dialog.title`
- `ui.pre-battle-dialog.actions.*` (`fight`, `auto`, `retreat`)
- `ui.pre-battle-dialog.status.*` (terrain id, tactics availability, retreat-allowed reason)
- `ui.pre-battle-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.pre-battle-dialog.background`
- `ui.pre-battle-dialog.frame`
- `ui.pre-battle-dialog.icons.*` (army slot, `VS` emblem, terrain badge)
- `audio.ui.hover`, `audio.ui.click`, `audio.battle.*`
- `vfx.pre-battle-dialog.*` (strength-bar fill, `VS` pulse, disabled-shake)

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when named
  by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays consume stable IDs and scalar command inputs only — never
  raw asset paths, localized labels, rendered positions, or
  wall-clock timestamps.

### Validation And Fallback
- Tactical combat initialises only after guard checks for encounter
  legality, army state, terrain, siege context, and optional
  tactics phase pass.
- Missing presentation assets may fall back through the resolver
  per [`asset-policy.md`](../../../asset-policy.md).
- Missing gameplay records, invalid commands, and unresolved
  content IDs fail loudly per [`fail-loud.md`](../../../fail-loud.md)
  before controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selector and command lists match sibling
  [`spec.md`](./spec.md) State Bindings and
  [`interactions.md`](./interactions.md) Actions exactly.
- **Schema: ❌** — `AUTO_RESOLVE_BATTLE` and `RETREAT_BEFORE_BATTLE`
  exist as canonical `Command` kinds in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json),
  and `START_TACTICAL_BATTLE` / `SELECT_PRE_BATTLE_STACK` are
  resolved by [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (alias and UI-local respectively). The five `state.pendingBattle.*`
  selectors, however, are not registered in
  [`state-shape.md`](../../../state-shape.md) or
  [`data-inventory.md`](../../../data-inventory.md). Detail in
  `## ⚠ Issues`.
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.40-pre-battle-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/40-pre-battle-dialog-screen.md)
  Reads First all four sibling files; dependencies on
  `mvp.05-adventure-map.06-auto-resolve-combat` and
  `mvp.09-tactical-combat.11-combat-hud-overlay` resolve via the
  task's `Dependencies` list.

## ⚠ Issues

- **`state.pendingBattle.*` slice not registered.** Same gap as
  sibling [`spec.md`](./spec.md) and
  [`interactions.md`](./interactions.md): the five
  `state.pendingBattle.*` selectors are not defined in
  [`state-shape.md`](../../../state-shape.md) or registered in
  [`data-inventory.md`](../../../data-inventory.md). Per CLAUDE.md
  ("every persisted field is registered in `data-inventory.md`"),
  [`phase-2.07-ui-screen-backlog.40-pre-battle-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/40-pre-battle-dialog-screen.md)
  must close the gap before this screen ships. Suggested values
  per the sibling spec's flag: `domain=battle`,
  `persistence=memory`, `retention=transient`. No edit made here
  per Hard Prohibition D.
