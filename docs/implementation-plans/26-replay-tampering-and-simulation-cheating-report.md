# Implementation Report: 26 — Replay/Tampering Attacks & Deterministic Simulation Cheating

> Source plan:
> [`26-replay-tampering-and-simulation-cheating-plan.md`](./26-replay-tampering-and-simulation-cheating-plan.md)

## 1. Outcome

All five Critical Fixes and the planned Improvements landed as
canonical doctrine + schema + owning task + screen-package +
validator wiring. `npm run all` (which runs `npm run validate &&
npm run generate:wiki && npm run generate:task-system-report`) and
`npm test` (32 tests) both pass on the resulting tree.

## 2. New artifacts

### Doctrine docs (`docs/architecture/`)
- `security-model.md` — symmetric input-only lockstep threat model
  (Critical Fix 5).
- `lockstep-envelope.md` — wire-shape + per-match HMAC contract
  (Critical Fix 1).
- `match-handshake.md` — three-phase commit-reveal handshake +
  derivation rules (Critical Fix 2).
- `turn-timer.md` — `WAITING / STALLED / AUTO_END_DAY` escalation
  (Critical Fix 4).
- `draft-preview-policy.md` — UI policy + lint gate for stochastic
  preview oracles (Improvement).
- `build-attestation.md` — engine-bundle attestation contract
  (Improvement).
- `bisect-protocol.md` — Byzantine-tolerant bisect with MACed
  midpoints + blame attribution (Improvement).
- `peer-reputation.md` — signaling-side bounded LRU reputation
  counter (Improvement).
- `replay-audit-pipeline.md` — opt-in post-match audit pipeline
  (Improvement).
- `spectator-mode-requirements.md` — Phase-4 placeholder
  (Improvement).

### Schemas (`content-schema/schemas/`)
- `lockstep-envelope.schema.json` — `{ matchId, matchEpoch, seq,
  playerId, turn, command, mac }`, full 32-byte HMAC.
- `match-handshake.schema.json` — `COMMIT | REVEAL | ACCEPT |
  ABORT` discriminated union.

### Example fixtures
- `content-schema/examples/lockstep-envelope/` — move-hero,
  end-day, cast-spell, bisect-midpoint.
- `content-schema/examples/match-handshake/` — commit, reveal,
  accept, abort × 3 reasons.

### Owning task files (`tasks/phase-3/01-multiplayer/`)
- `09-lockstep-envelope-and-mac.md`
- `10-match-handshake-protocol.md`
- `11-turn-timer-and-stall-detection.md`
- `12-visibility-preconditions-on-commands.md`
- `13-security-model-and-doctrine.md`
- `14-screen-multiplayer-game-status.md`
- `15-pack-signature-and-build-attestation-policy.md`
- `16-peer-reputation-counter.md`
- `17-replay-audit-pipeline-contract.md`

### Phase-4 placeholder
- `tasks/phase-4/spectator-mode.md` (module index)
- `tasks/phase-4/spectator-mode/00-requirements.md`

### Screen package
- `docs/architecture/wiki/screens/77-multiplayer-game/` — five-file
  package (mockup.html, spec.md, interactions.md, data-contracts.md,
  architecture.md), registered in `index.json` under `multiplayer`.
  *Numbered 77 instead of the plan's 63 because 63 is already taken
  by `63-hotseat-turn-handoff` — see Assumptions.*

### Source stubs (`src/`)
- `src/net/lockstep/turn-timer.ts` — constants stub.
- `src/content-runtime/manifest-digest.ts` — type stub.

### Scripts (`scripts/`) — new CI gates
- `scripts/check-build-attestation.mjs` — allow-list shape gate
  (refuses non-placeholder keys in the example file).
- `scripts/check-lockstep-fixtures.mjs` — example-fixture validator
  for `content-schema/examples/lockstep-envelope/`.
- `scripts/check-handshake-fixtures.mjs` — example-fixture validator
  for `content-schema/examples/match-handshake/`.
- `scripts/check-no-stochastic-preview.mjs` — UI lint gate that
  rejects calls to engine `apply*`/`simulate*` from `src/ui/`
  unless marked `@deterministic-preview`.

### Removed during cleanup
- `tools/replay/batch-replay.mjs` and the `replay:audit` script —
  the audit pipeline's M5 surface is the post-match consent prompt
  on screen 77; the consumer is the future Phase-4 hosted service,
  not a terminal CLI. The doctrine and upload payload contract
  remain in [`replay-audit-pipeline.md`](../architecture/replay-audit-pipeline.md).
- `tools/` directory itself — every check now lives under
  `scripts/` for a single, consistent location.

### Scripts (`scripts/`)
- `scripts/check-build-attestation.mjs` — allow-list gate.

### Configuration (`services/signaling/config/`)
- `services/signaling/config/build-attestation.allow.example.json`
  — placeholder allow-list shape.

