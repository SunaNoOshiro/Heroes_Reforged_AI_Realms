# Pack Trust & Save Import Safety

Single source of truth for the user-facing safety surface around
**save imports** and **pack trust prompts**. Implements the policy
side of the audit at
[`docs/readiness-audit/20-save-imports-and-pack-trust-prompts.md`](../readiness-audit/20-save-imports-and-pack-trust-prompts.md)
and is consumed by the screen packages
[`70-save-import/`](./wiki/screens/70-save-import/),
[`71-pack-manager/`](./wiki/screens/71-pack-manager/), and
[`72-pack-trust-prompt/`](./wiki/screens/72-pack-trust-prompt/).

The back-end primitives this doc binds to:

- [`manifest.schema.json`](../../content-schema/schemas/manifest.schema.json)
  — `signature`, `sandboxed`, `capabilities`, `contentRating`.
- [`save.schema.json`](../../content-schema/schemas/save.schema.json)
  — `saveVersion`, `engineHash`, `packHashes`, `stateHash`.
- [`publisher-registry.schema.json`](../../content-schema/schemas/publisher-registry.schema.json),
  [`pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json),
  [`trust-store.schema.json`](../../content-schema/schemas/trust-store.schema.json)
  — trust anchors, revocation, persisted decisions.
- [`pack-contract.md`](./pack-contract.md) — pack identity, capabilities,
  sandbox enforcement.
- [`revocation.md`](./revocation.md) — maintainer-signed revocation
  authority for canonical packs (orthogonal to the user-decision
  surface owned here).

---

## 1. Resource Limits

These caps are enforced **before** any decompression or schema
parsing so a hostile file cannot exhaust memory inside the validator.

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
(`C:\`, `\\?\`). On the **first violation** the entire pack is
rejected with `ui.pack-trust.error.unsafe-entry`. The rule is mirrored
in [`pack-contract.md` § Resource Limits](./pack-contract.md#resource-limits)
so the pack loader and the trust UI agree.

---

## 2. Save Quarantine

Imported saves stage in an in-memory area only. They are **never**
written to IndexedDB before the user confirms the trust review.

- Selector: `selectors.persistence.import.staging` (read-only).
- Cleared on `CLOSE_SAVE_LOAD`, on tab unload, and on import
  completion.
- A staged save cannot be loaded into the engine until pack consent
  + trust review are complete.
- Rolling "trash" ring on overwrite: the previous slot contents are
  moved to `selectors.persistence.recycle.savedSlots`, capped at 3
  entries per slot for 7 days, then evicted. Restored via the new
  `RESTORE_OVERWRITTEN_SAVE` command.

---

## 3. Save Version Bounds

Codified in [`save.schema.json`](../../content-schema/schemas/save.schema.json)
and enforced by the importer:

- **Reject newer:** if `saveVersion > runtimeMaxSaveVersion`,
  importer refuses load with `ui.save-import.reject.too-new`.
  No click-through path.
- **Reject older without migration:** if `saveVersion <
  runtimeMinSaveVersion` AND no entry in the migration registry
  reaches `runtimeMaxSaveVersion` from `saveVersion`, refuse load
  with `ui.save-import.reject.no-migration`.
- **Skew vs tamper:**
  - `packHashes` mismatch on a `required: true` pack →
    `compatibility.status = "skew"`, copy
    `ui.save-import.warn.pack-skew`. Continue is gated on a
    checkbox.
  - `stateHash` mismatch after replay →
    `compatibility.status = "tamper"`, copy
    `ui.save-import.error.tamper`. **Hard error**, no continue.

The full discriminated union:

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

1. **Revocation list** (`pack-revocation-list.schema.json`)
   `decision = deny` if `reason in [malware, tampered]`. Mounting
   refused with `ui.pack-trust.error.revoked`. For
   `deprecated | user-revoked`, `decision = sandboxed` is the
   ceiling.
2. **Trust store deny** (`trust-store.schema.json`,
   `decision = "deny"`) — refuses without re-prompting.
3. **Publisher registry** (`publisher-registry.schema.json`)
   matched by `manifest.signature.keyId` → ribbon
   `tier = signed-known`.
4. **Trust store allow** (`decision = "trust"` or `"sandboxed"` at
   matching `scope`) — install proceeds without re-prompting.
5. **Prompt user** via screen 72.

Trust-store entries key on `(packId, contentHash)`. A content-hash
change invalidates prior decisions and re-prompts. `scope = global`
decisions persist until revoked; `scope = save` are valid only when
loading the matching `saveId`; `scope = session` clear on next
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
entirely. There is no soft-warning click-through path for a
verification failure.

### Capability disclosure

Every value in `manifest.capabilities[]` maps to a fixed user-facing
key under `ui.pack-trust.capability.*`. Plain-language analogues
only — see § 7 Phrasing.

| Capability | User-facing key |
| --- | --- |
| `formulas.ast` | `ui.pack-trust.capability.formulas` |
| `spells.custom-kind` | `ui.pack-trust.capability.spells` |
| `abilities.custom-kind` | `ui.pack-trust.capability.abilities` |
| `assets.binary` | `ui.pack-trust.capability.assets` |
| `scripts.none` | `ui.pack-trust.capability.no-scripts` |

### Per-transitive-pack consent

When the trust prompt opens in **batch mode** (driven by save
import or by the pack manager installing a multi-dependency pack),
each dependency renders as its own collapsible row. The "Trust"
decision must be **per pack** — there is no `Trust all` button.

### Persistence-scope picker

Three-option radio with `Just this session` (default), `For this
save`, `Always (until I revoke)`. Surfaces in screen 72 alongside
the trust controls; writes a `trust-store.schema.json` entry on
confirm.

---

## 5. Safe Mode

Triggered by the new `ENTER_SAFE_MODE` command, surfaced through
`Safe mode (disable all packs)` in screen 54 and gated through
screen 60 (confirmation dialog).

Effects:

- Sets `state.session.safeMode = true`.
- All non-canonical packs unmount on the next session start.
- Trust store is **not cleared** (so the user keeps prior choices)
  but is **bypassed** while safe mode is on.
- Save loads in safe mode that require non-canonical packs are
  blocked at the import step with
  `ui.save-import.reject.safe-mode-blocks-pack`.

`EXIT_SAFE_MODE` re-arms packs at next session start.

---

## 6. Modded Indicator

Selector `selectors.session.moddedIndicator` with closed enum:

| Value | Meaning |
| --- | --- |
| `off` | Only canonical packs mounted. |
| `trusted` | Third-party packs mounted, all `decision = trust`. |
| `sandboxed` | At least one pack mounted with `decision = sandboxed`. |
| `mixed` | At least one trusted and at least one sandboxed. |

Bound in [`19-status-bar`](./wiki/screens/19-status-bar/) as a
small badge. The badge is **always visible** when not `off` — there
is no dismiss control. Replays inherit the badge from the save's
`packHashes` (signal is `mixed`/`sandboxed` if any non-canonical
pack is referenced).

Localization keys: `ui.status-bar.modded.off`, `ui.status-bar.modded.trusted`,
`ui.status-bar.modded.sandboxed`, `ui.status-bar.modded.mixed`.

---

## 7. Trust & Safety Phrasing

User-facing trust copy must be readable by a non-expert. Rules:

- No acronyms longer than four letters in user-facing copy.
- No raw terms `AST`, `ed25519`, `sandboxed`, `manifest`, `hash`,
  `nonce`, `entropy`. Replace with plain analogues:
  - `AST` → "game formulas"
  - `ed25519` → "publisher signature"
  - `sandboxed` → "limited mode"
  - `manifest` → "pack info"
  - `hash` → "fingerprint"
- All warning copy must include both *what changes* and *why it
  matters* in two short sentences max.

These rules apply to every `ui.save-import.*` and `ui.pack-trust.*`
key. The CI gate for the rule lives alongside the locale data file
declared by the localization plan; until that plan lands, screens
70/71/72 ship with the namespaces and the rule is reviewed in PR.

---

## 8. Content Rating

Optional `manifest.contentRating` ([manifest.schema.json](../../content-schema/schemas/manifest.schema.json))
is **author-asserted** and **advisory only**. It is surfaced under
"Author-declared content" on the trust prompt (screen 72) but is
**not** consumed by gameplay or matchmaking gates in v1. The
runtime never infers a rating; the field is text the user sees.

---

## 9. Platform Posture

### v1 (browser-only)

- Import is via the File API; OS attributes (MOTW,
  `com.apple.quarantine`) do not propagate.
- The in-memory quarantine staging area (§ 2) is the **only**
  sandbox available; no OS quarantine bit exists to honour.
- All caps in § 1 are enforced inside the browser tab. There is no
  desktop-wrapper escape hatch.

### vNext (desktop wrapper, when authored)

If a desktop wrapper enters scope, it MUST:

- Read MOTW / `com.apple.quarantine` and surface the bit on screen
  70 with a labelled banner.
- Refuse `Always trust` decisions for any pack file that still has
  the quarantine bit set, until the user explicitly clears it via
  OS-native UI.
- Preserve the bit when copying staged files into the install
  location.

Until that wrapper is authored, browser-only is the load-bearing
posture cited from [README.md](../../README.md).

---

## 10. Error Codes

User-facing localization keys consumed by screens 70/71/72:

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
[`error-taxonomy.md`](./error-taxonomy.md) under the
`STORAGE_*` and `PACK_*` prefixes.
