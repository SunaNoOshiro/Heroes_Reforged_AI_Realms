# Pack Trust & Save Import Safety

Single source of truth for the user-facing safety surface around
**save imports** and **pack trust prompts**. Section numbers are
public anchors — sibling docs and screen packages link
`#1-resource-limits`, `#4-trust-anchors`, `#5-safe-mode`,
`#6-modded-indicator`, `#7-trust--safety-phrasing`,
`#8-content-rating`, and `#10-error-codes`. Do not renumber.

Companion docs:
- Screens
  [`70-save-import/`](./wiki/screens/70-save-import/),
  [`71-pack-manager/`](./wiki/screens/71-pack-manager/),
  [`72-pack-trust-prompt/`](./wiki/screens/72-pack-trust-prompt/),
  and the modded-indicator badge in
  [`19-status-bar/`](./wiki/screens/19-status-bar/).
- [`pack-contract.md`](./pack-contract.md) — pack identity,
  capabilities, sandbox enforcement.
- [`revocation.md`](./revocation.md) — maintainer-signed revocation
  for canonical packs (orthogonal to the user-decision surface
  owned here).
- [`error-taxonomy.md`](./error-taxonomy.md) — engine-side
  `STORAGE_*` / `PACK_*` codes that mirror the user-facing keys
  in § 10.

Schemas this doc binds to:
- [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
  — `signature`, `sandboxed`, `capabilities`, `contentRating`.
- [`save.schema.json`](../../content-schema/schemas/save.schema.json)
  — `saveVersion`, `engineHash`, `packHashes`, `stateHash`.
- [`publisher-registry.schema.json`](../../content-schema/schemas/publisher-registry.schema.json),
  [`pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json),
  [`trust-store.schema.json`](../../content-schema/schemas/trust-store.schema.json)
  — trust anchors, revocation, persisted decisions.

---

## 1. Resource Limits

Caps are enforced **before** any decompression or schema parsing,
so a hostile file cannot exhaust memory inside the validator.

### Save imports

| Cap | Value | Failure key |
| --- | --- | --- |
| Compressed file size | 4 MiB | `ui.save-import.reject.too-large` |
| Decompression ratio | 1 : 200 | `ui.save-import.reject.bomb` |
| Decompressed size | 64 MiB | `ui.save-import.reject.bomb` |
| Streaming wall time on a 4 MiB save | 5 s | `ui.save-import.reject.timeout` |

Decompression streams through a counter; if `bytesOut / bytesIn`
exceeds the ratio at any boundary, abort. The wall-time budget
defends against parser-DoS attempts that fit inside the size cap.

### Pack `.hrmod` ZIPs

| Cap | Value | Failure key |
| --- | --- | --- |
| Compressed ZIP size | 256 MiB | `ui.pack-trust.error.too-large` |
| Decompression ratio | 1 : 50 | `ui.pack-trust.error.bomb` |
| Decompressed size (per pack) | 2 GiB | `ui.pack-trust.error.bomb` |
| Entry count | 50,000 | `ui.pack-trust.error.too-many-entries` |

### ZIP path-traversal sanitizer

Every entry path is normalized: POSIX separators, no leading `/`,
no `..` segment, no NUL byte, no Windows drive prefix
(`C:\`, `\\?\`). On the **first** violation the entire pack is
rejected with `ui.pack-trust.error.unsafe-entry`. Mirrored in
[`pack-contract.md` § Resource Limits](./pack-contract.md#resource-limits)
so the pack loader and the trust UI agree.

---

## 2. Save Quarantine

Imported saves stage in an in-memory area only. They are **never**
written to IndexedDB before pack consent and trust review complete.

- Selector: `selectors.persistence.import.staging` (read-only).
- Cleared on `CLOSE_SAVE_LOAD`, on tab unload, and on import
  completion.
- A staged save cannot be loaded into the engine until pack consent
  + trust review are complete.
- Rolling overwrite ring: when a slot is overwritten, the previous
  contents move to `selectors.persistence.recycle.savedSlots`,
  capped at 3 entries per slot for 7 days, then evicted. Restored
  via `RESTORE_OVERWRITTEN_SAVE`.

---

## 3. Save Version Bounds

Codified in [`save.schema.json`](../../content-schema/schemas/save.schema.json)
and enforced by the importer:

- **Reject newer.** `saveVersion > runtimeMaxSaveVersion` →
  `ui.save-import.reject.too-new`. Terminal; no click-through.
- **Reject older without migration.** `saveVersion <
  runtimeMinSaveVersion` AND no migration-registry chain reaches
  `runtimeMaxSaveVersion` from `saveVersion` →
  `ui.save-import.reject.no-migration`. Terminal.
- **Skew.** `packHashes` mismatch on a `required: true` pack →
  `compatibility.status = "skew"`, copy
  `ui.save-import.warn.pack-skew`. Continue gated on a checkbox.
- **Tamper.** `stateHash` mismatch after replay →
  `compatibility.status = "tamper"`, copy
  `ui.save-import.error.tamper`. Hard error; no continue.

Discriminated union:

```ts
type Compatibility =
  | { status: "ok" }
  | { status: "skew", mismatched: { packId: string, expected: string, actual: string }[] }
  | { status: "tamper", expectedStateHash: string, actualStateHash: string }
  | { status: "unsupported", reason: "too-new" | "no-migration" | "missing-pack" };
```

---

## 4. Trust Anchors

Lookup precedence (first match wins):

1. **Revocation list** ([`pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json)).
   `reason ∈ {malware, tampered}` → mount refused with
   `ui.pack-trust.error.revoked`. `reason ∈ {deprecated,
   user-revoked}` → ceiling is `decision = sandboxed`.
