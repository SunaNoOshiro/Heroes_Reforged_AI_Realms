# Desync Redaction

Every desync report and every auto-bisect round routes through this
redactor before reaching any UI sink, log file, or peer. Without it
the last-K-commands payload leaks hero loadouts, spell choices, and
fog-of-war intentions; combined with auto-bisect re-materializing
the same payload on every round, a desync becomes a one-shot intel
leak in competitive play.

Companion docs:

- [`command-schema.md`](./command-schema.md) — `visibility` per-field
  tag and the canonical command vocabulary.
- [`error-formatter.md`](./error-formatter.md) — the redactor reuses
  the formatter's `redact: true` allowlist for incidental error
  payload scrubbing.
- [`tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md`](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)
  — desync-detection sink.
- [`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)
  — auto-bisect rounds.
- [`docs/architecture/diagrams/24-save-flow.md`](./diagrams/24-save-flow.md)
  — replay-export sanitizer reuses this redactor.

---

## 1. Field-visibility tag

Every command field declared in
[`command-schema.md`](./command-schema.md) carries a per-field
`visibility: 'public' | 'hidden'` tag. The enum is closed; new field
kinds must pick one. Default is `public` for backwards
compatibility.

| visibility | Treatment in desync report |
|---|---|
| `public` | Copied verbatim. |
| `hidden` | Replaced with `sha256(canonical(field))` truncated to 12 hex chars + a length-class label (see § 2). |

## 2. Length classes

A hidden field discloses only an order-of-magnitude size label,
never its value:

| Label | Range |
|---|---|
| `<8` | 0 to 7 inclusive |
| `<32` | 8 to 31 inclusive |
| `<128` | 32 to 127 inclusive |
| `>=128` | 128 or larger |

Bucketing input per type:

- Numeric scalars — canonical-JSON byte length.
- Strings — character count.
- Arrays — element count.
- Objects — canonical-JSON byte length.

Length-class disclosure is intentional: knowing a hidden field is
"very small" or "very large" helps debugging without revealing the
underlying value.

## 3. Worked examples

Illustrative — the closed enum on
[`command-schema.md`](./command-schema.md) is the source of truth.

| Command | Field | Visibility | Reason |
|---|---|---|---|
| `MOVE_HERO` | `heroId` | public | Hero identity is already known to all peers. |
| `MOVE_HERO` | `path` | hidden | Reveals fog-of-war intentions. |
| `INITIATE_BATTLE` | `attackerHeroId`, `defenderId` | public | Both sides know who fights. |
| `BATTLE_ATTACK` | `targetHeroId` | public | Battlefield positions are visible. |
| `BATTLE_ATTACK` | `attackerSpellChoice` | hidden | Reveals spell-book contents. |
| `CAST_SPELL` | `spellId` | public | Already revealed by VFX. |
| `CAST_SPELL` | `targetIds` | hidden | Reveals target inference logic. |
| `TRANSFER_ARTIFACT` | `fromHeroId`, `toHeroId` | public | Both heroes are known. |
| `TRANSFER_ARTIFACT` | `artifactId` | hidden | Reveals army inventory. |
| `RECRUIT_UNIT` | `townId` | public | Town location is on the map. |
| `RECRUIT_UNIT` | `unitId`, `count` | hidden | Reveals army composition planning. |
| `SET_GUARD` | `townId`, `heroId` | public | Both are visible state. |
| `SET_GUARD` | `garrisonOrder` | hidden | Reveals garrison plan. |

## 4. Pipeline placement

```text
desync detected
   │
   ▼
last-K commands gathered
   │
   ▼
redactor consumes per-field visibility
   │  copies public verbatim
   │  hashes hidden + length-class
   ▼
report passes to UI / log / peer
```

The redactor runs **before** any sink — including the local desync
debug overlay, the on-device crash log, and the peer's
`hash-mismatch` exchange in
[`tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md`](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md).
No path reaches a sink ahead of the redactor.

## 5. Auto-bisect rounds

The auto-bisect loop in
[`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)
reuses the same redactor on every round. Intermediate
`expected: bigint` hashes are public (they are the bisect
algorithm's output); the underlying commands stay hidden, and each
round constructs a fresh redacted slice.

## 6. Replay export reuse

When `displayNameMode: 'hash'` is set on a command-bearing replay,
[`docs/architecture/diagrams/24-save-flow.md`](./diagrams/24-save-flow.md)
calls the same redactor over the entire command log. The save /
replay export sanitizer therefore inherits this rule for free; no
separate "replay redactor" exists.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surface is owned by this doc; the cited sinks (desync debug overlay, on-device crash log, peer `hash-mismatch` exchange, replay export) all defer to the consumer specs in [`error-formatter.md`](./error-formatter.md), [`diagrams/24-save-flow.md`](./diagrams/24-save-flow.md), and [`64-network-lobby/spec.md`](./wiki/screens/64-network-lobby/spec.md).
- **Schema: ⚠** — The `visibility: 'public' \| 'hidden'` tag is a meta-convention applied by the redactor (not a payload field), consistent with how [`command-schema.md` § Field Visibility](./command-schema.md#field-visibility-desync-redaction) describes it. Two enum-name drifts surface against `content-schema/`: § 6 uses `displayNameMode: 'hash'` but [`privacy-options.schema.json`](../../content-schema/schemas/privacy-options.schema.json) defines the enum as `["clear", "hashed"]`; and § 3's `kind` names diverge from [`command.schema.json`](../../content-schema/schemas/command.schema.json) (`CAST_SPELL` vs `SPELL_CAST`, `RECRUIT_UNIT` vs `RECRUIT_UNITS`, `TRANSFER_ARTIFACT` vs `TRANSFER_HERO_ARTIFACT`, `SET_GUARD` undefined). Detail in `## ⚠ Issues`.
- **Tasks: ✔** — Owning task [`mvp.00-core-architecture.22-06-command-field-visibility-and-desync-redaction`](../../tasks/mvp/00-core-architecture/22-06-command-field-visibility-and-desync-redaction.md) lists this file as its sole Owned Path; downstream task [`phase-3.01-multiplayer.22-desync-redaction-acceptance`](../../tasks/phase-3/01-multiplayer/22-desync-redaction-acceptance.md) extends the redactor acceptance onto tasks 04 and 05 (multiplayer); both are referenced reciprocally.

## ⚠ Issues

- **`displayNameMode: 'hash'` does not match the closed schema enum.** § 6 (Replay export reuse) and the mirroring step in [`diagrams/24-save-flow.md`](./diagrams/24-save-flow.md) both use the literal `'hash'`, but [`privacy-options.schema.json#/properties/displayNameMode/enum`](../../content-schema/schemas/privacy-options.schema.json) (and [`save.schema.json`](../../content-schema/schemas/save.schema.json) `metadata.displayNameMode`) define the enum as `["clear", "hashed"]`, also captured in [`enums.snapshot.json`](../../content-schema/enums.snapshot.json). Per CLAUDE.md ("Stable IDs are public API"), the schema is canonical. Suggested fix: rewrite both arch docs (`desync-redaction.md` § 6 and `diagrams/24-save-flow.md` Replay-Export Sanitization step 4) to read `displayNameMode === 'hashed'`. Surfaced rather than rewritten unilaterally because two arch docs share the drift; fixing only one would split the canonical statement.
- **§ 3 worked-example table uses non-canonical `kind` names.** [`command.schema.json`](../../content-schema/schemas/command.schema.json) defines `SPELL_CAST`, `RECRUIT_UNITS`, `TRANSFER_HERO_ARTIFACT`, and has no `SET_GUARD`; the table here lists `CAST_SPELL`, `RECRUIT_UNIT`, `TRANSFER_ARTIFACT`, and `SET_GUARD`. The same drift is mirrored in [`command-schema.md` § Field Visibility](./command-schema.md#field-visibility-desync-redaction), which already flags it in its own Sync Check. The owning task description ([`22-06-command-field-visibility-and-desync-redaction.md`](../../tasks/mvp/00-core-architecture/22-06-command-field-visibility-and-desync-redaction.md)) also names the non-canonical kinds, so the drift is entrenched in the task spec. Suggested fix: rename the table rows in this file, in [`command-schema.md` § Field Visibility](./command-schema.md#field-visibility-desync-redaction), and in the owning task description in lock-step (one PR), or alias the unused kinds in [`enums.removed.json`](../../content-schema/enums.removed.json) per [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md). Surfaced rather than rewritten here because the same table appears in both arch docs; unilateral edits would split the canonical statement.
