# Screen 71: Pack Manager
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `manifest.schema.json` | Pack identity, `signature` (ed25519), `capabilities`, `contentRating`, `trustTier`. | [`content-schema/schemas/manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json) |
| `trust-store.schema.json` | Persisted decisions keyed on `(packId, contentHash)`; `decision ∈ {trust, sandboxed, deny}`, `scope ∈ {session, save, global}`. | [`content-schema/schemas/trust-store.schema.json`](../../../../../content-schema/schemas/trust-store.schema.json) |
| `publisher-registry.schema.json` | Publisher signing-key list backing the `signed-known` tier. | [`content-schema/schemas/publisher-registry.schema.json`](../../../../../content-schema/schemas/publisher-registry.schema.json) |
| `pack-revocation-list.schema.json` | Client-local revocation surface; `reason ∈ {malware, tampered, deprecated, user-revoked}`. | [`content-schema/schemas/pack-revocation-list.schema.json`](../../../../../content-schema/schemas/pack-revocation-list.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error message keys. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `installed` | `selectors.packs.installed` | Ordered manifest snapshots. |
| `trustStore` | `selectors.packs.trustStore` | Per-pack trust decisions; persisted in IndexedDB (`hr-trust.decisions`) per [`data-inventory.md`](../../../data-inventory.md). |
| `filter` | `state.ui.packManager.filter` | `all \| canonical \| third-party \| sandboxed \| denied`. |
| `selectedPackId` | `state.ui.packManager.selectedPackId` | Highlights the row whose actions are active. |
| `modeIndicator` | `selectors.session.moddedIndicator` | Closed enum `off \| trusted \| sandboxed \| mixed`; mirrors the status-bar badge from [`pack-trust.md` § 6](../../../pack-trust.md#6-modded-indicator). |

### Commands And Events
Defined in [`command-schema.md` § Save-Import & Pack-Trust Commands](../../../command-schema.md#save-import--pack-trust-commands)
and [`command-schema.md` § Consent, Onboarding & Destructive-UX
Commands](../../../command-schema.md#consent-onboarding--destructive-ux-commands).

- `OPEN_PACK_MANAGER` (`packManager.open`) — mount the manager.
  local-ui.
- `INSTALL_PACK_FROM_FILE` (`packManager.install`) — file picker
  → traversal sanitizer → screen 72.
- `OPEN_PACK_TRUST_PROMPT` (`packManager.trust`) — route the
  selected pack to screen 72; the `GRANT_PACK_TRUST` write
  happens there. local-ui.
- `RUN_PACK_SANDBOXED` (`packManager.sandboxed`) — writes
  `decision = "sandboxed"` (downgrade — no re-prompt).
- `REQUEST_CONFIRMATION` → `REVOKE_PACK_TRUST`
  (`packManager.revoke`) — guarded revoke; drops the trust-store
  entry on accept.
- `REQUEST_CONFIRMATION` → `REMOVE_PACK` (`packManager.remove`) —
  guarded uninstall (`severity: 'critical'`,
  `requireType: 'UNINSTALL'`); drops every trust-store entry for
  that `packId`.
- `CLOSE_PACK_MANAGER` (`packManager.close`) — return to caller.
  local-ui.
- `SET_PACK_MANAGER_FILTER` (`packManager.filter`) — update the
  filter slice. local-ui.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`

### Localization Keys
- `ui.pack-manager.filter.title`
- `ui.pack-manager.list.title`
- `ui.pack-manager.actions.title`
- `ui.pack-trust.tier.signed-known`
- `ui.pack-trust.tier.signed-unknown`
- `ui.pack-trust.tier.unsigned`
- `ui.pack-trust.tier.signature-failed`
- `ui.pack-trust.error.revoked`
- `ui.pack-trust.capability.formulas`
- `ui.pack-trust.capability.spells`
- `ui.pack-trust.capability.abilities`
- `ui.pack-trust.capability.assets`
- `ui.pack-trust.capability.no-scripts`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`
- `error.storage.rejected.body` (per
  [`interactions.md` § Error surfaces](./interactions.md#error-surfaces))

### Asset, Sound, And VFX IDs
- `ui.pack-manager.background`
- `ui.pack-manager.frame`
- `ui.pack-manager.icons.tier`
- `audio.ui.hover`, `audio.ui.click`

### Save And Replay Fields
- This screen never writes save state.
- Trust-store writes are persisted in IndexedDB under
  `hr-trust.decisions` (per
  [`data-inventory.md`](../../../data-inventory.md) row
  `trust store`); they are not embedded in any save record.

### Validation And Fallback
- All actions consult the trust-anchor lookup precedence in
  [`pack-trust.md` § 4](../../../pack-trust.md#4-trust-anchors)
  before mutating the trust store.
- Revocation-list entries with `reason ∈ {malware, tampered}`
  cannot be trusted or sandboxed; only `REMOVE_PACK` is enabled.
- Safe mode (`state.session.safeMode === true`) bypasses the
  trust store and disables every action except `REMOVE_PACK` and
  `CLOSE_PACK_MANAGER` per
  [`pack-trust.md` § 5](../../../pack-trust.md#5-safe-mode).

---

## 🔍 Sync Check

- **UI: ⚠** — Selectors and commands match sibling
  [`spec.md`](./spec.md) state bindings and sibling
  [`interactions.md`](./interactions.md) action rows.
  `data-action` attributes in `mockup.html` agree with the action
  IDs above (`packManager.{install,trust,sandboxed,revoke,remove,close}`).
  Empty-state copy in the mockup is not yet bound to a
  localization key — flagged in Issues.
- **Schema: ✔** —
  [`trust-store.schema.json`](../../../../../content-schema/schemas/trust-store.schema.json)
  pins `decision ∈ {trust, sandboxed, deny}`, `scope ∈ {session,
  save, global}`, and the `^[a-f0-9]{16}$` `contentHash` pattern;
  [`pack-revocation-list.schema.json`](../../../../../content-schema/schemas/pack-revocation-list.schema.json)
  pins `reason ∈ {malware, tampered, deprecated, user-revoked}`;
  [`manifest.schema.json`](../../../../../content-schema/schemas/manifest.schema.json)
  pins the `capabilities` enum (`formulas.ast`, `spells.custom-kind`,
  `abilities.custom-kind`, `assets.binary`, `scripts.none`) — every
  `ui.pack-trust.capability.*` key maps per
  [`pack-trust.md` § 4 Capability disclosure](../../../pack-trust.md#4-trust-anchors).
  Rows present in [`schema-matrix.md`](../../../schema-matrix.md) for
  `Manifest`, `TrustStore`, `PublisherRegistry`,
  `PackRevocationList`, `Localization`.
- **Tasks: ✔** — Owning task
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md)
  reserves `src/persistence/trust-store.ts` (IndexedDB
  reader/writer) and `src/content-runtime/trust-anchors.ts` (lookup
  precedence); schema tasks
  [`29-publisher-registry-schema`](../../../../../tasks/mvp/02-content-schemas/29-publisher-registry-schema.md),
  [`30-pack-revocation-list-schema`](../../../../../tasks/mvp/02-content-schemas/30-pack-revocation-list-schema.md),
  and
  [`31-trust-store-schema`](../../../../../tasks/mvp/02-content-schemas/31-trust-store-schema.md)
  ship the schemas this screen binds to.

## ⚠ Issues

- **Empty-state copy not registered as a localization key.**
  `mockup.html` shows the line `empty-state: only canonical
  content is installed.` without a `data-i18n` attribute; this
  file's Localization Keys block enumerates filter / list /
  actions titles but no empty-state key. Flagged in sibling
  [`spec.md`](./spec.md#-issues) — the screen-implementation task
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../../../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md)
  must add a `data-i18n` attribute to the mockup line and the
  matching key here. Suggested key:
  `ui.pack-manager.empty.canonical-only`. Skill did not invent
  the key (Hard Prohibition B).
