# Contributing

Practical cookbook for humans and AI agents. If a section below is
silent on something, defer to [`AGENTS.md`](./AGENTS.md) (hard
invariants) and [`docs/architecture/`](./docs/architecture/) (design
rationale).

---

## Before You Start

1. Read [`AGENTS.md`](./AGENTS.md) — it lists the non-negotiable rules
   (determinism, pack layout, schema-first, provider-neutral AI).
2. Skim [`tasks/README.md`](./tasks/README.md) to pick a single task.
   Each task file owns one commit-sized unit of work.
3. Install once: `npm install`.
4. Gate once before pushing: `npm run validate && npm test`.

The CI workflow in [`.github/workflows/validate.yml`](./.github/workflows/validate.yml)
runs the same two commands.

---

## Cookbook — Add A New Schema

Use this when a record kind does not yet exist (for example, you
decide packs need an `Encounter` record).

1. **Schema file.** Create
   `content-schema/schemas/encounter.schema.json` with `$id:
   "heroes-reforged/encounter.schema.json"`, a `title`, a `description`,
   `type: "object"`, `required`, `properties`, and
   `additionalProperties: false`. Numeric fields must be `integer` —
   no JSON floats in deterministic paths. If a numeric field is a
   formula, `$ref` to `formula.schema.json`, not a string.
2. **File suffix mapping.** Open
   [`scripts/check-repo-contracts.mjs`](./scripts/check-repo-contracts.mjs),
   locate `schemaForFile`, and add
   `if (base.endsWith(".encounter.json")) return "encounter.schema.json";`.
   Without this mapping, example records fail validation with
   `no schema mapping`.
3. **Example record.** Author one canonical example at
   `content-schema/examples/records/encounters/<id>.encounter.json`.
   The CI validator walks every file under `examples/` and validates
   against the mapped schema, so the example is your first test.
4. **Schema matrix.** Add a row to
   [`docs/architecture/schema-matrix.md`](./docs/architecture/schema-matrix.md)
   — name, purpose, who references it, who it references.
5. **Task file (if work remains).** If the new schema enables a
   follow-up implementation, drop a task under
   `tasks/mvp/02-content-schemas/` sized 2–6h with clear outputs and
   acceptance criteria.
6. **Validate.** `npm run validate` and `npm test` must pass.

---

## Cookbook — Add A New Effect Kind

Effect kinds are a **closed** discriminated union — the runtime has
one handler per kind, and unknown kinds fail validation at load.

1. **Schema.** In
   [`content-schema/schemas/effect.schema.json`](./content-schema/schemas/effect.schema.json)
   add a new `$defs/<kindName>` subschema and reference it from the
   root `oneOf`. Required pattern:
   ```json
   {
     "type": "object",
     "required": ["kind", ...],
     "properties": {
       "kind":   { "const": "<kind_name>" },
       "amount": { "$ref": "heroes-reforged/formula.schema.json" }
     },
     "additionalProperties": false
   }
   ```
2. **Handler.** When the runtime exists
   ([`tasks/mvp/02-content-schemas/13-effect-registry.md`](./tasks/mvp/02-content-schemas/13-effect-registry.md)),
   add a handler in `src/rules/effects/` and register it in the
   effect-kind → handler table. The handler table uses `satisfies`
   exhaustiveness so a missing handler fails TypeScript compilation.
3. **Docs.** Add the kind + one-paragraph semantics to
   [`docs/architecture/effect-registry.md`](./docs/architecture/effect-registry.md).
4. **Example.** Author at least one example record (spell, ability,
   or artifact) that uses the new kind under
   `content-schema/examples/records/`.
5. **Validate.** `npm run validate` and `npm test` must pass. Any
   example record using a kind not listed in the `oneOf` fails.

Never re-introduce free-form effect strings.

---

## Cookbook — Add A New Architecture Diagram

