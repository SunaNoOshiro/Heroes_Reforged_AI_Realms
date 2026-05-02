# 17. FINAL CRITICAL QUESTIONS

> Audit pass over the 24 closing questions. Each is preserved verbatim
> and answered against the current repo state (planning + contracts +
> task files; almost no runtime code yet). Answers cross-reference the
> earlier sections of this readiness-audit folder where applicable, so
> this file functions as the synthesis layer rather than a fresh
> investigation.

---

### Q: 277. Which subsystem has the lowest specification confidence?

**Status:** ⚠ Partial

**Answer:**
The **AI-generated content pipeline** (Phase 3, module `02-ai-generation`) has the lowest specification confidence in the planning corpus. Section 14 of this audit shows clustered weakness: retry policy is informal (Q237 ⚠), image moderation for generated sprites is undefined (Q238 ⚠), asset normalization (size/palette/frame count) is wholly unspecified (Q239 ❌), and provider-output determinism is best-effort only (Q240 ⚠). Stage validators (`ValidationReport`, `CoherenceReport`, `BalanceReport`) are described in prose only (Q265). Close runners-up: the **UI shell runtime technology** (DOM is implied but never declared — Q25, Q26 ⚠) and the **testing/mocking convention** which is uniformly ❌ UNKNOWN (Q271, Q15-248).

**Evidence:**
- [docs/readiness-audit/14-ai-generated-content-pipeline.md](./14-ai-generated-content-pipeline.md) — clustered ⚠/❌ on retry, normalization, NSFW, determinism
- [docs/readiness-audit/02-ui-rendering-system.md](./02-ui-rendering-system.md) Q25, Q26 — UI-shell tech only implied
- [docs/readiness-audit/15-testability.md](./15-testability.md) Q248 — no mocking/DI convention
- [docs/readiness-audit/16-implementation-readiness.md](./16-implementation-readiness.md) Q271 ❌ UNKNOWN

---

### Q: 278. Which subsystem has the highest implementation risk?

**Status:** ⚠ Partial

**Answer:**
**Multiplayer (WebRTC input-only lockstep)**. The control-plane semantics are well-defined (peer-to-peer, per-turn xxh64 hash exchange, heartbeat host election), but the failure-recovery story degrades sharply at the edges: there is no automatic resync — desync triggers `bisect → report → quit` (Q135 ⚠); TURN is acknowledged as optional but no provider, credentials, or bandwidth-payer is selected (Q130 ⚠); no input-delay budget is set (Q127 ❌); no per-turn timeout for missing peer commands; no documented packet-loss budget. Implementation risk is high because every fix needs both peers + a signaling server + WebRTC + deterministic engine all working in concert, so bugs surface late and reproduce poorly. Tactical-combat balance (DEFEND TBD, Q266) is the second-highest because it gates an entire MVP module on a single unresolved formula.

**Evidence:**
- [docs/readiness-audit/07-multiplayer.md](./07-multiplayer.md) Q127, Q130, Q135 — partial recovery + missing budgets
- [docs/readiness-audit/16-implementation-readiness.md](./16-implementation-readiness.md) Q266 — DEFEND formula TBD
- [tasks/phase-3/01-multiplayer/](../../tasks/phase-3/01-multiplayer/) — recovery is "report + quit"

---

### Q: 279. What is assumed about the runtime that is not declared?

**Status:** ⚠ Partial

**Answer:**
Several runtime preconditions are load-bearing but never declared in a "minimum runtime requirements" doc:

- **DOM as the UI-shell renderer** — implied by `mockup.html` + `data-component`/`data-state` annotations, never named (Q25).
- **WebGL2 availability** with a Canvas-2D fallback path (mentioned, no fallback owner).
- **Web Workers** for the AI tick (`run-ai-in-web-worker`) — assumed available, no fallback for environments without them.
- **Web Crypto (`crypto.subtle`)** for ed25519 pack-signature verification — assumed in browser; no Node-side parity story.
- **IndexedDB / OPFS quota** for saves — no minimum quota requirement, no quota-exhaustion UX (related to Q288).
- **`deltaTime` source** for animation timeline — monotonic vs. throttled clock unspecified (Q66 ⚠).
- **gzip determinism** at a fixed compression level for save bytes-equality (Q151, Q154 ⚠).
- **Browser engine floor** — no minimum Chromium/Safari/Firefox version pinned.

