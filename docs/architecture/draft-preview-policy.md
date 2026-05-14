# Draft-Preview Policy

UI rule that prevents a peer from re-rolling canonical RNG outcomes
by running `apply(state, draft)` against the deterministic reducer
before deciding whether to commit. Without this rule, any "preview
attack outcome" affordance becomes a *stochastic-outcome oracle*: a
single draft-apply advances the canonical RNG, an undo lets the
player observe the sample, and iteration produces a free re-roll.

The policy is enforced by two mechanisms:

1. A **doctrine rule** in this file (read by humans and AI agents).
2. A **lint gate**, `npm run validate:no-stochastic-preview`, that
   scans `src/ui/` for forbidden imports
   ([`scripts/check-no-stochastic-preview.mjs`](../../scripts/check-no-stochastic-preview.mjs)).

Companion docs:
[`security-model.md`](./security-model.md) § 3 Mitigations,
[`effect-registry.md`](./effect-registry.md),
[`determinism.md`](./determinism.md),
[`rng-streams.md`](./rng-streams.md).

---

## 1. The rule

UI previews of stochastic effects MUST compute **closed-form
expected values and ranges** from effect parameters. UI code MUST
NOT call `apply(state, draftCommand)` against the canonical reducer
for any stochastic effect, because a single draft-apply followed by
an undo lets the player observe a sample of the canonical RNG
sub-stream before deciding whether to commit.

| UI affordance | Allowed | Required form |
| --- | --- | --- |
| "Show damage range for this attack" | yes | Closed-form `min`, `max`, `expected` derived from the unit's damage formula. |
| "Show this spell's expected effect" | yes | Closed-form expected values and ranges. |
| "Pre-roll five sample damage values" | only with the preview-RNG carve-out (§ 3) | Sample the preview RNG sub-stream, **not** canonical. |
| "Apply this command speculatively, show result, allow undo" | **no** | Forbidden. |
| "Run the engine reducer in dry-run mode and roll back" | **no** | Forbidden. |
| "Preview line of sight on the adventure map" | yes (deterministic preview) | Pure function over visibility geometry; no `random()` call. Annotate the import `@deterministic-preview`. |
| "Preview pathfinding cost" | yes (deterministic preview) | Same as line-of-sight preview. |

---

## 2. Closed-form previews

For every stochastic effect declared in
[`effect-registry.md`](./effect-registry.md), the runtime exposes a
closed-form expected-value selector. Examples:

- `selectors.combat.expectedDamage(attackerId, targetId)` →
  `{ min, max, expected }`. Uses the same parameters as the reducer
  but evaluates them analytically (no RNG draw).
- `selectors.spell.expectedEffectRange(spellId, casterId, target)`
  → range table per affected unit.

Closed-form selectors live next to the canonical reducer so the
formulas stay in sync. They are **read-only** and **pure**: same
inputs always produce the same expected ranges, and they MUST NOT
call `random()` on any RNG sub-stream.

---

## 3. Sample-preview RNG carve-out

If a UI affordance genuinely requires sample previews (e.g. "show
five representative damage rolls" for a tutorial), it MUST consume
a **non-canonical** PCG32 sub-stream:

```ts
// @deterministic-preview
import { simulateDamage } from "../../engine/combat/simulate.ts";
import { createPreviewRng } from "../preview-rng.ts";

const previewRng = createPreviewRng(commandId);
const samples = Array.from({ length: 5 }, () => simulateDamage(previewRng, …));
```

- **Seed.** `xxh64('preview-v1' || commandId)`.
- **Catalogue.** The preview sub-stream is **not** registered in
  [`rng-streams.md`](./rng-streams.md).
- **Canonical state.** Sample previews never touch canonical state
  and never affect the per-turn state hash.

The `@deterministic-preview` annotation MUST sit on the import
statement (same line, immediately above, or up to two lines above)
so the lint gate ignores the import. The annotation governs the
import, not individual call sites.

---

## 4. Lint gate

`npm run validate:no-stochastic-preview` runs
[`scripts/check-no-stochastic-preview.mjs`](../../scripts/check-no-stochastic-preview.mjs):

- **Inputs.** `src/ui/**/*.{ts,tsx,mts,cts,js,mjs,cjs}`.
- **Detection.** For every static import, dynamic `import()`, or
  `require()` whose specifier resolves under `src/engine/`,
  `src/rules/`, or `src/content-runtime/`, inspect the imported
  binding name.
- **Reject.** Any binding whose name matches
  `^(apply|simulate|advance|step|reduce)`. Dynamic imports and
  `require()` calls are rejected unconditionally for these layers
  (the binding name is opaque at the import site).
- **Allow.** An import preceded by `// @deterministic-preview` on
  the same line, the previous line, or up to two lines above.

Wired into `npm run validate` so CI catches misuse before merge.

---

## 5. Why this matters

Without this policy, a UI implementer can ship a "battle preview"
feature that internally runs `apply(state, attackCommand)` to
render the predicted result. Because the reducer advances the
canonical RNG, a hostile player can:

1. Open battle-preview → observe outcome.
2. Cancel → reducer state has already advanced one RNG draw.
3. Re-open battle-preview → observe a new outcome from the next
   draw.
4. Iterate until the next draw is favorable.
5. Commit.

The deterministic-engine layer **cannot** detect this misuse
because every reducer call is deterministic and therefore valid.
Protection lives at the UI / source-lint layer.

---

## 6. Out of scope

- **Rendering the result of a *committed* command** is not a
  preview; the reducer has already advanced the state, and rendering
  its output advances no RNG.
- **AI-bot previews of its own moves** are not user-facing previews;
  they run on the AI search's own sub-stream per
  [`rng-streams.md`](./rng-streams.md) (`ai-decision`).

---

## 🔍 Sync Check

- **UI: ✔** — No screen package owns this policy directly; the
  affordances in § 1 are illustrative classes of UI work, not named
  components. Cross-checked against
  [`security-model.md` § 3 row 6](./security-model.md) and the
  speculative-apply oracle row in § 1, which both reference this
  doc.
- **Schema: ✔** — Policy is source-lint-only; no schema row in
  [`schema-matrix.md`](./schema-matrix.md). Stochastic-effect
  definitions cross-checked against
  [`effect-registry.md`](./effect-registry.md) (`damage`, `heal`,
  `summon`, `status`, etc.) and
  [`rng-streams.md`](./rng-streams.md) (`damage`, `morale`, `luck`,
  `combat-init`, `ai-decision`).
- **Tasks: ✔** — Owning task
  [`tasks/phase-3/01-multiplayer/13-security-model-and-doctrine.md`](../../tasks/phase-3/01-multiplayer/13-security-model-and-doctrine.md)
  lists `draft-preview-policy.md` in the cross-link acceptance
  criterion. The lint script
  [`scripts/check-no-stochastic-preview.mjs`](../../scripts/check-no-stochastic-preview.mjs)
  is wired into `package.json` `validate:no-stochastic-preview` and
  into the `validate` aggregate.

## ⚠ Issues

- **Annotation site clarified.** The previous wording said the
  `@deterministic-preview` annotation marks the **call site**. The
  canonical lint script
  [`check-no-stochastic-preview.mjs`](../../scripts/check-no-stochastic-preview.mjs)
  inspects only **import statements** (`STATIC_IMPORT_RE`,
  `DYNAMIC_IMPORT_RE`, `REQUIRE_RE`) and walks back up to three
  lines from the import for the annotation. The rewrite aligns
  the prose with the script (the rule itself — what is forbidden,
  what is allowed — is unchanged). No code change implied.
