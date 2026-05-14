# Screen 17: Adventure Spell Targeting

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure-map targeting overlay for map spells (Town Portal,
Dimension Door, Fly, Water Walk, View Air, View Earth). Mounts on
top of `07-adventure-map` after `47-spell-book` dispatches
`BEGIN_SPELL_TARGETING`; exits back to the adventure map, to
`16-view-world`, or back to the spell book.

### Visual Direction
- Curation status: `curated-pass-3`.
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as
  implementation input.

### Visual Contract
- Adventure map darkens under a spell banner; legal target tiles
  glow blue/gold, illegal targets mark red, and the cursor/status
  line switches to targeting mode.
- Dense classic-fantasy strategy UI: fixed 800×600 layout, ornate
  gold frame, red/brown/stone panels, compact icon slots,
  right-click detail affordances, bottom status/resource feedback.
- `mockup.html` carries visible UI only; logic, transitions, and
  copy live in the Markdown files of this package.

### Component Tree
- `AdventureSpellTargeting`
  - `SpellBanner` — spell name, mastery, mana cost, instruction line
  - `LegalTargetOverlay` — pulsing markers on legal tiles/objects
  - `InvalidTargetMarkers` — red markers on illegal targets
  - `ManaCostPanel` — current vs. required mana readout
  - `CancelButton` — discard target draft (`advSpell.cancel`)

The underlying `MapViewport`, `FogMask`, `RightCommandPanel`, and
`ResourceDateBar` chrome belong to screen 07 and are not owned
here.

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `selectedSpell` | `state.ui.spellTargeting.spellId` | Spell chosen from spell book or command panel. |
| `casterHero` | `state.adventure.selectedHeroId` | Hero paying mana and receiving outcome. |
| `legalTargets` | `selectors.spells.adventureLegalTargets` | Tiles/objects/towns legal for this spell. |
| `mana` | `state.heroes.byId[caster].mana` | Current mana and cost guard. |
| `targetDraft` | `state.ui.spellTargeting.hoverTarget` | Local hover/selected target. |

`state.ui.spellTargeting.*` is a non-persisted local-UI draft slice
(see [`data-inventory.md`](../../../data-inventory.md) § scope:
hover / draft / selected). Mana is mutated by the engine reducer
through `CAST_ADVENTURE_SPELL` only.

### Mechanics Mapping
- Target legality checks spell scope, terrain, hero skills, mana,
  daily cast limits, town ownership, object blocks, and movement
  rules before command dispatch (see
  [`interactions.md`](./interactions.md) for the per-control
  routing).
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas; never
  hardcoded view logic.

### Animation Contract
- Legal tiles pulse, cursor rune rotates, invalid targets flash
  red, an accepted cast draws a magic trail and then resolves
  camera/hero movement.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes via static
  highlights plus localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  package's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions cover every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file holds screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema / config / localization / asset /
  sound / VFX / save / replay fields required to implement the
  screen.

### AI Implementation Notes
- Slug `adventure-spell-targeting`; system group `adventure`;
  curation marker `curated-pass-3`.
- Resolve presentation through asset IDs / manifests; deterministic
  gameplay commands use stable IDs and scalar values only.
- Build runtime components from this package; never from
  third-party captures or external product pixels.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree (`SpellBanner`, `LegalTargetOverlay`,
  `InvalidTargetMarkers`, `ManaCostPanel`, `CancelButton`) matches
  the overlay regions in [`mockup.html`](./mockup.html); the
  underlying map chrome is correctly attributed to screen 07. See
  sibling [`interactions.md`](./interactions.md) §Actions —
  aligned, and [`architecture.md`](./architecture.md) §Visual
  Composition — aligned.
- **Schema: ✔** — Bound spells/targeting resolve through
  [`spell.schema.json`](../../../../../content-schema/schemas/spell.schema.json)
  and
  [`targeting.schema.json`](../../../../../content-schema/schemas/targeting.schema.json);
  full schema list lives in
  [`data-contracts.md`](./data-contracts.md) — aligned.
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.17-adventure-spell-targeting-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/17-adventure-spell-targeting-screen.md)
  Reads First all five package files; engine work for adventure
  spells is upstream
  (`phase-2.01-spells-artifacts.03-adventure-map-spells`).

## ⚠ Issues

- **`ManaCostPanel` is named as a discrete region but the mockup
  folds cost into `SpellBanner`.**
  [`mockup.html`](./mockup.html) renders the banner string
  `Town Portal - Expert Earth - Cost 16` — there is no separate
  cost panel; the right-side `Mana 25/25` readout belongs to
  screen 07's `RightCommandPanel`. Either the mockup needs a
  dedicated mana panel or this component should be folded into
  `SpellBanner`. Owner: the owning UI task
  [`phase-2.07-ui-screen-backlog.17-adventure-spell-targeting-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/17-adventure-spell-targeting-screen.md);
  the mockup is not editable by this audit (skill § 9 prohibition
  D).