2. **Trust store deny** ([`trust-store.schema.json`](../../content-schema/schemas/trust-store.schema.json),
   `decision = "deny"`) — refuses without re-prompting.
3. **Publisher registry** ([`publisher-registry.schema.json`](../../content-schema/schemas/publisher-registry.schema.json))
   matched by `manifest.signature.keyId` → ribbon
   `tier = signed-known`.
4. **Trust store allow** (`decision ∈ {trust, sandboxed}` at a
   matching `scope`) — install proceeds without re-prompting.
5. **Prompt user** via screen 72.

Trust-store entries key on `(packId, contentHash)`. A
content-hash change invalidates prior decisions and re-prompts.
Scope semantics: `global` persists until revoked; `save` is valid
only when loading the matching `saveId`; `session` clears at next
session start.

### Trust-tier ribbon

Computed from `manifest.signature` plus the publisher registry:

| Tier | Ribbon | Localization key |
| --- | --- | --- |
| `signed-known` | green | `ui.pack-trust.tier.signed-known` |
| `signed-unknown` | amber | `ui.pack-trust.tier.signed-unknown` |
| `unsigned` | red | `ui.pack-trust.tier.unsigned` |
| `signature-failed` | black, terminal | `ui.pack-trust.tier.signature-failed` |

`signature-failed` is **terminal**: the install button is removed
entirely. There is no soft-warning click-through for a verification
failure.

### Capability disclosure

Every value in `manifest.capabilities[]` maps to a fixed
user-facing key under `ui.pack-trust.capability.*`. Use the
plain-language analogues (see § 7).

| Capability | User-facing key |
| --- | --- |
| `formulas.ast` | `ui.pack-trust.capability.formulas` |
| `spells.custom-kind` | `ui.pack-trust.capability.spells` |
| `abilities.custom-kind` | `ui.pack-trust.capability.abilities` |
| `assets.binary` | `ui.pack-trust.capability.assets` |
| `scripts.none` | `ui.pack-trust.capability.no-scripts` |

### Per-transitive-pack consent

In **batch mode** (driven by save import or by the pack manager
installing a multi-dependency pack), each dependency renders as
its own collapsible row. Trust is **per pack** — there is no
`Trust all` button.

### Persistence-scope picker

Three-option radio: `Just this session` (default), `For this
save`, `Always (until I revoke)`. Surfaces in screen 72 alongside
the trust controls; writes a `trust-store.schema.json` entry on
confirm.

---

## 5. Safe Mode

Triggered by `ENTER_SAFE_MODE`, surfaced as `Safe mode (disable
all packs)` in screen 54 and gated through screen 60 (confirmation
dialog).

Effects:

- Sets `state.session.safeMode = true`.
- All non-canonical packs unmount on the next session start.
- The trust store is **not cleared** (the user keeps prior
  decisions) but is **bypassed** while safe mode is on.
- Save loads requiring non-canonical packs are blocked at import
  with `ui.save-import.reject.safe-mode-blocks-pack`.

