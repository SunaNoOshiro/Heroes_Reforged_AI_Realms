# Screen 72: Pack Trust Prompt
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Per-pack trust review and persistence-scope picker. Writes a
`trust-store.schema.json` entry on confirm.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Open trust prompt | `packTrust.open` | navigation | Current screen | `OPEN_PACK_TRUST_PROMPT` | Mounts the prompt with the pending request. | Ribbon stamps tier colour. |
| Trust this pack | `packTrust.trust` | command | Caller (70 or 71) | `GRANT_PACK_TRUST` | Writes `decision = "trust"` at the chosen scope. | Ribbon transitions to green; modal closes. |
| Run sandboxed | `packTrust.sandboxed` | command | Caller (70 or 71) | `RUN_PACK_SANDBOXED` | Writes `decision = "sandboxed"`. | Ribbon transitions to amber; modal closes. |
| Deny | `packTrust.deny` | command | Caller (70 or 71) | `DENY_PACK_TRUST` | Writes `decision = "deny"`; gates further mounts. | Ribbon transitions to red; modal closes. |
| Cancel | `packTrust.cancel` | local-ui | Caller (70 or 71) | `CLOSE_PACK_TRUST_PROMPT` | Drops the pending decision; staged save remains in quarantine. | Modal fades out. |
| Set persistence scope | `packTrust.setScope` | local-ui | Current screen | `SET_PACK_TRUST_SCOPE` | Updates `state.ui.packTrust.scope`. | Radio group highlights selection. |
| Toggle transitive consent | `packTrust.toggleTransitive` | local-ui | Current screen | `TOGGLE_PACK_TRUST_TRANSITIVE` | Updates per-dependency consent flags. | Row checkbox highlights. |

### State Changes
- `selectors.packs.trustStore` updates after `GRANT_PACK_TRUST`,
  `RUN_PACK_SANDBOXED`, or `DENY_PACK_TRUST`.
- `state.ui.packTrust.scope` defaults to `session`; persists per
  scope on confirm.
- UI-only hover, focus, ribbon glow, and animation frame stay
  outside deterministic gameplay state.

### Navigation Outcomes
- Trust / sandboxed / deny / cancel can route back to the caller
  (screen 70 or screen 71) after the trust-store write.

### Disabled And Error Cases
- `tier = signature-failed` → `Trust this pack` is **removed** (not
  disabled). The user must Cancel or Deny.
- Pack on the revocation list with `reason in [malware, tampered]`
  → all positive controls disabled; only Deny / Cancel remain.
- Safe mode (`state.session.safeMode === true`) disables every
  positive decision; banner cites `pack-trust.md § Safe Mode`.
- Transitive rows cannot be batch-trusted; "Trust this pack" only
  applies to the header pack — each transitive row requires its
  own re-prompt.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.
- All copy follows
  [`pack-trust.md` § Trust & Safety Phrasing](../../../pack-trust.md#7-trust--safety-phrasing).

## Error surfaces

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Trust / sandboxed / deny | STORAGE_REJECTED | modal | `error.storage.rejected.body` | Default per `error-ux.md` § 2 STORAGE_*; trust-store write failure surfaces as modal. |