**Evidence:**
- [docs/readiness-audit/02-ui-rendering-system.md](./02-ui-rendering-system.md) Q25 — UI-shell tech implied
- [docs/readiness-audit/04-animation-system.md](./04-animation-system.md) Q66 — `deltaTime` source not pinned
- [docs/readiness-audit/08-persistence-save-system.md](./08-persistence-save-system.md) Q151, Q154 — gzip level unpinned
- ❌ no `docs/architecture/runtime-requirements.md` or equivalent

---

### Q: 280. What part of the spec depends on a single unverified assumption?

**Status:** ⚠ Partial

**Answer:**
**The entire save/replay/multiplayer determinism contract depends on the assumption that the canonical JSON serializer + xxh64 hash produce bit-identical output across Node and browser environments.** Every downstream guarantee (Q151 byte-identical saves, Q153 cross-machine replay, Q134 desync detection, content/engine hash pinning) reduces to one assumption: that `serialize(state)` followed by `xxh64(bytes)` is environment-portable. If JS-engine differences in `Number.prototype.toString` (e.g. `1e+21` exponent forms) or Node vs. browser TextEncoder UTF-8 edge cases drift, every save/replay/multiplayer-match silently breaks. The fuzz harness will catch *intra-process* drift but does NOT (today) cross-validate Node-output vs. browser-output bytes.

A close second: the assumption that **gzip compression is reproducible** at a fixed level across `pako` / Node `zlib` versions, which underwrites byte-identical save sharing.

**Evidence:**
- [docs/architecture/determinism.md](../architecture/determinism.md) — single source of all downstream guarantees
- [tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md](../../tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md)
- [tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md) — Node-only today
- ❌ no Node↔browser canonical-bytes equivalence test

---

### Q: 281. What is the single point of failure in the multiplayer stack?

**Status:** ✔ Defined

**Answer:**
**The signaling server.** It is a single Node WebSocket lobby with no replication, no failover, no horizontal scaling story, and no SLO. Without it, no new room can form, no SDP/ICE handshake can complete, and no host migration can update its lookup table. Existing in-flight matches survive a signaling outage (true peer-to-peer once connected), but every match start, late-join, and reconnection depends on it. Secondary SPOF: **TURN unavailability** for symmetric-NAT users (Q130) — without a deployed TURN, those users simply cannot connect at all. Tertiary: the **host peer's command log** during the ~6 s heartbeat-loss window before re-election triggers.

**Evidence:**
- [tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md](../../tasks/phase-3/01-multiplayer/01-signaling-server-node-js-websocket-lobby.md)
- [docs/readiness-audit/07-multiplayer.md](./07-multiplayer.md) Q130, Q133
- ❌ no signaling-server replication/failover spec

---

### Q: 282. What is the single point of failure in the determinism story?

**Status:** ✔ Defined

