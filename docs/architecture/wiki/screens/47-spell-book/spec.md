# Screen 47: Spell Book

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Open-spellbook view for the selected hero: school tabs, two-page
spell grid, known / disabled spell states, mastery-derived details,
mana cost, and cast / close controls. Entered from
`46-hero-screen` (or the previous caller); exits to
`17-adventure-spell-targeting` or `44-combat-spell-targeting` on
cast, or back to the caller on close.

### Visual Direction
- Curation status: `anchor-v1`.
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as
  implementation input.

### Visual Contract
- Open parchment book centered on a darkened backdrop with side
  tabs for spell schools, left / right pages of spell-icon slots,
  a selected-spell detail panel, a mana / mastery readout, and
  brass Cast / Close buttons.
- Dense classic-fantasy strategy UI: fixed 800 × 600 layout,
  ornate gold frame, red / brown / stone panels, compact icon
  slots, right-click detail affordances, bottom status / resource
  feedback.
- [`mockup.html`](./mockup.html) carries visible UI only; logic,
  transitions, and copy live in the Markdown files of this
  package.

### Component Tree
- `SpellBookScreen`
  - `BookBackdrop` — darkened parchment / shadow behind the book
  - `SchoolTabs` — left-rail school filter (All + per-school)
  - `LeftPageSpellGrid` — left-page spell icon slots
  - `RightPageSpellGrid` — right-page spell icon slots
  - `SelectedSpellDetails` — name, school, cost, target hint
  - `ManaFooter` — current mana plus wisdom / mastery line
  - `CastCloseButtons` — Cast (routes to targeting) and Close
    (returns to caller)

The `ResourceDateBar` in [`mockup.html`](./mockup.html) is shared
adventure-shell chrome (see [`19-status-bar`](../19-status-bar/));
it is not owned by this screen.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `hero.spells` | `state.heroes.byId[selected].knownSpells` | Known spell IDs. |
| `spellbook.school` | `state.ui.spellbook.selectedSchool` | Local school filter. |
| `selectedSpell` | `state.ui.spellbook.selectedSpellId` | Local selected spell. |
| `mana` | `state.heroes.byId[selected].mana` | Current and max spell points. |
| `castContext` | `state.ui.spellbook.castContext` | `adventure` or `combat`; gates the cast control. |

`state.ui.spellbook.*` is a non-persisted local-UI draft slice
(school filter, selected-spell highlight, cast-context route key);
it never enters saves or the deterministic command log.
`state.heroes.*` is save-borne gameplay state mutated only by the
engine reducer (e.g. `SPELL_CAST` downstream).

### Mechanics Mapping
- Known spell list, school filter, wisdom / mastery gating,
  adventure / combat scope, mana cost, and target mode together
  decide whether Cast routes to targeting or stays disabled
  (per-control routing in
  [`interactions.md`](./interactions.md) § Actions).
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas; never
  hardcoded view logic.

### Animation Contract
- Book opens with page lift, school tabs flip pages, selected
  spell glows, disabled spell icons desaturate, Cast transitions
  into the targeting overlay.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes through
  static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  package's internal visual direction.
- Spec lists every visible region and the authoritative state
  bindings.
- Interactions cover every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file holds screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema / config / localization / asset /
  sound / VFX / save / replay fields required to implement the
  screen.

### AI Implementation Notes
- Slug `spell-book`; system group `hero`; curation marker
  `anchor-v1`.
- Resolve presentation through asset IDs / manifests; deterministic
  gameplay commands use stable IDs and scalar values only.
- Build runtime components from this package; never from
  third-party captures or external product pixels.

---

## 🔍 Sync Check

- **UI: ⚠** — Component tree (`BookBackdrop`, `SchoolTabs`,
  `LeftPageSpellGrid`, `RightPageSpellGrid`,
  `SelectedSpellDetails`, `ManaFooter`, `CastCloseButtons`)
  matches [`mockup.html`](./mockup.html) `data-component` /
  `data-action` attributes and the diagrams in sibling
  [`architecture.md`](./architecture.md) § Visual Composition. The
  mockup has no visible page-turn affordance — see
  `## ⚠ Issues` and sibling
  [`interactions.md`](./interactions.md) § Issues.
- **Schema: ✔** — Bindings reference `hero.schema.json`
  (`knownSpells`, `mana`),
  [`spell.schema.json`](../../../../../content-schema/schemas/spell.schema.json),
  [`skill.schema.json`](../../../../../content-schema/schemas/skill.schema.json)
  (wisdom / mastery), and
  [`targeting.schema.json`](../../../../../content-schema/schemas/targeting.schema.json);
  full schema list lives in
  [`data-contracts.md`](./data-contracts.md) § Content Schemas And
  Registries — aligned. `state.heroes.*` is save-borne; no
  [`data-inventory.md`](../../../data-inventory.md) row required.
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.47-spell-book-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/47-spell-book-screen.md)
  Reads First all five package files; engine prerequisites
  (`phase-2.01-spells-artifacts.01b-spell-school-loader-plus-mastery-scaling`,
  `phase-2.01-spells-artifacts.08-spell-casting-in-combat-ui`)
  appear in that task's Dependencies.

## ⚠ Issues

- **`SchoolTabs` enumeration is not constrained by the spec.**
  [`mockup.html`](./mockup.html) renders five tabs (`All`, `Air`,
  `Earth`, `Fire`, `Water`); the spec leaves the school set
  open-ended so any pack-defined school resolves through
  `spell.schema.json`. This is intentional but worth flagging
  because the layout in the mockup assumes ≤ 5 tabs vertically.
  Owner:
  [`phase-2.07-ui-screen-backlog.47-spell-book-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/47-spell-book-screen.md)
  should decide whether to scroll, paginate, or truncate when a
  pack contributes additional schools.
