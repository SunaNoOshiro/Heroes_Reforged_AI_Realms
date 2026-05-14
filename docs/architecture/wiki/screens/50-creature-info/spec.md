# Screen 50: Creature Info

### Screen Package

- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description

Read-only detail panel for a single creature, opened from army
stacks, dwellings, combat stacks, rewards, and tooltip drill-down.
Displays base stats from the unit registry plus the current stack's
modifier overlay; exit returns to the caller. No gameplay mutation
happens here — the upgrade button is a route to the surface that
owns the mutation.

### Visual Direction

Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

### Visual Contract

- Curation status: `curated-pass-5`.
- Bestiary parchment modal centered over the caller chrome: portrait
  panel (left), primary stat block (Atk, Def, Dmg, HP, Spd), ability
  list, modifier breakdown, upgrade-path hint, and `UPGRADE` /
  `CLOSE` buttons in the lower-right strip per `mockup.html`.
- Dense classic-fantasy strategy UI: ornate gold frame, red/brown/
  stone panels, compact icon slots, right-click detail affordances,
  bottom status/resource feedback.
- `mockup.html` carries the visible UI only. Logic, transitions, and
  implementation notes live in the sibling Markdown files.

### Component Tree

- `CreatureInfoPanel` (modal root)
  - `CreaturePortrait` — bound to `creatureId`'s registry portrait asset.
  - `StatGrid` — Atk / Def / Dmg / HP / Spd / Shots from `baseStats` + `modifiers`.
  - `AbilityList` — one row per `abilityIds` entry resolved through the ability registry.
  - `ModifierBreakdown` — per-stat source rows from `modifiers` (hero, spell, artifact, terrain, ruleset).
  - `UpgradePathPreview` — preview of the upgrade target (read-only label; mutation lives in `13-hill-fort` / `25-building-recruitment-dialog`).
  - `UpgradeButton` — `creatureInfo.openUpgrade`; hidden / disabled when the caller does not support upgrades.
  - `CloseButton` — `creatureInfo.close`.

### State Bindings

| Element | Bound to | Notes |
| --- | --- | --- |
| `creatureId` | `state.ui.creatureInfo.creatureId` | Set by the caller route (e.g. `58-week-month-popup` per [`58-week-month-popup/data-contracts.md`](../58-week-month-popup/data-contracts.md)). |
| `stackContext` | `state.ui.creatureInfo.stackContext` | Caller discriminator: `hero` / `combat` / `dwelling` / `reward` / `calendar`. Drives which modifier sources resolve. |
| `baseStats` | `registries.creatures.byId[creatureId].stats` | `attack`, `defense`, `hp`, `speed`, `shots`, `damageMin`, `damageMax` per [`unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json). |
| `modifiers` | `selectors.creatures.stackStatModifiers` | Per-stat overlay derived from hero skills, spells, artifacts, terrain, and ruleset formulas. |
| `abilityIds` | `registries.creatures.byId[creatureId].abilityIds` | Resolves through the ability registry to the rendered `AbilityList` rows. |

### Mechanics Mapping

- Read-only: the panel never dispatches a schema command. Stat,
  ability, and upgrade values resolve from registries and stack
  selectors only.
- The upgrade affordance is a route — the actual upgrade mutation is
  owned by `13-hill-fort` (`UPGRADE_HERO_ARMY_STACK`) or
  `25-building-recruitment-dialog` (recruitment-flow upgrade), not
  by this screen.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas — never
  hardcoded in view logic.

### Animation Contract

- Mount: panel fade-in over the caller; portrait pulses idle.
- Hover: ability-row glow on the focused ability; stat cell pulses
  when the displayed value differs from `baseStats` (i.e. a modifier
  is contributing).
- Exit: panel fade-out back to the caller.
- `prefers-reduced-motion: reduce` skips fade / glow / pulse and
  renders the final visible state directly per
  [`autoplay-policy.md`](../../../autoplay-policy.md).
- Animations consume route results; they never decide gameplay
  outcomes.

### Acceptance Criteria

- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and its authoritative state
  binding (table above).
- Interactions cover hover-ability detail, open-upgrade route,
  close, disabled cases, and error paths.
- Architecture diagrams describe this screen's actual flow (no
  copied archetype boilerplate).
- Data contracts identify every schema, config, localization, asset,
  sound, VFX, save, and replay field required to implement the
  screen.

### AI Implementation Notes

- Screen slug `creature-info`; system group `hero`; curation marker
  `curated-pass-5`.
- Build the runtime component from this contract, not from
  third-party captures or external product pixels.
- All three interaction tokens (`SHOW_CREATURE_ABILITY_DETAIL`,
  `OPEN_CREATURE_UPGRADE_SOURCE`, `CLOSE_CREATURE_INFO`) are
  **local-ui routes**, not schema commands — see `data-contracts.md`
  for the classification and `interactions.md` for the routing
  matrix.
- Resolve presentation through asset IDs / manifests; deterministic
  gameplay commands (recruitment, upgrade) belong to the routed-to
  screens, not here.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree matches the inner-modal regions in `mockup.html` (`Crusader` portrait panel + Stats block + Abilities block + `UPGRADE` / `CLOSE` buttons); state bindings match sibling [`data-contracts.md`](./data-contracts.md) Runtime State Selectors and [`interactions.md`](./interactions.md) State Changes.
- **Schema: ✔** — Stat field names align with [`unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) (`attack`, `defense`, `hp`, `speed`, `shots`, `damageMin`, `damageMax`); ability binding is `abilityIds` per the same schema; both schemas are registered in [`schema-matrix.md`](../../../schema-matrix.md) (`Unit`, `Ability`).
- **Tasks: ✔** — UI screen owned by [`phase-2.07-ui-screen-backlog.50-creature-info-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/50-creature-info-screen.md); upstream caller route owned by [`phase-2.07-ui-screen-backlog.58-week-month-popup-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/58-week-month-popup-screen.md); upgrade-mutation surfaces owned by their respective screen tasks (`13-hill-fort`, `25-building-recruitment-dialog`).

## ⚠ Issues

- **`state.ui.creatureInfo.{creatureId, stackContext}` is a screen-introduced UI slice not yet declared in any sibling arch doc.** The slice is transient (`state.ui.*`), so no [`data-inventory.md`](../../../data-inventory.md) row is strictly required, but its path is load-bearing for every caller route (see `58-week-month-popup`). Owning UI task [`phase-2.07-ui-screen-backlog.50-creature-info-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/50-creature-info-screen.md) should document the slice in [`state-shape.md`](../../../state-shape.md) or fold it into the existing UI shell state. Skill did not add the row itself (Hard Prohibition D).
- **`stackContext` discriminator values are not pinned by a schema or enum.** The binding lists `hero` / `combat` / `dwelling` / `reward` / `calendar` — `calendar` matches the write site in [`58-week-month-popup/interactions.md`](../58-week-month-popup/interactions.md), but the other four are introduced by this package. Per CLAUDE.md's schema-evolution policy, the owning UI task should pin the literal set in code (string union) or schema before runtime ships. Surfaced rather than rewritten because the choice is load-bearing for downstream selector code.
