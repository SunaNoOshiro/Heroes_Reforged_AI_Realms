# Screen 53: University — Data Contracts

This file lists every schema, registry, selector, command, config,
localization key, and asset / sound / VFX / save / replay reference
the University screen consumes.

### Screen Package
- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Interactions: [`interactions.md`](./interactions.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants and formulas consumed by `LEARN_UNIVERSITY_SKILL` validation. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `hero.schema.json` | Visiting-hero identity, primary stats, secondary skills, spellbook, equipment, ownership selectors. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `skill.schema.json` | Secondary skill records, mastery tiers (`basic`/`advanced`/`expert`), and hero skill-grid input. | [`content-schema/schemas/skill.schema.json`](../../../../../content-schema/schemas/skill.schema.json) |
| `condition.schema.json` | Declarative availability rules for the offer table. | [`content-schema/schemas/condition.schema.json`](../../../../../content-schema/schemas/condition.schema.json) |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, and affordability checks. | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `command.schema.json` | `learnUniversitySkill` envelope; the only reducer-backed command on this screen. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |
| Runtime registries | Heroes, map objects, skills, and content-pack manifests resolved at load. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `universityId` | `state.ui.university.sourceId` | Visited adventure-map university or town-bound source object. |
| `offeredSkills` | `state.mapObjects.byId[universityId].offeredSkills` | Skill offer IDs for this source. |
| `heroSkills` | `state.heroes.byId[selected].skills` | Current hero secondary-skill set, read-only. |
| `selectedSkill` | `state.ui.university.selectedSkillId` | Local UI draft; never persisted. |
| `learnGuard` | `selectors.heroes.universityLearnGuard` | Aggregate legality + affordability selector. |

### Commands And Events
| Action ID (UI) | Token | Class | Schema reference |
| --- | --- | --- | --- |
| `university.selectSkill` | `SELECT_UNIVERSITY_SKILL` | `local-ui` (prefix `SELECT_` per [`screen-command-coverage.json`](../../../screen-command-coverage.json)) | — (UI-draft only) |
| `university.learn` | `LEARN_UNIVERSITY_SKILL` | `command` (reducer) | [`command.schema.json#/$defs/learnUniversitySkill`](../../../../../content-schema/schemas/command.schema.json) — required `kind`, `heroId`, `universityId`, `skillId`, `metadata` |
| `university.close` | `CLOSE_UNIVERSITY` | `local-ui` (prefix `CLOSE_`); routes to [`07-adventure-map`](../07-adventure-map/) or [`24-town-screen`](../24-town-screen/) | — |

Only `LEARN_UNIVERSITY_SKILL` is in the deterministic command log;
the other two tokens are UI-only and never enter
`command-envelope.schema.json`.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.university.title`
- `ui.university.actions.*`
- `ui.university.status.*`
- `ui.university.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`
- `error.dispatcher.rejected.body` (per sibling
  [`interactions.md` § Error surfaces](./interactions.md#error-surfaces))

### Asset, Sound, And VFX IDs
- `ui.university.background`
- `ui.university.frame`
- `ui.university.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.university.*`

### Save And Replay Fields
- The only persistent mutation is `LEARN_UNIVERSITY_SKILL`; replay
  reproduces it from the command log using stable IDs (`heroId`,
  `universityId`, `skillId`) only.
- Hover, focus, tooltip, the selected-skill draft, scroll, drag
  ghost, cursor blink, and animation frame are transient — never
  persisted or replayed.
- Replays carry stable IDs and scalar payloads — never raw asset
  paths, localized strings, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- `LEARN_UNIVERSITY_SKILL` validates hero ownership, an open or
  upgradeable secondary-skill slot, the offered skill record, the
  max skill count, current mastery, the price, and player gold (per
  engine task
  [`phase-2.01-spells-artifacts.12-learn-university-skill-command`](../../../../../tasks/phase-2/01-spells-artifacts/12-learn-university-skill-command.md)).
- Missing presentation assets fall back through the asset resolver
  per [`asset-policy.md`](../../../asset-policy.md).
- Missing gameplay records, invalid commands, and unresolved
  content IDs fail loudly per
  [`fail-loud.md`](../../../fail-loud.md) before `LEARN` becomes
  enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs, tokens, and localization namespaces match
  sibling [`interactions.md`](./interactions.md) § Actions and the
  `data-action` attributes in `mockup.html`
  (`university.learn`, `university.close`); the localized error key
  matches sibling
  [`interactions.md`](./interactions.md) § Error surfaces.
- **Schema: ⚠** — `learnUniversitySkill` is defined in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  (line 1256) with required keys
  `kind, heroId, universityId, skillId, metadata`. Canonical
  `university-skill-table.schema.json` named by the content task is
  not yet on disk — see sibling [`spec.md ⚠ Issues`](./spec.md#-issues).
- **Tasks: ⚠** — UI owner
  [`phase-2.07-ui-screen-backlog.53-university-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/53-university-screen.md)
  Reads First this file. Engine reducer owner
  [`phase-2.01-spells-artifacts.12-learn-university-skill-command`](../../../../../tasks/phase-2/01-spells-artifacts/12-learn-university-skill-command.md)
  emits the schema-backed `LEARN_UNIVERSITY_SKILL` row above; content
  schema task
  [`mvp.02-content-schemas.20-university-skill-table`](../../../../../tasks/mvp/02-content-schemas/20-university-skill-table.md)
  owns the offer-table schema referenced in `## ⚠ Issues`.

## ⚠ Issues

- **`university-skill-table.schema.json` missing on disk (mirror).**
  Sibling [`spec.md ⚠ Issues`](./spec.md#-issues) carries the
  canonical description. The schema table above currently sources
  offers through `skill.schema.json` as a working stand-in; add a
  `university-skill-table.schema.json` row pointing at
  [`content-schema/schemas/`](../../../../../content-schema/schemas/)
  once
  [`mvp.02-content-schemas.20-university-skill-table`](../../../../../tasks/mvp/02-content-schemas/20-university-skill-table.md)
  lands the file. Skill did not create the schema (Hard
  Prohibition D).
- **State-path projections not in `AdventureState` (mirror).** The
  five rows in § Runtime State Selectors reference projections
  (`state.mapObjects.byId[universityId]`, `state.ui.university.*`,
  `state.heroes.byId[selected].skills`,
  `selectors.heroes.universityLearnGuard`) that the strategic state
  model does not yet expose. Owner:
  [`mvp.05-adventure-map.01-strategic-game-state-model`](../../../../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md)
  or a sibling UI-selector task. Full detail in sibling
  [`spec.md ⚠ Issues`](./spec.md#-issues).
