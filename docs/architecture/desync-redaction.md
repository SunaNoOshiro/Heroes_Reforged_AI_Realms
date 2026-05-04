# Desync Redaction

The redactor that runs on every desync report and every auto-bisect
round before the payload reaches any UI sink, log file, or peer.
Without this rule, the last-K-commands desync report carries hero
loadouts, spell choices, and fog-of-war movement intentions; combined
with auto-bisect re-materializing the same payload on every round,
a desync becomes a one-shot intel leak in competitive play.

> Source plan:
> [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../implementation-plans/22-privacy-retention-and-error-leaks-plan.md).

## 1. Field-visibility tag

Every command field declared in
[`command-schema.md`](./command-schema.md) carries a per-field
`visibility: 'public' | 'hidden'` tag (default `public` for
backwards compatibility). The tag is closed; new field kinds must
pick one.

| visibility | Treatment in desync report |
|---|---|
| `public` | Copied verbatim. |
| `hidden` | Replaced with `sha256(canonical(field))` truncated to 12 hex chars + length-class. |

## 2. Length classes

The redactor publishes the order-of-magnitude size of a hidden
field through one of four labels:

- `<8` — 0 to 7 inclusive.
- `<32` — 8 to 31 inclusive.
- `<128` — 32 to 127 inclusive.
- `>=128` — 128 or larger.

Numeric scalars are bucketed by their canonical-JSON byte length;
strings by character count; arrays by length; objects by
canonical-JSON byte length.

Length-class disclosure is intentional — knowing that a hidden
field is "very small" or "very large" is a small public signal
that helps debugging without revealing the underlying value.

## 3. Worked examples

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

The list above is illustrative, not exhaustive; the closed enum on
[`command-schema.md`](./command-schema.md) is the source of truth.

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
There is no path that reaches a sink ahead of the redactor.

## 5. Auto-bisect rounds

The auto-bisect loop in
[`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)
reuses the same redactor on every bisect round. Intermediate
`expected: bigint` hashes are public (they are the bisect
algorithm's output), but the underlying commands stay hidden;
each round constructs a fresh redacted slice.

## 6. Replay export reuse

When `displayNameMode: 'hash'` is set on a command-bearing replay,
[`docs/architecture/diagrams/24-save-flow.md`](./diagrams/24-save-flow.md)
calls the same redactor over the entire command log. The save /
replay export sanitizer therefore inherits this rule for free; no
separate "replay redactor" exists.

## 7. Cross-references

- [`command-schema.md`](./command-schema.md) — `fieldVisibility`
  per-field tag.
- [`error-formatter.md`](./error-formatter.md) — the redactor reuses
  the `redact: true` allowlist for incidental error payload
  scrubbing.
- [`tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md`](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)
- [`tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)
- [`docs/architecture/diagrams/24-save-flow.md`](./diagrams/24-save-flow.md) — replay export sanitizer.