**Answer:**
**The canonical serializer + state hash (Stack item #4).** Items 1–3 (seeded RNG, fixed-point math, command dispatcher) all deliver state mutations correctly only if item 4 then produces the *same* canonical bytes for the *same* logical state. One drift — an unsorted Map iteration in serialization, a forgotten `BigInt` round-trip, a NaN/`undefined` slipping past the canonicalizer — invalidates: per-turn xxh64 hash exchange, save bytes-equality, replay verification, multiplayer desync detection, pack `contentHash`, and engineHash pinning. The fuzz harness (#6) is the *test* for #4, not a substitute. If #4 breaks, *every* downstream guarantee breaks at the same instant.

**Evidence:**
- [docs/architecture/determinism.md](../architecture/determinism.md) — "Non-Negotiable Stack" 1–6
- [tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md](../../tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md)
- [docs/readiness-audit/15-testability.md](./15-testability.md) Q249

---

### Q: 283. What is most likely to break when player count doubles?

**Status:** ⚠ Partial

**Answer:**
**Per-turn hash exchange and turn-gating.** Today's spec is two-peer: `exchangeHashes()` is a pairwise compare and the turn gate waits for "all peers' same-turn commands" with no slowest-peer timeout. Doubling to 4 players makes the hash compare O(N²) (each peer cross-checks every other) unless the protocol is converted to broadcast-and-confirm; turn time becomes bottlenecked by the slowest peer's worst latency; host-migration election with priority-by-peer-ID becomes more contested; the canonical command log size grows roughly linearly per active hero per player. Secondary risks: AI Web Worker count vs. CPU cores (one bot per non-human player) and renderer entity count on shared maps.

**Evidence:**
- [tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md](../../tasks/phase-3/01-multiplayer/04-per-turn-hash-exchange-plus-desync-detection.md)
- [tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)
- ❌ no documented N-peer scaling story

---

### Q: 284. What is most likely to break when map size doubles?

**Status:** ⚠ Partial

**Answer:**
**Renderer + AI pathfinding + state-hash time.** The renderer NFR is pinned at 128×128 hexes (M1 Acceptance), with 200×200 cited as the upper bound in `renderer-technology-choice.md`. At 256×256: viewport tile count quadruples, fog-of-war bitfield quadruples, A* search space quadruples (no documented cap), AI flood-fill scoring blows up, save command-log size grows with movement distance, and the per-turn xxh64 hash recomputation walks more terrain. There is no max-map-size NFR for the engine itself, no LOD strategy for distant tiles, and no documented chunked-rendering plan.

**Evidence:**
- [docs/architecture/renderer-technology-choice.md](../architecture/renderer-technology-choice.md) — "up to 200×200 hexes"
- [tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md](../../tasks/mvp/06-renderer/03-map-renderer-terrain-objects-units-layers.md) — 128×128 @ 60 fps
- [docs/readiness-audit/09-performance.md](./09-performance.md) Q168 — entity ceiling unspecified
- ❌ no chunked-rendering / LOD spec

---

### Q: 285. What is most likely to break when content packs triple?

**Status:** ⚠ Partial

**Answer:**
**Pack-dependency resolution and asset-loader cache.** The dependency resolver algorithm is undefined (Q221 ⚠) — topological order, version-range matching, cycle handling, and conflict policy are not specified. With 3× packs, resolution time, ID-collision likelihood, manifest scan time, and `contentHash` recomputation all scale linearly at best; without a defined cycle policy, a circular-dep accident becomes possible. Asset loader cache (`< 1 ms` hit target) is not bounded — total bytes is unspecified, eviction policy is unspecified. Validator gate runtime grows linearly: today `check-repo-contracts.mjs` walks every example record; at scale it would need parallelization or sharding.

**Evidence:**
- [docs/readiness-audit/13-content-system.md](./13-content-system.md) Q221 — resolver algorithm undefined
- [tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md](../../tasks/mvp/02b-asset-pipeline/05-async-asset-loader-with-caching.md) — `< 1 ms` hit, no eviction policy
- ❌ no documented cache-size cap or eviction strategy

---

### Q: 286. What is most likely to break under packet loss above 5%?

**Status:** ⚠ Partial

**Answer:**
**The 2 s heartbeat / 6 s timeout host-migration trigger.** With ~5% packet loss on the unordered heartbeat channel (`maxRetransmits: 0`), three consecutive heartbeats can plausibly drop in succession (≈ 0.012 % per host), but as packet loss climbs, the chance of 3-in-a-row loss approaches 0.05³ ≈ 0.0125 % at 5 % and higher rapidly — enough to trigger spurious host migrations. The reliable `commands` channel does retry forever, so commands eventually arrive but turn-gate stretches indefinitely (no documented per-turn timeout). No packet-loss budget is published. Q136 already flags dropped-packet handling as ⚠ Partial.

**Evidence:**
- [tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md) — 2 s / 6 s
- [tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md](../../tasks/phase-3/01-multiplayer/02-webrtc-peer-connection-plus-datachannel-setup.md) — heartbeat channel `maxRetransmits: 0`
- [docs/readiness-audit/07-multiplayer.md](./07-multiplayer.md) Q136 — dropped packets partial
- ❌ no documented loss budget; no spurious-migration debounce

---

### Q: 287. What is most likely to break under sustained 60-minute sessions?

**Status:** ⚠ Partial

**Answer:**
**Memory growth and command-log handling.** No GC budget is defined (Q166 ❌), no allocation pooling is mandated (Q167 ❌), and no per-frame leak detection is planned. The canonical command log grows unboundedly within a match — at hundreds of commands per turn over a long session, the log + per-turn state-hash recomputation cost grows monotonically. There is no documented log-checkpoint compaction story, no save-checkpoint cadence, and no "long-session" soak-test acceptance criterion. WebGL texture caches and animation-timeline buffers also have no published ceiling. Renderer 60 FPS target is acceptance-tested against short scenarios, not 60-minute sessions.

**Evidence:**
- [docs/readiness-audit/09-performance.md](./09-performance.md) Q166, Q167 — GC budget, pooling unspecified
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../tasks/mvp/08-persistence/02-log-only-save-format.md) — `Checkpoint[]` is optional, no cadence
- ❌ no soak-test task; no memory-ceiling NFR

