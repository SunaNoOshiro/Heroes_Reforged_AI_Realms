# Data Inventory

> Single source of truth for every persisted field in Heroes Reforged.
> The `WIPE_LOCAL_DATA` handler iterates this table; it is **not** a
> hand-coded list. Every new persistent slice MUST add a row here
> **before** being merged.

Companion docs:
[`persistence.md`](./persistence.md) (per-slice medium and the
`localStorage` ban),
[`permissions.md`](./permissions.md) (OS / browser API allowlist),
[`ugc-safety.md`](./ugc-safety.md) (text and binary sanitization
upstream of saves),
[`age-gate.md`](./age-gate.md) (`config.player.ageGate` lifecycle).

## 1. Inventory Table

| Field | State path | Medium | Sensitivity | Retention | Wipe scope | Notes |
|------|------------|--------|-------------|-----------|------------|-------|
| `displayName` (active session) | `state.players.byId.*.displayName` | in-memory | medium | session | n/a | transient; never persisted |
| `playerHash` (saves) | save `metadata.playerHash` | IndexedDB (`hr-saves.slots`) | low | until user-deleted | `WIPE_LOCAL_DATA scope=saves\|all` | salted xxh64; replaces cleartext name in saves |
| `playerName` (saves, opt-in) | save `metadata.playerName` | IndexedDB (`hr-saves.slots`) | medium | until user-deleted | `WIPE_LOCAL_DATA scope=saves\|all` | only present when `displayNameMode = clear` |
| `playerLabel` (saves) | save `metadata.playerLabel` | IndexedDB (`hr-saves.slots`) | low | until user-deleted | `WIPE_LOCAL_DATA scope=saves\|all` | short opaque label rendered in lieu of cleartext name |
| local salt | `state.privacy.localSalt` (mirror) | IndexedDB (`hr-profile.keys`) | high | until user-deleted | `WIPE_LOCAL_DATA scope=profile\|all` | per-installation; never leaves device |
| salt fingerprint | `state.privacy.options.saltFingerprint` | IndexedDB (`hr-profile.privacy`) | low | until user-deleted | `WIPE_LOCAL_DATA scope=profile\|all` | first 4 hex chars; user-visible verification |
| high-score entries | `state.profile.highScores` | IndexedDB (`hr-profile.profile`) | low | rolling top-10 | `WIPE_LOCAL_DATA scope=profile\|all` | renders `playerLabel`, never `playerName` |
| UI options | `state.ui.options` | IndexedDB (`hr-profile.options`) | low | until user-deleted | `WIPE_LOCAL_DATA scope=profile\|all` | volume, language, hotkeys, reduced-motion |
| privacy options | `state.privacy.options` | IndexedDB (`hr-profile.privacy`) | low | until user-deleted | `WIPE_LOCAL_DATA scope=profile\|all` | analytics opt-in, mature-content gate, displayNameMode |
| consent records | `state.profile.consent` | IndexedDB (`hr-profile.consent`) | low | until user-deleted | `WIPE_LOCAL_DATA scope=profile\|all` | per-scope `consent.schema.json` records; backs the Privacy tab consent rows; load-bearing for `selectFeatureAvailability` |
| consent audit log | `state.profile.consentAuditLog` | IndexedDB (`hr-profile.audit`) | low | rolling capacity (default 256) | `WIPE_LOCAL_DATA scope=profile\|all` | append-only `consent-audit-log.schema.json` ring buffer; rendered by `ConsentHistoryPanel` |
| age gate | `config.player.ageGate` | IndexedDB (`hr-profile.options`) | low | until user-deleted | `WIPE_LOCAL_DATA scope=profile\|all` | `'unknown' \| 'under13' \| 'over13'` per [`age-gate.md`](./age-gate.md); cascades into the consent matrix |
| known peers | `state.profile.knownPeers` | IndexedDB (`hr-profile.knownPeers`) | medium | LRU 256, 30-day implicit retention for `tier: recent` | `WIPE_LOCAL_DATA scope=profile\|all` | `peer-allowlist.schema.json`; writes require `consent.multiplayer === 'granted'` |
| lobby chat (transient) | `state.net.lobby.chat` | in-memory | medium | session | n/a | not persisted; cleared on lobby exit |
| save thumbnail | save `metadata.thumbnail` | IndexedDB (`hr-saves.slots`) | low | until save deleted | `WIPE_LOCAL_DATA scope=saves\|all` | base64 PNG/WebP |
| AI prompt (per pack) | pack `manifest.aiProvenance.promptExcerpt` | IndexedDB (`hr-packs.packs`) + `.hrmod` | medium | until pack uninstalled | n/a (pack scope) | truncated to 280 chars |
| outbound content reports | `state.privacy.outboundReports[]` | IndexedDB (`hr-profile.reports`) | medium | until dequeued or user-deleted | `WIPE_LOCAL_DATA scope=profile\|all` | local queue with retry stub; consumes the moderation backend when authored |
| trust store | `selectors.packs.trustStore` | IndexedDB (`hr-trust.decisions`) | low | until user-revoked | `WIPE_LOCAL_DATA scope=profile\|all` | per-pack decisions |
| pack store (`.hrmod` bytes) | (binary) | IndexedDB (`hr-packs.packs`) | low | until uninstalled | `WIPE_LOCAL_DATA scope=profile\|all` | runtime managed by the pack loader |
| signed publish ack | pack `signed-acks/<contentHash>.json` | in-pack file (`.hrmod`) | low | bound to pack lifetime | n/a (pack scope) | per-pack content-policy ack timestamp |
| `analyticsClientId` | `state.privacy.options.analyticsClientId` (FUTURE) | IndexedDB (`hr-profile.privacy`) | medium | until user-deleted | `WIPE_LOCAL_DATA scope=profile\|all` | **not generated at v1**; future opt-in only; UUIDv4 |
| crash dump | `state.diagnostics.crashDump` | in-memory only at v1 | high | session | `WIPE_LOCAL_DATA scope=profile\|all` clears in-memory copy | redaction baseline below |
| auth tokens | (forbidden at v1) | n/a (banned from `localStorage`) | high | n/a | n/a | see [`persistence.md` § 5](./persistence.md#5-token--secret-storage) |

## 2. Sensitivity Tiers

- **low** — non-identifying, non-sensitive (UI prefs, save
  thumbnails, game options).
- **medium** — potentially identifying when combined with other data
  (display name, lobby chat, prompt content, content-report notes).
- **high** — per-installation only; must never appear in
  `localStorage`, even transiently; must be redacted from crash dumps
  (local salt, future tokens, raw crash-dump payloads).

Hard rules:

- `high`-tier rows MAY NOT enter `localStorage` at any time.
- `medium`-tier rows MAY NOT cross the network without explicit user
  consent.

## 3. Wipe-Scope Policy

`WIPE_LOCAL_DATA` accepts `scope: 'all' | 'saves' | 'profile' | 'chat'`:

- `all` — wipes every row in this table; the local salt is
  regenerated on next launch; the page reloads to drop in-memory
  state.
- `saves` — wipes every row whose `Wipe scope` mentions `saves`; the
  salt is preserved so future saves remain readable.
- `profile` — wipes every row whose `Wipe scope` mentions `profile`;
  saves are preserved.
- `chat` — clears any persisted chat surface (none today; reserved
  so a future feature cannot regress it).

**Single-source-of-truth rule.** The `WIPE_LOCAL_DATA` handler
iterates the rows of this table; it is **not** a hand-coded list. CI
gate `npm run validate:tasks` extends to scan IndexedDB store-name
literals across `src/persistence/` and fails when a store is created
without an inventory row.

## 4. Crash Dumps

This section pins the **redaction baseline** for the crash-dump
pipeline. Cross-link: [`permissions.md` § Crash
Reporting](./permissions.md).

A crash dump MAY include:

- build hash, engine hash
- redacted command index, last-N command kinds (no payloads)
- state hash
- exception class, exception message **with PII tokens stripped**

A crash dump MUST NOT include:

- `playerName`, `playerLabel`, `playerHash`
- save thumbnails
- chat content
- prompt content
- asset bytes
- any field tagged `medium` or `high` in this table

Persistence: in-memory only at v1; user-initiated export to a local
file only. No network upload until a future amendment declares one.
The `WIPE_LOCAL_DATA` handler clears any in-memory crash dumps and
any on-disk export (when wired).

## 5. Future: Social State (gated)

No social state is persisted today. Adding friend / block /
recent-players state requires, in order:

1. a schema under `content-schema/schemas/social-*.schema.json`,
2. a row in this document,
3. a corresponding `WIPE_LOCAL_DATA` scope,
4. a privacy-pane disclosure on screen 56.

Until those land, no `state.social.*` slice may be merged.

## 6. Future: Analytics

`analyticsClientId` is **not generated at v1**. If added later, it
MUST be:

- opt-in (`state.privacy.options.analyticsOptIn === true`),
- a UUIDv4,
- regeneratable via the privacy pane ("Reset analytics ID"),
- stored in IndexedDB (`hr-profile.privacy`),
- wiped by `WIPE_LOCAL_DATA scope=profile|all`.

The opt-in toggle in screen 56 (Privacy pane) is the only switch.
No analytics SDK is loaded at v1.

## 7. Cross-References

- [`docs/architecture/persistence.md`](./persistence.md) — owns
  per-slice medium and the `localStorage` ban.
- [`docs/architecture/permissions.md`](./permissions.md) — owns the
  OS / browser API allowlist.
- [`docs/architecture/ugc-safety.md`](./ugc-safety.md) — owns text
  and binary sanitization upstream of saves.
- [`docs/architecture/diagrams/24-save-flow.md`](./diagrams/24-save-flow.md)
  — save composition; references `metadata.playerHash`.
- [`docs/architecture/wiki/screens/56-options/`](./wiki/screens/56-options/)
  — privacy pane that lets the user inspect / change tiers.
- [`docs/architecture/wiki/screens/54-system-menu/`](./wiki/screens/54-system-menu/)
  — entry point for "Forget me on this device".

---

## 🔍 Sync Check

- **UI: ✔** — `WIPE_LOCAL_DATA` scope set, `displayNameMode`,
  `analyticsOptIn`, age-gate, and consent surfaces match
  [`wiki/screens/56-options/spec.md`](./wiki/screens/56-options/spec.md),
  [`wiki/screens/56-options/data-contracts.md`](./wiki/screens/56-options/data-contracts.md),
  and the "Forget me" entry in
  [`wiki/screens/54-system-menu/`](./wiki/screens/54-system-menu/).
- **Schema: ✔** — `consent.schema.json`,
  `consent-audit-log.schema.json`, `peer-allowlist.schema.json`,
  `privacy-options.schema.json`, and the IndexedDB stores in
  [`persistence.md` § 1](./persistence.md#1-per-slice-mapping) match
  the rows above; corresponding rows are present in
  [`schema-matrix.md`](./schema-matrix.md) (`Consent`,
  `ConsentAuditLog`, `PeerAllowlist`, `PrivacyOptions`,
  `AuditLogEntry`, `ErasureReceipt`).
- **Tasks: ❌** — Three persisted slices documented in sibling arch
  docs / `schema-matrix.md` are **not** registered in the table
  above. Each is a CI-blocking gap per CLAUDE.md root contract
  ("every persisted field is registered in `data-inventory.md`").
  See `## ⚠ Issues`.

## ⚠ Issues

- **Missing row for `state.profile.abandonHistory` (`hr-profile.abandonHistory`).**
  [`abandon-penalty.md` § 5](./abandon-penalty.md#5-ring-buffer-storage)
  declares the ring buffer as "persisted in IndexedDB store
  `hr-profile.abandonHistory` per `data-inventory.md`; wiped by
  `WIPE_LOCAL_DATA scope=profile|all`", and
  [`schema-matrix.md`](./schema-matrix.md) row `AbandonPenaltyRecord`
  cites `data-inventory.md` as the registration point. No matching
  row exists here. Per CLAUDE.md root contract, the owning task —
  [`tasks/phase-3/01-multiplayer/28-abandon-penalty-and-quorum-disconnect.md`](../../tasks/phase-3/01-multiplayer/28-abandon-penalty-and-quorum-disconnect.md)
  — must add the row before the slice can ship. Suggested values:
  Field=`abandon penalty history`,
  State path=`state.profile.abandonHistory`,
  Medium=`IndexedDB (hr-profile.abandonHistory)`, Sensitivity=`low`,
  Retention=`ring buffer (64 entries)`,
  Wipe scope=`WIPE_LOCAL_DATA scope=profile|all`,
  Notes=`abandon-penalty.schema.json`; ring buffer per
  `abandon-penalty.md`.
- **Missing row for the peer keypair (`hr-profile.peerIdentity`).**
  [`peer-identity.md` § 1–§ 2](./peer-identity.md#1-keypair-shape)
  states that the per-profile Ed25519 keypair persists in IndexedDB
  under `profile.peerKeypair`, and
  [`schema-matrix.md`](./schema-matrix.md) row `PeerIdentity` cites
  `hr-profile.peerIdentity` and "private half lives in
  `state.profile.peerKeypair`". No matching row exists here. Per
  CLAUDE.md root contract, the owning task —
  [`tasks/phase-3/01-multiplayer/16-peer-keypair-and-denylist.md`](../../tasks/phase-3/01-multiplayer/16-peer-keypair-and-denylist.md)
  — must add the row before the slice can ship. Suggested values:
  Field=`peer keypair`,
  State path=`state.profile.peerKeypair` (private + public halves),
  Medium=`IndexedDB (hr-profile.peerIdentity)`, Sensitivity=`high`
  (private key never on the wire), Retention=`until profile reset`,
  Wipe scope=`WIPE_LOCAL_DATA scope=profile|all`,
  Notes=`peer-identity.schema.json`; Ed25519 per
  [`peer-identity.md`](./peer-identity.md).
- **Missing row for the privacy / erasure audit-log slice (`hr-profile.audit`).**
  [`persistence.md` § 1](./persistence.md#1-per-slice-mapping)
  enumerates `hr-profile.audit` as the **"Consent + privacy audit
  log"** store, and [`schema-matrix.md`](./schema-matrix.md) row
  `AuditLogEntry` describes a separate "local on-device journal
  entry produced by privacy / consent flows (erasure receipts,
  replay-export sanitization, policy acceptance, opt-in toggles)"
  also persisted in `hr-profile.audit`. The current `consent audit
  log` row covers only the per-scope state-transition journal
  (`ConsentAuditLog`); the privacy / erasure / replay journal
  (`AuditLogEntry`) is unregistered. Per CLAUDE.md root contract,
  the owning task —
  [`tasks/mvp/02-content-schemas/41-error-and-audit-schemas.md`](../../tasks/mvp/02-content-schemas/41-error-and-audit-schemas.md)
  — must add the row before the slice can ship. Suggested values:
  Field=`privacy audit log`,
  State path=`state.profile.auditLog`,
  Medium=`IndexedDB (hr-profile.audit)`, Sensitivity=`low`,
  Retention=`rolling capacity (capped ring buffer)`,
  Wipe scope=`WIPE_LOCAL_DATA scope=profile|all`,
  Notes=`audit-log-entry.schema.json`; rendered by
  [`54-system-menu`](./wiki/screens/54-system-menu/) erasure-receipt
  and policy-acceptance surfaces.
