# Screen 47: Spell Book
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
| `hero.schema.json` | Hero identity, `knownSpells`, `mana`, secondary skills (wisdom). | `content-schema/schemas/hero.schema.json` |
| `spell.schema.json` | Spell catalog records: school, level, mana cost, mastery scaling, targeting, castability. | `content-schema/schemas/spell.schema.json` |
| `effect.schema.json` | Closed effect records embedded by spells (for tooltip preview only). | `content-schema/schemas/effect.schema.json` |
| `targeting.schema.json` | Targeting modes and legal-target shapes used to compute Cast enablement. | `content-schema/schemas/targeting.schema.json` |
| `target-scope.schema.json` | Runtime target-scope records consumed by spell previews. | `content-schema/schemas/target-scope.schema.json` |
| `skill.schema.json` | Wisdom / mastery tiers that gate spell knowledge and scaling. | `content-schema/schemas/skill.schema.json` |
| `command.schema.json` | Reference only — this screen dispatches no reducer commands; downstream targeting overlays dispatch `SPELL_CAST`. | `content-schema/schemas/command.schema.json` |
| Runtime registries | Spell, hero, and skill records resolved through the pack runtime. | Loaded content / runtime registries. |

### Runtime State Selectors
`state.ui.spellbook.*` is a non-persisted local-UI draft slice
(school filter, selected-spell highlight, cast-context route key);
it never enters saves or the deterministic command log.
`state.heroes.*` is save-borne gameplay state managed by the
engine reducer; per
[`data-inventory.md`](../../../data-inventory.md) it is not a
privacy-tracked slice and needs no row there.

| UI Element | Selector | Notes |
| --- | --- | --- |
| `hero.spells` | `state.heroes.byId[selected].knownSpells` | Known spell IDs. |
| `spellbook.school` | `state.ui.spellbook.selectedSchool` | Local school filter. |
| `selectedSpell` | `state.ui.spellbook.selectedSpellId` | Local selected spell. |
| `mana` | `state.heroes.byId[selected].mana` | Current and max spell points. |
| `castContext` | `state.ui.spellbook.castContext` | `adventure` or `combat`; gates Cast enablement. |

### Commands And Events
All five tokens dispatched from this screen are UI-local per
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
(matched by the `SELECT_`, `TURN_`, `BEGIN_`, and `CLOSE_`
prefixes). None enters the deterministic command log; the
reducer-backed `SPELL_CAST` is dispatched downstream by
`17-adventure-spell-targeting` or `44-combat-spell-targeting`.

- `SELECT_SPELL_SCHOOL_TAB` from `spellbook.selectSchool` —
  UI-local; changes the school filter.
- `TURN_SPELLBOOK_PAGE` from `spellbook.turnPage` — UI-local;
  changes the page index (see Issues — no mockup affordance).
- `SELECT_SPELL` from `spellbook.selectSpell` — UI-local;
  updates `SelectedSpellDetails` and the Cast enabled state.
- `BEGIN_SPELL_TARGETING` from `spellbook.cast` — UI-local;
  routes to the matching targeting overlay with the targeting
  draft seeded.
- `CLOSE_SPELLBOOK` from `spellbook.close` — UI-local; returns
  to the owning caller.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.spell-book.title`
- `ui.spell-book.actions.*`
- `ui.spell-book.status.*`
- `ui.spell-book.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.spell-book.background`
- `ui.spell-book.frame`
- `ui.spell-book.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.spell-book.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records,
  content hashes, command inputs, and explicit draft records
  only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost,
  cursor blink, animation frame, or transient visual effects —
  this includes the `state.ui.spellbook.*` slice this screen
  draws from.
- Replays use stable IDs and scalar command inputs; never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- Cast enablement depends on: spell present in
  `hero.knownSpells`, wisdom / mastery tier permits the spell's
  level, `mana >= spell.manaCost`, `castContext` matches the
  spell's `scope`, and the spell's `targeting` mode has at least
  one legal target reachable from the active caller.
- Missing presentation assets may fall back through the asset
  resolver.
- Missing gameplay records, invalid commands, or unresolved
  content IDs fail loudly before controls become enabled (per
  [`fail-loud.md`](../../../fail-loud.md)).

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and action tokens match sibling
  [`spec.md`](./spec.md) § State Bindings and
  [`interactions.md`](./interactions.md) § Actions; the
  `data-action` attributes (`spellbook.selectSchool.*`,
  `spellbook.cast`, `spellbook.close`) in
  [`mockup.html`](./mockup.html) line up — aligned. Page-turn
  affordance gap is tracked in sibling
  [`interactions.md`](./interactions.md) § Issues.
- **Schema: ✔** — Every schema in the table exists at the cited
  path; `spell.schema.json` and `targeting.schema.json` carry the
  fields named in the Validation And Fallback rules.
  `command.schema.json` is referenced for downstream `SPELL_CAST`
  only; this screen has no rows to register in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  because every token falls under an existing UI-local prefix.
  `state.heroes.*` is save-borne; no
  [`data-inventory.md`](../../../data-inventory.md) row required.
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.47-spell-book-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/47-spell-book-screen.md)
  Reads First this file; engine prerequisites for spell catalog
  and combat casting are upstream
  (`phase-2.01-spells-artifacts.01b-spell-school-loader-plus-mastery-scaling`,
  `phase-2.01-spells-artifacts.08-spell-casting-in-combat-ui`).

## ⚠ Issues

_None._ See sibling [`interactions.md`](./interactions.md)
§ Issues for the `spellbook.turnPage` affordance gap and sibling
[`spec.md`](./spec.md) § Issues for the open-ended `SchoolTabs`
layout question; both also affect this file's Commands And Events
and Validation And Fallback sections and resolve when the package
siblings resolve.