---

### Q: 288. What is the worst-case data-corruption scenario, and is it mitigated?

**Status:** ⚠ Partial

**Answer:**
**A pack with a forged-but-valid manifest serving subtly tampered records that survive schema validation.** Mitigations in place:

- Pack `contentHash` mismatch with save's stored hash → fail loud at load time (mitigated for tampered-after-publish).
- Save's recomputed post-replay state hash ≠ stored hash → "Save corrupt!" (mitigated for save-file tampering).
- Pack signature verification (ed25519) → unsigned/community packs forced into `sandboxed: true` (mitigated for trust separation).

**What is NOT fully mitigated:** a *signed-but-malicious-author* pack still passes signature verification; gameplay-record tampering that respects schema (e.g. an attacker-controlled "official" pack with stat = 99999 but valid types) would be caught only by schema-level constraints + balance checks, not by data-integrity checks. Save-file-share scenarios (Q20 in `save-imports-and-pack-trust-prompts.md`) and pack-trust UX prompts are not yet specified end-to-end.

**Evidence:**
- [docs/readiness-audit/13-content-system.md](./13-content-system.md) Q222, Q227 — pack signing model
- [docs/readiness-audit/27-save-tampering-and-pack-signing.md](./27-save-tampering-and-pack-signing.md) — open questions
- [docs/architecture/diagrams/25-load-flow.md](../architecture/diagrams/25-load-flow.md) — post-replay hash check

---

### Q: 289. What happens if the AI generator goes offline permanently?

**Status:** ✔ Defined

**Answer:**
**Gameplay continues unaffected.** The architecture is intentionally provider-neutral: the generator is a Phase-3 feature (`02-ai-generation`) gated behind a `GenerationProvider` interface; gameplay depends only on installed packs (first-party + previously-generated/saved community). Existing saves replay deterministically because they pin `contentHash` and `engineHash`, not provider availability. Players lose the ability to generate *new* content but not the ability to play with content already on disk. The MVP loop (M0–M2) and all of Phase 2 have zero generator dependency. Mitigation strategy: ship official faction packs first; AI generation is additive depth, not substrate.

**Evidence:**
- [docs/architecture/ai-integration.md](../architecture/ai-integration.md) — `GenerationProvider` is an interface, not a runtime requirement
- [docs/architecture/ai-generation-pipeline.md](../architecture/ai-generation-pipeline.md) — pipeline runs only when invoked
- [docs/planning/roadmap.md](../planning/roadmap.md) — M6 is AI generation; M0–M5 do not depend on it

---

### Q: 290. What is the minimum viable subset that proves the architecture end-to-end?

**Status:** ✔ Defined

**Answer:**
**M0 + M1 (mandatory), with M2 strongly recommended.** The minimal *architectural* proof is **M0 alone**: deterministic engine + replay-fuzz harness passing in CI demonstrates that the seeded RNG / fixed-point / command dispatcher / canonical serializer / replay API stack hangs together. The minimal *gameplay-loop* proof is **M0 + M1**: one reference faction (Emberwild), adventure layer with a hero, mines, a town, and auto-resolve combat — this exercises engine→content-runtime→pack-registry→persistence→save/replay end-to-end without renderer or multiplayer complexity. Adding **M2** (real tactical battle) closes the renderer↔engine integration loop. Beyond M2, every milestone is depth, not architectural validation.

**Evidence:**
- [docs/planning/roadmap.md](../planning/roadmap.md) — M0/M1/M2 exit criteria
- [docs/planning/solo-build-lane.md](../planning/solo-build-lane.md) — practical execution order
- [tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md)

---

### Q: 291. What component has no owner, no spec, and no test?

**Status:** ⚠ Partial

**Answer:**
Several thin candidates:

