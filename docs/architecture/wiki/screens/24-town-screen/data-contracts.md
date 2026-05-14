# Screen 24: Town Screen
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Panorama, frame, button, slot icons, cursor sprites, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | Labels, status text, disabled reasons, error messages. | `content-schema/schemas/localization.schema.json` |
| `ruleset.schema.json` | Deterministic constants and formulas consumed by the engine commands referenced below. | `content-schema/schemas/ruleset.schema.json` |
| `faction.schema.json` | Faction identity for the panorama and town roster references. | `content-schema/schemas/faction.schema.json` |
| `hero.schema.json` | Visiting-hero portrait, stats, army, spellbook eligibility. | `content-schema/schemas/hero.schema.json` |
| `unit.schema.json` | Garrison and visiting-hero army stacks. | `content-schema/schemas/unit.schema.json` |
| `building.schema.json` | Town buildings, hotspot built / unbuilt state, dwellings, mage guild, fort, marketplace. | `content-schema/schemas/building.schema.json` |
| `town-presentation.schema.json` | Hotspot positions, panorama bindings, presentation-only town fields. | `content-schema/schemas/town-presentation.schema.json` |
| `spell.schema.json` | Mage-guild spell catalog (rendered on screen 29). | `content-schema/schemas/spell.schema.json` |
| `resource-id.schema.json` | Resource IDs used by the `ResourceDateBar` and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Engine-level command payloads — only `TRANSFER_TOWN_ARMY_STACK` is dispatched **on this screen**; see § Commands And Events. | `content-schema/schemas/command.schema.json` |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `town.id` | `state.towns.selectedTownId` | Current town context. |
| `town.buildings` | `state.towns.byId[selected].buildings` | Drives hotspot built state and service-button availability. |
| `dailyBuild` | `state.towns.byId[selected].builtToday` | Disables Build after the day's construction. |
| `garrison` | `state.towns.byId[selected].garrison` | Town-army row stacks. |
| `visitingHero` | `state.adventure.visitingHeroId` | Visiting-hero portrait, army row, mage-guild eligibility. |

### Commands And Events
Tokens emitted by this screen, classified per the rule in
[`command-schema.md`](../../../command-schema.md) ("schema command,
alias, UI-local, or explicitly out of scope with an owning task"):

| Action ID | Token | Class | Destination | Notes |
| --- | --- | --- | --- | --- |
| `town.selectBuilding` | `SELECT_TOWN_BUILDING` | local-ui | (current screen) | Highlights hotspot, updates `BuildStatePlaque` + status line. |
| `town.build` | `OPEN_BUILD_TREE` | navigation | `30-build-tree` | `BUILD_BUILDING` dispatched on screen 30. |
| `town.recruit` | `OPEN_RECRUITMENT_DIALOG` | navigation | `25-building-recruitment-dialog` | `RECRUIT_UNITS` dispatched on screen 25. |
| `town.mage` | `OPEN_MAGE_GUILD` | navigation | `29-mage-guild` | `LEARN_SPELL` dispatched on screen 29; requires `visitingHero` per mage-guild eligibility. |
| `town.tavern` | `OPEN_TAVERN` | navigation | `28-tavern` | `HIRE_TAVERN_HERO` dispatched on screen 28. |
| `town.market` | `OPEN_MARKETPLACE` | navigation | `26-marketplace` | Trade commands dispatched on screen 26. |
| `town.transferArmy` | `TRANSFER_TOWN_ARMY_STACK` | engine command | (current screen) | Closed `Command.kind` in `command.schema.json`; the only engine command this screen dispatches. |
| `town.exit` | `CLOSE_TOWN_SCREEN` | navigation | `07-adventure-map` | Returns to adventure-map focus. |

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.town-screen.title`
- `ui.town-screen.actions.*` (one key per service button:
  `actions.build`, `actions.recruit`, `actions.mage`,
  `actions.tavern`, `actions.market`, `actions.exit`)
- `ui.town-screen.status.*` (selected-building plaque text,
  `built-today.yes`, `built-today.no`)
- `ui.town-screen.errors.*` (disabled-reason and rejection strings)
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.town-screen.background`
- `ui.town-screen.frame`
- `ui.town-screen.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.town-screen.*`

### Save And Replay Fields
- Persisted state on this screen flows through the global save /
  replay path: town selectors and garrison stacks are part of the
  reducer-approved game state. This screen contributes no
  screen-local persisted slice.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw asset
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- Building inspection, one-build-per-day construction, recruitment,
  mage-guild / tavern / marketplace routing, garrison transfer,
  visiting-hero context, and exit each use the selectors and tokens
  above.
- Missing presentation may fall back through the asset resolver per
  [`asset-policy.md`](../../../asset-policy.md).
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before controls become enabled per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Service buttons, hotspots, and component slots match
  `mockup.html` and the sibling `spec.md` § Component Tree; eight
  action rows in § Commands And Events line up 1:1 with sibling
  `interactions.md` § Actions.
- **Schema: ✔** — `TRANSFER_TOWN_ARMY_STACK` is a closed
  `Command.kind` in
  [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  (line 1490). All other schemas listed in § Content Schemas And
  Registries exist under `content-schema/schemas/` and back the
  selectors and bindings used here.
- **Tasks: ✔** — Owning task
  [`tasks/mvp/07-ui-shell/04-town-screen-modal.md`](../../../../../tasks/mvp/07-ui-shell/04-town-screen-modal.md)
  Reads First this file; the transfer command is owned by
  [`tasks/mvp/05-adventure-map/18-transfer-stack-commands.md`](../../../../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md)
  (declared as a dependency).

## ⚠ Issues

- **Navigation / local-ui tokens lack `screen-command-coverage.json`
  rows.** The seven non-engine tokens above
  (`SELECT_TOWN_BUILDING`, `OPEN_BUILD_TREE`,
  `OPEN_RECRUITMENT_DIALOG`, `OPEN_MAGE_GUILD`, `OPEN_TAVERN`,
  `OPEN_MARKETPLACE`, `CLOSE_TOWN_SCREEN`) need entries in
  [`docs/architecture/screen-command-coverage.json`](../../../screen-command-coverage.json)
  per `command-schema.md`. Owner:
  [`tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md`](../../../../../tasks/mvp/07-ui-shell/13-screen-package-contract-sweep.md).
  Suggested values: `local-ui` for `SELECT_TOWN_BUILDING`;
  `navigation` for the six `OPEN_*` / `CLOSE_*` tokens with their
  destination screen slugs.
- **Companion garrison / swap commands not surfaced on this screen
  yet.** The schema defines `TRANSFER_GARRISON_STACK`,
  `TRANSFER_HERO_ARMY_STACK`, and `SWAP_TOWN_HEROES` (lines 1454,
  1529, 1565 of `command.schema.json`). If garrison-row and
  visiting-hero-row drag interactions are intended to cover all
  three, the table above must grow; flagged rather than added
  silently because the mockup only exposes one transfer slot
  variant (Hard Prohibition B — never invent features). Owner:
  [`tasks/mvp/05-adventure-map/18-transfer-stack-commands.md`](../../../../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md).
- **No per-field row in `data-inventory.md`.** Town state slices
  (`state.towns.*`) are reducer-owned gameplay state persisted
  through the save flow, not screen-local. Per CLAUDE.md ("every
  persisted field is registered in data-inventory.md"),
  registration of the top-level `state.towns` slice is owned by
  the persistence task, not this screen. Recorded here so a future
  audit confirms the registration exists when the persistence row
  for adventure-state lands.
