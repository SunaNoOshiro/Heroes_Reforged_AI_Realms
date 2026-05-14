# Screen 60: Confirmation Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Reusable modal that gates destructive, irreversible, or
route-changing actions. The dialog itself has no gameplay logic — it
queues the caller-supplied command and dispatches it once the
[`ConfirmEnabled`](./interactions.md#confirmenabled-predicate)
predicate passes.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Z-Layer: `1000` (Modal dialogs) per
  [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Small centered red-bronze modal over a dimmed caller screen: icon,
  localized prompt, Confirm/Cancel buttons, optional warning line.
- Dense classic fantasy strategy UI: fixed `800 × 600` layout, ornate
  gold frame, red/brown/stone panels.
- `mockup.html` contains visible UI only. Logic, timing, and
  implementation notes live in the sibling Markdown files.

### Component Tree
- `ConfirmationDialog`
  - `DimmedCaller`
  - `WarningIcon`
  - `PromptText`
  - `RequireTypeChallenge` — mounted only when `requireType != null`
  - `ConfirmCancelButtons`

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `pendingAction` | `state.ui.confirmation.pendingAction` | Caller command/event awaiting confirmation. |
| `promptKey` | `state.ui.confirmation.promptKey` | Localization key for the prompt text. |
| `callerRoute` | `state.ui.confirmation.callerRoute` | Screen to return to on cancel. |
| `confirmPayload` | `state.ui.confirmation.payload` | Stable IDs / scalars passed through on confirm. |
| `severity` | `state.ui.confirmation.severity` | Closed enum `info` / `warning` / `critical`. Load-bearing — drives styling **and** the input gate in [Click-Through Resistance](#click-through-resistance). |
| `openedAt` | `state.ui.confirmation.openedAt` | Wall-clock at modal mount, used by the click-through-resistance timer. Never enters saves, replays, or the canonical state hash. |
| `confirmDelayMs` | `state.ui.confirmation.confirmDelayMs` | Optional integer (ms). When omitted, falls back to the per-severity default in [Click-Through Resistance](#click-through-resistance). |
| `requireType` | `state.ui.confirmation.requireType` | Optional literal text the user must type before `Confirm` enables. Reserved for `severity: critical`. |
| `typedConfirmText` | `state.ui.confirmation.typedConfirmText` | Live local input from `RequireTypeChallenge`; presentation-only, cleared on close. |
| `popInComplete` | `state.ui.confirmation.popInComplete` | Set by the modal pop-in animation end-frame; cleared on close. While `false`, `Confirm` stays disabled regardless of `confirmDelayMs`. |

### Click-Through Resistance
`Confirm` is disabled until **all** four conditions hold:

1. `pendingAction != null`
2. `now() - openedAt >= confirmDelayMs`
3. `popInComplete === true`
4. `requireType == null || typedConfirmText === requireType`

Per-severity defaults applied when the caller omits the optional
fields:

| `severity`  | default `confirmDelayMs` | optional `requireType`                                                  |
|-------------|--------------------------|-------------------------------------------------------------------------|
| `info`      | `0`                      | unsupported                                                             |
| `warning`   | `750`                    | `false` (omitted)                                                       |
| `critical`  | `1500`                   | caller-supplied (e.g. `'CONFIRM'`, `'UNINSTALL'`, `'REVOKE'`, `'DEV'`)  |

Defaults are applied by the single builder in
`src/ui/confirmation/` per
[`mvp.07-ui-shell.28-confirmation-dialog-hardening`](../../../../../tasks/mvp/07-ui-shell/28-confirmation-dialog-hardening.md):
any `severity: 'critical'` payload without `confirmDelayMs` MUST
inherit `1500`. `severity` is the closed input-gate selector — it is
not "warning styling only".

### Mechanics Mapping
- The dialog dispatches the pending caller command; it owns no
  reducer logic of its own.
- UI previews stay local until the caller's command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas, never via
  hardcoded view logic.

### Animation Contract
- Modal pops in, warning icon pulses, `Confirm` depresses on accept,
  caller-provided transition animation plays after the accepted
  command/route resolves.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes via static
  highlights and localized feedback (no pop-in, no pulse).

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  package's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- Interactions covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file holds screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify every schema, config, localization, asset,
  sound, VFX, save, and replay field required to implement the
  screen.

### AI Implementation Notes
- Screen slug `confirmation-dialog`; system group `system`; curation
  marker `curated-pass-6`.
- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs / manifests; deterministic
  commands carry stable IDs and scalar values only.

---

## 🔍 Sync Check

- **UI: ✔** — Layout, Z-layer (`1000`), and component tree match `mockup.html` and the modal entry in [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract); sibling `interactions.md` and `data-contracts.md` align on the same component, command, and selector names.
- **Schema: ✔** — `state.ui.confirmation.*` bindings match the `REQUEST_CONFIRMATION` payload in [`command-schema.md` § Consent, Onboarding & Destructive-UX Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands); per-severity defaults match the hardening task `Inputs` section.
- **Tasks: ✔** — Owning task [`phase-2.07-ui-screen-backlog.60-confirmation-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/60-confirmation-dialog-screen.md) Reads First this file; hardening task [`mvp.07-ui-shell.28-confirmation-dialog-hardening`](../../../../../tasks/mvp/07-ui-shell/28-confirmation-dialog-hardening.md) owns `src/ui/confirmation/` and enforces the per-severity defaults.

## ⚠ Issues

_None._
