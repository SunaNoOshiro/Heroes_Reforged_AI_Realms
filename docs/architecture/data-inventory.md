# Data Inventory

> Single source of truth for every persisted field in Heroes Reforged.
> The `WIPE_LOCAL_DATA` handler iterates this document, not a
> hand-coded list. Every new persistent slice MUST add a row here
> **before** being merged.

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
| lobby chat (transient) | `state.net.lobby.chat` | in-memory | medium | session | n/a | not persisted; cleared on lobby exit |
| save thumbnail | save `metadata.thumbnail` | IndexedDB (`hr-saves.slots`) | low | until save deleted | `WIPE_LOCAL_DATA scope=saves\|all` | base64 PNG/WebP |
| AI prompt (per pack) | pack `manifest.aiProvenance.promptExcerpt` | IndexedDB (`hr-packs.packs`) + `.hrmod` | medium | until pack uninstalled | n/a (pack scope) | declared by Plan 14; truncated to 280 chars |
| outbound content reports | `state.privacy.outboundReports[]` | IndexedDB (`hr-profile.reports`) | medium | until dequeued or user-deleted | `WIPE_LOCAL_DATA scope=profile\|all` | local queue with retry stub; consumes Plan 30 backend when authored |
| trust store | `selectors.packs.trustStore` | IndexedDB (`hr-trust.decisions`) | low | until user-revoked | `WIPE_LOCAL_DATA scope=profile\|all` | Plan 20 schema; per-pack decisions |
| pack store (`.hrmod` bytes) | (binary) | IndexedDB (`hr-packs.packs`) | low | until uninstalled | `WIPE_LOCAL_DATA scope=profile\|all` | Plan 20 owns runtime |
| signed publish ack | pack `signed-acks/<contentHash>.json` | in-pack file (`.hrmod`) | low | bound to pack lifetime | n/a (pack scope) | per-pack content-policy ack timestamp |
| `analyticsClientId` | `state.privacy.options.analyticsClientId` (FUTURE) | IndexedDB (`hr-profile.privacy`) | medium | until user-deleted | `WIPE_LOCAL_DATA scope=profile\|all` | **not generated at v1**; future opt-in only; UUIDv4 |
| crash dump | `state.diagnostics.crashDump` | in-memory only at v1 | high | session | `WIPE_LOCAL_DATA scope=profile\|all` clears in-memory copy | Plan 22 owns full pipeline; redaction baseline below |
| auth tokens | (forbidden until Plan 25) | n/a (banned from `localStorage`) | high | n/a | n/a | see `persistence.md` § Token & Secret Storage |

## 2. Sensitivity Tiers

- **low** — non-identifying, non-sensitive (UI prefs, save thumbnails,
  game options).
- **medium** — potentially identifying when combined with other
  data (display name, lobby chat, prompt content, content-report
  notes).
- **high** — must never appear in `localStorage`; must be redacted from
  crash dumps; per-installation only (local salt, future tokens, raw
  crash-dump payloads).

`high`-tier rows MAY NOT go into `localStorage` at any time, even
transiently. `medium`-tier rows MAY NOT be embedded in any record
that crosses the network without explicit user consent.

## 3. Wipe-Scope Policy

`WIPE_LOCAL_DATA` accepts a `scope` payload of `all | saves | profile | chat`:

- `all` — every row in this table is wiped; the local salt is
  regenerated on next launch; the page reloads to drop in-memory
  state.
- `saves` — every row whose `Wipe scope` mentions `saves` is wiped;
  the salt is preserved so future saves remain readable to the same
  user.
- `profile` — every row whose `Wipe scope` mentions `profile` is
  wiped; saves are preserved.
- `chat` — clears any persisted chat surface (none today; this scope
  exists so a future feature cannot regress it).

**Single-source-of-truth rule.** The `WIPE_LOCAL_DATA` handler
iterates the rows of this table; it is **not** a hand-coded list. CI
gate (`npm run validate:tasks`) extends to scan IndexedDB store-name
literals across `src/persistence/` and fail if a store is created
that has no inventory row.

## 4. Crash Dumps

(Plan 22 owns the full pipeline. This section declares the
**redaction baseline** so Plan 22 inherits a clear contract.)

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
file only. No network upload until Plan 22 declares one. The
`WIPE_LOCAL_DATA` handler clears any in-memory crash dumps and any
on-disk export (when wired).

Cross-link: `permissions.md` § Crash Reporting.

## 5. Future: Social State (gated)

No social state is persisted today. Adding friend / block /
recent-players state requires:

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
  per-slice medium and `localStorage` ban.
- [`docs/architecture/permissions.md`](./permissions.md) — owns
  the OS / browser API allowlist.
- [`docs/architecture/ugc-safety.md`](./ugc-safety.md) — owns the
  text and binary sanitization rules upstream of saves.
- [`docs/architecture/diagrams/24-save-flow.md`](./diagrams/24-save-flow.md)
  — save composition; references `metadata.playerHash`.
- [`docs/architecture/wiki/screens/56-options/`](./wiki/screens/56-options/)
  — privacy pane that lets the user inspect / change tiers.
- [`docs/architecture/wiki/screens/54-system-menu/`](./wiki/screens/54-system-menu/)
  — entry point for "Forget me on this device".
