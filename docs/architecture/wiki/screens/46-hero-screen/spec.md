# Screen 46: Hero Screen

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Hero management sheet: portrait, primary stats, specialty,
experience, secondary skills, equipment paper doll, backpack, army
row, minimap / sidebar context, and routes to spell book, quest log,
stack split, and dismiss confirmation.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `anchor-v1`.
- A parchment / stone hero sheet overlays the adventure sidebar
  style: stats and skills on the left, paper doll and artifacts in
  the centre, army row along the bottom, minimap / sidebar context
  on the right.
- Dense classic fantasy strategy UI: fixed 800×600 layout, ornate
  gold frame, red / brown / stone panels, compact icon slots,
  right-click detail affordances, bottom status / resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in the Markdown package files.

### Component Tree
- HeroScreen
  - HeroPortrait
  - PrimaryStats
  - SpecialtyPanel
  - SecondarySkills
  - PaperDoll
  - ArtifactSlots
  - Backpack
  - HeroArmyRow
  - SidebarContext

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `hero.id` | `state.heroes.selectedHeroId` | Current hero context. |
| `hero.primaryStats` | `state.heroes.byId[selected].stats` | Attack, defense, power, knowledge. |
| `hero.skills` | `state.heroes.byId[selected].secondarySkills` | Skill grid and tooltips. |
| `hero.equipment` | `state.heroes.byId[selected].equipment` | Paper-doll slots. |
| `hero.backpack` | `state.heroes.byId[selected].backpack` | Backpack inventory. |
| `hero.army` | `state.heroes.byId[selected].army` | Army row and stack operations. |

### Mechanics Mapping
- Artifact equip / unequip, backpack drag-drop, army stack movement,
  hero dismissal guard, quest log, spellbook access, and right-click
  detail consume hero selectors and validated commands (see sibling
  [`interactions.md`](./interactions.md) § Actions).
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas, never
  hardcoded view logic.

### Animation Contract
- Artifact drag ghosts follow the cursor; legal equipment slots glow;
  accepted artifacts snap into place; skill and stat tooltips fade
  in.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- Interactions cover every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file holds screen-specific diagrams, not archetype
  copies.
- Data contracts identify the schema / config / localization / asset
  / sound / VFX / save / replay fields needed at runtime.

### AI Implementation Notes
- Screen slug: `hero-screen`; system group: `hero`; curation marker:
  `anchor-v1`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ⚠** — State bindings and the component tree align with sibling [`data-contracts.md`](./data-contracts.md) § Runtime State Selectors and [`architecture.md`](./architecture.md) § Visual Composition. The mockup ([`mockup.html`](./mockup.html)) renders a `ResourceDateBar` and a 3×3 right-side slot grid that are not named in the Component Tree, and `PaperDoll` plus `ArtifactSlots` are listed as separate nodes for one visible paper-doll region — see `## ⚠ Issues`.
- **Schema: ✔** — Selectors match `state.heroes.*` paths used in sibling files. `state.heroes.*` is save-borne gameplay state managed by the engine reducer; it is not a privacy-tracked slice, so no row is required in [`data-inventory.md`](../../../data-inventory.md).
- **Tasks: ✔** — Owning UI task [`phase-2.07-ui-screen-backlog.46-hero-screen-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/46-hero-screen-screen.md) Reads First this file; engine prerequisites are listed in its Dependencies.

## ⚠ Issues

- **Component Tree omits visible mockup nodes.** [`mockup.html`](./mockup.html) shows `data-component="ResourceDateBar"` along the bottom and a 3×3 right-side slot grid below the minimap; the Component Tree does not list either. Per Hard Prohibition B, this audit did not add the nodes. Owner: [`phase-2.07-ui-screen-backlog.46-hero-screen-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/46-hero-screen-screen.md) decides whether `ResourceDateBar` is a global HUD inherited from the adventure shell (cross-link only) or a screen-owned node to add. Same for the 3×3 grid (likely belongs under `SidebarContext`).
- **`PaperDoll` vs `ArtifactSlots` redundancy.** The tree lists both, but the mockup renders a single paper-doll region with seven slots. Mirrored in sibling [`architecture.md`](./architecture.md) `## ⚠ Issues`. Resolve by either folding `ArtifactSlots` into `PaperDoll` or naming a distinct surface (e.g. the right-side 3×3 grid). Audit did not pick one — owner above.
