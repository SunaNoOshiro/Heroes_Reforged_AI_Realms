# Implementation Plan: 17 — Final Critical Questions

> Source audit: [docs/readiness-audit/17-final-critical-questions.md](../readiness-audit/17-final-critical-questions.md)
> Audit AI-Readiness score at time of writing: **7.5 / 10** — target after this plan: **9 / 10**.

---

## 1. Overview

This plan converts the synthesis-layer gaps surfaced by Q277–Q300 into
concrete, AI-executable work. Section 17 is a *cross-cutting* audit:
many of its findings are already owned by sibling plans (multiplayer
07, performance 09, content 13, persistence 08, edge-cases 12,
testability 15, implementation-readiness 16). This plan therefore:

- **Adds the artifacts that no other section owns** — runtime-requirements
  doc, rollback playbook, deferred-items register, observability spec
  stub, Node↔browser canonical-bytes equivalence test, diagram↔task
  divergence audit, "first-bug" UX rules, week-one blockers.
- **Closes provenance gaps** — DEFEND TBD divergence (Q293, Q299),
  diagram-only contracts (Q292), single load-bearing assumptions
  (Q280, Q282).
- **Cross-references sibling plans** for issues already owned there,
  rather than re-specifying them — see §3 mapping.

Scope of this plan:

- 18 ❌ / ⚠ findings from Q277–Q300
- All 8 "Missing Logic" items from the summary
- All 6 "Risks" from the summary
- All 12 "Improvements" from the summary

Out of scope (handled by sibling plans):

- Concrete multiplayer recovery / TURN / N-peer protocol — see [07-multiplayer-plan.md](./07-multiplayer-plan.md)
- Concrete performance NFR / soak / memory ceiling — see [09-performance-plan.md](./09-performance-plan.md)
- Concrete pack-resolver algorithm / asset-loader cache — see [13-content-system-plan.md](./13-content-system-plan.md)
- Concrete `ValidationError` shape / surface rules / catalogue — see [12-edge-cases-plan.md](./12-edge-cases-plan.md)
- Concrete testing conventions / DI / mocking — see [15-testability-plan.md](./15-testability-plan.md)
- Concrete LICENSE / dependency policy / NFR matrix — see [16-implementation-readiness-plan.md](./16-implementation-readiness-plan.md)

The synthesis layer's **net new** ownership is:

| Artifact | Owner |
| --- | --- |
| `docs/architecture/runtime-requirements.md` | this plan |
| `docs/operations/rollback-playbook.md` | this plan |
| `docs/planning/deferred.md` | this plan |
| `docs/architecture/observability.md` | this plan |
| Node↔browser canonical-bytes equivalence test | this plan |
| Diagram↔task-spec divergence audit + fixes | this plan |
| `docs/architecture/error-ux.md` | this plan (delegates field shapes to plan 12) |

---

## 2. Critical Fixes (Must Do First)

These are blocking: an AI agent reading the canonical sources today
will either get stuck, contradict the audit summary, or invent a value.

### Issue: DEFEND damage-reduction TBD vs. audit-summary lock divergence

**Source:**
- Q293 (chat-thread-only contracts), Q299 (week-one blocker), summary
  "Risks" item 1 and "Improvements" item 1.

