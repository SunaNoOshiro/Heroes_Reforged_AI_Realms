# Screen 28: Tavern

## Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md` (this file)
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

## Description
Tavern recruitment and rumor screen for a visited town. Two weekly
hero offers with inline hire costs sit above a rumor parchment;
entry buttons route to the Thieves Guild and back to the town
screen. Only `HIRE_TAVERN_HERO` mutates deterministic state.

## Visual Direction
Original internal UI contract. Never seed implementation from
third-party captures, copied franchise art, or external product
pixels.

## Visual Contract
- Curation status: `curated-pass-2`.
- Fixed 800 × 600 panel; ornate gold frame; red / brown / stone
  fills.
- Two large hero cards dominate the panel; the rumor parchment
  sits below them; the thieves-guild button is framed as a
  separate service entry; CLOSE returns to the town screen.
- `mockup.html` shows visible UI only. Logic, transitions, and
  implementation notes live in the markdown package files.

## Component Tree
- TavernDialog
  - HeroOfferCardA
  - HeroOfferCardB
  - RumorParchment
  - HireCostPanel
  - ThievesGuildButton
  - CloseButton

## State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `heroPool` | `state.tavern.weeklyHeroOffers` | Two current recruitable offers. |
| `playerGold` | `state.players.active.resources.gold` | Drives HIRE affordability. |
| `selectedOffer` | `state.ui.tavern.selectedHeroId` | Local UI draft; never persisted. |
| `rumor` | `state.tavern.currentRumorId` | Localized rumor text key. |

## Mechanics Mapping
- HIRE validates gold, town/hero capacity, and weekly-refresh
  rules before the reducer instantiates the hero (engine owner:
  [`mvp.05-adventure-map.11-hire-tavern-hero-command`](../../../../../tasks/mvp/05-adventure-map/11-hire-tavern-hero-command.md)).
- UI selection and route entries stay local until the dispatcher
  or a route guard accepts them.
- Costs, heroes, classes, and resources resolve through content
  registries — never hard-coded view logic.

## Animation Contract
- Hero card lifts on hover; hired card slides toward roster; rumor
  parchment unfurls on entry; thieves-guild entry glows on focus.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode swaps animations for static highlights and
  localized feedback (`prefers-reduced-motion: reduce` in
  `mockup.html`).

## Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and authoritative state
  binding.
- `interactions.md` covers every primary control, next screen,
  state update, animation, disabled case, and error path.
- `architecture.md` contains screen-specific diagrams, not copied
  archetype diagrams.
- `data-contracts.md` identifies the schemas, config, localization
  keys, asset / sound / VFX IDs, and save / replay fields required
  to implement the screen.

## AI Implementation Notes
- Screen slug: `tavern`; system group: `town`; curation marker:
  `curated-pass-2`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs and
  manifests; deterministic gameplay commands use stable IDs and
  scalar values.

---

## 🔍 Sync Check

- **UI: ⚠** — Component tree lists `HireCostPanel` as a sibling of the two hero offer cards, but `mockup.html` renders the cost inline on each card (`Cost: 2500 gold`) with no separate panel region. Sibling [`architecture.md`](./architecture.md) lists `HireCostPanel` too — internal-spec is consistent, mockup is not. Detail in `## ⚠ Issues`.
- **Schema: ✔** — `state.tavern.weeklyHeroOffers`, `state.players.active.resources.gold`, `state.ui.tavern.selectedHeroId`, `state.tavern.currentRumorId` agree across sibling [`data-contracts.md`](./data-contracts.md) § Runtime State Selectors and sibling [`architecture.md`](./architecture.md) § State Inputs; `HIRE_TAVERN_HERO` resolves to `hireTavernHero` in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
- **Tasks: ✔** — UI owner [`phase-2.07-ui-screen-backlog.28-tavern-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/28-tavern-screen.md) reads this file first; engine owner [`mvp.05-adventure-map.11-hire-tavern-hero-command`](../../../../../tasks/mvp/05-adventure-map/11-hire-tavern-hero-command.md) reads sibling `interactions.md`.

## ⚠ Issues

- **`HireCostPanel` not present in `mockup.html`.** The component tree on this file (and sibling [`architecture.md`](./architecture.md)) lists `HireCostPanel` as a top-level child of `TavernDialog`; `mockup.html` instead renders the cost as an inline line of text on each `HeroOfferCard*` next to the HIRE button. Per Hard Prohibition B (never invent features), the skill kept the panel rather than silently dropping it from the spec. Owner: [`phase-2.07-ui-screen-backlog.28-tavern-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/28-tavern-screen.md). Suggested values: fold the cost into each hero offer card and remove `HireCostPanel` from the component tree (and from sibling `architecture.md` § Visual Composition), or add the panel region to `mockup.html`. Decide in the UI task, not here.
