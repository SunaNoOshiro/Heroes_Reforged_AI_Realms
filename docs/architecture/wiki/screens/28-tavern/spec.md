# Screen 28: Tavern

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Tavern recruitment and rumor screen with two hero offer cards, hire cost, weekly hero pool, rumor text, and thieves guild entry.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- Two large hero cards dominate the panel; a rumor parchment sits below them and the thieves guild button is framed as a separate service entry.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- TavernDialog
  - HeroOfferCardA
  - HeroOfferCardB
  - RumorParchment
  - HireCostPanel
  - ThievesGuildButton
  - CloseButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| heroPool | state.tavern.weeklyHeroOffers | Two current recruitable heroes. |
| playerGold | state.players.active.resources.gold | Hire cost availability. |
| selectedOffer | state.ui.tavern.selectedHeroId | Local selected hero card. |
| rumor | state.tavern.currentRumorId | Localized rumor text. |

### Mechanics Mapping
- Hiring validates available hero pool, player gold, town/hero capacity, and weekly refresh rules before creating the hero.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Hero card lifts on hover, hired card slides toward roster, rumor parchment unfurls, thieves guild entry glows on focus.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `tavern`; system group: `town`; curation marker: `curated-pass-2`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
