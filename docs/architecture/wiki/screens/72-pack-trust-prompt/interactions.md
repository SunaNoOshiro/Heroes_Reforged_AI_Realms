# Screen 72: Pack Trust Prompt
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Companion Docs
- [`pack-trust.md`](../../../pack-trust.md) — anchors
  [§ 4](../../../pack-trust.md#4-trust-anchors),
  [§ 5](../../../pack-trust.md#5-safe-mode),
  [§ 7](../../../pack-trust.md#7-trust--safety-phrasing),
  [§ 10](../../../pack-trust.md#10-error-codes).
- [`command-schema.md` § Save-Import & Pack-Trust](../../../command-schema.md#save-import--pack-trust-commands)
  — canonical command list.
- Owning task:
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md).

### Purpose
Per-pack trust review and persistence-scope picker. Writes a
[`trust-store.schema.json`](../../../../../content-schema/schemas/trust-store.schema.json)
entry on confirm. Cancel drops the pending decision; the caller's
staged save (if any) stays in quarantine.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Open trust prompt | `packTrust.open` | navigation | Current | `OPEN_PACK_TRUST_PROMPT` | Mounts the prompt with the pending request. | Ribbon stamps tier colour. |
| Trust this pack | `packTrust.trust` | command | Caller (70 or 71) | `GRANT_PACK_TRUST` | Writes `decision = "trust"` at the chosen scope. | Ribbon transitions to green; modal closes. |
| Run sandboxed | `packTrust.sandboxed` | command | Caller (70 or 71) | `RUN_PACK_SANDBOXED` | Writes `decision = "sandboxed"`. | Ribbon transitions to amber; modal closes. |
| Deny | `packTrust.deny` | command | Caller (70 or 71) | `DENY_PACK_TRUST` | Writes `decision = "deny"`; gates further mounts. | Ribbon transitions to red; modal closes. |
| Cancel | `packTrust.cancel` | local-ui | Caller (70 or 71) | `CLOSE_PACK_TRUST_PROMPT` | Drops the pending decision; staged save remains in quarantine. | Modal fades out. |
| Set persistence scope | `packTrust.setScope` | local-ui | Current | `SET_PACK_TRUST_SCOPE` | Updates `state.ui.packTrust.scope`. | Radio group highlights selection. |
| Toggle transitive consent | `packTrust.toggleTransitive` | local-ui | Current | `TOGGLE_PACK_TRUST_TRANSITIVE` | Updates per-dependency consent flags. | Row checkbox highlights. |

### State Changes
- `selectors.packs.trustStore` updates after `GRANT_PACK_TRUST`,
  `RUN_PACK_SANDBOXED`, or `DENY_PACK_TRUST`.
- `state.ui.packTrust.scope` defaults to `session`; persists per
  scope on confirm.
- UI-only hover, focus, ribbon glow, and animation frame stay
  outside deterministic gameplay state.

### Navigation Outcomes
- Trust / sandboxed / deny / cancel route back to the caller
  (screen 70 or 71) after the trust-store write (or, for cancel,
  immediately).

### Disabled And Error Cases
- `tier = signature-failed` → `Trust this pack` is **removed** (not
  disabled); only Cancel and Deny remain.
- Revocation entry with `reason ∈ {malware, tampered}` → all
  positive controls disabled; banner cites `ui.pack-trust.error.revoked`.
- Revocation entry with `reason ∈ {deprecated, user-revoked}` →
  decision ceiling is `sandboxed` per
  [`pack-trust.md` § 4 Trust Anchors](../../../pack-trust.md#4-trust-anchors).
- Safe mode (`state.session.safeMode === true`) disables every
  positive decision; banner cites
  [`pack-trust.md` § 5 Safe Mode](../../../pack-trust.md#5-safe-mode).
- Transitive rows cannot be batch-trusted; `Trust this pack` only
  applies to the header pack — each dependency re-prompts.

### Error Formatter
- Toast / banner / modal copy is produced by
  `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md). Never
  construct error strings inline.

## Error surfaces

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Trust / sandboxed / deny | `STORAGE_REJECTED` | modal | `error.storage.rejected.body` | Trust-store write failure surfaces as a modal per [`error-ux.md` § 2 STORAGE_*](../../../error-ux.md#2-code--surface-mapping). |

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams mirror these interactions rather than
  inventing new behavior.
- All copy follows
  [`pack-trust.md` § 7 Trust & Safety Phrasing](../../../pack-trust.md#7-trust--safety-phrasing).

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs, command tokens, and target screens match
  sibling [`spec.md`](./spec.md) § State Bindings,
  [`data-contracts.md`](./data-contracts.md) § Commands And Events,
  and [`architecture.md`](./architecture.md) § Outgoing Transitions.
- **Schema: ✔** — `decision` enum (`trust | sandboxed | deny`) and
  `scope` enum (`session | save | global`) match
  [`trust-store.schema.json`](../../../../../content-schema/schemas/trust-store.schema.json);
  revocation `reason ∈ {malware, tampered, deprecated, user-revoked}`
  matches
  [`pack-revocation-list.schema.json`](../../../../../content-schema/schemas/pack-revocation-list.schema.json).
- **Tasks: ✔** — Engine-side behaviour owned by
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md);
  trust-store IndexedDB store registered in
  [`data-inventory.md`](../../../data-inventory.md) row `trust store`.

## ⚠ Issues

- **`STORAGE_REJECTED` is a prefix-shape code, not a schema enum.**
  The Error-surfaces row uses `STORAGE_REJECTED` consistent with the
  `STORAGE_*` prefix convention in
  [`error-ux.md` § 2](../../../error-ux.md#2-code--surface-mapping).
  The canonical
  [`storage-error.schema.json`](../../../../../content-schema/schemas/storage-error.schema.json)
  pins bare codes such as `QUOTA_EXCEEDED` / `IDB_*` without the
  `STORAGE_` prefix. This is a known structural drift already
  flagged in the
  [`error-ux.md`](../../../error-ux.md) audit trailer; no fix in
  this screen package will close the gap. Owner:
  [`mvp.00-core-architecture.22-01-error-formatter-contract`](../../../../../tasks/mvp/00-core-architecture/22-01-error-formatter-contract.md)
  (bridges schema-rule → UI-prefixed code). Skill did not edit the
  schema (Hard Prohibition D). See sibling
  [`data-contracts.md`](./data-contracts.md) — aligned on the same
  pinning.
- **`CLOSE_PACK_TRUST_PROMPT`, `SET_PACK_TRUST_SCOPE`,
  `TOGGLE_PACK_TRUST_TRANSITIVE` are not enumerated in
  [`command-schema.md`](../../../command-schema.md).** All three
  appear in the Actions table above as `local-ui` tokens; the
  Save-Import & Pack-Trust section of `command-schema.md` lists
  only `OPEN_PACK_TRUST_PROMPT`, `GRANT_PACK_TRUST`,
  `DENY_PACK_TRUST`, `RUN_PACK_SANDBOXED`, and `REVOKE_PACK_TRUST`.
  Per the screen-command-coverage gate
  [`screen-command-coverage.json`](../../../screen-command-coverage.json),
  the owning task
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md)
  must add `local-ui` rows for these three tokens (or mark them
  out-of-scope with an owning task). See sibling
  [`spec.md`](./spec.md) — aligned.
