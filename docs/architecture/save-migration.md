# Save Migration Policy

Canonical policy for evolving the save format. Pins the migrator
authoring contract, composition rules, support window, testing
rules, and the explicit boundary between save-schema migration and
content-pack-version migration.

Companion docs:

- [`02-log-only-save-format.md`](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  — owns the on-disk inner-record shape this policy migrates.
- [`08-migration-registry.md`](../../tasks/mvp/08-persistence/08-migration-registry.md)
  — owns the runtime registry that consumes this contract.
- [`save-envelope-mac.md`](./save-envelope-mac.md) — authoritative
  doctrine for the M5+ HMAC seam summarized in § 9.
- [`version-policy.md`](./version-policy.md) — pack-version drift
  policy (different surface; see § 6).
- [`determinism.md`](./determinism.md) § "Tamper detection vs.
  forgery" — keyed-vs-unkeyed integrity boundary.
- [`replay-format.md`](./replay-format.md) — replay envelope
  projection rules.
- Schemas:
  [`save-envelope.schema.json`](../../content-schema/schemas/save-envelope.schema.json),
  [`save.schema.json`](../../content-schema/schemas/save.schema.json).

## 1. Why this document exists

Each save carries an integer `saveVersion` (currently `1`). The
first breaking schema change is inevitable. Without a written
policy:

- Every implementer reinvents one.
- The Save/Load compatibility seal renders "migration available?"
  with no actual code path behind it.
- Players lose long campaigns the moment the schema shifts.

The contract below removes those failure modes.

## 2. Migrator signature

```typescript
type Migrator<From, To> = {
  fromVersion: number,           // saveVersion this migrator consumes
  toVersion: number,             // == fromVersion + 1
  migrate: (prev: From) => To,   // pure, synchronous, no I/O
};
```

- **Pure / synchronous / no I/O.** No `fetch`, no `Date.now()`, no
  `Math.random()`, no module-level mutable state. A migrator that
  consults the network or the wall clock will diverge between
  machines and break determinism.
- **Single step.** Each migrator handles exactly one version step.
  A v3 → v5 migration is two migrators (v3 → v4, v4 → v5), not a
  diagonal jump.
- **Throw on incompatible input.** A migrator MAY throw if the prev
  record fails its precondition (e.g. a required field is absent).
  The loader catches and surfaces the canonical "incompatible save
  migration needed" error.

## 3. Composition

The loader composes registered migrators in order from the on-disk
`saveVersion` to the current schema version:

```typescript
function migrate(record: AnySaveRecord): SaveRecord_current {
  const chain = registry.chainFrom(record.saveVersion);
  if (!chain) throw incompatibleSaveError(record.saveVersion);
  return chain.reduce((r, m) => m.migrate(r), record);
}
```

- `chainFrom(v)` returns the ordered list `(v → v+1 → … → current)`
  or `null` if the on-disk version is older than the support window.
- A throw at any step bubbles to the canonical incompatible-save
  error. The Save/Load screen renders the matching missing-state.

## 4. Support window

The **last 4** save versions are migrated in-app. Older saves are
not loadable in-place. The user-facing message is:

> This save is from an older version of the game. Keep the file —
> a future update may restore loading.

Bridging migrators for older saves are not promised; they remain
out of scope unless the project explicitly commits to longer
backward compatibility.

## 5. Authoring rule

Each new migrator ships with **two** companion artifacts:

1. A fixture: `saves/migrations/v{N}/sample.json` — a valid
   `SaveRecord_v{N}` that exercises the fields the migrator touches.
2. A round-trip test: load → migrate → replay → assert post-replay
   `stateHash` is non-zero AND matches the fixture's recorded
   `stateHash` after the migrator's structural changes are accounted
   for. The test asserts the migrator produces a record the replay
   API can consume, not just a record that type-checks.

A migrator without a fixture and round-trip test is not allowed in
the registry; this is enforced by lint over
`src/persistence/migrations/`.

### Authoring template

A new migrator copies `src/persistence/migrations/template.ts`,
which carries:

- Type imports for `SaveRecord_vN` and `SaveRecord_vN+1`.
- The migrator skeleton with `fromVersion`, `toVersion`, and
  `migrate`.
- A reminder of the pure / sync / no-I/O rule.
- A reminder to register the migrator in `index.ts`.
- A reminder to add the fixture and round-trip test.

## 6. Pack-version boundary (out of scope for migrators)

Save migrators handle **schema** evolution only. Content-pack hash
mismatches are a different problem with different ergonomics and a
different failure surface:

- A schema migration is **internal** to the engine: the shape of
  `SaveRecord` changed, the underlying gameplay record IDs did not.
- A pack-version drift is **external**: the player's loaded packs
  produce different gameplay outcomes from the packs that were
  loaded when the save was written.

Pack drift is handled by the load gate's warn-or-abort policy in
[`version-policy.md`](./version-policy.md): `degrade` offline (toast
and continue), `refuse loud` in multiplayer / trusted-replay
contexts. Do not write "migrators" for pack drift; that conflates
two distinct compatibility surfaces.

## 7. Tamper detection vs. forgery (cross-reference)

`canonicalContentHash` is non-keyed xxh64 — sufficient to detect
accidental corruption and replay drift, **not** adversarial forgery.
Ranked / leaderboard / tournament features must layer an HMAC keyed
by a server-issued match secret. See
[`determinism.md`](./determinism.md) § "Tamper detection vs.
forgery".

## 8. Envelope, intent discriminator & MAC phase-in

The on-disk save artifact is wrapped in
[`save-envelope.schema.json`](../../content-schema/schemas/save-envelope.schema.json).
The envelope shape is `{ envelopeVersion, intent, saveVersion,
engineHash, contentPackHashes, body, mac?, signature? }`.

`intent` is a discriminated union over `save | replay | fixture`:

- **`save`** — device-local. Carries `mac` in M5+ (after cloud-sync
  opt-in); absent in M4. Player-identifying metadata is preserved
  in `body.metadata`.
- **`replay`** — shared / exported. Player-identifying fields are
  stripped on the conversion (see § 8.1). The `mac` field is absent
  — replays are unsigned by design.
- **`fixture`** — canonical engine fixture. Requires `signature`
  (Ed25519 by an `engine-fixture` key); `mac` is absent. Used by
  the golden-fixture suite and the AI-tournament harness.

Migrators apply only to `body` (the inner save record). The
envelope itself is not migrated; new envelope fields are additive
under `envelopeVersion = 1`. A future `envelopeVersion = 2` would
gate a breaking outer-shape change behind an explicit envelope
migrator chain (none exists today).

`saveVersion` is part of the canonical-JSON input to the optional
`mac` per [`save-envelope-mac.md`](./save-envelope-mac.md) § 4. A
tampered `saveVersion` with MAC enabled invalidates the MAC and the
loader refuses the save with `MAC_MISMATCH`. Without MAC (M4), a
tampered `saveVersion` falls into the "no migrator available" →
reject branch — the only unsigned defense available.

### Privacy strip on replay export

Converting `intent: "save"` to `intent: "replay"` strips the
following player-identifying fields: `name`, `slotId`, `createdAt`,
`savedAt`, and any user-supplied annotations. `replayCreatedAt`
replaces `createdAt`. The resulting envelope is unsigned (`mac`
absent) and its outer `id` is substituted by the deterministic
`canonicalContentHash`-derived id per
[`replay-format.md`](./replay-format.md).

### Replay-intent migration skip

When migrating an envelope with `intent === "replay"`, MAC re-
derivation is skipped because replays are unsigned. When migrating
an envelope with `intent === "fixture"`, the migration produces a
new canonical message that requires a fresh signature by an
`engine-fixture` key after migration. Migrators MUST NOT silently
re-emit a fixture envelope without re-signing.

## 9. MAC phase-in plan

The `mac` field on the envelope is **optional in M4** — saves are
device-local, IndexedDB-bound, and not exposed across installations.
The seam exists so M5 (cloud sync) and M5+ (shared replays /
leaderboards) can flip `mac` to required without a breaking save-
format change.

| Milestone | `mac` requirement |
| --- | --- |
| M4 | optional; not produced; not verified |
| M5 (cloud-sync opt-in) | required when `intent === "save"` AND user opted into cloud sync |
| M5+ (shared replays) | `intent === "fixture"` requires `signature` instead of `mac` |
| M6+ | required for every `intent === "save"` envelope |

The toggle is a runtime config, not a schema change. The schema
keeps `mac` as optional indefinitely so older fixtures and dev-mode
flows remain valid; the runtime decides whether to require it.
Authoritative doctrine:
[`save-envelope-mac.md`](./save-envelope-mac.md).

## 10. Authoring checklist

When you ship a new `saveVersion`:

- [ ] Add the new `SaveRecord_v{N+1}` type to
      `src/persistence/save-format.ts`.
- [ ] Add the migrator under
      `src/persistence/migrations/v{N}-to-v{N+1}.ts` from the
      template.
- [ ] Register it in `src/persistence/migrations/index.ts`.
- [ ] Add the fixture under `saves/migrations/v{N}/sample.json`.
- [ ] Add the round-trip test that loads → migrates → replays.
- [ ] If the new version drops a field, retire the matching fixture
      from older versions only after the support window rolls past.
- [ ] Re-run `npm run validate`; the migration lint will check the
      template-fixture-test invariants.

---

## 🔍 Sync Check

- **UI: ✔** — Save/Load screen 55 (`spec.md`, `interactions.md`,
  `data-contracts.md`) computes
  `selectors.persistence.selectedSaveCompatibility` against the
  migration registry, surfaces the "incompatible save migration
  needed" missing-state for out-of-window saves, and renders
  `IntentBadge` per the `save | replay | fixture` discriminator —
  consistent with §§ 4 and 8.
- **Schema: ⚠** —
  [`save-envelope.schema.json`](../../content-schema/schemas/save-envelope.schema.json)
  (envelope shape, `intent` enum, `mac` / `signature` gating) and
  [`save.schema.json`](../../content-schema/schemas/save.schema.json)
  (inner-body) match the prose. Row present in
  [`schema-matrix.md`](./schema-matrix.md) under `SaveEnvelope`.
  However, the § 8.1 strip-field list (`name`, `slotId`,
  `createdAt`, `savedAt`, `replayCreatedAt`) does not match
  `save.schema.json:metadata`, which has no `slotId`, no top-level
  `createdAt`, and no `replayCreatedAt`; see Issues.
- **Tasks: ✔** — Owning runtime task
  [`mvp.08-persistence.08-migration-registry`](../../tasks/mvp/08-persistence/08-migration-registry.md)
  and inner-record task
  [`mvp.08-persistence.02-log-only-save-format`](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  Read First this doc; envelope task
  [`mvp.08-persistence.18-save-envelope-and-intent`](../../tasks/mvp/08-persistence/18-save-envelope-and-intent.md),
  pre-replay task
  [`mvp.08-persistence.17-pre-replay-command-validation`](../../tasks/mvp/08-persistence/17-pre-replay-command-validation.md),
  and MAC task
  [`mvp.08-persistence.19-save-envelope-mac-phase-in`](../../tasks/mvp/08-persistence/19-save-envelope-mac-phase-in.md)
  likewise reference it.

## ⚠ Issues

- **Strip-field list does not match the canonical inner schema or
  task 18 AC.** § 8.1 lists `name`, `slotId`, `createdAt`,
  `savedAt`, with `replayCreatedAt` replacing `createdAt` — wording
  inherited from the now-archived
  [`docs/archive/implementation-plans/27-save-tampering-and-pack-signing-plan.md`](../archive/implementation-plans/27-save-tampering-and-pack-signing-plan.md)
  § "Privacy strip on replay export". The current canonical inner
  shape
  ([`save.schema.json`](../../content-schema/schemas/save.schema.json)
  `metadata`) has no `slotId`, no top-level `createdAt`, and no
  `replayCreatedAt`; the player-identifying fields it actually
  carries are `metadata.playerName`, `metadata.playerHash`,
  `metadata.playerLabel`, and `metadata.thumbnail`. Task
  [`mvp.08-persistence.18-save-envelope-and-intent`](../../tasks/mvp/08-persistence/18-save-envelope-and-intent.md)
  AC strips `metadata.playerName / playerHash / playerLabel /
  thumbnail`, matching the schema rather than this doc. Per CLAUDE.md
  root contract ("schema evolution is additive-first; alias before
  remove") the audit cannot decide which side moves; the canonical
  doctrine for the strip set lives in this file by both the schema
  description (`save-envelope.schema.json` `intent.replay`) and task
  18's link, so reconciliation must update either this § 8.1, or
  `save.schema.json` + task 18 — not all three independently.
  Suggested values for the doc-aligns-to-schema path: strip
  `metadata.name`, `metadata.savedAt`, `metadata.playerName`,
  `metadata.playerHash`, `metadata.playerLabel`,
  `metadata.thumbnail`, and any user-supplied `metadata.*`
  annotations; the new envelope's outer `id` is the deterministic
  `canonicalContentHash`-derived id per
  [`replay-format.md`](./replay-format.md). Skill did not silently
  rewrite (Hard Prohibition A — never change meaning of structural
  claims; Hard Prohibition D — never edit cross-checked files).
