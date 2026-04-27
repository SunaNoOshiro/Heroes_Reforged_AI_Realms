# UI Screen Curation Plan

This file tracks the manual pass needed to replace scaffold-like screen packages with screen-specific original classic-strategy contracts.

## Rules
- Do one screen package at a time.
- Do not run scaffold generation over curated files.
- Mockup owns visible UI only; no explanatory prose belongs in the mockup.
- Spec owns component/state contract.
- Interactions own next screen, command/event, data update, animation, disabled, and error behavior.
- Data contracts own schemas, configs, localization, assets, sound, VFX, save, and replay references.
- Architecture owns small screen-specific diagrams. Shared mechanics belong in general architecture diagrams.
- After each batch run `npm run generate:wiki`, `npm run validate:links`, `npm run validate:contracts`, `npm run validate:cross-refs`, `npm run validate:tasks`, and `npm test`.

## Anchor Batch
- `01-main-menu`
- `07-adventure-map`
- `24-town-screen`
- `38-combat-screen`
- `46-hero-screen`
- `47-spell-book`

## Curated Pass 2
- `25-building-recruitment-dialog`
- `26-marketplace`
- `27-thieves-guild`
- `28-tavern`
- `29-mage-guild`
- `30-build-tree`
- `39-battle-results`
- `40-pre-battle-dialog`
- `41-surrender-cost-dialog`
- `42-victory-defeat-cinematic`
- `43-siege-combat`
- `44-combat-spell-targeting`
- `45-tactics-phase`

## Curated Pass 3
- `08-kingdom-overview`
- `09-map-object-dialog`
- `10-puzzle-map`
- `11-quest-log`
- `12-creature-bank-loot`
- `13-hill-fort`
- `14-war-machine-factory`
- `15-underground-toggle`
- `16-view-world`
- `17-adventure-spell-targeting`
- `18-map-object-tooltip`
- `19-status-bar`
- `20-mine-visit-dialog`
- `21-external-dwelling`
- `22-garrison-structure`
- `23-hero-prison`

## Curated Pass 4
- `31-grail-building`
- `32-artifact-merchant-black-market`
- `33-shipyard`
- `34-fort-view`
- `35-town-flyby`
- `36-marketplace-artifact-trading`
- `37-quick-recruit-window`

## Curated Pass 5
- `48-level-up-dialog`
- `49-hero-meeting`
- `50-creature-info`
- `51-split-stack-dialog`
- `52-artifact-combine-dialog`
- `53-university`

## Curated Pass 6
- `02-new-game-setup`
- `03-campaign-selection`
- `04-campaign-narrative`
- `05-intro-cinematic`
- `06-random-map-setup`
- `54-system-menu`
- `55-save-load`
- `56-options`
- `57-high-scores`
- `58-week-month-popup`
- `59-loading-screen`
- `60-confirmation-dialog`
- `61-ai-turn-indicator`
- `62-multiplayer-setup`
- `63-hotseat-turn-handoff`
- `64-network-lobby`
- `65-map-editor`

## Matrix
| # | Screen | Status | Reference Inputs | Required Work |
| --- | --- | --- | --- | --- |
| 01 | Main Menu | curated anchor-v1 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 02 | New Game Setup | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 03 | Campaign Selection | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 04 | Campaign Inter-Mission Narrative | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 05 | Intro / Outro Cinematics | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 06 | Random Map Generator Settings | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 07 | Adventure Map | curated anchor-v1 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 08 | Kingdom Overview | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 09 | Map Object Dialog | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 10 | Puzzle Map | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 11 | Quest Log | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 12 | Creature Bank Loot | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 13 | Hill Fort | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 14 | War Machine Factory | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 15 | Underground Layer Toggle | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 16 | View World | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 17 | Adventure Spell Targeting | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 18 | Map Object Tooltip | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 19 | Status Bar | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 20 | Mine Visit Dialog | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 21 | External Dwelling | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 22 | Garrison Structure | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 23 | Hero Prison | curated-pass-3 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 24 | Town Screen | curated anchor-v1 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 25 | Building / Recruitment Dialog | curated-pass-2 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 26 | Marketplace | curated-pass-2 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 27 | Thieves Guild | curated-pass-2 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 28 | Tavern | curated-pass-2 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 29 | Mage Guild | curated-pass-2 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 30 | Town Hall / Build Tree | curated-pass-2 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 31 | Grail Building | curated-pass-4 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 32 | Artifact Merchant / Black Market | curated-pass-4 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 33 | Shipyard | curated-pass-4 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 34 | Fort View | curated-pass-4 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 35 | Town Flyby | curated-pass-4 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 36 | Marketplace Artifact Trading | curated-pass-4 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 37 | Quick Recruit Window | curated-pass-4 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 38 | Combat Screen | curated anchor-v1 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 39 | Battle Results | curated-pass-2 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 40 | Pre-Battle Dialog | curated-pass-2 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 41 | Surrender Cost Dialog | curated-pass-2 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 42 | Victory / Defeat Cinematic | curated-pass-2 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 43 | Siege Combat Variant | curated-pass-2 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 44 | Combat Spell Targeting | curated-pass-2 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 45 | Combat Tactics Phase | curated-pass-2 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 46 | Hero Screen | curated anchor-v1 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 47 | Spell Book | curated anchor-v1 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 48 | Level Up Dialog | curated-pass-5 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 49 | Hero Meeting | curated-pass-5 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 50 | Creature Info | curated-pass-5 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 51 | Split Stack Dialog | curated-pass-5 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 52 | Artifact Combine Dialog | curated-pass-5 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 53 | University | curated-pass-5 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 54 | System Menu | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 55 | Save / Load | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 56 | Options | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 57 | High Scores | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 58 | Week / Month Popup | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 59 | Loading Screen | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 60 | Confirmation Dialog | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 61 | AI Turn Indicator | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 62 | Multiplayer Setup | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 63 | Hotseat Turn Handoff | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 64 | Network Lobby | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
| 65 | Map Editor | curated-pass-6 | Internal UI contract | Reviewed as manually curated; preserve screen-specific mockup, specs, and diagrams. |
