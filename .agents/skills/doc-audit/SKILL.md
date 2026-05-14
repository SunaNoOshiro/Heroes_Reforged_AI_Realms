---
name: doc-audit
description: Use this skill when the user asks to audit, improve, clean up, simplify, sync-check, align, or polish a single markdown file in this repo — typically an architecture doc under `docs/architecture/`, a task spec under `tasks/`, or a screen package under `docs/architecture/wiki/screens/`. Trigger phrases include "improve this doc", "clean up this markdown", "audit this spec", "sync check", "align with tasks", "make this concise / token-efficient / AI-friendly", "is this in sync with the schema". The skill rewrites the target file for clarity and AI-friendliness, cross-checks UI / schema / sibling-arch / task-registry consistency, and emits a trailing `## 🔍 Sync Check` + `## ⚠ Issues` block. Meaning is preserved — the skill simplifies and aligns, but never invents features or changes intent.
---

# Doc Audit & Sync Check

This skill audits ONE markdown file (architecture, task, or screen
package) and rewrites it to be **clear, concise, AI-friendly, and
consistent** with the rest of the repo. It is the read-and-rewrite
counterpart of an architecture review: it never edits files other
than the target, never invents features, and always emits a Sync
Check trailer.

Use this skill when:
- the user opens a doc and says "improve / clean up / audit this"
- a doc has drifted from related schemas, UI specs, or tasks
- the user wants the same doc shorter, tighter, or AI-friendlier
- the user wants explicit cross-references checked

Do **not** use this skill for:
- generating brand-new architecture docs from scratch (write a Plan
  or use `init`)
- changing repo-owned thresholds, rule sets, or invariants — those
  are separate PRs with written rationale
- editing code (use `architect-review` or the per-language skills)
- reviewing a pull request (use `review`)
- fixing structural / mutation / coverage gates (use
  [`structural-checks`](../structural-checks/SKILL.md) and
  [`mutation-test`](../mutation-test/SKILL.md))

---

## 1. Identify the target file

The target is the file the user wants audited. Resolution order:

1. A path the user explicitly named in the request.
2. The `<ide_opened_file>` if the user has one open and didn't name another.
3. Ask the user — do not guess across multiple candidates.

<read_target_in_full>
Read the **entire** target file before any cross-check or rewrite.
Never speculate about, rephrase, or "tighten" content you have not
actually opened. Skimming costs you the meaning-preservation
contract: every rule, ID, window, threshold, and link in the
original must survive in the rewrite, and you can only preserve
what you have fully ingested.
</read_target_in_full>

## 2. Classify the file

| Class | Indicators | Heaviest cross-checks |
|---|---|---|
| Architecture doc | `docs/architecture/<name>.md` (not under `wiki/` or `diagrams/`) | UI specs, schemas, sibling arch docs, task registry, `data-inventory.md`, `schema-matrix.md`, `command-schema.md` |
| Task file | `tasks/<phase>/<module>/<id>.md` | the arch doc(s) it Reads First; `tasks/task-registry.json`; sibling task files for dep order; `task-status.json` for status sanity |
| Screen package | `docs/architecture/wiki/screens/<NN>-<slug>/*.md` | sibling files in the same package (`spec.md`, `interactions.md`, `data-contracts.md`, `architecture.md`); the task that owns the screen |
| Planning / decision | `docs/planning/*.md` | `decision-log.md`; the arch doc or task the decision affects |
| Diagram | `docs/architecture/diagrams/*.md` | the arch doc that links the diagram |

Class drives § 3 (cross-check matrix) and §§ 6–7 (quality gates).

## 3. Cross-check matrix (CRITICAL)

Run the relevant checks **in parallel** (single message, multiple
`Bash`/`Read`/`Grep` calls). Aim to issue every read in one round
trip; that's how you keep the audit fast on large docs.

For every claim in the target file, verify against:

- **UI specs.**
  `docs/architecture/wiki/screens/*/spec.md` and `*/interactions.md`.
  For every component, command, toast, banner, or state binding
  named in the target, confirm the copy-strings, command IDs, and
  component names match exactly.
