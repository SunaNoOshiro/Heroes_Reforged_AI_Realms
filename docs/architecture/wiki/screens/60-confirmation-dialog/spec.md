# Screen 60: Confirmation Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Reusable confirmation dialog for destructive, irreversible, or route-changing actions.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Z-Layer: 1000 per [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Small centered red-bronze modal over dimmed caller screen with icon, localized prompt, Confirm/Cancel buttons, and caller-specific warning line.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- ConfirmationDialog
  - DimmedCaller
  - WarningIcon
  - PromptText
  - RequireTypeChallenge
  - ConfirmCancelButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| pendingAction | state.ui.confirmation.pendingAction | Action/event awaiting confirmation. |
| promptKey | state.ui.confirmation.promptKey | Localized prompt key. |
| callerRoute | state.ui.confirmation.callerRoute | Screen to return on cancel. |
| confirmPayload | state.ui.confirmation.payload | Stable IDs/scalars passed on confirm. |
| severity | state.ui.confirmation.severity | Closed enum `info` / `warning` / `critical`. Load-bearing — drives both styling **and** the input gate in [Click-Through Resistance](#click-through-resistance). |
| openedAt | state.ui.confirmation.openedAt | Wall-clock at modal mount; used by the click-through-resistance timer. Never enters saves, replays, or the canonical state hash. |
| confirmDelayMs | state.ui.confirmation.confirmDelayMs | Optional integer (ms). When omitted, falls back to the per-severity default in [Click-Through Resistance](#click-through-resistance). |
| requireType | state.ui.confirmation.requireType | Optional literal text the user must type before `Confirm` enables. Combined with `severity: critical` for high-impact actions. |
| typedConfirmText | state.ui.confirmation.typedConfirmText | Live local input from `RequireTypeChallenge`; presentation-only. |
| popInComplete | state.ui.confirmation.popInComplete | Set by the modal pop-in animation end-frame. While `false`, `Confirm` stays disabled regardless of `confirmDelayMs`. |

### Click-Through Resistance
The modal hardens against reflexive confirm clicks. `Confirm` is
disabled until **all** of the following are true:

1. `pendingAction != null`
2. `now - openedAt >= confirmDelayMs`
3. `popInComplete === true`
4. `requireType == null || typedConfirmText === requireType`

Defaults consumed when the caller omits the optional fields:

| `severity`   | default `confirmDelayMs` | optional `requireType` |
|--------------|--------------------------|------------------------|
| `info`       | `0`                      | unsupported            |
| `warning`    | `750`                    | `false` (omitted)      |
| `critical`   | `1500`                   | caller-supplied (e.g. `'CONFIRM'`, `'UNINSTALL'`, `'REVOKE'`, `'DEV'`) |

Any caller dispatching `REQUEST_CONFIRMATION` with `severity: 'critical'`
and no `confirmDelayMs` MUST inherit the `1500` default — the
confirmation builder in `src/ui/confirmation/` is the single enforcement
point. `severity` is no longer "warning styling only"; it is the closed
input-gate selector.

### Mechanics Mapping
- Executes only the pending confirmed event supplied by caller. Dialog itself has no gameplay logic beyond confirm/cancel routing.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Modal pops in, warning icon pulses, Confirm button depresses, and accepted action plays caller-provided transition animation.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `confirmation-dialog`; system group: `system`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
