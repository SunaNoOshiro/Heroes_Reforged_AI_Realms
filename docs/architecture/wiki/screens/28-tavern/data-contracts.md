# Screen 28: Tavern — Data Contracts

## Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

## Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules (hire cost, weekly refresh). | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment used to render and instantiate the offer. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `hero-class.schema.json` | Class growth weights, starting skills, and level-up offer rules. | [`content-schema/schemas/hero-class.schema.json`](../../../../../content-schema/schemas/hero-class.schema.json) |
| `resource-id.schema.json` | Canonical resource IDs used by costs and affordability checks. | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `command.schema.json` | `hireTavernHero` envelope; the only reducer-backed command on this screen. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |

## Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `heroPool` | `state.tavern.weeklyHeroOffers` | Two current recruitable offers. |
| `playerGold` | `state.players.active.resources.gold` | Drives affordability of HIRE. |
| `selectedOffer` | `state.ui.tavern.selectedHeroId` | Local UI draft; never persisted. |
| `rumor` | `state.tavern.currentRumorId` | Localized rumor text key. |

## Commands And Events
| Action ID (UI) | Token | Class | Schema reference |
| --- | --- | --- | --- |
| `tavern.selectHero` | `SELECT_TAVERN_HERO` | `local-ui` (prefix `SELECT_` per [`screen-command-coverage.json`](../../../screen-command-coverage.json)) | — (UI-draft only) |
| `tavern.hireHero` | `HIRE_TAVERN_HERO` | `command` (reducer) | [`command.schema.json#/$defs/hireTavernHero`](../../../../../content-schema/schemas/command.schema.json) — required `kind`, `playerId`, `townId`, `heroId`, `offerId`, `metadata` |
| `tavern.thievesGuild` | `OPEN_THIEVES_GUILD` | `local-ui` (prefix `OPEN_`); routes to `27-thieves-guild` | — |
| `tavern.close` | `CLOSE_TAVERN` | `local-ui` (prefix `CLOSE_`); routes to `24-town-screen` | — |

Only `HIRE_TAVERN_HERO` is in the deterministic command log; the
other three tokens are UI-only and never enter
`command-envelope.schema.json`.

## Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

## Localization Keys
- `ui.tavern.title`
- `ui.tavern.actions.*`
- `ui.tavern.status.*`
- `ui.tavern.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`
- `error.dispatcher.rejected.body` (per sibling `interactions.md` § Error surfaces)

## Asset, Sound, And VFX IDs
- `ui.tavern.background`
- `ui.tavern.frame`
- `ui.tavern.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.tavern.*`

## Save And Replay Fields
- The hired hero, gold deduction, and refreshed offer slot persist
  via the engine save record (reducer-approved fields only).
- `state.ui.tavern.selectedHeroId`, hover, focus, tooltip, drag
  ghost, cursor blink, and animation frame stay outside save and
  replay.
- Replays carry stable IDs and scalar payloads (`heroId`,
  `offerId`, `townId`) — never raw paths, localized strings,
  rendered positions, or wall-clock timestamps.

## Validation And Fallback
- Hire validation runs gold, town/hero capacity, and weekly-refresh
  rules before the reducer creates the hero (per engine task
  [`mvp.05-adventure-map.11-hire-tavern-hero-command`](../../../../../tasks/mvp/05-adventure-map/11-hire-tavern-hero-command.md)).
- Missing presentation assets fall back through the asset resolver
  per [`asset-policy.md`](../../../asset-policy.md).
- Missing gameplay records, invalid commands, and unresolved
  content IDs fail loudly per
  [`fail-loud.md`](../../../fail-loud.md) before HIRE becomes
  enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs and tokens match sibling [`interactions.md`](./interactions.md) § Actions and the `data-action` attributes in `mockup.html` (`tavern.hireHero`, `tavern.thievesGuild`, `tavern.close`).
- **Schema: ⚠** — `hireTavernHero` defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) line 891 (required keys `kind, playerId, townId, heroId, offerId, metadata`); the table above mirrors it. No canonical `tavern-offer.schema.json` exists yet — see `## ⚠ Issues`.
- **Tasks: ✔** — UI owner [`phase-2.07-ui-screen-backlog.28-tavern-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/28-tavern-screen.md) reads this file in its Read First; engine reducer owner [`mvp.05-adventure-map.11-hire-tavern-hero-command`](../../../../../tasks/mvp/05-adventure-map/11-hire-tavern-hero-command.md) emits the schema-backed `HIRE_TAVERN_HERO` row above.

## ⚠ Issues

- **`tavern-offer.schema.json` missing on disk.** Tasks [`mvp.02-content-schemas.19-tavern-and-marketplace-tables`](../../../../../tasks/mvp/02-content-schemas/19-tavern-and-marketplace-tables.md) and [`mvp.05-adventure-map.11-hire-tavern-hero-command`](../../../../../tasks/mvp/05-adventure-map/11-hire-tavern-hero-command.md) both name `content-schema/schemas/tavern-offer.schema.json` as canonical, but the file is not present in [`content-schema/schemas/`](../../../../../content-schema/schemas/). The schema table above currently sources offers through `hero.schema.json` as a working stand-in. Per CLAUDE.md ("Stable IDs are public API"), the offer-pool schema must land before the engine task can be marked `done`. Suggested values: add the schema under task `mvp.02-content-schemas.19-tavern-and-marketplace-tables`; update this file's table to add a `tavern-offer.schema.json` row pointing at it. Skill did not create the schema (Hard Prohibition D).
- **`state.tavern.*` engine slices not enumerated in [`data-inventory.md`](../../../data-inventory.md).** The inventory enumerates profile/saves/options/privacy slices but does not list engine state slices such as `state.tavern.weeklyHeroOffers` or `state.tavern.currentRumorId`. Those slices are captured via the save record in `hr-saves.slots`, which the inventory does carry, so this is non-blocking — but the inventory does not explicitly say so for tavern fields, and a future reader cannot tell whether a missing row is an omission or an intentional roll-up. Owner: [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../../../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md) is the wrong target — this belongs to whichever task owns the data-inventory rollup convention. Suggested values: add a clarifying note in [`data-inventory.md` § 1](../../../data-inventory.md) that engine `state.*` game-state slices are persisted only through the save slot row and need no per-slice row.
