# Screen 65: Map Editor
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
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | `content-schema/schemas/ruleset.schema.json` |
| `scenario.schema.json` | Scenario setup, starting state, victory/loss conditions, and save/load metadata. | `content-schema/schemas/scenario.schema.json` |
| `world.schema.json` | World terrain, biome, underground, generator, and map setup records. | `content-schema/schemas/world.schema.json` |
| `map-object.schema.json` | Map object categories, interaction prompts, rewards, placement rules, and visit outcomes. | `content-schema/schemas/map-object.schema.json` |
| `adventure-building.schema.json` | Adventure-map structures, visit rules, ownership state, and map-facing economy bindings. | `content-schema/schemas/adventure-building.schema.json` |
| `neutral-stack-template.schema.json` | Neutral stack composition, guard encounters, creature bank defenders, rewards, and attitude. | `content-schema/schemas/neutral-stack-template.schema.json` |
| `unit.schema.json` | Unit stats, stacks, recruitment options, combat previews, upgrades, and army transfers. | `content-schema/schemas/unit.schema.json` |
| `building.schema.json` | Town buildings, construction requirements, dwellings, mage guilds, forts, shipyards, and grail structures. | `content-schema/schemas/building.schema.json` |
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment, and ownership selectors. | `content-schema/schemas/hero.schema.json` |
| `faction.schema.json` | Faction identity, town roster, hero/unit references, and player-facing faction metadata. | `content-schema/schemas/faction.schema.json` |
| `artifact.schema.json` | Artifact inventory, equipment slots, rewards, merchants, combinations, and tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| `spell.schema.json` | Spell catalog records, school/level metadata, mana costs, mastery scaling, and castability. | `content-schema/schemas/spell.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, and shell state loaded by the active content/runtime registries. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `editorDocument` | `state.editor.currentDocument` | Scenario draft document. |
| `selectedTool` | `state.editor.selectedTool` | One of: brush, object, erase, road, river, zone, properties. |
| `selectedLayer` | `state.editor.selectedLayer` | One of: surface, underground, objects, events, regions. |
| `selection` | `state.editor.selection` | Selected tile, object, or region. |
| `validationIssues` | `selectors.editor.validationIssues` | Schema and scenario rule issues. |

### Commands And Events
| Token | Action ID | Effect |
| --- | --- | --- |
| `SELECT_EDITOR_TOOL` | `editor.selectTool` | Changes active editing tool (local-ui draft). |
| `APPLY_EDITOR_BRUSH` | `editor.paintTile` | Mutates editor draft document. |
| `PLACE_EDITOR_OBJECT` | `editor.placeObject` | Adds object record with stable ID. |
| `VALIDATE_EDITOR_DOCUMENT` | `editor.validate` | Refreshes validation drawer (local-ui). |
| `SAVE_EDITOR_SCENARIO` | `editor.save` | Writes scenario draft after validation guard. |
| `OPEN_PUBLISH_DISCLAIMER` → `EXPORT_SCENARIO_AS_PACK` | `editor.publish` | Routes through screen 73 for the per-pack content-policy ack; on accept, writes a local `.hrmod`. |

See [`interactions.md`](./interactions.md) § Actions for the full
per-control row (next screen, animation cue, disabled cases).

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.map-editor.title`
- `ui.map-editor.actions.*`
- `ui.map-editor.status.*`
- `ui.map-editor.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.map-editor.background`
- `ui.map-editor.frame`
- `ui.map-editor.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.editor.*`
- `vfx.map-editor.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records **only when
  named by the owning system**. The editor's draft persistence
  contract is owned by
  [`phase-2.04-content-editor.08-map-editor-commands`](../../../../../tasks/phase-2/04-content-editor/08-map-editor-commands.md);
  the local `.hrmod` export contract is owned by
  [`phase-2.04-content-editor.10-publish-disclaimer-flow`](../../../../../tasks/phase-2/04-content-editor/10-publish-disclaimer-flow.md).
- Do **not** persist hover, focus, tooltip, scroll, drag ghost,
  cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- Edits scenario authoring data, **not** runtime gameplay state.
  Save validates schema records, stable IDs, object rules, starting
  positions, objectives, and asset references.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved
  content IDs fail loudly before controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selector list mirrors [`spec.md`](./spec.md) § State
  Bindings and the per-control rows in
  [`interactions.md`](./interactions.md) § Actions.
- **Schema: ✔** — Every listed schema file exists under
  `content-schema/schemas/` and is registered in
  [`schema-matrix.md`](../../../schema-matrix.md). `command.schema.json`
  is the canonical command surface; aliases and out-of-scope tokens
  resolve through
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ⚠** — Owning task
  [`phase-2.07-ui-screen-backlog.65-map-editor-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/65-map-editor-screen.md)
  reads this file; reducer-side
  [`08-map-editor-commands`](../../../../../tasks/phase-2/04-content-editor/08-map-editor-commands.md)
  defines a different command-token vocabulary (see
  `interactions.md` § ⚠ Issues). No data-inventory row exists for
  `state.editor.*` — see `## ⚠ Issues`.

## ⚠ Issues

- **No `state.editor.*` rows in `data-inventory.md`.** This screen
  binds five selectors under `state.editor.*` (`currentDocument`,
  `selectedTool`, `selectedLayer`, `selection`, `validationIssues`).
  [`data-inventory.md`](../../../data-inventory.md) contains zero
  rows whose path begins with `state.editor`. Per the CLAUDE.md root
  contract ("every persisted field is registered in
  `data-inventory.md`"), whichever of these slices is persisted
  (most likely `state.editor.currentDocument` as the scenario
  draft) needs a row before the slice can ship. Owning task:
  [`phase-2.04-content-editor.08-map-editor-commands`](../../../../../tasks/phase-2/04-content-editor/08-map-editor-commands.md).
  Suggested values: domain=`editor`, owner=
  `phase-2.04-content-editor.08-map-editor-commands`,
  persistence=`indexeddb`, retention=`draft`. Selectors that are
  pure UI state (`selectedTool`, `selectedLayer`, `selection`) stay
  outside the inventory per the original "UI-only … stay outside
  deterministic gameplay state" rule. Skill did not add the row
  itself (Hard Prohibition D).
