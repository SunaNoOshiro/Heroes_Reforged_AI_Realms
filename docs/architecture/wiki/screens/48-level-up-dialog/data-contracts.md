# Screen 48: Level Up Dialog
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `command.schema.json` | Reducer command payload for the confirm step. The `levelUp` alternative is the canonical `LEVEL_UP` command. | [`content-schema/schemas/command.schema.json` §`levelUp`](../../../../../content-schema/schemas/command.schema.json) |
| `event.schema.json` | `HERO_LEVEL_UP` event that seeds the modal (offers, primary-stat gain) before the UI opens. | [`content-schema/schemas/event.schema.json` §`HERO_LEVEL_UP`](../../../../../content-schema/schemas/event.schema.json) |
| `hero.schema.json` | Hero identity, primary stats, skill grid, and experience read by this screen. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `hero-class.schema.json` | Class growth weights (`primaryStatGrowth`) and level-up offer rules. | [`content-schema/schemas/hero-class.schema.json`](../../../../../content-schema/schemas/hero-class.schema.json) |
| `skill.schema.json` | Secondary-skill records, mastery tiers, and hero skill-grid entries. | [`content-schema/schemas/skill.schema.json`](../../../../../content-schema/schemas/skill.schema.json) |
| `ruleset.schema.json` | Deterministic constants and formulas (`heroLevelup.classWeights`, XP table) consumed by the reducer. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `modal-entry.schema.json` | Registers `48-level-up-dialog` in the modal stack `modalId` closed enum. | [`content-schema/schemas/modal-entry.schema.json` §`modalId`](../../../../../content-schema/schemas/modal-entry.schema.json) |
| `asset-index.schema.json` | Backgrounds, frames, icons, and animation manifests for the modal chrome. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `heroId` | `state.ui.levelUp.heroId` | Hero receiving the level. Seeded by `HERO_LEVEL_UP`. |
| `primaryGain` | `state.ui.levelUp.primaryStatGain` | Resolved deterministic stat gain (one of attack / defense / power / knowledge, +1). |
| `skillChoices` | `state.ui.levelUp.skillChoices` | The two legal secondary-skill offers. |
| `selectedChoice` | `state.ui.levelUp.selectedChoiceId` | Local UI draft; written by `selectLeft` / `selectRight`. |
| `experience` | `state.heroes.byId[heroId].experience` | XP bar value and next-level threshold. |

### Commands And Events
- **Local-ui** (do not enter the deterministic command log; matched
  by the `SELECT_` prefix in
  [`screen-command-coverage.json` §`localUiPrefixes`](../../../screen-command-coverage.json)):
  - `levelUp.selectLeft` → `SELECT_LEVEL_UP_CHOICE` (sets
    `selectedChoiceId` to the left offer).
  - `levelUp.selectRight` → `SELECT_LEVEL_UP_CHOICE` (sets
    `selectedChoiceId` to the right offer).
- **Command** (enters the command log via the shared dispatch hook):
  - `levelUp.confirm` → `APPLY_HERO_LEVEL_UP`, an alias of canonical
    `LEVEL_UP` per
    [`screen-command-coverage.json` §`commandAliases`](../../../screen-command-coverage.json).
    Payload (per
    [`command.schema.json` §`levelUp`](../../../../../content-schema/schemas/command.schema.json)):
    `{ kind: "LEVEL_UP", heroId, newLevel ≥ 2, newPrimaryStats,
    metadata }`.
- **Upstream event:** `HERO_LEVEL_UP` per
  [`event.schema.json`](../../../../../content-schema/schemas/event.schema.json)
  opens the modal and seeds `state.ui.levelUp.*`.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.level-up-dialog.title`
- `ui.level-up-dialog.actions.*`
- `ui.level-up-dialog.status.*`
- `ui.level-up-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`
- Error strings: `error.dispatcher.rejected.body` (default per
  [`error-ux.md` § 2](../../../error-ux.md#2-code--surface-mapping)).

### Asset, Sound, And VFX IDs
- `ui.level-up-dialog.background`
- `ui.level-up-dialog.frame`
- `ui.level-up-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.level-up-dialog.*` (XP fill, primary-stat gem flash, skill-
  card slide-in, selected-card stamp; reduced-motion fallback uses
  static highlights).

### Save And Replay Fields
- The dispatcher persists the `LEVEL_UP` command (heroId, newLevel,
  newPrimaryStats) and the resulting hero record. No raw paths,
  localized labels, rendered positions, or wall-clock timestamps
  enter the log.
- `state.ui.levelUp.*` is **transient UI draft** and is not
  persisted; it is cleared when the modal closes.
- Hover, focus, tooltip, scroll, drag ghost, cursor blink, and
  animation-frame state stay outside saves.

### Validation And Fallback
- The two skill choices are produced deterministically from hero
  class, existing skills, ruleset weights, seed state, and per-skill
  max-mastery limits; selecting a card commits exactly one level
  result.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before controls enable, per the project root
  contract on
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Selectors, commands, and copy keys match sibling
  `spec.md` State Bindings and `interactions.md` Actions table; the
  modal id `48-level-up-dialog` matches
  [`modal-entry.schema.json` §`modalId`](../../../../../content-schema/schemas/modal-entry.schema.json).
- **Schema: ✔** — `LEVEL_UP` command shape matches
  [`command.schema.json` §`levelUp`](../../../../../content-schema/schemas/command.schema.json)
  (heroId, newLevel ≥ 2, newPrimaryStats, metadata); `HERO_LEVEL_UP`
  event matches
  [`event.schema.json`](../../../../../content-schema/schemas/event.schema.json);
  class weighting is owned by
  [`hero-class.schema.json` §`primaryStatGrowth`](../../../../../content-schema/schemas/hero-class.schema.json).
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.48-level-up-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/48-level-up-dialog-screen.md).
  Engine-side: `LEVEL_UP` command + growth weights owned by
  [`phase-2.01-spells-artifacts.00-hero-leveling`](../../../../../tasks/phase-2/01-spells-artifacts/00-hero-leveling.md);
  the two-offer rule is owned by
  [`phase-2.01-spells-artifacts.09-leveling-up-hero-gains-skills-and-stats`](../../../../../tasks/phase-2/01-spells-artifacts/09-leveling-up-hero-gains-skills-and-stats.md).

## ⚠ Issues

- **`LEVEL_UP` payload omits the chosen secondary skill.** The
  canonical schema in
  [`command.schema.json` §`levelUp`](../../../../../content-schema/schemas/command.schema.json)
  carries `{ heroId, newLevel, newPrimaryStats }` only; the selected
  skill must be applied by a separate command (`ASSIGN_SKILL` is
  defined adjacent in the same schema). Sibling `interactions.md`
  describes the confirm step as atomic. Implementer must either
  (a) dispatch both `LEVEL_UP` and `ASSIGN_SKILL` in one queued
  envelope, or (b) extend the `levelUp` payload with an optional
  `secondarySkillChoiceId`. Per CLAUDE.md ("Stable IDs are public
  API") the schema, not the doc, is canonical. Owner:
  [`phase-2.01-spells-artifacts.00-hero-leveling`](../../../../../tasks/phase-2/01-spells-artifacts/00-hero-leveling.md)
  (command definition) and
  [`phase-2.01-spells-artifacts.09-leveling-up-hero-gains-skills-and-stats`](../../../../../tasks/phase-2/01-spells-artifacts/09-leveling-up-hero-gains-skills-and-stats.md)
  (skill-application rule). Skill did not edit the schema (Hard
  Prohibition D).
