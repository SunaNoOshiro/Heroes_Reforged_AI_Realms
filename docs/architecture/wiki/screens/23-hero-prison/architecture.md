# Screen 23 Architecture: Hero Prison

- System: `adventure`
- Screen ID: `hero-prison`
- Visual Archetype: `curated-hero-prison`
- Curation Status: `curated-pass-3`

## Companion Docs
- [`spec.md`](./spec.md) — components, bindings.
- [`interactions.md`](./interactions.md) — controls, commands,
  navigation.
- [`data-contracts.md`](./data-contracts.md) — schemas, selectors,
  commands.
- [`mockup.html`](./mockup.html) — visual reference.

## Purpose
Adventure prison dialog. Releases an imprisoned hero into the visiting
player's roster when capacity, ownership, and spawn-tile rules pass.

## Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

## Visual Composition
```mermaid
flowchart TD
  Root["HeroPrisonDialog"]
  Root --> C0["PrisonCellPortrait"]
  Root --> C1["ImprisonedHeroSummary"]
  Root --> C2["RosterCapacityPanel"]
  Root --> C3["ReleaseLeaveButtons"]
```

## Screen Load And Data Resolution
```mermaid
flowchart LR
  L0["state.ui.adventure.pendingPrisonId"] --> L1["state.mapObjects.byId[prisonId].heroId"]
  L1 --> L2["selectors.heroes.availableRosterSlots"]
  L2 --> L3["selectors.mapObjects.prisonReleaseTile"]
  L3 --> L4["HeroPrisonDialog render"]
```

## Main Interaction Flow
```mermaid
flowchart TD
  I0["Release click"] --> I1["selectors.heroes.prisonReleaseGuard"]
  I1 -->|accepted| I2["RELEASE_PRISON_HERO"]
  I1 -->|rejected| I5["Disabled control + localized reason"]
  I2 --> I3["Reducer: roster + prison + spawn"]
  I3 --> I4["Map spawn at prisonReleaseTile"]
```

## Animation Flow
```mermaid
sequenceDiagram
  participant UI
  participant Guard
  participant Reducer
  participant VFX
  UI->>UI: hover / focus / preview (local draft)
  UI->>Guard: confirm Release
  Guard->>Reducer: RELEASE_PRISON_HERO (when accepted)
  Reducer-->>UI: authoritative result
  UI->>VFX: bars lift, portrait brighten, roster glow, hero spawn
```

## Outgoing Transitions
```mermaid
flowchart LR
  Current["Hero Prison"]
  Current -->|prison.release| T0["07-adventure-map"]
  Current -->|prison.inspectHero| T1["46-hero-screen"]
  Current -->|prison.leave| T2["07-adventure-map"]
```

## State Inputs
| Symbol | Source | Notes |
| --- | --- | --- |
| `prisonId` | `state.ui.adventure.pendingPrisonId` | UI-local route state. |
| `imprisonedHero` | `state.mapObjects.byId[prisonId].heroId` | Hero record locked inside the prison. |
| `rosterSlots` | `selectors.heroes.availableRosterSlots` | Active player capacity. |
| `releaseGuard` | `selectors.heroes.prisonReleaseGuard` | Eligibility + reason. |
| `spawnTile` | `selectors.mapObjects.prisonReleaseTile` | Released-hero spawn tile. |

## Implementation Contract
- [`mockup.html`](./mockup.html) defines visual regions and data hooks
  only.
- [`spec.md`](./spec.md) defines the component / state contract.
- [`interactions.md`](./interactions.md) defines controls, timing,
  command routing, disabled states, and error behaviour.
- [`data-contracts.md`](./data-contracts.md) defines schemas, config,
  localization, assets, audio, VFX, save, and replay references.
- These diagrams are screen-specific summaries of the same contract
  and must not introduce hidden behaviour.

---

## 🔍 Sync Check

- **UI: ⚠** — Diagrams mirror
  [`spec.md`](./spec.md) and [`interactions.md`](./interactions.md).
  The `prison.inspectHero` arrow in *Outgoing Transitions* is not
  reflected by a control in [`mockup.html`](./mockup.html); flagged
  in sibling [`spec.md`](./spec.md) Issues.
- **Schema: ⚠** — `RELEASE_PRISON_HERO` is registered with
  [`mvp.05-adventure-map.12-release-prison-hero-command`](../../../../../tasks/mvp/05-adventure-map/12-release-prison-hero-command.md)
  per [`command-schema.md`](../../../command-schema.md);
  `OPEN_IMPRISONED_HERO_PREVIEW` and `CLOSE_HERO_PRISON` are not
  defined there. See sibling
  [`data-contracts.md`](./data-contracts.md) Issues.
- **Tasks: ✔** — UI surface owned by
  [`phase-2.07-ui-screen-backlog.23-hero-prison-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/23-hero-prison-screen.md);
  release reducer owned by
  [`mvp.05-adventure-map.12-release-prison-hero-command`](../../../../../tasks/mvp/05-adventure-map/12-release-prison-hero-command.md).
  Both list this screen package in Read First.

## ⚠ Issues

- **Inspect-hero transition has no mockup control.** *Outgoing
  Transitions* shows the `prison.inspectHero → 46-hero-screen` edge,
  but [`mockup.html`](./mockup.html) renders only RELEASE and LEAVE.
  See sibling [`spec.md`](./spec.md) Issues for the canonical
  statement; reconciler is
  [`phase-2.07-ui-screen-backlog.23-hero-prison-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/23-hero-prison-screen.md).