- **Schemas.**
  `content-schema/schemas/*.schema.json`. For every schema the
  target references, verify enum values, field names, required keys,
  and the schema's own `description`. Cross-check the registration
  in [`schema-matrix.md`](../../../docs/architecture/schema-matrix.md).
- **Sibling architecture docs.**
  Read each doc in the target's "Companion docs" / "Read First"
  block. Confirm anchors resolve, claims are mutually consistent,
  and no canonical definition is duplicated across two docs.
- **Tasks.**
  Grep `tasks/task-registry.json` and the relevant
  `tasks/<phase>/<module>/*.md` for the target's filename and key
  identifiers (commands, schemas, state paths, IDs). Verify: the
  target is referenced by the task that owns its runtime; every
  described logic has a task; no orphan tasks reference the target
  without reciprocal mention.
- **Data inventory.**
  [`data-inventory.md`](../../../docs/architecture/data-inventory.md).
  If the target claims a state slice or IndexedDB store is
  registered there, **verify the row exists**. Missing rows are a
  CI-blocking gap (per project root: "every persisted field is
  registered in data-inventory.md").
- **Command schema.**
  [`command-schema.md`](../../../docs/architecture/command-schema.md).
  If the target dispatches commands, verify each one is defined
  (or correctly marked `runtime-only` / `local-ui`).
- **Module graph & side-effect matrix.**
  When the target asserts cross-module imports or side-effect
  permissions, sanity-check
  [`module-graph.md`](../../../docs/architecture/module-graph.md)
  and
  [`side-effect-matrix.md`](../../../docs/architecture/side-effect-matrix.md).

## 4. Clean & optimize the prose

REMOVE:
- redundant sentences that restate the section header
- duplicated ideas across sections — collapse to one
- vague theory ("this is important because…") with no action
- explanations the linked schema / spec already provides

KEEP:
- the WHY behind a non-obvious rule (one sentence, no more)
- timing windows, enum values, IDs, paths, anchors
- every existing link reference (links survive the rewrite)

IMPROVE:
- replace ambiguous phrasing ("after X begins") with concrete
  timelines, tables, or `t = …` markers
- prefer bullet lists over multi-clause prose
- normalize naming (`peerId` not `peer-id`; `state.profile.x`
  not `profile.x`; `PEER_DISCONNECTED` not `peer-disconnected`)
- short top sentence per section: state the rule, then bullets

Match the surrounding doc style:
- numbered sections (`## 1. …`)
- backticked `code` for IDs, paths, enum values
- relative link targets (`./peer-trust.md`, not absolute)
- companion-docs block at the top, schema link last

## 5. AI-friendly format

Ensure:
- no ambiguity — every conditional is explicit
- no hidden assumptions — state every constraint inline
- short sections — ≤ 1 screenful, or split with sub-headings
- bullets for lists; tables for typed comparisons
- explicit Inputs / Outputs / Side-effects when describing a flow

If the original mixes inputs, outputs, and side effects in one
paragraph, split it into a labeled bullet list or a 3-column table.

## 6. Task-quality (task-file class only)

Each task `.md` must carry these sections (verify presence and
quality, not order):

- **Module** — link to the parent module file.
- **Description** — short (≤ 5 lines).
- **Read First** — the arch docs the implementer must read.
- **Inputs** — explicit upstream task IDs and the contracts they
  expose (one bullet per upstream).
- **Outputs** — exact paths under `Owned Paths`, plus a one-line
  description of what each file exports.
- **Owned Paths / Owned Paths (shared)** — the three contracts per
  [`.agents/rules/tasks.md`](../../rules/tasks.md).
- **Dependencies** — task IDs only; never raw file paths.
- **Acceptance Criteria** — testable assertions (one bullet per
  observable behavior or invariant; no "works correctly" prose).
- **Verify** — the `verifyCommands` chain.
- **Estimated Time** — hours.

If the task is too large (estimated > 8 h, or > 5 distinct
acceptance-criteria categories, or its `Owned Paths` span > 3
modules), recommend a split in `## ⚠ Issues`. **Do not** create new
task files or edit the registry from this skill — surface the
recommendation only.

Status lives in [`tasks/task-status.json`](../../../tasks/task-status.json),
not in the task `.md`. If the target file carries a `Status:` line,
that is a stale-format violation and goes in `## ⚠ Issues`.

## 7. Architecture-quality (arch-file class only)

Ensure:
- **System boundaries.** One section per responsibility; cross-cuts
  named explicitly with a one-line reference.
- **Data flow.** Inputs → transform → outputs; each step has a
  named owner (task ID, doc, or runtime module).
- **No duplicated logic.** If a rule lives in two docs, demote one
  to a one-line reference and keep the canonical statement in the
  other. Flag the demotion in `## ⚠ Issues` if it changes which
  doc is canonical.
- **Explicit responsibilities.** Every "owned by …" claim must
  resolve to a real task ID or module path.

## 8. Mismatch handling

When the audit finds a contradiction with another file:

**Option A — fix the target file.** Preferred when the target's
claim is wrong but the rest of the system is consistent. Rewrite
the claim to match reality.

**Option B — flag a mismatch.** When the target is correct but the
system is missing the registration / definition / row, add a row to
`## ⚠ Issues` in this exact shape:

```
- **<short title>.** <what the target claims> versus <what
  actually exists>. Per <root contract + link>, <which task / file
  must close the gap>. Suggested values: <…>.
```

**Never silently rewrite a claim that points to a structural
invariant** (e.g. "registered in data-inventory.md", "defined in
command-schema.md", "schema row in schema-matrix.md") just because
the registration is missing. Silent rewrites hide CI-blocking gaps.
The whole point of the audit is to surface them.

## 9. Hard prohibitions

**A. Never change meaning.**
Every rule, window, enum, ID, threshold, and link target in the
target file must appear unchanged in the rewrite (modulo wording).
If a clarification requires picking one of two interpretations, pick
the one most consistent with the cross-checked files and call it out
in `## ⚠ Issues`.

**B. Never invent features.**
If the audit finds a gap (a missing UI surface, a missing command,
a missing schema field), flag it in `## ⚠ Issues`. Do not add the
feature to the target, even when it would "obviously" make the
system consistent.

**C. Never break existing links.**
Every `./` and `../` link, every `#anchor`, and every task-path
reference in the original must resolve in the rewrite. Verify
anchors against the actual headings in the target file. Add new
links freely; remove only when the link is genuinely broken or
duplicated.

**D. Never edit cross-checked files.**
The audit pass reads other docs; it does not write them. If a
sibling file needs a fix (data-inventory row, schema-matrix entry,
task-registry update), surface it in `## ⚠ Issues`.

**E. Never strip companion-docs / schema cross-refs.**
Top-of-file companion blocks anchor the doc in the wider system.
Tighten wording, but keep the link set.

**F. Never delete a section silently.**
If a section has no implementation-critical content, fold it into
the prior section with a short label rather than dropping it. The
diff should make the consolidation obvious.

**G. Never rename the file or move it.**
The audit rewrites in place. A rename / move is a separate concern
because it touches every inbound link.

**H. Never edit restricted files.**
Per [`.agents/settings.json`](../../settings.json) and
[`.agents/codex.config.toml`](../../codex.config.toml), some files
are deny-listed at the harness layer. If the target is on those
lists, **stop and surface that to the user** — do not attempt the
rewrite.

## 10. Output template

Return the **full rewritten markdown file**, ending with these two
sections (always emit both, even when fully green):

```markdown
---

## 🔍 Sync Check

- **UI: ✔ / ⚠ / ❌** — <one-line verdict + link to the spec(s) checked>
- **Schema: ✔ / ⚠ / ❌** — <one-line verdict + link to the schema(s) and `schema-matrix.md` row>
- **Tasks: ✔ / ⚠ / ❌** — <one-line verdict + link to the owning task and `task-registry.json` reference>

## ⚠ Issues

- **<short title>.** <description>. Per <root contract + link>, <who closes the gap>. Suggested values: <…>.
```

If all three rows are ✔ and there are no issues, write `_None._`
under `## ⚠ Issues`. Do not omit the section — its presence is the
signal that the audit ran.

Verdict scale per row:
- **✔** — fully consistent; no action required.
- **⚠** — minor gap, non-blocking (e.g. a missing cross-link, an
  outdated reference). Detail in `## ⚠ Issues`.
- **❌** — CI-blocking gap (e.g. missing data-inventory row,
  undefined command, schema enum mismatch). Detail in `## ⚠ Issues`
  with the responsible task ID.

<examples>
<example index="1" title="Fully green — small arch doc, no mismatches">

```markdown
---

## 🔍 Sync Check

- **UI: ✔** — Dialogs and toasts in the target match `wiki/screens/14-resign-confirm/spec.md` and `interactions.md` exactly.
- **Schema: ✔** — `content-schema/schemas/abandon-penalty.schema.json` enums and field names match; row present in [`schema-matrix.md`](../../../docs/architecture/schema-matrix.md).
- **Tasks: ✔** — Owning task `mvp.07-rules.04` references the target in its Read First; no orphan tasks point to it.

## ⚠ Issues

_None._
```

</example>

<example index="2" title="Mixed verdicts — schema enum drift + missing data-inventory row">

```markdown
---

## 🔍 Sync Check

- **UI: ✔** — Confirm-dialog copy in the target matches `wiki/screens/22-peer-handoff/spec.md`.
- **Schema: ⚠** — Target lists `peerStatus` values `online | offline | stale`, but `peer-status.schema.json` adds `pending`. Not CI-blocking, but the doc was out of date; rewrote inline.
- **Tasks: ❌** — Target claims `state.network.peerHandoffLog` is registered, but `data-inventory.md` has no matching row. Per CLAUDE.md root contract, `mvp.04-net.07` (the runtime owner) must add the row before this slice can ship.

## ⚠ Issues

- **Schema enum drift.** Target listed `peerStatus` with three values; [`peer-status.schema.json`](../../../content-schema/schemas/peer-status.schema.json) defines four (`pending` was added per [`enum-lifecycle-policy.md`](../../../docs/architecture/enum-lifecycle-policy.md)). Schema is canonical; rewrote the target to include `pending` and noted the lifecycle stage inline. No code change implied.
- **Missing data-inventory row for `state.network.peerHandoffLog`.** Target asserts the slice is registered; [`data-inventory.md`](../../../docs/architecture/data-inventory.md) has no matching row. Per CLAUDE.md root contract ("every persisted field is registered in data-inventory.md"), `mvp.04-net.07` must add the row. Suggested values: domain=`network`, owner=`mvp.04-net.07`, persistence=`indexeddb`, retention=`session`. Skill did not add the row itself (Hard Prohibition D — never edit cross-checked files).
```

</example>
</examples>

## 11. Workflow summary

```
1. Read target file in full.
2. Classify (arch / task / screen / planning / diagram).
3. Parallel cross-checks (UI, schemas, sibling docs, tasks,
   data-inventory, command-schema).
4. Plan rewrite — list every fact to preserve and every mismatch
   to flag.
5. Rewrite the target in place via Write or Edit.
6. Emit `## 🔍 Sync Check` + `## ⚠ Issues` at the end.
7. Reply with a short summary (what was tightened, what was
   flagged) plus the list of cross-checked files. Do NOT echo the
   full rewritten file in chat — the file is on disk, the user can
   read it.
```

**Self-check before replying.** Walk § 12 in order. If any item
fails, fix it before responding. If an item cannot be fixed without
violating a hard prohibition (e.g. a structural gap that would need
edits in another file), surface the reason in `## ⚠ Issues` rather
than silently shipping the rewrite.

## 12. Quick checklist before returning

- [ ] Every link in the original survives in the rewrite.
- [ ] Every enum / ID / window / threshold survives.
- [ ] Every section is ≤ 1 screenful, or split.
- [ ] No new facts that weren't in the original or one of the
      cross-checked files.
- [ ] `## 🔍 Sync Check` and `## ⚠ Issues` are both present.
- [ ] Mismatches go in `## ⚠ Issues`, not silently in the prose.
- [ ] No edits to any file other than the target.
- [ ] If the target is on the restricted list, the rewrite was
      aborted and the user was told.
