# Screen 49: Hero Meeting — Data Contracts

## Source Files

- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Interactions: [`interactions.md`](./interactions.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

Cross-package references:
[`command-schema.md`](../../../command-schema.md),
[`screen-command-coverage.json`](../../../screen-command-coverage.json),
[`data-inventory.md`](../../../data-inventory.md),
[`error-ux.md`](../../../error-ux.md),
[`error-formatter.md`](../../../error-formatter.md).

## Content Schemas And Registries

| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `command.schema.json` | `TRANSFER_HERO_ARMY_STACK` and `TRANSFER_HERO_ARTIFACT` envelopes and validation gate. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |
| `hero.schema.json` | Hero identity, ownership, equipped artifacts, backpack, and army container. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `unit.schema.json` | Stack stats, merge legality, army capacity. | [`content-schema/schemas/unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) |
| `artifact.schema.json` | Artifact records, equip slots, backpack rules, tooltip effects. | [`content-schema/schemas/artifact.schema.json`](../../../../../content-schema/schemas/artifact.schema.json) |
| `ruleset.schema.json` | Deterministic transfer / adjacency constants consumed by the guard. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error message keys. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |

## Runtime State Selectors

| UI Element | Selector | Notes |
| --- | --- | --- |
| `leftHero` | `state.ui.heroMeeting.leftHeroId` | First friendly hero. |
| `rightHero` | `state.ui.heroMeeting.rightHeroId` | Second friendly hero. |
| `leftArmy` | `state.heroes.byId[left].army` | Left hero stacks. |
| `rightArmy` | `state.heroes.byId[right].army` | Right hero stacks. |
| `dragDraft` | `state.ui.heroMeeting.dragDraft` | Local transfer draft (in-memory). |

Local drafts under `state.ui.heroMeeting.*` are session-only,
in-memory, and require no
[`data-inventory.md`](../../../data-inventory.md) row.

## Commands And Events

Resolution rules per
[`screen-command-coverage.json`](../../../screen-command-coverage.json):

| Action | Token | Resolution | Effect |
| --- | --- | --- | --- |
| `heroMeeting.dragStack` | `START_HERO_MEETING_DRAG` | UI-local (matches `START_` prefix). | Creates the drag draft on `state.ui.heroMeeting.dragDraft`. |
| `heroMeeting.dropStack` | `TRANSFER_HERO_ARMY_STACK` | Schema-backed; dispatched through the shared command hook. | Moves, merges, swaps, or rejects the transfer between the two hero armies. |
| `heroMeeting.moveArtifact` | `TRANSFER_HERO_ARTIFACT` | Schema-backed; dispatched through the shared command hook. | Moves the artifact between heroes when slot / backpack rules allow. |
| `heroMeeting.close` | `CLOSE_HERO_MEETING` | UI-local (matches `CLOSE_` prefix); routes to [`07-adventure-map`](../07-adventure-map/). | Closes the modal; preserves no draft. |

Engine ownership:
[`tasks/mvp/05-adventure-map/18-transfer-stack-commands.md`](../../../../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md)
(stacks);
[`tasks/phase-2/01-spells-artifacts/05b-transfer-hero-artifact-command.md`](../../../../../tasks/phase-2/01-spells-artifacts/05b-transfer-hero-artifact-command.md)
(artifacts).

## Config Keys

- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

## Localization Keys

- `ui.hero-meeting.title`
- `ui.hero-meeting.actions.*`
- `ui.hero-meeting.status.*`
- `ui.hero-meeting.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`
- Error keys resolve through
  [`error-formatter.md`](../../../error-formatter.md) under the
  closed `errors.*` namespace.

## Asset, Sound, And VFX IDs

- `ui.hero-meeting.background`
- `ui.hero-meeting.frame`
- `ui.hero-meeting.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.hero-meeting.*`

## Save And Replay Fields

- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when named
  by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

## Validation And Fallback

- The dispatcher validates `TRANSFER_HERO_ARMY_STACK` against
  ownership, hero lock state, army capacity, one-creature-left
  rules, and meeting-tile adjacency before reducing both heroes
  atomically.
- `TRANSFER_HERO_ARTIFACT` additionally validates artifact
  ownership, equip-slot legality, and backpack capacity per
  [`phase-2.01-spells-artifacts.05b-transfer-hero-artifact-command`](../../../../../tasks/phase-2/01-spells-artifacts/05b-transfer-hero-artifact-command.md).
- Missing presentation may fall back through the asset resolver
  (see [`asset-loading.md`](../../../asset-loading.md)).
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly per [`fail-loud.md`](../../../fail-loud.md) before
  controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors, command tokens, and asset / localization roots match [`spec.md` § State Bindings](./spec.md#state-bindings), [`interactions.md` § 1 Actions](./interactions.md#1-actions), and the modal regions in [`mockup.html`](./mockup.html).
- **Schema: ✔** — `TRANSFER_HERO_ARMY_STACK` and `TRANSFER_HERO_ARTIFACT` defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (lines 1516, 1611); `START_HERO_MEETING_DRAG` and `CLOSE_HERO_MEETING` covered by the `START_` / `CLOSE_` entries in [`screen-command-coverage.json`](../../../screen-command-coverage.json) `localUiPrefixes`. No persisted slice requires a [`data-inventory.md`](../../../data-inventory.md) row.
- **Tasks: ✔** — UI screen owned by [`phase-2.07-ui-screen-backlog.49-hero-meeting-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/49-hero-meeting-screen.md); reducer ownership split between [`mvp.05-adventure-map.18-transfer-stack-commands`](../../../../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md) and [`phase-2.01-spells-artifacts.05b-transfer-hero-artifact-command`](../../../../../tasks/phase-2/01-spells-artifacts/05b-transfer-hero-artifact-command.md). Both reducer tasks name `interactions.md` in Read First.

## ⚠ Issues

_None._