Use this when documenting a runtime scenario (e.g. "encounter
resolution", "auto-save heartbeat") that doesn't yet have a flow
diagram.

1. **Diagram file.** Create
   `docs/architecture/diagrams/<id>.md` with the standard frontmatter
   (`id`, `title`, `category`, optional `short`), a one-paragraph
   description, and one Mermaid block. See
   [`docs/architecture/diagrams/README.md`](./docs/architecture/diagrams/README.md)
   for the canonical format and authoring rules.
2. **Index entry.** Add `<id>` to the matching category's `diagrams`
   array in
   [`docs/architecture/diagrams/index.json`](./docs/architecture/diagrams/index.json).
   Add a new category only if none of the existing eight fit.
3. **Rebuild the wiki.** Run `npm run generate:wiki`. This
   regenerates `docs/architecture/architecture-wiki.html` (the
   unified offline viewer) from the `.md` sources. Commit both the
   new `.md` and the regenerated wiki together so reviewers see the
   rendered version.
4. **Verify.** Open `architecture-wiki.html` in a browser, switch to
   the 🎯 Diagrams tab, and confirm the diagram renders without
   Mermaid errors and auto-fits the canvas.

The `.md` file is the source of truth; the wiki HTML is a packaged
viewer. AI agents and humans both read the `.md` directly to
understand the scenario.

---

## Cookbook — Add Or Update A UI Screen Package

Use this when documenting a new screen or panel (e.g. "spell book",
"trade screen") that doesn't yet have a UI contract.

1. **Create the numbered package.** Add
   `docs/architecture/wiki/screens/<nn-screen-name>/`. Choose the number
   from the screen's `index.json` group order and keep it stable; it
   controls wiki navigation order and task references.
2. **Add it to the screen index.** Add the folder name to exactly one
   category in `docs/architecture/wiki/screens/index.json`.
3. **Visual mockup.** Create `mockup.html` inside that folder as the
   visual source of truth for the screen. Annotate important elements
   with `data-component`, `data-state`, `data-action`, `data-i18n`, and
   `data-asset` so AI agents can map layout to runtime code. Keep
   behavior prose out of the HTML.
4. **Screen spec.** Create `spec.md` with the component tree, state
   bindings, mechanics mapping, acceptance criteria, and AI
   implementation notes.
5. **Interaction map.** Create `interactions.md` with every button,
   hotkey, command, route, data update, animation, sound, disabled case,
   and error case.
6. **Data contracts.** Create `data-contracts.md` with the schemas,
   selectors, config keys, localization keys, asset IDs, save/replay
   fields, validation, and fallback rules.
7. **Architecture diagrams.** Create `architecture.md` with small
   Mermaid diagrams for screen load, state refresh, important
   interactions, data updates, transitions, and determinism/content
   rules.
8. **Rebuild the wiki.** Run `npm run generate:wiki`. Commit the new
   screen package and regenerated `architecture-wiki.html` together.
9. **Verify.** Open `architecture-wiki.html`, switch to UI Screens, and
   confirm the Mockup, Spec, Interactions, Data Contracts, and
   Architecture Diagrams tab renders.

See [`docs/architecture/wiki/README.md`](./docs/architecture/wiki/README.md)
for the canonical source layout. The screen package files are the source
of truth; the unified wiki HTML is regenerated from them.

---

## Cookbook — Add A New Task File

1. Copy the structure of an existing peer task (stable headers,
   **Outputs**, **Dependencies**, **Estimated Time**, **Acceptance
   Criteria**). Keep the estimate between 2–6h; split larger work.
   If a task family has to grow, use suffixes such as `05a`, `05b`,
   `05c` instead of leaving one oversized task behind.
2. Place it under the correct module directory (the module's `.md`
   file is the index; sibling folder contains the tasks).
3. Run `npm run generate:task-registry` locally to refresh the
   (gitignored) `tasks/task-registry.json`. CI regenerates it, so you
   do not need to commit the JSON.
4. Run `npm run validate:tasks` to catch dependency cycles,
   unresolved dependency strings, missing UI screen-package references,
   unowned screen packages, and unreferenced schemas.
5. Run `npm run generate:task-system-report` if the change affects
   task ownership, screen coverage, schema coverage, or dependency
   health.
6. If the task replaces or renames an older one, update any
   cross-references and add a line to
   [`docs/planning/implementation-log.md`](./docs/planning/implementation-log.md).
7. For UI tasks, include the relevant
   `docs/architecture/wiki/screens/<nn-screen-name>/` package in the
   task Inputs and acceptance criteria so the mockup, spec, and
   architecture diagram travel together.

---

## Cookbook — Modify A Formula

All numeric gameplay math is a
[`formula.schema.json`](./content-schema/schemas/formula.schema.json)
AST. Strings are never formulas.

1. Express the change as AST nodes from the closed opcode set
   (`const`, `var`, `add`, `sub`, `mul`, `divFloor`, `ratio`, `min`,
   `max`, `clamp`, `neg`, `abs`).
2. Every numeric literal is an integer. For fractions, use `ratio`
   with `num`/`den`, or fixed-point at basis 1000 (see
   [`09-tactical-combat/03-damage-formula.md`](./tasks/mvp/09-tactical-combat/03-damage-formula.md)).
3. Add or update test vectors in the task's Acceptance Criteria.
4. Do not reach for `eval`, `new Function`, or a string mini-DSL.
   The contract validator grep-checks for these.

---

## Definition Of Done

- [ ] `npm run validate` passes (task registry regenerates, Markdown
      links resolve, every example record validates, task files meet
      structure/estimate rules, no forbidden-pattern hits).
- [ ] `npm test` passes.
- [ ] If you changed a schema, the matching example was updated in
      the same commit.
- [ ] If you changed a task or module file, the module index links
      still resolve.
- [ ] No `eval`, no `new Function`, no IP-unsafe names (Castle, legacy expansion,
      classic fantasy strategy, original fantasy strategy-and-Magic), no `apiKey` or provider
      names leaking into `tasks/phase-3/02-ai-generation/`.
