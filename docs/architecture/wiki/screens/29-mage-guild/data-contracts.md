# Screen 29: Mage Guild — Data Contracts

This file lists every schema, registry, selector, command, config,
localization key, and asset/sound/VFX/save/replay reference the Mage
Guild screen consumes.

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
| `ruleset.schema.json` | Deterministic constants and formulas consumed by `LEARN_SPELL` validation. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `hero.schema.json` | Visiting-hero identity, primary stats, secondary skills, spellbook. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `building.schema.json` | Town buildings — used to derive `mageGuildLevel`. | [`content-schema/schemas/building.schema.json`](../../../../../content-schema/schemas/building.schema.json) |
| `spell.schema.json` | Spell records — `school`, `level`, `manaCost`, `targeting`, `masteryTiers`. | [`content-schema/schemas/spell.schema.json`](../../../../../content-schema/schemas/spell.schema.json) |
| `effect.schema.json` | Effects embedded by `spell.masteryTiers`. | [`content-schema/schemas/effect.schema.json`](../../../../../content-schema/schemas/effect.schema.json) |
| `targeting.schema.json` | Spell targeting metadata (referenced by spell records). | [`content-schema/schemas/targeting.schema.json`](../../../../../content-schema/schemas/targeting.schema.json) |
| `skill.schema.json` | Wisdom secondary-skill record (mastery tier source). | [`content-schema/schemas/skill.schema.json`](../../../../../content-schema/schemas/skill.schema.json) |
| `command.schema.json` | `LEARN_SPELL` payload + dispatcher envelope. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |
| Runtime registries | Heroes, towns, spells, and content-pack manifests resolved at load. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `town.mageGuildLevel` | `state.towns.byId[selected].mageGuildLevel` | Highest enabled shelf for the selected town. |
| `guildSpells` | `state.towns.byId[selected].mageGuildSpells` | Spell IDs per shelf level (level → index). |
| `visitingHero` | `state.adventure.visitingHeroId` | Hero authorized to learn at this guild. |
| `hero.knownSpells` | `state.heroes.byId[visiting].knownSpells` | Drives known-spell markers and duplicate guard. |
| `hero.wisdom` | `state.heroes.byId[visiting].skills.wisdom` | Eligibility input for higher-shelf icons. See `## ⚠ Issues`. |

### Commands And Events
- `SELECT_GUILD_SPELL` from `mageGuild.selectSpell` — UI-local
  (covered by the `SELECT_` prefix in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json));
  updates the selected-spell draft only.
- `LEARN_SPELL` from `mageGuild.learnSpell` — schema-backed; payload
  `{ heroId, townId, spellId }`; routed through the shared command
  hook. See
  [`command-schema.md` § `LEARN_SPELL`](../../../command-schema.md#learn_spell).
- `CLOSE_MAGE_GUILD` from `mageGuild.close` — UI-local (covered by
  the `CLOSE_` prefix); returns to
  [`24-town-screen`](../24-town-screen/).

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.mage-guild.title`
- `ui.mage-guild.actions.*`
- `ui.mage-guild.status.*`
- `ui.mage-guild.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`
- `error.dispatcher.rejected.body` (see
  [`interactions.md` § Error surfaces](./interactions.md#error-surfaces))

### Asset, Sound, And VFX IDs
- `ui.mage-guild.background`
- `ui.mage-guild.frame`
- `ui.mage-guild.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.mage-guild.*`

### Save And Replay Fields
- The only persistent mutation is `LEARN_SPELL`; replay reproduces it
  from the command log using stable IDs (`heroId`, `townId`,
  `spellId`) only.
- Hover, focus, tooltip, selected-spell draft, scroll, drag ghost,
  cursor blink, and animation frame are transient — never persisted
  or replayed.
- Replays never carry raw asset paths, localized labels, rendered
  positions, or wall-clock timestamps.

### Validation And Fallback
- `LEARN_SPELL` validates: hero is in the town, town mage guild
  reaches the spell's level, Wisdom-mastery gate met for that level,
  spell not already known, spell-registry scope. See
  [`command-schema.md` § `LEARN_SPELL`](../../../command-schema.md#learn_spell).
- Missing presentation may fall back through the asset resolver per
  [`asset-policy.md`](../../../asset-policy.md).
- Missing gameplay records, invalid command payloads, and unresolved
  content IDs fail loudly before controls become enabled, per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Selectors, command tokens, and localization namespaces
  match sibling [`spec.md`](./spec.md) and
  [`interactions.md`](./interactions.md); the localized error key
  matches the [`interactions.md`](./interactions.md) Error-surfaces
  table.
- **Schema: ⚠** — `spell.schema.json` (`school`, `level` 1–5,
  `manaCost`, `targeting`, `masteryTiers`) and
  `building.schema.json` (mage-guild building family) match the
  references above. `LEARN_SPELL` payload matches
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
  Drift: per [`spells-and-mage-guild.md` § 6](../../../spells-and-mage-guild.md#6-learning-a-spell)
  and [`command-schema.md` § `LEARN_SPELL`](../../../command-schema.md#learn_spell)
  the gate field is **Knowledge**; this screen package consistently
  uses **Wisdom**. Detail in `## ⚠ Issues`.
- **Tasks: ⚠** — Owning task
  [`phase-2/07-ui-screen-backlog/29-mage-guild-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/29-mage-guild-screen.md)
  Reads First this file. Several selectors above target slices the
  [strategic-state-model task](../../../../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md)
  has not yet exposed (no `Town.mageGuildLevel`, no top-level
  `state.adventure.visitingHeroId`, no `Hero.knownSpells`, no
  `Hero.skills.wisdom`). See `## ⚠ Issues`.

## ⚠ Issues

- **Wisdom vs Knowledge gate (mirror).** Sibling
  [`spec.md ⚠ Issues`](./spec.md#-issues) carries the canonical
  description. This file's selector row `hero.wisdom →
  state.heroes.byId[visiting].skills.wisdom` follows the screen
  package; alignment must come from the MVP task
  [`mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild`](../../../../../tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md).
- **Selectors not in `AdventureState` (mirror).** The four
  unresolved selectors (`mageGuildLevel`,
  `state.adventure.visitingHeroId`, `hero.knownSpells`,
  `hero.skills.wisdom`) need either a schema/state-model addition or
  a documented UI-selector adapter. Owner: the
  [strategic-state-model task](../../../../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md)
  or the UI screen task. Full detail in
  [`spec.md ⚠ Issues`](./spec.md#-issues).
