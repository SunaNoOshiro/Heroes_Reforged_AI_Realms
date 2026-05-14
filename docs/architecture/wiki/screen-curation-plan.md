# UI Screen Curation Plan

Tracker for the manual pass that replaced scaffold-shaped screen
packages with screen-specific, classic-strategy contracts. Every
listed package is currently `curated`; this file is the historical
record of which batch each screen was curated in and the standing
rules for any follow-up edit.

> Companion docs:
>
> - [`README.md`](./README.md) — folder shape, file-by-file
>   contracts, and the screen-package authoring rules.
> - [`missing-states.md`](./missing-states.md) — variant-state
>   queue (top-level coverage is complete; remaining work is
>   variant depth).
> - [`migration-plan.md`](./migration-plan.md) — folder-shape and
>   batch-migration history.
> - [`screens/index.json`](./screens/index.json) — authoritative
>   list of screen packages and their wiki-sidebar groups.

## 1. Curation rules

- One screen package at a time. Do not batch unrelated packages
  in a single edit.
- Treat curated packages as hand-authored. Do not regenerate them
  from a scaffold tool — the per-package mockup, spec,
  interactions, data contract, and architecture diagrams are
  screen-specific contracts.
- Per-file ownership matches [`README.md` § 6.2](./README.md#62-file-by-file-contracts):
  - `mockup.html` — visible UI only; no explanatory prose.
  - `spec.md` — component tree and state contract.
  - `interactions.md` — per-control behavior: next screen,
    command/event, data update, animation, sound, disabled and
    error cases.
  - `data-contracts.md` — schemas, configs, localization,
    assets, sound, VFX, save and replay references.
  - `architecture.md` — small screen-specific diagrams. Shared
    mechanics live in [`../diagrams/`](../diagrams/).

## 2. Verify after each batch

Run the following from the repo root after every curated batch:

```
npm run generate:wiki
npm run validate:links
npm run validate:contracts
npm run validate:cross-refs
npm run validate:tasks
npm test
```

## 3. Batch history

All curated batches use the internal UI contract as their only
reference input, and the standing work is **preserve
screen-specific mockup, spec, interactions, data contract, and
diagrams** (no regeneration). Pass labels (`anchor-v1`,
`curated-pass-2` … `curated-pass-6`) are referenced inside the
per-package files themselves — do not rename them without a sweep
of [`screens/`](./screens/).

### 3.1 Anchor batch (`anchor-v1`)

- [`01-main-menu`](./screens/01-main-menu/)
- [`07-adventure-map`](./screens/07-adventure-map/)
- [`24-town-screen`](./screens/24-town-screen/)
- [`38-combat-screen`](./screens/38-combat-screen/)
- [`46-hero-screen`](./screens/46-hero-screen/)
- [`47-spell-book`](./screens/47-spell-book/)

### 3.2 Curated Pass 2

- [`25-building-recruitment-dialog`](./screens/25-building-recruitment-dialog/)
- [`26-marketplace`](./screens/26-marketplace/)
- [`27-thieves-guild`](./screens/27-thieves-guild/)
- [`28-tavern`](./screens/28-tavern/)
- [`29-mage-guild`](./screens/29-mage-guild/)
- [`30-build-tree`](./screens/30-build-tree/)
- [`39-battle-results`](./screens/39-battle-results/)
- [`40-pre-battle-dialog`](./screens/40-pre-battle-dialog/)
- [`41-surrender-cost-dialog`](./screens/41-surrender-cost-dialog/)
- [`42-victory-defeat-cinematic`](./screens/42-victory-defeat-cinematic/)
- [`43-siege-combat`](./screens/43-siege-combat/)
- [`44-combat-spell-targeting`](./screens/44-combat-spell-targeting/)
- [`45-tactics-phase`](./screens/45-tactics-phase/)

### 3.3 Curated Pass 3

- [`08-kingdom-overview`](./screens/08-kingdom-overview/)
- [`09-map-object-dialog`](./screens/09-map-object-dialog/)
- [`10-puzzle-map`](./screens/10-puzzle-map/)
- [`11-quest-log`](./screens/11-quest-log/)
- [`12-creature-bank-loot`](./screens/12-creature-bank-loot/)
- [`13-hill-fort`](./screens/13-hill-fort/)
- [`14-war-machine-factory`](./screens/14-war-machine-factory/)
- [`15-underground-toggle`](./screens/15-underground-toggle/)
- [`16-view-world`](./screens/16-view-world/)
- [`17-adventure-spell-targeting`](./screens/17-adventure-spell-targeting/)
- [`18-map-object-tooltip`](./screens/18-map-object-tooltip/)
- [`19-status-bar`](./screens/19-status-bar/)
- [`20-mine-visit-dialog`](./screens/20-mine-visit-dialog/)
- [`21-external-dwelling`](./screens/21-external-dwelling/)
- [`22-garrison-structure`](./screens/22-garrison-structure/)
- [`23-hero-prison`](./screens/23-hero-prison/)

### 3.4 Curated Pass 4

- [`31-grail-building`](./screens/31-grail-building/)
- [`32-artifact-merchant-black-market`](./screens/32-artifact-merchant-black-market/)
- [`33-shipyard`](./screens/33-shipyard/)
- [`34-fort-view`](./screens/34-fort-view/)
- [`35-town-flyby`](./screens/35-town-flyby/)
- [`36-marketplace-artifact-trading`](./screens/36-marketplace-artifact-trading/)
- [`37-quick-recruit-window`](./screens/37-quick-recruit-window/)

### 3.5 Curated Pass 5

- [`48-level-up-dialog`](./screens/48-level-up-dialog/)
- [`49-hero-meeting`](./screens/49-hero-meeting/)
- [`50-creature-info`](./screens/50-creature-info/)
- [`51-split-stack-dialog`](./screens/51-split-stack-dialog/)
- [`52-artifact-combine-dialog`](./screens/52-artifact-combine-dialog/)
- [`53-university`](./screens/53-university/)

### 3.6 Curated Pass 6

- [`02-new-game-setup`](./screens/02-new-game-setup/)
- [`03-campaign-selection`](./screens/03-campaign-selection/)
- [`04-campaign-narrative`](./screens/04-campaign-narrative/)
- [`05-intro-cinematic`](./screens/05-intro-cinematic/)
- [`06-random-map-setup`](./screens/06-random-map-setup/)
- [`54-system-menu`](./screens/54-system-menu/)
- [`55-save-load`](./screens/55-save-load/)
- [`56-options`](./screens/56-options/)
- [`57-high-scores`](./screens/57-high-scores/)
- [`58-week-month-popup`](./screens/58-week-month-popup/)
- [`59-loading-screen`](./screens/59-loading-screen/)
- [`60-confirmation-dialog`](./screens/60-confirmation-dialog/)
- [`61-ai-turn-indicator`](./screens/61-ai-turn-indicator/)
- [`62-multiplayer-setup`](./screens/62-multiplayer-setup/)
- [`63-hotseat-turn-handoff`](./screens/63-hotseat-turn-handoff/)
- [`64-network-lobby`](./screens/64-network-lobby/)
- [`65-map-editor`](./screens/65-map-editor/)

## 4. Matrix (sorted by package number)

| # | Screen | Pass |
| --- | --- | --- |
| 01 | [Main Menu](./screens/01-main-menu/) | `anchor-v1` |
| 02 | [New Game Setup](./screens/02-new-game-setup/) | `curated-pass-6` |
| 03 | [Campaign Selection](./screens/03-campaign-selection/) | `curated-pass-6` |
| 04 | [Campaign Inter-Mission Narrative](./screens/04-campaign-narrative/) | `curated-pass-6` |
| 05 | [Intro / Outro Cinematics](./screens/05-intro-cinematic/) | `curated-pass-6` |
| 06 | [Random Map Generator Settings](./screens/06-random-map-setup/) | `curated-pass-6` |
| 07 | [Adventure Map](./screens/07-adventure-map/) | `anchor-v1` |
| 08 | [Kingdom Overview](./screens/08-kingdom-overview/) | `curated-pass-3` |
| 09 | [Map Object Dialog](./screens/09-map-object-dialog/) | `curated-pass-3` |
| 10 | [Puzzle Map](./screens/10-puzzle-map/) | `curated-pass-3` |
| 11 | [Quest Log](./screens/11-quest-log/) | `curated-pass-3` |
| 12 | [Creature Bank Loot](./screens/12-creature-bank-loot/) | `curated-pass-3` |
| 13 | [Hill Fort](./screens/13-hill-fort/) | `curated-pass-3` |
| 14 | [War Machine Factory](./screens/14-war-machine-factory/) | `curated-pass-3` |
| 15 | [Underground Layer Toggle](./screens/15-underground-toggle/) | `curated-pass-3` |
| 16 | [View World](./screens/16-view-world/) | `curated-pass-3` |
| 17 | [Adventure Spell Targeting](./screens/17-adventure-spell-targeting/) | `curated-pass-3` |
| 18 | [Map Object Tooltip](./screens/18-map-object-tooltip/) | `curated-pass-3` |
| 19 | [Status Bar](./screens/19-status-bar/) | `curated-pass-3` |
| 20 | [Mine Visit Dialog](./screens/20-mine-visit-dialog/) | `curated-pass-3` |
| 21 | [External Dwelling](./screens/21-external-dwelling/) | `curated-pass-3` |
| 22 | [Garrison Structure](./screens/22-garrison-structure/) | `curated-pass-3` |
| 23 | [Hero Prison](./screens/23-hero-prison/) | `curated-pass-3` |
| 24 | [Town Screen](./screens/24-town-screen/) | `anchor-v1` |
| 25 | [Building / Recruitment Dialog](./screens/25-building-recruitment-dialog/) | `curated-pass-2` |
| 26 | [Marketplace](./screens/26-marketplace/) | `curated-pass-2` |
| 27 | [Thieves Guild](./screens/27-thieves-guild/) | `curated-pass-2` |
| 28 | [Tavern](./screens/28-tavern/) | `curated-pass-2` |
| 29 | [Mage Guild](./screens/29-mage-guild/) | `curated-pass-2` |
| 30 | [Town Hall / Build Tree](./screens/30-build-tree/) | `curated-pass-2` |
| 31 | [Grail Building](./screens/31-grail-building/) | `curated-pass-4` |
| 32 | [Artifact Merchant / Black Market](./screens/32-artifact-merchant-black-market/) | `curated-pass-4` |
| 33 | [Shipyard](./screens/33-shipyard/) | `curated-pass-4` |
| 34 | [Fort View](./screens/34-fort-view/) | `curated-pass-4` |
| 35 | [Town Flyby](./screens/35-town-flyby/) | `curated-pass-4` |
| 36 | [Marketplace Artifact Trading](./screens/36-marketplace-artifact-trading/) | `curated-pass-4` |
| 37 | [Quick Recruit Window](./screens/37-quick-recruit-window/) | `curated-pass-4` |
| 38 | [Combat Screen](./screens/38-combat-screen/) | `anchor-v1` |
| 39 | [Battle Results](./screens/39-battle-results/) | `curated-pass-2` |
| 40 | [Pre-Battle Dialog](./screens/40-pre-battle-dialog/) | `curated-pass-2` |
| 41 | [Surrender Cost Dialog](./screens/41-surrender-cost-dialog/) | `curated-pass-2` |
| 42 | [Victory / Defeat Cinematic](./screens/42-victory-defeat-cinematic/) | `curated-pass-2` |
| 43 | [Siege Combat Variant](./screens/43-siege-combat/) | `curated-pass-2` |
| 44 | [Combat Spell Targeting](./screens/44-combat-spell-targeting/) | `curated-pass-2` |
| 45 | [Combat Tactics Phase](./screens/45-tactics-phase/) | `curated-pass-2` |
| 46 | [Hero Screen](./screens/46-hero-screen/) | `anchor-v1` |
| 47 | [Spell Book](./screens/47-spell-book/) | `anchor-v1` |
| 48 | [Level Up Dialog](./screens/48-level-up-dialog/) | `curated-pass-5` |
| 49 | [Hero Meeting](./screens/49-hero-meeting/) | `curated-pass-5` |
| 50 | [Creature Info](./screens/50-creature-info/) | `curated-pass-5` |
| 51 | [Split Stack Dialog](./screens/51-split-stack-dialog/) | `curated-pass-5` |
| 52 | [Artifact Combine Dialog](./screens/52-artifact-combine-dialog/) | `curated-pass-5` |
| 53 | [University](./screens/53-university/) | `curated-pass-5` |
| 54 | [System Menu](./screens/54-system-menu/) | `curated-pass-6` |
| 55 | [Save / Load](./screens/55-save-load/) | `curated-pass-6` |
| 56 | [Options](./screens/56-options/) | `curated-pass-6` |
| 57 | [High Scores](./screens/57-high-scores/) | `curated-pass-6` |
| 58 | [Week / Month Popup](./screens/58-week-month-popup/) | `curated-pass-6` |
| 59 | [Loading Screen](./screens/59-loading-screen/) | `curated-pass-6` |
| 60 | [Confirmation Dialog](./screens/60-confirmation-dialog/) | `curated-pass-6` |
| 61 | [AI Turn Indicator](./screens/61-ai-turn-indicator/) | `curated-pass-6` |
| 62 | [Multiplayer Setup](./screens/62-multiplayer-setup/) | `curated-pass-6` |
| 63 | [Hotseat Turn Handoff](./screens/63-hotseat-turn-handoff/) | `curated-pass-6` |
| 64 | [Network Lobby](./screens/64-network-lobby/) | `curated-pass-6` |
| 65 | [Map Editor](./screens/65-map-editor/) | `curated-pass-6` |

Packages `66-debug-overlay` … `77-multiplayer-game` exist under
[`screens/`](./screens/) and are registered in
[`screens/index.json`](./screens/index.json) but are not tracked
in any pass above. See `## ⚠ Issues` below.

---

## 🔍 Sync Check

- **UI: ⚠** — Every package linked in §§ 3–4 exists under [`screens/`](./screens/) and is registered in [`screens/index.json`](./screens/index.json). However, the index lists 12 additional packages (`66-debug-overlay`, `67-animation-debug-overlay`, `68-dev-profiler`, `69-dev-ai-inspector`, `70-save-import`, `71-pack-manager`, `72-pack-trust-prompt`, `73-ugc-publish-disclaimer`, `74-ai-provenance-detail`, `75-content-report`, `76-onboarding-consent`, `77-multiplayer-game`) that this tracker does not place in any pass. Files exist on disk; the tracker is the doc that is behind.
- **Schema: ✔** — No schema references in this file. Companion authoring rules in [`README.md` § 6.3](./README.md#63-schema-and-contract-pins) cover [`hotkey.schema.json`](../../../content-schema/schemas/hotkey.schema.json) and [`error-state.schema.json`](../../../content-schema/schemas/error-state.schema.json) at the package level, not at this tracker level.
- **Tasks: ✔** — No task file lists this tracker under Read First or Inputs. UI implementation tasks reference the individual screen packages directly, per [`README.md` § 6.4](./README.md#64-task-coupling); the tracker is a planning artifact, not a task dependency.

## ⚠ Issues

- **12 screen packages missing from the pass-history matrix.** `screens/index.json` registers `66-debug-overlay` through `77-multiplayer-game` (diagnostics, system-dialogs add-ons, multiplayer game screen), and all twelve have at least a `mockup.html` and `architecture.md` on disk. They have no row in § 4 and no entry in any `## 3.x Curated Pass`. The tracker therefore claims completion through pass 6 when there is a thirteenth batch's worth of curated (or partially curated) packages already shipped. Per the curation rule in § 1 ("treat curated packages as hand-authored"), they need to be assigned to either `curated-pass-7` (or whichever label is in use inside their per-package files) or, if scaffold-shaped, queued as a real pass-7 curation batch. This audit does not invent a new pass label (Hard Prohibition B) — closing the gap requires checking the version tag actually written inside each of the twelve `spec.md` / `architecture.md` files and aligning this tracker to it. Suggested values: read the pass label inside each package, group accordingly, and add a `### 3.7 Curated Pass 7` (or matching) section plus matrix rows.
- **Verify command set is advisory, not pinned.** § 2 lists six commands to run after each batch. None are CI-enforced from this file's text; the canonical contract for repo-wide validation is [`.github/workflows/validate.yml`](../../../.github/workflows/validate.yml) and the per-task `verifyCommands` chain in [`scripts/tasks.mjs`](../../../scripts/tasks.mjs). The list is correct (all six scripts exist in [`package.json`](../../../package.json)) but is a convenience checklist, not a gate. No fix needed in this doc — keep the checklist; the gate authority lives elsewhere.
