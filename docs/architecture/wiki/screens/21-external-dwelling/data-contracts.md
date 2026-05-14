# Screen 21: External Dwelling
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | `content-schema/schemas/localization.schema.json` |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by the recruit command. | `content-schema/schemas/ruleset.schema.json` |
| `unit.schema.json` | Creature stats, stack rules, combat preview, upgrade lineage, army-transfer rules. | `content-schema/schemas/unit.schema.json` |
| `adventure-building.schema.json` | External dwelling visit rules, ownership state, and map-facing economy bindings. | `content-schema/schemas/adventure-building.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by cost preview, spend, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | `RECRUIT_EXTERNAL_DWELLING_UNITS` payload shape (`heroId`, `dwellingId`, `unitId`, `quantity`, `metadata`). | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, units, map objects, and selector slices listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `dwellingId` | `state.ui.adventure.pendingDwellingId` | Visited external dwelling. |
| `dwellingStock` | `state.mapObjects.byId[dwellingId].stock` | Weekly available creature count. |
| `selectedQuantity` | `state.ui.externalDwelling.quantity` | Local recruit draft. |
| `destinationArmy` | `state.heroes.byId[selected].army` | Hero army receiving recruits. |
| `costPreview` | `selectors.economy.externalDwellingCost` | Cost and affordability for `selectedQuantity`. |

### Commands And Events
| Action ID | Command / Event | Type | Effect |
| --- | --- | --- | --- |
| `dwelling.quantity` | `SET_EXTERNAL_DWELLING_QUANTITY` | local-ui | Updates draft quantity; refreshes cost and destination preview. |
| `dwelling.max` | `SET_EXTERNAL_DWELLING_MAX` | local-ui | Snaps `selectedQuantity` to the legal maximum. |
| `dwelling.recruit` | `RECRUIT_EXTERNAL_DWELLING_UNITS` | command | Spends resources, decrements stock, updates hero army. |
| `dwelling.close` | `CLOSE_EXTERNAL_DWELLING` | navigation | Drops draft; returns to `07-adventure-map`. |

Only `RECRUIT_EXTERNAL_DWELLING_UNITS` is reducer-backed; the other
three tokens stay in route / draft state per
[`command-schema.md`](../../../command-schema.md).

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.external-dwelling.title`
- `ui.external-dwelling.actions.*`
- `ui.external-dwelling.status.*`
- `ui.external-dwelling.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.external-dwelling.background`
- `ui.external-dwelling.frame`
- `ui.external-dwelling.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.external-dwelling.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when named
  by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- The recruit command validates dwelling ownership / visit state,
  weekly stock, resource cost, hero army capacity, and creature merge
  legality before any state mutates.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before controls become enabled (per
  [`fail-loud.md`](../../../fail-loud.md)).

---

## 🔍 Sync Check

- **UI: ✔** — Selector table matches sibling `spec.md` § State Bindings and `interactions.md` § State Changes verbatim; action table matches `interactions.md` § Actions row-for-row.
- **Schema: ✔** — Every listed schema file exists under [`content-schema/schemas/`](../../../../../content-schema/schemas/); `RECRUIT_EXTERNAL_DWELLING_UNITS` is defined at the `recruitExternalDwellingUnits` variant of `command.schema.json`.
- **Tasks: ✔** — Owning UI task `phase-2.07-ui-screen-backlog.21-external-dwelling-screen` lists this file under Read First; the engine command task `mvp.05-adventure-map.13-recruit-external-dwelling-command` owns the reducer for `RECRUIT_EXTERNAL_DWELLING_UNITS`.

## ⚠ Issues

_None._