**Problem:**
- [docs/architecture/command-schema.md:303](../architecture/command-schema.md#L303) reads `(TBD: exact reduction)`.
- [tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md](../../tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md) reads `formula TBD based on DEF stat`.
- [docs/archive/AUDIT-EXECUTIVE-SUMMARY.md](../archive/AUDIT-EXECUTIVE-SUMMARY.md) (formerly `docs/planning/audits/AUDIT-EXECUTIVE-SUMMARY.md`) declares the formula locked at "250 permille".
- The audit summary therefore reflects a decision *not present in canonical sources*.

**Impact:**
- An agent picking up `09-tactical-combat/02a` gets stuck at week 1.
- An agent reading the audit summary silently invents `250 permille` and overrides the canonical spec — undetected until tactical-combat tests run.
- Plan 16 lists the same issue but is scoped to the doc-divergence; the synthesis layer additionally needs the **provenance check** (Q293) so future chat-thread-only locks are detected automatically.

**Solution:**
- Pick the canonical value (preferred: ratify the archived audit summary's `250 permille` lock since it was committed first).
- Patch all three sources to the same numeric formula and a worked example.
- Regenerate `tasks/task-registry.json`.
- Add a CI grep-gate that fails on `TBD`/`TODO`/`FIXME`/`???` inside `docs/architecture/` and `tasks/mvp/` (this is the same gate proposed in plan 16 — coordinate so it is added once, not twice).
- Add a *provenance gate*: every `Locked:` claim in `docs/archive/AUDIT-*` must be either (a) reflected verbatim in canonical sources or (b) recorded in `docs/planning/decision-log.md`. Provide the gate as `scripts/check-decision-provenance.mjs` and wire into `npm run validate`.

**Files to Update:**
- [docs/architecture/command-schema.md](../architecture/command-schema.md) — line 303.
- [tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md](../../tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md).
- [tasks/task-registry.json](../../tasks/task-registry.json) — regenerated.
- [scripts/check-repo-contracts.mjs](../../scripts/check-repo-contracts.mjs) — coordinate with plan 16.
- [package.json](../../package.json) — wire `validate:provenance` into `validate`.

**New Files (if needed):**
- `docs/planning/decision-log.md` — append-only log of locked decisions (one heading per lock, with date, value, rationale, and the canonical source it patched).
- `scripts/check-decision-provenance.mjs` — verifies every `docs/archive/AUDIT-*` `Locked:` line resolves to a value in canonical sources or `decision-log.md`.

**Implementation Steps:**
1. Confirm `250 permille` (or alternate) with the project owner.
2. Patch `command-schema.md:303` with explicit formula + worked example.
3. Patch `02a-defend-damage-reduction.md` description + Acceptance Criteria + Verify steps.
4. Run `npm run generate:task-registry`; inspect diff.
5. Create `docs/planning/decision-log.md` with the DEFEND lock as the first entry.
6. Author `scripts/check-decision-provenance.mjs`; wire into `package.json` `validate` script.
7. Run `npm run validate` end-to-end.
8. Append entry to [docs/planning/implementation-log.md](../planning/implementation-log.md).

**Dependencies:**
- Owner confirmation of canonical formula.
- Coordination with plan 16 (same TBD-grep gate).

**Complexity:** S

---

### Issue: Node↔browser canonical-bytes equivalence is a single load-bearing assumption with no test

**Source:**
- Q280 (single unverified assumption), Q282 (determinism SPOF), summary "Missing Logic" item 8.

**Problem:**
- Every save/replay/multiplayer guarantee reduces to: `serialize(state)` + `xxh64(bytes)` produces bit-identical output across Node and browser.
- The fuzz harness in [tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md) runs Node-only.
- JS-engine differences in `Number.prototype.toString` (e.g. `1e+21` exponent forms), `TextEncoder` UTF-8 normalization edge cases, and `Map`/`Set` iteration order can drift silently between V8 (Node), V8 (Chromium), JavaScriptCore (Safari), and SpiderMonkey (Firefox).

**Impact:**
- A drift goes undetected until two players on different engines try to share a save or run a multiplayer match — at which point every save/replay/desync guarantee fails simultaneously and silently for those users.
- Plan 08 (persistence) covers gzip-level pinning but not cross-environment serializer parity.

**Solution:**
- Add a Node↔browser canonical-bytes equivalence test that runs in CI:
  - Node side: existing fuzz harness produces a transcript of `(state, canonicalBytes, hash)` triples for the deterministic 1000-command run.
  - Browser side: a Playwright-driven headless Chromium re-runs the same transcript through the same serializer, asserting byte-identical canonical bytes and identical xxh64.
  - Optional second target: WebKit (Safari) and Firefox (Gecko) under the same Playwright runner.
- Pin the determinism-fragile primitives explicitly:
  - Number formatting helper (no `toString` reliance for serialization — use a fixed-point decimal formatter).
  - Sorted-key object emission.
  - Sorted-key Map/Set emission.
  - UTF-8 encoder identity (canonical NFC).

**Files to Update:**
- [tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md](../../tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md) — extend Acceptance Criteria with cross-environment parity.
- [tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md) — add a "browser parity" sub-target.
- [docs/architecture/determinism.md](../architecture/determinism.md) — document the parity test as part of the Non-Negotiable Stack.
- `.github/workflows/ci.yml` (or equivalent) — add the Playwright job.

**New Files (if needed):**
- `tasks/mvp/01-engine-core/09b-cross-environment-canonical-bytes-test.md` — new task with explicit Playwright + multi-engine targets.
- `tests/determinism/cross-env/playwright.config.ts`.
- `tests/determinism/cross-env/parity.spec.ts`.
- `tests/determinism/cross-env/transcript-runner.ts` — shared between Node and browser.

**Implementation Steps:**
1. Author `09b-cross-environment-canonical-bytes-test.md` with Inputs/Outputs/Owned Paths/Verify.
2. Implement a transcript exporter in the existing fuzz harness (`writeTranscript({ state, canonicalBytes, hash }[])`).
3. Set up Playwright config targeting Chromium (mandatory), WebKit + Firefox (optional, gated by env flag).
4. Implement the browser-side runner that reads the transcript and asserts byte equality.
5. Wire into CI as a separate job ("determinism-cross-env") — must pass for merge.
6. Document the test in `determinism.md` under the existing serializer section.

**Dependencies:**
- Tasks `07-state-serializer-plus-xxh64-hash` and `09-fuzz-harness-...` must be implemented first.
- Plan 08's gzip-level pin should land in the same window so save-bytes-equality has the same cross-env coverage.

**Complexity:** M

---

### Issue: No `runtime-requirements.md` declaring load-bearing runtime assumptions

**Source:**
- Q279 (runtime preconditions undeclared), summary "Improvements" item 2.

**Problem:**
The following runtime preconditions are load-bearing but never declared
in a single doc:

- DOM as the UI-shell renderer (Q25).
- WebGL2 with a Canvas-2D fallback path (no fallback owner).
- Web Workers for the AI tick (no fallback for environments without).
- Web Crypto (`crypto.subtle`) for ed25519 pack-signature verification — no Node parity story.
- IndexedDB / OPFS quota for saves — no minimum, no quota-exhaustion UX (Q288).
- `deltaTime` source for animation timeline — monotonic vs. throttled clock unspecified (Q66).
- gzip determinism at fixed compression level (Q151, Q154).
- Browser engine floor — no minimum Chromium / Safari / Firefox version pinned.

**Impact:**
- Implementer of any of those subsystems either invents a precondition or omits the fallback; users on under-spec environments get cryptic failures.
- Cross-environment determinism (above issue) cannot be verified without naming the engine floor.

**Solution:**
Author `docs/architecture/runtime-requirements.md` as the single declaration. Each precondition has: a numbered ID, the minimum version/quota, the fallback policy (or "no fallback — fail loud"), and a reference to the task that owns the runtime check.

**Files to Update:**
- [docs/architecture/overview.md](../architecture/overview.md) — link to runtime-requirements from "Architecture index".
- [CLAUDE.md](../../CLAUDE.md) — add `docs/architecture/runtime-requirements.md` to the "Read first" list.
- [docs/readiness-audit/02-ui-rendering-system.md](../readiness-audit/02-ui-rendering-system.md) — Q25, Q26 cross-link.
- [docs/readiness-audit/04-animation-system.md](../readiness-audit/04-animation-system.md) — Q66.
- [docs/readiness-audit/08-persistence-save-system.md](../readiness-audit/08-persistence-save-system.md) — Q151, Q154.

**New Files (if needed):**
- `docs/architecture/runtime-requirements.md` with sections:
  - `RR-01: UI shell — DOM (React-DOM, decision pinned by plan 02)`
  - `RR-02: Map renderer — WebGL2, Canvas-2D fallback owner = renderer task ##`
  - `RR-03: AI worker — Web Workers, fallback = main-thread (degraded)`
  - `RR-04: Crypto — Web Crypto (subtle); Node parity via @noble/ed25519`
  - `RR-05: Storage — IndexedDB ≥ 50 MB; OPFS preferred when available; quota-exhaustion UX = task ##`
  - `RR-06: Time source — `performance.now()` monotonic, capped `deltaTime` per frame`
  - `RR-07: gzip — fflate v0.8.x at level 6 (deterministic)`
  - `RR-08: Browser floor — Chromium ≥ 120, Safari ≥ 17, Firefox ≥ 121`

**Implementation Steps:**
1. Resolve each open precondition with the responsible task author (UI shell decision = blocked on plan 02; gzip = blocked on plan 08).
2. Draft `runtime-requirements.md` with stub entries for unresolved items, marked `Status: pending` and a back-reference to the deciding plan.
3. Add link in `CLAUDE.md` "Read first" list.
4. Add a CI step (`scripts/check-runtime-requirements.mjs`) that asserts every `RR-NN` referenced in tasks resolves to a heading in this file.
5. Update audit cross-links (Q25, Q26, Q66, Q151, Q154) to cite the new doc.

**Dependencies:**
- Plan 02 must lock UI shell technology before `RR-01` can be marked `Status: locked`.
- Plan 08 must lock gzip implementation + level before `RR-07` can be marked `Status: locked`.

**Complexity:** M

---

## 3. System Improvements

### UI / Screens

#### Issue: No `error-ux.md` for `ValidationError` surfacing

**Source:**
- Q300 (first user-filed bug), Q204 cross-ref, summary "Improvements" item 6.

**Problem:**
- Dispatcher returns `Result<…, ValidationError>` but the audit notes no spec for how the error reaches the player.
- Plan 12 (edge-cases) owns the `ValidationError` *shape*; the synthesis layer needs the *UX surface rule* (toast vs. disabled-control vs. modal vs. silent).

**Impact:**
- "Greyed-out control with no tooltip" is the Q300 most-likely first bug.
- Without a single rule, every screen implementer chooses differently → inconsistent, untestable UX.

**Solution:**
Author `docs/architecture/error-ux.md` with:
- Surface decision matrix (severity × originator × actionable-by-player).
- Mapping from `ValidationError.code` → surface (toast / inline / modal / log-only).
- Localization-key naming convention (`error.<domain>.<code>`).
- Telemetry tagging requirement (every surfaced error emits `error.shown` with `code`).
- Per-screen wiring rule: the screen package's `interactions.md` MUST cite the error-ux surface for every action that can return `Err`.

**Files to Update:**
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md) — link error-ux.md from screen-package authoring rules.
- All screen `interactions.md` — add an "Error surfaces" subsection (do this lazily as each screen task lands; add a CI gate that requires the section once a control returns `Err`).

**New Files (if needed):**
- `docs/architecture/error-ux.md`.
- `scripts/check-error-ux-coverage.mjs` — for every action declared in `interactions.md` that targets a fallible command, require an `Error surfaces:` block. Wire into `npm run validate`.

**Implementation Steps:**
1. Wait for plan 12 to land the `ValidationError` shape.
2. Draft `error-ux.md` with the surface matrix and a worked example (DEFEND command rejected because hero already moved).
3. Add localization-key convention to [docs/architecture/wiki/screens/00-screen-package-template/data-contracts.md](../architecture/wiki/screens/) once authored.
4. Add the CI gate.
5. Backfill the screens whose `interactions.md` already lists fallible actions.

**Dependencies:**
- Plan 12 (`ValidationError` shape).
- Telemetry stub doc (below).

**Complexity:** M

---

#### Issue: Per-screen view-model schema undefined (close-fourth week-one blocker)

**Source:**
- Q299 close-fourth, Q111 cross-ref.

**Problem:**
- Screen → component DTO shape is undefined; first UI task will improvise.
- Plan 06 (data-contracts) owns the schema convention but the synthesis layer should ensure the rule lands before the *first* UI task starts.

**Impact:**
- Every later UI task would re-invent its own DTO; later refactors become expensive.

**Solution:**
- Confirm plan 06 owns this and is sequenced ahead of the first UI/editor task. If not, pull the view-model schema work forward in the task graph.

**Files to Update:**
- [docs/planning/roadmap.md](../planning/roadmap.md) — confirm sequencing.
- [tasks/mvp/02-ui-shell-or-equivalent/](../../tasks/mvp/) — add a `Dependencies:` line citing the plan-06 view-model schema task.

**New Files (if needed):**
- None — owned by plan 06.

**Implementation Steps:**
1. Read [06-data-contracts-and-schema-plan.md](./06-data-contracts-and-schema-plan.md) to confirm view-model schema task.
2. If absent, escalate to plan 06; if present, ensure first UI task lists it as a dependency.

**Dependencies:**
- Plan 06.

**Complexity:** S

---

### Data Contracts

#### Issue: Diagram-only contracts diverge from canonical task specs

**Source:**
- Q292 (contract-only-in-diagram).

**Problem:**
Three concrete divergences identified:

1. **Save format** — [docs/architecture/diagrams/24-save-flow.md](../architecture/diagrams/24-save-flow.md) shows a `state` blob alongside the command log; [tasks/mvp/08-persistence/02-log-only-save-format.md](../../tasks/mvp/08-persistence/02-log-only-save-format.md) is "log-only, no game state" (Q150).
2. **"Resync from last good state"** — [docs/architecture/diagrams/26-multiplayer-sync.md](../architecture/diagrams/26-multiplayer-sync.md) shows this branch; actual recovery path is `bisect → report → quit` (Q135).
3. **DAMAGE_FRAME callback** — sequence diagrams reference an engine→renderer synchronization moment, but no schema or call-protocol exists (Q67).

**Impact:**
- A reader who consults only the diagram implements the wrong contract.
- AI agents reading both will pick whichever appears first in their context.

**Solution:**
- Patch each diagram to match the canonical task spec (the task is the source of truth, per CLAUDE.md).
- Add a header note in `docs/architecture/diagrams/README.md` (or create one): "Diagrams are normatively secondary to task acceptance criteria. If they diverge, fix the diagram."
- Add a CI gate `scripts/check-diagram-task-parity.mjs` that for each diagram cross-references the cited tasks and warns on divergence patterns (state-vs-log-only, resync-vs-quit, DAMAGE_FRAME existence).

**Files to Update:**
- [docs/architecture/diagrams/24-save-flow.md](../architecture/diagrams/24-save-flow.md) — remove `state` blob from the diagram; show only `Header + Commands[] + Hashes[] + (optional) Checkpoints[]`.
- [docs/architecture/diagrams/26-multiplayer-sync.md](../architecture/diagrams/26-multiplayer-sync.md) — replace "Resync from last good state" with `bisect → report → quit` per Q135 / [tasks/phase-3/01-multiplayer/](../../tasks/phase-3/01-multiplayer/).
- [docs/architecture/diagrams/](../architecture/diagrams/) — locate the DAMAGE_FRAME-referencing diagram (battle-attack sequence) and either define the callback contract in `docs/architecture/renderer-engine-contract.md` (plan 04 territory) or remove the reference.
- [docs/architecture/diagrams/README.md](../architecture/diagrams/) — add or update with the normative-secondary note.

**New Files (if needed):**
- `scripts/check-diagram-task-parity.mjs` — opt-in CI gate.

**Implementation Steps:**
1. For each of the three divergences, decide: patch diagram to match task, or escalate to plan 04 / plan 07 / plan 08 to redefine the task.
2. Patch the diagrams.
3. Author `diagrams/README.md` with the normative-secondary note.
4. Implement the parity script and wire into `npm run validate`.
5. Re-run `npm run generate:wiki`.

**Dependencies:**
- Plan 04 (DAMAGE_FRAME contract).
- Plan 07 (multiplayer recovery story).
- Plan 08 (save format).

**Complexity:** S

---

### Schemas

This audit surfaced no new schema gaps — the canonical schema work is
fully owned by plan 06. No-op for this plan.

---

### Architecture

#### Issue: No `observability.md` / telemetry contract

**Source:**
- Q298 (production observability), Q291 (no owner/spec/test for telemetry), summary "Improvements" item 3.

**Problem:**
- No logger interface, no metrics sink, no error-reporting service, no per-match anonymous-stats schema.
- Audit section [31-trust-boundaries-and-logging-monitoring.md](../readiness-audit/31-trust-boundaries-and-logging-monitoring.md) catalogs the surface but has no answers.
- Production day-one blind spots: per-match desync incidence, AI provider failure rate, pack-load failure types, save-corruption frequency, renderer frame-time outliers, WebRTC connection success rate, heartbeat-loss / spurious host-migration rate.

**Impact:**
- First production incident has no diagnostic data.
- Every later module re-invents its own logging.

**Solution:**
Author `docs/architecture/observability.md` with:
- Logger interface (`Logger { info | warn | error }`) — pure, environment-agnostic, with structured fields.
- Metrics sink interface (`MetricsSink { counter | histogram | gauge }`) — backend-agnostic.
- Per-match anonymous-stats schema (privacy-respecting; see plan 22 for retention).
- Required emission catalogue: each subsystem lists the events/metrics it MUST emit (multiplayer: `desync.detected`, `host.migrated`; pack: `pack.load.failed{reason}`; AI: `ai.provider.error{provider, code}`; save: `save.corrupt`).
- Backend strategy: dev = console; prod = pluggable (no provider locked-in at this stage).
- Privacy redaction rules — no PII, no IP, no peer ID; pack hash + engine hash + faction ID OK.

**Files to Update:**
- [docs/architecture/overview.md](../architecture/overview.md) — link observability.md.
- [CLAUDE.md](../../CLAUDE.md) — add to "Read first".
- [docs/readiness-audit/31-trust-boundaries-and-logging-monitoring.md](../readiness-audit/31-trust-boundaries-and-logging-monitoring.md) — back-link.

**New Files (if needed):**
- `docs/architecture/observability.md`.
- `tasks/phase-2/observability/01-logger-and-metrics-sink-interfaces.md` — implements the interfaces against a console backend; later phases swap backends.
- `content-schema/telemetry/event-schema.json` — canonical event schema for the per-match anonymous-stats emission.

**Implementation Steps:**
1. Draft `observability.md` listing interfaces and the required-emissions catalogue.
2. Coordinate with plan 22 (privacy retention) for the redaction rules.
3. Author `tasks/phase-2/observability/01-…` with explicit Owned Paths.
4. Add `content-schema/telemetry/event-schema.json` and validate via `check-repo-contracts.mjs`.
5. Cross-reference from the multiplayer / pack / AI / save plans so each module's required emissions are wired into their tasks' Acceptance Criteria.

**Dependencies:**
- Plan 22 (privacy retention) for redaction rules.
- Plan 16 (NFR matrix) so observability NFRs (event rate, payload ceiling) live in one place.

**Complexity:** M

---

#### Issue: No `rollback-playbook.md`

**Source:**
- Q295 (rollback plan), summary "Improvements" item 4.

**Problem:**
- Schema additivity + engine/contentHash pinning cover *content* and *engine* drift.
- No client-version pinning policy, no kill-switch for malicious content, no hot-fix migration procedure, no incident-response RACI.
- Acute gap once published packs and multiplayer go live.

**Impact:**
- A malicious community pack (or a regression in a first-party pack) cannot be remotely deactivated.
- A determinism regression shipped to clients has no documented mitigation path.

**Solution:**
Author `docs/operations/rollback-playbook.md` with:
- **Content rollback** — pack revocation list (signed, fetched at startup), `sandboxed: true` quarantine policy, "hot-pin to last-good content hash" procedure.
- **Engine rollback** — client-version pinning rule (rejected engineHash → user prompted to roll back the client; published builds keep N−1 alongside N for ≥ 30 days).
- **Save rollback** — corrupted-save quarantine procedure, last-known-good checkpoint surfacing.
- **Incident-response RACI** — Responsible / Accountable / Consulted / Informed for each surface (pack, engine, signaling, AI provider).
- **Kill-switch policy** — per-feature flag pulled from a signed manifest; flags ship with conservative defaults so a missing manifest never *enables* something.
- **Hot-fix migration steps** — schema migration procedure when an additive-only change is not enough.

**Files to Update:**
- [docs/architecture/overview.md](../architecture/overview.md) — link.
- [CLAUDE.md](../../CLAUDE.md) — add `docs/operations/rollback-playbook.md` reference.

**New Files (if needed):**
- `docs/operations/rollback-playbook.md`.
- `docs/operations/` directory marker.
- (Optional, deferred to Phase-3 deployment) `services/revocation/` for the signed revocation-list service.

**Implementation Steps:**
1. Draft the playbook with the structure above.
2. RACI table requires owner input — escalate sections that have no owner yet, mark them `Status: pending owner`.
3. Cross-link from plan 13 (content) and plan 07 (multiplayer) where their tasks' failure paths invoke the playbook.

**Dependencies:**
- Plan 13 (pack-signing model) — sets the technical basis for revocation.
- Plan 16 (NFR matrix) — references the playbook for the "graceful degradation" NFRs.

**Complexity:** M

---

#### Issue: No `deferred.md` register

**Source:**
- Q296 (deferred to v2 without note), summary "Improvements" item 10.

**Problem:**
Repository has *some* deferral notes ([roadmap.md](../planning/roadmap.md) "Out of Scope For Early Milestones",
[spells-and-mage-guild.md](../architecture/spells-and-mage-guild.md) §7) but no consolidated register. Items implicitly deferred:

- Per-record content versioning (Q220).
- Spectator slots, streamer mode, replay sharing (audit #18-#19).
- Public mod marketplace.
- Dedicated-server / authoritative-server mode.
- Mobile native app (mentioned in roadmap, no v2 deferral note).
- 3D rendering (mentioned in roadmap, no v2 deferral note).

**Impact:**
- An AI agent reading any single doc cannot tell whether feature X is in scope, deferred, or out-of-scope-forever.

**Solution:**
Author `docs/planning/deferred.md` as a single register with one row per deferred item: ID, title, rationale, deferred-from-milestone, target-milestone (or "v2" / "out of scope"), owning audit question reference.

**Files to Update:**
- [docs/planning/roadmap.md](../planning/roadmap.md) — link to deferred.md and stop duplicating the list.
- [docs/architecture/spells-and-mage-guild.md](../architecture/spells-and-mage-guild.md) — link to the relevant deferred IDs.
- [CLAUDE.md](../../CLAUDE.md) — add to "Read first" list.

**New Files (if needed):**
- `docs/planning/deferred.md`.

**Implementation Steps:**
1. Walk every audit ⚠/❌ and the roadmap/spells doc to extract deferred items.
2. Assign each a stable ID (`DEF-001`, `DEF-002` …).
3. Author the register; cross-link from each origin doc.
4. Add `scripts/check-deferred-coverage.mjs` that warns on TODO/FIXME/`v2:` mentions in canonical sources without a `DEF-NNN` reference.

**Dependencies:**
- None.

**Complexity:** S

---

#### Issue: Pack data-integrity beyond schema + signature is not specified

**Source:**
- Q288 (worst-case data corruption).

**Problem:**
- A *signed-but-malicious-author* pack passes signature verification.
- Schema-valid-but-tampered records (e.g. stat = 99999 inside type bounds) survive validation.
- Save-file-share scenarios (Q20 in section 20) and pack-trust UX prompts are not specified end-to-end.

**Impact:**
- Trust boundary is weaker than the audit summary implies.
- Players opening a shared save with a malicious pack get malicious content with no in-product warning.

**Solution:**
- Plan 13 (content) owns balance/stat-range constraints — coordinate, do not duplicate.
- The synthesis-layer addition: a **trust-tier matrix** in `docs/architecture/pack-trust.md` (or extend `pack-contract.md`) that defines:
  - tier `verified-first-party` — mutated content shows a "modified pack" UI banner.
  - tier `verified-third-party` — same UI banner + author-identity surfaced.
  - tier `community` (signed) — `sandboxed: true` capability mask, balance-corridor enforcement on stats.
  - tier `unsigned` — load denied unless user explicitly opts in via the "I trust this developer" prompt.
- Save-import flow MUST surface the trust tier of every pack the save references.

**Files to Update:**
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md).
- [docs/readiness-audit/27-save-tampering-and-pack-signing.md](../readiness-audit/27-save-tampering-and-pack-signing.md) — back-link.
- [docs/readiness-audit/20-save-imports-and-pack-trust-prompts.md](../readiness-audit/20-save-imports-and-pack-trust-prompts.md) — back-link.

**New Files (if needed):**
- (Optional) `docs/architecture/pack-trust.md` if `pack-contract.md` becomes too large.

**Implementation Steps:**
1. Coordinate with plan 13 on trust-tier ownership.
2. Define the trust-tier matrix.
3. Add the save-import trust-surface rule.
4. Add a screen-package interaction note in any save-import / pack-load screen.

**Dependencies:**
- Plan 13 (content trust model).
- Plan 12 (error UX) for the surfacing UI.

**Complexity:** M

---

### Tasks

#### Issue: Several components have no owner / no spec / no test

**Source:**
- Q291 (no owner/spec/test).

**Problem:**
Six surfaces flagged:

| Surface | Owner |
| --- | --- |
| Stub/mocking convention | plan 15 |
| Telemetry / observability | this plan (above) |
| License-audit / dependency-policy | plan 16 / plan 30 |
| Lobby browser / friend list | plan 18 (TBD: `18-room-codes-and-lobby-discovery-plan.md` not yet authored) |
| NSFW + copyright moderation for image outputs | plan 14 |
| Storage-quota exhaustion UX | plan 12 (edge-cases) — re-confirm |

**Impact:**
- An AI agent picking up any of these has no entry point.

**Solution:**
- For each row above, confirm the owning plan exists and lists a concrete task. Where the plan is missing (lobby-browser → plan 18 not yet drafted), file a stub `tasks/phase-3/02-lobby/` task that names the gap and depends on the plan being authored.
- For the storage-quota UX, ensure plan 12 has an explicit task; if not, file one.

**Files to Update:**
- [docs/implementation-plans/](.) — confirm coverage in plans 14, 15, 16, 18 (TBD), 30 (TBD).

**New Files (if needed):**
- (Conditional) `docs/implementation-plans/18-room-codes-and-lobby-discovery-plan.md` and `30-dependencies-and-build-pipeline-plan.md` if not present.

**Implementation Steps:**
1. Audit the six rows against the plans directory.
2. For missing plans, file placeholder plan files referencing the audit section IDs.
3. For missing tasks, author them under `tasks/phase-3/`.

**Dependencies:**
- None internal; depends on the existence of plans 14/15/16/18/30.

**Complexity:** S

---

#### Issue: "Logic in the head of one contributor" risk

**Source:**
- Q294 (head-of-one-contributor logic).

**Problem:**
Four candidates ranked by load-bearing impact:

1. Strategic-AI heuristic weights beyond `research/deep-research-report.md`.
2. Balance-corridor judgement-call methodology (Wilson 95 % CI ∈ [35 %, 65 %], outliers, "compensating ability exists").
3. Renderer ↔ UI overlay protocol (WebGL canvas hit-tests into DOM panels).
4. IP-neutralization decision provenance.

**Impact:**
- Any of these failing review by a second contributor forces re-derivation rather than reference.

**Solution:**
- (1) Plan 10 (AI) owns: ensure strategic-AI weights are codified in a `tasks/phase-2/04-strategic-ai/03-priority-weights.md` table with rationale per row.
- (2) Plan 05 (game mechanics) owns: balance-corridor methodology already in `research/deep-research-report.md` — extract the *judgement-call rules* into `docs/balance/judgement-rules.md`.
- (3) Plan 02 (UI rendering) owns: renderer↔UI overlay protocol → `docs/architecture/renderer-ui-overlay.md`.
- (4) This plan owns: IP-neutralization decision log goes into the new `docs/planning/decision-log.md` (created above for DEFEND), with one entry per renamed/dropped mechanic.

**Files to Update:**
- [docs/planning/decision-log.md](../planning/decision-log.md) (new) — append IP-neutralization entries.
- [research/deep-research-report.md](../../research/deep-research-report.md) — link out to the judgement-rules doc.

**New Files (if needed):**
- `docs/balance/judgement-rules.md` (plan 05 territory; coordinate).
- `docs/architecture/renderer-ui-overlay.md` (plan 02 territory; coordinate).

**Implementation Steps:**
1. Walk the IP-neutralization commit history; extract every rename/drop into a `decision-log.md` entry.
2. File coordination notes against plans 02, 05, 10.

**Dependencies:**
- Plans 02, 05, 10.

**Complexity:** M

---

### Multiplayer / Persistence / Performance

The audit raised five risks in this group; four are owned by sibling
plans. The synthesis-layer additions are listed here so they are not
lost.

#### Issue: N-peer scaling story (cross-reference)

**Source:** Q283.

**Problem:** Today's hash-exchange and turn-gate are pairwise.

**Solution:** Owned by [07-multiplayer-plan.md](./07-multiplayer-plan.md). The synthesis-layer obligation: ensure plan 07 has an explicit "N-peer scaling" section. If not, escalate.

**Complexity:** (Tracked in plan 07.)

---

#### Issue: Map-size NFR (cross-reference)

**Source:** Q284.

**Problem:** No engine-side max map-size NFR.

**Solution:** Owned by [09-performance-plan.md](./09-performance-plan.md). Synthesis-layer obligation: ensure NFR matrix in plan 16 cites it.

**Complexity:** (Tracked in plan 09.)

---

#### Issue: Pack-resolver algorithm (cross-reference)

**Source:** Q285.

**Solution:** Owned by [13-content-system-plan.md](./13-content-system-plan.md).

**Complexity:** (Tracked in plan 13.)

---

#### Issue: Packet-loss budget + spurious-migration debounce (cross-reference)

**Source:** Q286.

**Solution:** Owned by [07-multiplayer-plan.md](./07-multiplayer-plan.md). Synthesis-layer obligation: ensure plan 07 explicitly publishes a packet-loss budget and a debounce window; if missing, escalate.

**Complexity:** (Tracked in plan 07.)

---

#### Issue: Long-session memory ceiling + soak target (cross-reference)

**Source:** Q287.

**Solution:** Owned by [09-performance-plan.md](./09-performance-plan.md).

**Complexity:** (Tracked in plan 09.)

---

#### Issue: Late-testable subsystem mitigation (cross-reference)

**Source:** Q297.

**Problem:** Multiplayer E2E, AI generation pipeline, performance NFRs, and 60-minute soak are all gated until late in implementation.

**Solution:** Owned by [15-testability-plan.md](./15-testability-plan.md). Synthesis-layer obligation: ensure plan 15 lists, for each late-testable area, the *interim mitigation* (M0 fuzz harness, headless game runner, mocked `GenerationProvider`).

**Complexity:** (Tracked in plan 15.)

---

## 4. Suggested Task Breakdown

These are the new `tasks/` files this plan introduces. Each is sized
for a single AI agent run and has explicit `Owned Paths`, `Inputs`,
`Outputs`, `Acceptance Criteria`, `Verify`, and `Dependencies`.

- [ ] `tasks/mvp/01-engine-core/09b-cross-environment-canonical-bytes-test.md` — Playwright job asserting Node↔Chromium byte-identical canonical output (Q280).
- [ ] `tasks/phase-2/observability/01-logger-and-metrics-sink-interfaces.md` — pure interface + console backend (Q298).
- [ ] `tasks/phase-2/observability/02-required-emissions-catalogue.md` — every subsystem's mandatory events/metrics enumerated.
- [ ] (Stub) `tasks/phase-3/02-lobby/00-plan.md` — placeholder marking that lobby-browser work depends on plan 18 being authored.
- [ ] (Stub) `tasks/phase-2/balance/01-judgement-rules-doc.md` — extract balance-corridor judgement rules from research notes (Q294 #2).

These are the new docs this plan introduces:

- [ ] `docs/architecture/runtime-requirements.md` (Q279).
- [ ] `docs/architecture/observability.md` (Q298).
- [ ] `docs/architecture/error-ux.md` (Q300, Q204).
- [ ] `docs/operations/rollback-playbook.md` (Q295).
- [ ] `docs/planning/deferred.md` (Q296).
- [ ] `docs/planning/decision-log.md` (Q293, Q294 #4).
- [ ] (Possibly) `docs/architecture/pack-trust.md` if pack-contract.md becomes too large (Q288).
- [ ] `docs/architecture/diagrams/README.md` — normative-secondary note (Q292).

These are the new CI scripts this plan introduces:

- [ ] `scripts/check-decision-provenance.mjs` (Q293).
- [ ] `scripts/check-runtime-requirements.mjs` (Q279).
- [ ] `scripts/check-error-ux-coverage.mjs` (Q300).
- [ ] `scripts/check-diagram-task-parity.mjs` (Q292).
- [ ] `scripts/check-deferred-coverage.mjs` (Q296).

Diagram + spec patches:

- [ ] Patch [docs/architecture/diagrams/24-save-flow.md](../architecture/diagrams/24-save-flow.md) to log-only.
- [ ] Patch [docs/architecture/diagrams/26-multiplayer-sync.md](../architecture/diagrams/26-multiplayer-sync.md) to `bisect → report → quit`.
- [ ] Resolve DAMAGE_FRAME (define contract or remove diagram reference).
- [ ] Patch [docs/architecture/command-schema.md:303](../architecture/command-schema.md#L303) — DEFEND lock.
- [ ] Patch [tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md](../../tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md) — DEFEND lock.

---

## 5. Execution Order

Order matters because several items unblock others. Group A is
critical-path; Group B is parallelizable; Group C is dependent on
sibling plans landing first.

**Group A — Critical (week 1, blocks first MVP work):**

1. Resolve DEFEND TBD (patch sources + add `decision-log.md` + provenance gate).
2. Author `docs/architecture/runtime-requirements.md` — at least the stub structure with `Status: pending` rows for items blocked on sibling plans.
3. Author `docs/planning/deferred.md` (small, independent, unblocks readers).

**Group B — Parallelizable foundations (weeks 1–3):**

4. Author `docs/operations/rollback-playbook.md`.
5. Author `docs/architecture/observability.md` + `tasks/phase-2/observability/01-…`.
6. Patch the three diagram divergences + author `docs/architecture/diagrams/README.md`.
7. Author `scripts/check-diagram-task-parity.mjs`, `check-runtime-requirements.mjs`, `check-deferred-coverage.mjs` and wire into `npm run validate`.

**Group C — Dependent on sibling plans (weeks 3–6):**

8. After plan 12 lands `ValidationError` shape → author `docs/architecture/error-ux.md` + `check-error-ux-coverage.mjs`.
9. After tasks 07-state-serializer + 09-fuzz-harness implementation → author `09b-cross-environment-canonical-bytes-test.md` and wire Playwright into CI.
10. After plan 13 finalizes pack-trust model → author trust-tier matrix and save-import surface.
11. After plans 02 + 05 + 10 land → backfill `decision-log.md` IP-neutralization entries and confirm renderer↔UI overlay + balance-judgement docs exist.

**Group D — Long tail (after MVP is testable):**

12. Add Playwright cross-env test for WebKit + Firefox (currently optional in step 9).
13. Stand up the per-match anonymous-stats emission pipeline against a real backend (deferred until Phase 3 deployment).

---

## 6. Risks if Not Implemented

| Risk | Trigger | Consequence |
| --- | --- | --- |
| DEFEND TBD persists | First M2 tactical-combat task starts | Implementer invents a value; later balance pass invalidates it; replays from old engine builds desync. |
| No runtime-requirements doc | First user on Safari 16 / Firefox 119 / no Web Workers | Cryptic failure with no actionable error. |
| No Node↔browser parity test | Cross-machine save share or two-player match | Silent canonical-bytes drift breaks every save/replay/multiplayer guarantee at once. |
| No observability stack | First production incident | Zero diagnostic data; every later module re-invents its own logger. |
| No rollback playbook | Malicious community pack ships, or determinism regression in published build | No remote deactivation path; players keep loading bad content; engine-version mismatches silently corrupt saves. |
| No deferred.md register | New contributor reads roadmap.md | Cannot tell whether feature X is in scope, deferred, or out forever; planning churn. |
| Diagram divergences persist | AI agent reads only the diagram | Implements the wrong contract; integration breaks at the engine↔renderer / engine↔storage boundary. |
| Provenance gate absent | Future audit "locks" something without patching canonical source | Audit summary and source diverge silently again — same bug class as DEFEND. |
| Trust-tier matrix absent | Player imports a save referencing a malicious signed pack | Pack loads with first-party trust; balance-corridor exploit ships unchallenged. |
| Decision-log absent | New contributor questions an IP-neutralization rename | Re-derivation; possible regression of the rename. |

---

## 7. AI Implementation Readiness

**Score after this plan: 9 / 10.**

**Rationale:**

- All four `❌ UNKNOWN` synthesis-layer findings (Q293, Q294, Q296, Q298) gain canonical artifacts (`decision-log.md`, `deferred.md`, `observability.md`).
- The two single-load-bearing assumptions (Q280 canonical bytes, Q282 determinism stack) gain a Node↔browser CI test and an explicit Non-Negotiable Stack reference.
- The three diagram divergences (Q292) are patched and a CI gate prevents regressions.
- The week-one blockers (Q299) — DEFEND, runtime requirements, mocking convention (delegated to plan 15) — all have first-step fixes in this plan or in a sibling plan it cross-references.
- The first-bug surfaces (Q300) are addressed by `error-ux.md` (this plan) plus `ValidationError` shape (plan 12) plus gzip pin (plan 08) plus TURN spec (plan 07).

**Why not 10:**

- **0.5 deduction** — observability emission catalogue and rollback playbook depend on production-side decisions (telemetry backend, hosting model) that are deliberately deferred to Phase 3. Until those decisions are made, the playbook contains `Status: pending` rows.
- **0.5 deduction** — Q294 #1 (strategic-AI heuristic weights beyond the research report) cannot be fully closed until plan 10 implements its weights table; this plan can only file a coordination note.

Closing those two would lift the score to 10 / 10.
