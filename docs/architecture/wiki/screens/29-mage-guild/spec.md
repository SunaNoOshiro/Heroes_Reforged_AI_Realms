# Screen 29: Mage Guild

System group: `town` · Screen slug: `mage-guild` · Curation: `curated-pass-2`

### Screen Package
- Mockup: [`mockup.html`](./mockup.html)
- Spec: `spec.md`
- Interactions: [`interactions.md`](./interactions.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Description
Spell-learning surface inside a town's Mage Guild. The visiting hero
inspects available spells per guild level, learns one that passes the
eligibility gate, then returns to the town screen.

### Visual Direction
Original internal UI contract. Do **not** use third-party captures,
copied franchise art, or external product pixels as implementation
input.

### Visual Contract
- Fixed 800 × 600 dialog over the dimmed town view; ornate gold
  outer frame, red/brown stone inner panels, classic fantasy-strategy
  density.
- Five vertical spell shelves (`L1`–`L5`) hold spell-icon slots.
  Shelves above the town's guild level render dark; eligible icons
  glow.
- Side plaque shows the visiting hero name, Wisdom mastery tier, and
  mana pool (mockup: `"Darkstorn — Expert Wisdom — Mana 20/20"`).
- Bottom status row carries selected-spell summary and known-state
  marker (mockup: `"Selected: Stone Skin. Already known: no."`).
- Two right-side buttons: `LEARN`, `CLOSE`.
- `mockup.html` carries visible UI only. Logic, transitions, timing,
  and asset hooks live in the four Markdown package files.

### Component Tree
- `MageGuildDialog`
  - `SpellLevelShelves` — five-column shelf chrome (L1–L5).
  - `SpellIconGrid` — per-shelf spell-icon slots.
  - `HeroEligibilityPlaque` — visiting hero, Wisdom tier, mana.
  - `KnownSpellMarkers` — overlay on icons the hero already knows.
  - `LearnCloseButtons` — `LEARN` and `CLOSE` actions.

### State Bindings
| UI binding | State path | Notes |
| --- | --- | --- |
| `town.mageGuildLevel` | `state.towns.byId[selected].mageGuildLevel` | Highest enabled shelf. |
| `guildSpells` | `state.towns.byId[selected].mageGuildSpells` | Per-shelf spell IDs. |
| `visitingHero` | `state.adventure.visitingHeroId` | Hero authorised to learn. |
| `hero.knownSpells` | `state.heroes.byId[visiting].knownSpells` | Drives known-spell markers and duplicate guard. |
| `hero.wisdom` | `state.heroes.byId[visiting].skills.wisdom` | Eligibility for higher shelves. See `## ⚠ Issues`. |

### Mechanics Mapping
- `LEARN_SPELL` validates town mage-guild level, hero presence in the
  town, the Wisdom-mastery gate for the spell's level, duplicate
  knowledge, and spell-registry scope. See
  [`command-schema.md` § `LEARN_SPELL`](../../../command-schema.md#learn_spell).
- Selection and close are UI-local drafts; only `LEARN_SPELL` enters
  the deterministic command log.
- Spells, buildings, hero records, and registries resolve through
  content schemas — never inline view logic.

### Animation Contract
- Selecting an eligible icon highlights the slot and surfaces its
  detail in the status row.
- `LEARN_SPELL` acceptance stamps the spell into the hero spellbook
  and marks the slot as known.
- Locked shelves stay dark; rejected learns keep the screen open and
  surface the dispatcher error inline.
- Reduced-motion mode preserves the state changes with static
  highlights and localized text feedback only; animation never
  decides gameplay outcomes.

### Acceptance Criteria
- Mockup is visually distinct from sibling screens and follows the
  internal visual direction above.
- This spec lists every visible region and its authoritative state
  binding.
- [`interactions.md`](./interactions.md) covers every primary
  control, next screen, state update, animation, disabled case, and
  error path.
- [`architecture.md`](./architecture.md) diagrams are screen-specific
  and do not invent behavior absent from this file or
  [`interactions.md`](./interactions.md).
- [`data-contracts.md`](./data-contracts.md) names every
  schema/config/localization/asset/audio/VFX/save/replay field
  required to implement the screen.

### AI Implementation Notes
- Build the React component from this package; do not infer layout
  from third-party captures or external product pixels.
- Resolve presentation through asset IDs and manifests; dispatch
  `LEARN_SPELL` through the shared command hook so the gate runs in
  the engine reducer, not in the view.
- UI-local tokens (`mageGuild.selectSpell`, `mageGuild.close`) stay
  in route/draft state.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, plaque copy, shelf count, and button
  set match [`mockup.html`](./mockup.html); sibling files
  [`interactions.md`](./interactions.md) and
  [`data-contracts.md`](./data-contracts.md) carry the same bindings
  and animation claims (aligned).
- **Schema: ⚠** — `LEARN_SPELL` payload `{ heroId, townId, spellId }`
  matches
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  and [`command-schema.md` § `LEARN_SPELL`](../../../command-schema.md#learn_spell);
  however the gate field name in this spec is `wisdom` while
  `command-schema.md` and
  [`spells-and-mage-guild.md` § 6](../../../spells-and-mage-guild.md#6-learning-a-spell)
  name `knowledge`. Detail in `## ⚠ Issues`.
- **Tasks: ⚠** — Owning task
  [`phase-2/07-ui-screen-backlog/29-mage-guild-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/29-mage-guild-screen.md)
  Reads First all four screen-package files. State-path bindings here
  reference selectors that the
  [strategic-state-model task](../../../../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md)
  does not yet expose (no `Town.mageGuildLevel`, no
  `state.adventure.visitingHeroId`, no `Hero.knownSpells`, no
  `Hero.skills.wisdom`). Detail in `## ⚠ Issues`.

## ⚠ Issues

- **Wisdom vs Knowledge gate.** This spec binds eligibility to
  `hero.wisdom` (`state.heroes.byId[visiting].skills.wisdom`).
  [`command-schema.md` § `LEARN_SPELL`](../../../command-schema.md#learn_spell)
  and
  [`spells-and-mage-guild.md` § 6](../../../spells-and-mage-guild.md#6-learning-a-spell)
  name **Knowledge** as the gate; Wisdom is the school-mastery
  secondary skill, and Knowledge is the mana-pool input. The drift
  is already flagged in
  [`spells-and-mage-guild.md ⚠ Issues`](../../../spells-and-mage-guild.md).
  Per Hard Prohibition A this audit does not silently swap one for
  the other. Owner: the MVP task
  [`mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild`](../../../../../tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md)
  must align the gate name across `command-schema.md`,
  `spells-and-mage-guild.md`, and this screen package.
- **`Town.mageGuildLevel` selector is not in `AdventureState`.**
  [`tasks/mvp/05-adventure-map/01-strategic-game-state-model.md`](../../../../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md)
  defines `Town.mageGuildSpells: SpellId[][]` but no
  `Town.mageGuildLevel`; guild level is derived from
  `Town.buildings[]`. The screen treats `mageGuildLevel` as a direct
  read. Owner: the state-model task (or a sibling UI-selector task)
  must expose `selectMageGuildLevel(town)` and update this binding.
- **`state.adventure.visitingHeroId` path does not exist.** The
  state model carries `Town.visitingHeroId: string | null` per town,
  not a top-level `state.adventure.visitingHeroId`. Owner: the
  state-model task must add the projection, or this spec and
  [`data-contracts.md`](./data-contracts.md) must rebind to
  `state.towns.byId[selected].visitingHeroId`.
- **`hero.knownSpells` vs `hero.spells`.**
  [`command-schema.md` § `LEARN_SPELL`](../../../command-schema.md#learn_spell)
  says the reducer "Adds spell to `hero.spells[]`". This screen names
  `state.heroes.byId[visiting].knownSpells`. Owner: the state-model
  task and `command-schema.md` must converge on one field name; the
  screen package and
  [`interactions.md`](./interactions.md) will follow.
- **`hero.skills.wisdom` projection is not in the hero record.** The
  state model stores `Hero.secondarySkills: SkillEntry[]`;
  [`hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json)
  has no `skills.wisdom` direct field. The screen requires a
  selector adapter (e.g. `selectHeroSkill(hero, "wisdom")`). Owner:
  the state-model task or the
  [UI screen task](../../../../../tasks/phase-2/07-ui-screen-backlog/29-mage-guild-screen.md)
  must define the projection before the binding can ship.