## 3. Updated artifacts

- `CLAUDE.md` — `security-model.md` added to **Read first** (item
  45) and to **Protect These Rules**.
- `docs/architecture/determinism.md` — added Seed Establishment
  Protocol subsection in § Content Hash + Engine Hash, cross-linked
  to `match-handshake.md` and `security-model.md`.
- `docs/architecture/pack-contract.md` — added Signature Policy
  subsection with `signaturePolicy: optional |
  required-friendly | required-ranked` enum.
- `docs/architecture/schema-matrix.md` — registered
  `LockstepEnvelope` + `MatchHandshake` rows.
- `docs/architecture/screen-command-coverage.json` — registered
  `LEAVE_MATCH`, `STALL_LIMIT_MS`, `WAITING_THRESHOLD_MS`,
  `SUBMIT_REPLAY_AUDIT`, `TRUST_VIOLATION_DETECTED` under
  `outOfScope`.
- `docs/architecture/wiki/screens/index.json` — added
  `77-multiplayer-game` to the `multiplayer` group.
- `tasks/phase-3/01-multiplayer/02-...md` — added Match Handshake
  cross-cutting subsection.
- `tasks/phase-3/01-multiplayer/03-...md` — added Sequence
  Validation, Canonical Intra-Turn Order, Wire-Shape Note, Turn
  Timer cross-cutting subsections; added dependency on Task 09.
- `tasks/phase-3/01-multiplayer/04-...md` — added Canonical Order
  Note + Mid-Match Pack Re-Validation subsections.
- `tasks/phase-3/01-multiplayer/05-...md` — added Byzantine
  Handling + Blame Attribution subsections.
- `content-schema/examples/ui-component-registry.example.json` —
  added 9 components for screen 77.
- `scripts/check-repo-contracts.mjs` — extended `schemaForFile`
  with `.lockstep-envelope.json` and `.match-handshake.json`
  suffix mappings so fixture files validate against their schemas.
- `package.json` — added `validate:lockstep`,
  `validate:handshake`, `validate:build-attestation`,
  `validate:no-stochastic-preview` scripts; chained all four
  into the `validate` aggregate.

## 4. Validation

- `npm run validate` — passes (all 22 sub-validators).
- `npm run all` — passes (validate + generate:wiki + report).
- `npm test` — passes (32/32 tests).
- New validators: `validate:lockstep`, `validate:handshake`,
  `validate:build-attestation`, `validate:no-stochastic-preview`
  — all clean.

## 5. Assumptions

- **Screen number 77 instead of 63.** The plan calls for screen
  package `63-multiplayer-game/`, but `63-hotseat-turn-handoff`
  already exists in `wiki/screens/index.json` under the
  `multiplayer` group. Took the next available numbered slot
  (`77`) and registered it under the same `multiplayer` group.
  All cross-links from the new doctrine + tasks point to
  `77-multiplayer-game` consistently.
- **Lockstep envelope coexists with the legacy command-envelope
  schema.** The plan creates a new
  `lockstep-envelope.schema.json` while
  `command-envelope.schema.json` remains in place from Plan 24
  / Task 30. The new schema is the M5 wire shape; the legacy
  schema is documented in `lockstep-envelope.md` § Wire shape
  as superseded for the M5 multiplayer module. No removal —
  additive-first per the engineering guide.
- **TS stubs are minimal.** `src/net/lockstep/turn-timer.ts` and
  `src/content-runtime/manifest-digest.ts` ship as constant /
  type stubs only. Full implementation is owned by the
  respective tasks (11 and 10) and lands when the engine surface
  exists. The stubs exist solely so the doctrine cross-links
  resolve under `npm run validate:links`.
- **No `replay:audit` CLI.** The plan asked for one, but the
  realistic flow is UI consent prompt → upload → Phase-4 hosted
  service. No human runs the audit from a terminal in M5, so the
  CLI was deleted and the doctrine reframed § 4 as the reference
  algorithm the future hosted service consumes.
- **Build-attestation example uses all-zero placeholders.** The
  CI gate `validate:build-attestation` enforces all-zero
  `publicKey` in the example file to prevent accidental commit
  of real signing keys.

## 6. Blockers

None.

## 7. Suggested commit message

```
plan-26: replay tampering and simulation cheating doctrine

Implements Plan 26 § Critical Fixes 1-5 + the system improvements:
authors the canonical security-model doctrine + lockstep wire envelope
with per-match HMAC + three-phase commit-reveal match handshake +
turn-timer escalation + visibility preconditions; adds the
Byzantine-tolerant bisect protocol, peer-reputation counter,
build-attestation contract, draft-preview lint, and post-match audit
pipeline; ships nine owning task files, a Phase-4 spectator placeholder,
the 77-multiplayer-game screen package, and four new CI validators wired
into npm run validate.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```
