# Screen 42: Victory / Defeat Cinematic

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Letterboxed campaign/scenario outcome screen with victory or defeat art, score summary, narration text, skip/continue controls, and next-route decision.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- A wide illustrated panel is framed by black letterbox bars; narration parchment and score medallions sit below the art.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- OutcomeCinematic
  - LetterboxArt
  - NarrationPanel
  - ScoreMedallions
  - CampaignCarryoverSummary
  - ContinueSkipButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| outcome | state.scenario.outcome | Victory/defeat/campaign outcome. |
| score | state.scenario.finalScore | Score breakdown. |
| carryover | state.campaign.carryoverDraft | Campaign hero/artifact carryover summary. |
| nextRoute | state.scenario.outcomeRoute | High scores, next mission, or main menu. |

### Mechanics Mapping
- Displays already-finalized outcome state and routes to high scores, campaign next mission, main menu, or replay without changing battle results.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Outcome art slowly pans, narration types in, score medallions appear one by one, continue cross-fades to destination.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `victory-defeat-cinematic`; system group: `battle`; curation marker: `curated-pass-2`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
