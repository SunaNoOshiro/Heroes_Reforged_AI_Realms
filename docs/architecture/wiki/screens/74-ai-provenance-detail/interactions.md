# Screen 74: AI Provenance Detail
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Surface `manifest.aiProvenance` to the player. Read-only; no
mutation. Triggered by the `[AI]` badge on info-cards.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Open provenance | `aiProvenance.open` | navigation | Current screen | `OPEN_AI_PROVENANCE` | Mounts the modal with the target pack's provenance block. | Modal drops in over dimmed caller. |
| Close | `aiProvenance.close` | local-ui | Caller | `CLOSE_AI_PROVENANCE` | Drops the modal. | Modal fades. |
| Open content report | `aiProvenance.report` | navigation | `75-content-report` | `OPEN_CONTENT_REPORT` | Routes to screen 75 with `targetType = ai-faction` and `targetId = pack.id` pre-filled. | Modal crossfades. |

### State Changes
- No deterministic state is mutated.
- UI-only hover, focus, scroll, and animation frame stay outside
  deterministic gameplay state.

### Navigation Outcomes
- Close routes back to the caller (info-card, pack-manager).
- Report routes to screen 75 (content-report).

### Disabled And Error Cases
- When `aiProvenance.present === false`, this screen does not mount;
  the `[AI]` badge is not rendered upstream.
- When `aiProvenance.playerInspectable === false`, the body collapses
  to a single line `ui.ai-provenance.details-unavailable` and the
  detail rows are hidden; the close affordance remains.


### Error Formatter

- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.
- All copy follows
  [`ugc-safety.md` § Localization Keys](../../../ugc-safety.md#7-localization-keys).