`EXIT_SAFE_MODE` re-arms packs at the next session start.

---

## 6. Modded Indicator

Selector `selectors.session.moddedIndicator`, closed enum:

| Value | Meaning |
| --- | --- |
| `off` | Only canonical packs mounted. |
| `trusted` | Third-party packs mounted, all `decision = trust`. |
| `sandboxed` | At least one pack mounted with `decision = sandboxed`. |
| `mixed` | At least one trusted **and** at least one sandboxed. |

Bound in [`19-status-bar`](./wiki/screens/19-status-bar/) as a
small badge. The badge is **always visible** when the value is not
`off` — there is no dismiss control. Replays inherit the badge
from the save's `packHashes` (signal is `sandboxed` or `mixed` if
any non-canonical pack is referenced).

Localization keys: `ui.status-bar.modded.off`,
`ui.status-bar.modded.trusted`, `ui.status-bar.modded.sandboxed`,
`ui.status-bar.modded.mixed`.

---

## 7. Trust & Safety Phrasing

Trust copy must be readable by a non-expert. Rules (apply to every
copy value under the `ui.save-import.*` and `ui.pack-trust.*`
namespaces):

- No acronyms longer than four letters in user-facing copy.
- No raw terms `AST`, `ed25519`, `sandboxed`, `manifest`, `hash`,
  `nonce`, `entropy`. Plain-language analogues:
  - `AST` → "game formulas"
  - `ed25519` → "publisher signature"
  - `sandboxed` → "limited mode"
  - `manifest` → "pack info"
  - `hash` → "fingerprint"
- Every warning includes both *what changes* and *why it matters*,
  in two short sentences max.

Until the localization-plan CI gate lands, screens 70 / 71 / 72
ship with the namespaces above and the rule is reviewed in PR.

---

## 8. Content Rating