- **Stub/mocking convention** — no doc, no task, no module owns it (Q271 ❌).
- **Telemetry / observability infrastructure** — no logger contract, no metrics collector, no error-reporting sink (companion section #31 covers the gaps).
- **License-audit / dependency-policy** — no LICENSE file, no policy doc, no CI step (Q274 ❌).
- **Lobby browser / friend list** — referenced in audit #18 questions, no answer/task.
- **NSFW + copyright moderation for image outputs** — Q238 ⚠, no task, no provider contract.
- **Storage-quota exhaustion UX** — referenced obliquely, no owner.

**Evidence:**
- [docs/readiness-audit/16-implementation-readiness.md](./16-implementation-readiness.md) Q271, Q273, Q274
- [docs/readiness-audit/31-trust-boundaries-and-logging-monitoring.md](./31-trust-boundaries-and-logging-monitoring.md)
- [docs/readiness-audit/18-room-codes-and-lobby-discovery.md](./18-room-codes-and-lobby-discovery.md)

---

### Q: 292. What contract is currently described only in a diagram?

**Status:** ⚠ Partial

**Answer:**
At least three:

1. **Save format** — `docs/architecture/diagrams/24-save-flow.md` shows a `state` blob alongside the command log, contradicting `tasks/mvp/08-persistence/02-log-only-save-format.md` which is "log-only, no game state" (Q150 ⚠).
2. **Multiplayer "Resync from last good state"** — `docs/architecture/diagrams/26-multiplayer-sync.md` notes this branch but no implementing task exists; the actual recovery path is `bisect → report → quit` (Q135 ⚠).
3. **Engine→renderer DAMAGE_FRAME callback** — sequence diagrams reference the synchronization moment between deterministic damage application and the visual frame, but no schema or call-protocol exists (Q67 ⚠).

The diagrams are normatively secondary to task acceptance criteria, but the conflict means a reader who only sees the diagram will implement the wrong contract.

**Evidence:**
- [docs/readiness-audit/08-persistence-save-system.md](./08-persistence-save-system.md) Q150
- [docs/readiness-audit/07-multiplayer.md](./07-multiplayer.md) Q135
- [docs/readiness-audit/04-animation-system.md](./04-animation-system.md) Q67
- [docs/architecture/diagrams/](../architecture/diagrams/)

---

### Q: 293. What contract is currently described only in a chat thread?

**Status:** ❌ UNKNOWN

**Answer:**
By definition, chat-thread-only contracts are not in the repo and cannot be enumerated from the repo. The strongest *evidence* of a chat-only contract is the **DEFEND damage-reduction formula divergence** (Q266): source files (`command-schema.md:303`, `tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md`) still carry "TBD: exact reduction" while `docs/planning/audits/AUDIT-EXECUTIVE-SUMMARY.md` (2026-04-25) declares the formula locked at "250 permille". The audit summary is consistent with a decision having been taken somewhere — almost certainly in a chat or PR thread that was not back-ported to the canonical source. Until the canonical text is patched, this is an in-the-air contract.

**Evidence:**
- [docs/architecture/command-schema.md](../architecture/command-schema.md) line 303 — "(TBD: exact reduction)"
- [tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md](../../tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md) — TBD
- [docs/planning/audits/AUDIT-EXECUTIVE-SUMMARY.md](../archive/AUDIT-EXECUTIVE-SUMMARY.md) — declares lock
- ❌ provenance gap between canonical source and audit claim

---

### Q: 294. What logic currently lives only in the head of one contributor?

**Status:** ❌ UNKNOWN

**Answer:**
By definition undocumented and therefore not directly enumerable from the repo. Strong-suspicion candidates, ranked by load-bearing impact:

1. **Strategic-AI heuristic weights** beyond what `research/deep-research-report.md` records — Phase-2 task `04-strategic-ai/03-priority-weights` carries placeholders.
2. **The exact balance-corridor methodology** (Wilson 95 % CI ∈ [35 %, 65 %]) — the *rule* is in docs, but the *judgement calls* on outliers ("compensating ability exists") are author-side.
3. **Renderer ↔ UI overlay protocol** (how the WebGL canvas reports hit-tests into DOM panels) — Q26 ⚠.
4. **Decision provenance for IP-neutralization** — which mechanics were renamed/dropped vs. kept, and the rationale, is partly in commit history and partly implicit.

The risk: any of these failing review by a second contributor would force re-derivation rather than reference.

**Evidence:**
- ❌ inherent gap; flagged via cross-referenced ⚠ entries throughout this audit folder
- [research/deep-research-report.md](../../research/deep-research-report.md) — partial codification

---

### Q: 295. What is the rollback plan if a core assumption proves false post-launch?

**Status:** ⚠ Partial

**Answer:**
**Partial — additive-first schema evolution covers content; engine version pinning covers engine drift; live deployment rollback is not documented.** The architecture absorbs assumption failures at three layers:

- **Content layer:** schemas are additive-first; renames go through migration shims; pack `contentHash` pinning means existing saves continue to load with their original pack version.
- **Engine layer:** every save and replay pins `engineHash`; an engine build that breaks determinism bumps the hash, refusing to load mismatched saves rather than silently corrupting them. Old engine binaries can still load old saves.
- **Pack-trust layer:** `sandboxed: true` flag can quarantine an entire pack class.

**Missing:** there is no documented "live rollback playbook" — no client-version pinning policy, no kill-switch for malicious content, no hot-fix migration procedure, no incident-response RACI. For a single-player local-first game this is partly fine; for a multiplayer/published-pack scenario the gap will become acute.

**Evidence:**
- [docs/architecture/master-plan.md](../architecture/master-plan.md) — "Schema evolution is additive-first and migration-backed"
- [docs/architecture/determinism.md](../architecture/determinism.md) — engine/contentHash pinning
- ❌ no `docs/operations/rollback-playbook.md`

---

### Q: 296. What is explicitly deferred to "v2" without a written deferral note?

**Status:** ❌ UNKNOWN

**Answer:**
The repo *does* have written deferrals — `roadmap.md` ("Out of Scope For Early Milestones": dedicated servers, mobile native app, 3D rendering, large first-party content volume); `solo-build-lane.md` lists late-game work; `spells-and-mage-guild.md` §7 enumerates explicit out-of-scope items (spell creation editor, cross-school meta-magic, faction-defined schools). What is NOT enumerated centrally — and therefore the answer to "deferred without a written note" — likely includes:

- **Per-record content versioning** (Q220 ⚠) — implicitly v2 ("split into its own pack" today).
- **Spectator slots, streamer mode, replay sharing** — referenced in #18-#19 audit questions, no written deferral.
- **Public mod marketplace** — implied by pack-signing infrastructure but never declared as in or out of scope.
- **Dedicated-server / authoritative-server mode** — `roadmap.md` flags as out of scope for early milestones, but no v2 deferral note.

A central `docs/planning/deferred.md` register would close this question.

**Evidence:**
- [docs/planning/roadmap.md](../planning/roadmap.md) — "Out of Scope For Early Milestones"
- [docs/architecture/spells-and-mage-guild.md](../architecture/spells-and-mage-guild.md) — explicit out-of-scope
- [docs/readiness-audit/13-content-system.md](./13-content-system.md) Q220
- ❌ no consolidated `deferred.md` register

---

### Q: 297. What part of the system cannot be tested until late in implementation?

**Status:** ⚠ Partial

**Answer:**
Four areas have an inherently late testability profile:

1. **Multiplayer end-to-end** — needs deployed signaling server + two browsers + WebRTC + a deterministic engine reaching turn boundaries. Realistically gated until M5.
2. **AI content-generation pipeline** — needs a `GenerationProvider` integration, moderation provider, and a settled validator stack. Phase-3.
3. **Performance NFRs** (frame budget, RAM ceiling, GC, lockstep latency) — most modules have no NFR set; testing requires renderer + assets + engine all running together. Testable only post-M2.
4. **Long-session soak (Q287)** — requires a complete loop and hours of runtime; cannot be exercised on a partial slice.

**Mitigation already in place:** the M0 fuzz harness and headless-game runner can validate the deterministic kernel in isolation, ahead of the late-testable layers above.

**Evidence:**
- [docs/readiness-audit/07-multiplayer.md](./07-multiplayer.md) — multiplayer gating
- [docs/readiness-audit/09-performance.md](./09-performance.md) — NFR gaps
- [docs/readiness-audit/15-testability.md](./15-testability.md) Q250 — headless harness mitigates kernel testability

---

### Q: 298. What part of the system cannot be observed in production?

**Status:** ❌ UNKNOWN

**Answer:**
**Today, essentially nothing.** There is no telemetry sink, no metrics collector, no logger contract, no error-reporting service, no signaling-server log retention policy, and no per-match analytics. Specific blind spots a production deployment would have on day one:

- Per-match desync incidence (peer-to-peer; nothing centralized records it).
- AI provider failure rate (no aggregation point).
- Pack-load failure types (validation vs. signature vs. quota).
- Save-corruption frequency in the wild.
- Renderer frame-time outliers and crash logs.
- WebRTC connection-establishment success rate by region/NAT type.
- Heartbeat-loss / spurious host-migration rate (Q286).

The companion readiness section [`31-trust-boundaries-and-logging-monitoring.md`](./31-trust-boundaries-and-logging-monitoring.md) catalogs the surface; it has no answers yet.

**Evidence:**
- [docs/readiness-audit/31-trust-boundaries-and-logging-monitoring.md](./31-trust-boundaries-and-logging-monitoring.md) — open questions
- [docs/readiness-audit/22-privacy-retention-and-error-leaks.md](./22-privacy-retention-and-error-leaks.md) — error-leak unknowns
- ❌ no `docs/architecture/observability.md` or telemetry contract

---

### Q: 299. If implementation began today, which spec gap would block work in week one?

**Status:** ⚠ Partial

**Answer:**
The earliest blocker depends on which task is pulled first from `npm run tasks:next:mvp`. The honest top-three week-one blockers, ranked by likelihood of immediate impact:

1. **DEFEND damage-reduction formula** (Q266 ⚠) — combat math literally cannot be implemented without resolving the TBD; the audit summary's claimed lock is not in the source. *Blocks MVP module 09 the moment it is started.*
2. **UI-shell runtime technology** (Q25 ⚠) — first UI task cannot scaffold a framework choice (React-DOM? Solid? plain DOM?) without an explicit decision. *Blocks the first UI/editor task in M1.*
3. **Stub/mocking + DI convention** (Q271 ❌) — first unit test that needs a fake `PackRegistry` or a fake `Renderer` will diverge per-author. *Blocks consistent test patterns from task #1.*

A close fourth: **per-screen view-model schema** (Q111) — the screen→component DTO shape is undefined, so the first UI implementer will improvise.

**Evidence:**
- [docs/readiness-audit/16-implementation-readiness.md](./16-implementation-readiness.md) Q266, Q271
- [docs/readiness-audit/02-ui-rendering-system.md](./02-ui-rendering-system.md) Q25
- [docs/readiness-audit/06-data-contracts-and-schema.md](./06-data-contracts-and-schema.md) Q111

---

### Q: 300. If shipped today, what is the first bug a player would file?

**Status:** ⚠ Partial

**Answer:**
The repo has no runtime, so this is necessarily speculative — but if the *current spec* shipped as-is, the first user-visible failure modes (and likely first bug-filing order) would be:

1. **"Command rejected, no reason"** — the dispatcher returns `Result<…, ValidationError>` but no spec for `ValidationError` *shape* and no UX rule for surfacing it (Q204 ⚠). Players seeing greyed-out UI controls without a tooltip explanation file the first bug.
2. **"Save corrupt!"** false positives — gzip non-determinism (Q151 ⚠) or canonical-serializer drift (Q280) would surface as cross-machine save-share failures with a hard-fail message.
3. **"Cannot connect to room <code>"** — TURN-less WebRTC (Q130 ⚠) silently fails for symmetric-NAT users with no actionable diagnostic.
4. **"DESYNC_DETECTED — please report"** with no resync option (Q135 ⚠) — UX feels brutal even if the underlying engine is fine.
5. **Pack with dependency on missing pack** — resolver behavior on unsatisfied deps is not pinned (Q221 ⚠); error UX is undefined.

The common thread: every top-five failure is a *UX-of-failure* gap, not a gameplay-logic bug. The engine is over-specified; the error/edge-case UX is under-specified.

**Evidence:**
- [docs/readiness-audit/12-edge-cases.md](./12-edge-cases.md) Q204 — no `ValidationError` UX
- [docs/readiness-audit/07-multiplayer.md](./07-multiplayer.md) Q130, Q135
- [docs/readiness-audit/13-content-system.md](./13-content-system.md) Q221
- [docs/readiness-audit/08-persistence-save-system.md](./08-persistence-save-system.md) Q151

---

## 🔍 Summary

### Missing Logic
- **No live-rollback playbook** (Q295) — additive schemas + hash pinning cover content/engine drift, but there is no incident-response procedure, no kill-switch policy, no client-version pinning rule for published builds.
- **No telemetry / observability stack** (Q298) — zero production-side visibility into desync rate, pack-load failure types, AI provider failure rate, or WebRTC connection success.
- **No N-peer scaling story** (Q283) — multiplayer protocol is implicitly two-player; hash exchange and turn-gate become problematic at >2 peers.
- **No max-map-size NFR for the engine** (Q284) — renderer is pinned at 128×128 / 200×200, but engine pathfinding, fog, and state hashing have no upper bound declared.
- **No long-session soak target / memory ceiling** (Q287) — GC, allocation pooling, log-checkpoint compaction are all unspecified.
- **No dependency-resolver algorithm** (Q285) — topological ordering, version-range matching, cycle policy not pinned.
- **No `ValidationError` UX rule** (Q300) — the most likely first-bug surface.
- **No Node↔browser canonical-bytes equivalence test** (Q280) — the determinism kernel's single load-bearing assumption is not cross-environment-validated.

### Risks
- **DEFEND TBD blocking M1/M2 work** (Q299) — first concrete week-one blocker; the audit-summary lock at 250 permille has not been back-ported to canonical source.
- **Multiplayer recovery is "report + quit"** (Q278, Q286) — packet loss above 5 % can spuriously fire host migration and stretch turn-gate indefinitely; no automatic resync exists.
- **Signaling-server is a single point of failure** (Q281) — no replication, failover, or SLO; new-room formation and host-migration updates depend on it.
- **Canonical serializer + xxh64 is the determinism SPOF** (Q282) — one drift breaks every save/replay/multiplayer guarantee at once.
- **Stub/mocking convention undefined** (Q271, Q299) — first unit-test author sets a precedent that every later module diverges from.
- **No image-output moderation / asset normalization** (Q277, Q14-238/239) — AI-generated sprites can ship at any size, with any palette, with no NSFW gate.

### Improvements
1. **Resolve DEFEND TBD** — patch [`docs/architecture/command-schema.md:303`](../architecture/command-schema.md#L303) and [`tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md`](../../tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md) to the canonical 250 permille value (or revert the audit summary if the lock isn't real).
2. **Author `docs/architecture/runtime-requirements.md`** — declare DOM/WebGL2/Web Worker/Web Crypto/IndexedDB minimums, browser engine floor, and storage quota requirements (Q279).
3. **Author `docs/architecture/observability.md` + telemetry contract** — define a logger interface, a metrics sink, and a privacy-respecting per-match anonymous-stats schema (Q298).
4. **Author `docs/operations/rollback-playbook.md`** — incident-response RACI, kill-switch policy, client-version pinning, hot-fix migration steps (Q295).
5. **Author `docs/architecture/testing-conventions.md`** — DI convention, fake-`PackRegistry`/fake-`Renderer` catalogue, mock policy for deterministic engine tests (Q271).
6. **Author `docs/architecture/error-ux.md`** — `ValidationError` shape, surface rules (toast/disabled-control/modal), localization keys, telemetry tagging (Q204, Q300).
7. **Add a Node↔browser canonical-bytes equivalence test to CI** — guard the single load-bearing determinism assumption (Q280).
8. **Document N-peer multiplayer scaling story** — broadcast-and-confirm hash compare, slowest-peer turn timeout, packet-loss budget, debounce on heartbeat-loss host migration (Q283, Q286).
9. **Pin pack-dependency resolver algorithm** — topological order, version ranges, cycle handling, conflict policy (Q285).
10. **Author `docs/planning/deferred.md`** — single register for items deferred to v2 (per-record content versioning, spectator/streamer mode, public mod marketplace, dedicated server) (Q296).
11. **Add gzip-level pin + canonical-bytes test for save-bytes equality** (Q151, Q154, Q280).
12. **Specify TURN provider, credentials, fallback policy** — Q130 has been outstanding across multiple audits.

### AI-Readiness
**Score:** 7.5 / 10

**Reason:** The deterministic kernel and contract layer are in unusually good shape for AI-agent execution: 32 schemas validated in CI, every task has explicit `Inputs`/`Outputs`/`Owned Paths`/`Dependencies`/`Acceptance Criteria`/`Verify`, and `tasks:next` produces a dependency-respecting work queue. The 2.5-point deduction reflects the *failure-edge* gaps surfaced by this final-question pass: a live `TBD` blocking week-one combat work (Q299), no testing/mocking convention (Q271), no error-UX spec (Q300), no observability stack (Q298), no rollback playbook (Q295), and a single-environment determinism assumption (Q280) that has never been cross-checked. None of these block the *first* implementable module (M0 engine + serializer + replay), so an AI agent can begin productive work immediately — but each gap is a tripwire as soon as work crosses into UI, multiplayer, or content-pack edges. Closing the top-six "Improvements" above moves this score to 9 / 10.
