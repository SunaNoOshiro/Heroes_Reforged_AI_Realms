# Screen 44: Combat Spell Targeting

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Targeting overlay raised over [`38-combat-screen`](../38-combat-screen/)
after the player picks a combat spell in
[`47-spell-book`](../47-spell-book/). Shows the selected spell, mana
cost, area-of-effect shape, legal hexes, immune targets, and
confirm/cancel controls.

### Visual Direction
Original internal UI contract. Do not use third-party captures, copied
franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- Fixed 800×600 layout, ornate gold frame, red/brown/stone panels.
- The active battlefield is darkened under luminous target hexes; a
  spell card across the top names the spell, school, mastery, and
  mana cost, with an instructional line ("Choose valid enemy area.
  Immune targets are marked red.").
- Dense classic fantasy strategy UI: compact icon slots, right-click
  detail affordances, and a bottom status / resource bar reused from
  `38-combat-screen`.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in the Markdown package files.

### Component Tree
- `CombatSpellTargeting`
  - `BattlefieldDimmer`
  - `SpellCard`
  - `AreaOverlay`
  - `ImmuneMarkers`
  - `ManaCost`
  - `ConfirmCancelButtons`

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `selectedSpell` | `state.ui.battle.selectedSpellId` | Spell chosen in `47-spell-book`. |
| `casterHero` | `state.battle.activeHeroId` | Hero casting context. |
| `mana` | `state.heroes.byId[caster].mana` | Mana affordability gate. |
| `legalTargets` | `state.battle.spellTargeting.legalTargets` | Rules output for the spell's target shape. |
| `immuneTargets` | `state.battle.spellTargeting.immuneTargets` | Stacks that reject this spell. |

### Mechanics Mapping
- Validates combat spell scope, hero turn, mana, mastery, target
  shape, immunity, and friendly/enemy restrictions before casting.
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas, never
  hardcoded view logic.

### Animation Contract
- Valid hexes pulse; the previewed area locks on hover; the spell
  glyph flares on confirm; immune targets flash red with status text
  on rejection.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- Interactions file covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify the schemas, config, localization, asset,
  sound, VFX, save, and replay fields required to implement the
  screen.

### AI Implementation Notes
- Screen slug: `combat-spell-targeting`; system group: `battle`;
  curation marker: `curated-pass-2`.
- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands carry stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, layout, and copy strings match [`mockup.html`](./mockup.html) (spell card "Meteor Shower - Cost 16 - Expert Fire"; status line "Choose valid enemy area. Immune targets are marked red."). Sibling [`interactions.md`](./interactions.md) and [`architecture.md`](./architecture.md) reuse the same component names — aligned.
- **Schema: ✔** — `selectedSpell` resolves through [`spell.schema.json`](../../../../../content-schema/schemas/spell.schema.json) (`scope: 'combat' | 'both'`); the targeting shape is the closed `targeting` `oneOf` in [`targeting.schema.json`](../../../../../content-schema/schemas/targeting.schema.json). AoE (`area`) is reserved for phase-2; MVP combat spells use `self`, `single_unit`, or `hex`.
- **Tasks: ⚠** — Owning task [`phase-2.01-spells-artifacts.08-spell-casting-in-combat-ui`](../../../../../tasks/phase-2/01-spells-artifacts/08-spell-casting-in-combat-ui.md) Read-Firsts this file. State paths under `state.battle.*` diverge from sibling [`38-combat-screen/spec.md`](../38-combat-screen/spec.md); detail in `## ⚠ Issues` of sibling [`architecture.md`](./architecture.md).

## ⚠ Issues

- **`area` targeting reads as MVP-ready but is phase-2-reserved.** The mockup ([`mockup.html`](./mockup.html)) renders Meteor Shower as a 9-hex area, and the Visual Contract describes "area-of-effect shape". [`targeting.schema.json`](../../../../../content-schema/schemas/targeting.schema.json) marks the `area` `kind` as RESERVED — the engine dispatcher rejects it until phase-2. Per CLAUDE.md schema-evolution policy, the screen is fine to ship its presentation against the reserved kind, but the owning task `phase-2.01-spells-artifacts.08-spell-casting-in-combat-ui` must depend on the phase-2 dispatcher unblocking `area` (currently tracked by `phase-2.01-spells-artifacts.02-combat-spells`). Surfaced rather than rewritten because the screen's visual identity is the AoE preview.
- **State-path divergence with `38-combat-screen`.** See sibling [`architecture.md` § ⚠ Issues](./architecture.md#-issues) — `state.battle.activeHeroId` and `state.battle.spellTargeting.*` are not yet aligned with the canonical `state.battle.activeStackId` / `state.battle.legalTargets` registered by `mvp.09-tactical-combat`. The reconciliation is in scope for the owning task, not this audit.