Optional `manifest.contentRating`
([`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json))
is **author-asserted** and **advisory only**. Surfaced under
"Author-declared content" on the trust prompt (screen 72); not
consumed by gameplay or matchmaking gates in v1. The runtime never
infers a rating; the field is text the user sees.

---

## 9. Platform Posture

### v1 (browser-only)

- Imports use the File API; OS attributes (MOTW,
  `com.apple.quarantine`) do not propagate.
- The in-memory quarantine staging area (§ 2) is the **only**
  sandbox available; no OS quarantine bit exists to honour.
- All caps in § 1 are enforced inside the browser tab. There is no
  desktop-wrapper escape hatch.

### vNext (desktop wrapper, when authored)

If a desktop wrapper enters scope, it MUST:

- Read MOTW / `com.apple.quarantine` and surface the bit on
  screen 70 with a labelled banner.
- Refuse `Always trust` decisions for any pack file that still
  carries the quarantine bit, until the user explicitly clears it
  via OS-native UI.
- Preserve the bit when copying staged files into the install
  location.

Until that wrapper is authored, browser-only is the load-bearing
posture cited from [`README.md`](../../README.md).

---

## 10. Error Codes

User-facing localization keys consumed by screens 70 / 71 / 72:

- `ui.save-import.reject.too-large`
- `ui.save-import.reject.too-new`
- `ui.save-import.reject.no-migration`
- `ui.save-import.reject.bomb`
- `ui.save-import.reject.timeout`
- `ui.save-import.reject.safe-mode-blocks-pack`
- `ui.save-import.warn.pack-skew`
- `ui.save-import.warn.untrusted-packs`
- `ui.save-import.error.tamper`
- `ui.save-import.seal.ok`
- `ui.save-import.seal.version-skew`
- `ui.save-import.seal.tamper-detected`
- `ui.save-import.confirm.overwrite`
- `ui.pack-trust.tier.signed-known`
- `ui.pack-trust.tier.signed-unknown`
- `ui.pack-trust.tier.unsigned`
- `ui.pack-trust.tier.signature-failed`
- `ui.pack-trust.error.revoked`
- `ui.pack-trust.error.unsafe-entry`
- `ui.pack-trust.error.too-large`
- `ui.pack-trust.error.bomb`
- `ui.pack-trust.error.too-many-entries`
- `ui.pack-trust.capability.formulas`
- `ui.pack-trust.capability.spells`
- `ui.pack-trust.capability.abilities`
- `ui.pack-trust.capability.assets`
- `ui.pack-trust.capability.no-scripts`

Engine-side error codes for the same flow live in
[`error-taxonomy.md`](./error-taxonomy.md) under the `STORAGE_*`
and `PACK_*` prefixes.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors (`selectors.persistence.import.staging`,
  `selectors.persistence.recycle.savedSlots`,
  `selectors.packs.signatureTier`,
  `selectors.packs.trustStore`,
  `selectors.session.moddedIndicator`), commands
  (`RESTORE_OVERWRITTEN_SAVE`, `ENTER_SAFE_MODE`, `EXIT_SAFE_MODE`,
  `CLOSE_SAVE_LOAD`, `GRANT_PACK_TRUST`, `RUN_PACK_SANDBOXED`,
  `DENY_PACK_TRUST`, `REVOKE_PACK_TRUST`), the four ribbon tiers,
  the persistence-scope picker, and the safe-mode banner all match
  [`wiki/screens/70-save-import/`](./wiki/screens/70-save-import/),
  [`wiki/screens/71-pack-manager/`](./wiki/screens/71-pack-manager/),
  [`wiki/screens/72-pack-trust-prompt/`](./wiki/screens/72-pack-trust-prompt/),
  [`wiki/screens/19-status-bar/`](./wiki/screens/19-status-bar/),
  [`wiki/screens/54-system-menu/`](./wiki/screens/54-system-menu/),
  and [`wiki/screens/60-confirmation-dialog/`](./wiki/screens/60-confirmation-dialog/).
- **Schema: ✔** — `decision` enum (`trust | sandboxed | deny`),
  `scope` enum (`session | save | global`), revocation `reason`
  enum (`malware | tampered | deprecated | user-revoked`),
  capability enum, `signaturePolicy` / `trustTier` enums, and the
  `(packId, contentHash)` key all match
  [`trust-store.schema.json`](../../content-schema/schemas/trust-store.schema.json),
  [`pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json),
  [`publisher-registry.schema.json`](../../content-schema/schemas/publisher-registry.schema.json),
  [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json),
  and [`save.schema.json`](../../content-schema/schemas/save.schema.json);
  rows present in [`schema-matrix.md`](./schema-matrix.md) for
  `Manifest`, `PublisherRegistry`, `PackRevocationList`, and
  `TrustStore`.
- **Tasks: ✔** — Owning tasks
  [`tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md`](../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md)
  and
  [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md)
  reference this doc in Read First; schema tasks
  [`28-save-schema`](../../tasks/mvp/02-content-schemas/28-save-schema.md),
  [`29-publisher-registry-schema`](../../tasks/mvp/02-content-schemas/29-publisher-registry-schema.md),
  [`30-pack-revocation-list-schema`](../../tasks/mvp/02-content-schemas/30-pack-revocation-list-schema.md),
  and
  [`31-trust-store-schema`](../../tasks/mvp/02-content-schemas/31-trust-store-schema.md)
  ship the schemas this doc binds to. `tasks/task-registry.json`
  has matching entries.

## ⚠ Issues

- **Trust-store / overwrite-ring slices not registered in
  `data-inventory.md`.** This doc names two persisted slices —
  the trust store keyed on `(packId, contentHash)` and the rolling
  overwrite ring at `selectors.persistence.recycle.savedSlots`
  capped at 3 entries × 7 days. The trust store **is** registered
  in [`data-inventory.md`](./data-inventory.md) (row `trust store`
  → `IndexedDB (hr-trust.decisions)`), but the overwrite ring is
  not — neither row, `state.persistence.recycle.*`, nor an
  `hr-saves.*` recycle store appears in the inventory. Per CLAUDE.md
  root contract ("every persisted field is registered in
  `data-inventory.md`"), the owning task —
  [`tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md`](../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md)
  — must add the row before the slice can ship. Suggested values:
  Field=`save overwrite ring`,
  State path=`state.persistence.recycle.savedSlots`,
  Medium=`IndexedDB (hr-saves.recycle)` (or in-memory if storage
  policy decides not to persist), Sensitivity=`low`,
  Retention=`per-slot ring (cap 3, 7-day TTL)`,
  Wipe scope=`WIPE_LOCAL_DATA scope=saves|all`,
  Notes=`save.schema.json`; restored via `RESTORE_OVERWRITTEN_SAVE`.
  Skill did not edit `data-inventory.md` (Hard Prohibition D).
