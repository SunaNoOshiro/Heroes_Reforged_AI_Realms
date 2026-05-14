# Architecture Wiki Sources

Source set consumed by `npm run generate:wiki`. The generated
[`../architecture-wiki.html`](../architecture-wiki.html) is a read-only
viewer; the files in this folder are the canonical implementation
contracts. Re-run `npm run generate:wiki` after any change here.

> Companion docs:
>
> - [`screen-curation-plan.md`](./screen-curation-plan.md) — work
>   queue for replacing scaffolds with curated packages.
> - [`migration-plan.md`](./migration-plan.md) — folder-shape and
>   batch-migration history.
> - [`missing-states.md`](./missing-states.md) — variant-state gaps
>   to add as new packages.
> - [`_templates/`](./_templates/) — checklists copied into screen
>   packages (animation seven-state sweep, contract sweep).

## 1. Folder structure

```text
docs/architecture/wiki/
  README.md
  migration-plan.md
  missing-states.md
  screen-curation-plan.md
  _templates/
    animation-states.md
    contract-sweep.md
  screens/
    index.json
    01-main-menu/
      mockup.html
      spec.md
      interactions.md
      data-contracts.md
      architecture.md
    02-new-game-setup/
      mockup.html
      spec.md
      interactions.md
      data-contracts.md
      architecture.md
    …
```

Each screen package uses the same `<nn>-<slug>` folder name for all
five sources. The wiki generator loads them together and renders the
screen tabs as **Mockup**, **Spec**, **Interactions**, **Data
Contracts**, and **Architecture Diagrams**.
[`screens/index.json`](./screens/index.json) assigns every package to
exactly one group; package numbers follow group order so the sidebar
reads in natural numeric sequence. General diagrams stay separate
under [`../diagrams/`](../diagrams/).

## 2. Source of truth

| Concern | Canonical file |
|---|---|
| Visual state | `screens/<nn-screen>/mockup.html` |
| Components and state bindings | `screens/<nn-screen>/spec.md` |
| Per-control behavior | `screens/<nn-screen>/interactions.md` |
| Schemas, config, l10n, save/replay, asset links | `screens/<nn-screen>/data-contracts.md` |
| Per-screen data-flow / command-flow diagrams | `screens/<nn-screen>/architecture.md` |
| Screen group order | [`screens/index.json`](./screens/index.json) |
| Curation tracker | [`screen-curation-plan.md`](./screen-curation-plan.md) |
| General architecture diagrams | [`../diagrams/`](../diagrams/) |
| Human browser (generated) | [`../architecture-wiki.html`](../architecture-wiki.html) |

## 3. UI smoke contract

Every screen package under [`screens/<nn-screen>/`](./screens/) is
paired at runtime with exactly one `<screen>.smoke.test.ts` under
`src/ui/__tests__/screens/`, per the contract pinned in
[`../testing/ui-smoke-contract.md`](../testing/ui-smoke-contract.md).

A UI task whose `ownedPaths` glob matches `src/ui/**` cannot flip to
`done` if the smoke step fails:
[`scripts/tasks.mjs`](../../../scripts/tasks.mjs) automatically
prepends `npm run test:ui-smoke` to its verify chain. The harness,
template, and `tasks:done` wiring are owned by
[`tasks/mvp/02-tooling/01-ui-smoke-harness.md`](../../../tasks/mvp/02-tooling/01-ui-smoke-harness.md).

## 4. UI evolution policy

Layout, visual style, panel composition, navigation flow, component
structure, tooltips, modals, and other presentation details may
evolve after implementation. **The screen package is the source of
truth for those changes**: update `mockup.html`, `spec.md`,
`interactions.md`, `data-contracts.md`, and `architecture.md` before
changing runtime UI code.

Runtime UI remains a presentation boundary. It reads gameplay through
selectors, stores transient UI-only state outside deterministic
gameplay state, and emits commands through the shared dispatch path.
UI redesigns MUST NOT:

- mutate engine state directly,
- change command semantics,
- rename stable IDs,
- alter save/replay contracts, or
- add raw asset paths to gameplay records.

If a better UI needs new gameplay data, add it through an explicit
schema, selector, command, migration, or task-owned contract change.

Chat-related edits — e.g. on
[`screens/64-network-lobby/`](./screens/64-network-lobby/) — MUST
update [`../chat-safety.md`](../chat-safety.md) **first** when the
change touches channel reservation, envelope shape, normalization,
sanitization, rate limit, mute / block, report flow, retention, or
the trust-model disclosure. The screen package mirrors that contract;
it does not re-author it.

## 5. Required architecture reading

Screen-package authors and runtime implementers read the DOM-side
contracts below before authoring or implementing a package.

| Doc | Owns |
|---|---|
| [`../ui-technology-choice.md`](../ui-technology-choice.md) | framework, state binding, z-stack, localization, fonts, build flags |
| [`../ui-renderer-seam.md`](../ui-renderer-seam.md) | DOM ↔ canvas seam, input routing, hit-test API, resize protocol |
| [`../screen-scaling.md`](../screen-scaling.md) | virtual 800×600 stage, aspect, hi-DPI, filter modes |
| [`../ui-component-resolver.md`](../ui-component-resolver.md) | `data-component` registry, reuse policy, missing-component fallback |
| [`../ui-frame-lag-contract.md`](../ui-frame-lag-contract.md) | UI lag bounds, optimistic UI, M5 lockstep, context loss, replay |
| [`../ui-state-contract.md`](../ui-state-contract.md) | component-state matrix, selector purity, tooltip lifecycle, command lifecycle, undo/redo (map editor) |
| [`../ui-routing.md`](../ui-routing.md) | screen-router FSM, transition graph, modal stack, dismissal policy |
| [`../ui-input-arbitration.md`](../ui-input-arbitration.md) | single-emit per gesture, Esc precedence ladder, animation gates |
| [`../ui-gestures.md`](../ui-gestures.md) | gesture taxonomy and drag contract |
| [`../ui-hotkeys.md`](../ui-hotkeys.md) | hotkey registry, focus order, tab-trap, focus restoration |
| [`../ui-input-modalities.md`](../ui-input-modalities.md) | mouse / touch / keyboard / gamepad bridging |
| [`../onboarding.md`](../onboarding.md) | first-run onboarding, consent scopes, policy version, re-prompt rules |
| [`../age-gate.md`](../age-gate.md) | `config.player.ageGate` and the minor-strict feature matrix |
| [`../undo-policy.md`](../undo-policy.md) | soft-delete + undo contract for save delete / overwrite |
| [`../url-routing.md`](../url-routing.md) | closed query-param list, fragment discipline, confirmation routing |
| [`../autoplay-policy.md`](../autoplay-policy.md) | first-gesture unlock, muted-by-default, `prefers-reduced-motion` |
| [`../new-install-defaults.md`](../new-install-defaults.md) | safe-default table for every optional feature |
| [`../developer-mode.md`](../developer-mode.md) | `config.dev.*` keys, chord-unlock, double-confirm, persistent banner |
| [`../peer-trust.md`](../peer-trust.md) | `state.profile.knownPeers` ring buffer and the lobby `trustLevel` badge |
| [`../ai-moderation-contract.md`](../ai-moderation-contract.md) | AI moderation status field and banner contract |
| [`../storage-contract.md`](../storage-contract.md) | file-picker rules and storage transport pinning |

## 6. Authoring rules

### 6.1 Package shape

- Treat [`screen-curation-plan.md`](./screen-curation-plan.md) as the
  work queue for replacing scaffold-level packages with manually
  curated, screen-specific contracts.
- Add one numbered folder per screen package, e.g.
  `screens/48-level-up-dialog/`.
- Keep the number stable. It controls navigation order and makes
  task references unambiguous.
- Add the folder name to exactly one category in
  [`screens/index.json`](./screens/index.json). The generator fails
  if the index references a missing screen, repeats a screen, or
  omits a screen.
- Every new package MUST declare at least one **inbound transition**
  in another screen's `interactions.md`. A package with zero inbound
  references is an orphan and fails validation.
- Add another numbered package for a materially different UI state
  only when it needs its own visual, spec, and architecture contract.
  Minor conditional states stay inside the existing package per
  [`missing-states.md`](./missing-states.md).

### 6.2 File-by-file contracts

- **`mockup.html`** — visual contract only. Annotate important
  elements with `data-component`, `data-state`, `data-action`,
  `data-i18n`, and `data-asset` where useful. No explanatory specs or
  behavior prose.
- **`spec.md`** — component tree, state bindings, mechanics mapping,
  acceptance criteria, and AI implementation notes.
- **`interactions.md`** — every button, hotkey, route, command, data
  update, animation, sound, disabled case, and error case.
- **`data-contracts.md`** — content schema, runtime selector, config,
  localization, asset, save/replay, and fallback references. Do not
  put raw asset paths in gameplay state examples; use IDs.
- **`architecture.md`** — small screen-specific Mermaid diagrams.
  Prefer separate diagrams for load, binding refresh, important
  interactions, data updates, and route transitions instead of one
  large diagram.

### 6.3 Schema and contract pins

- The `interactions.md` **Actions** table MUST include a `Hotkey`
  column whose values resolve to entries in
  [`../../../content-schema/schemas/hotkey.schema.json`](../../../content-schema/schemas/hotkey.schema.json).
  Mouse-only actions leave the cell empty and document the reason in
  AI Implementation Notes. See
  [`../ui-hotkeys.md`](../ui-hotkeys.md).
- Use canonical gesture names from
  [`../ui-gestures.md`](../ui-gestures.md) (`click`, `double-click`,
  `right-click`, `long-press`, `drag`, `dragstart`, `dragmove`,
  `dragend`). Ad-hoc gesture vocabulary fails validation.
- The `spec.md` **Animation Contract** MUST enumerate the seven
  normative states (`idle`, `hover`, `pressed`, `disabled`, `focused`,
  `error`, `loading`) per
  [`../ui-state-contract.md` § Component State Matrix](../ui-state-contract.md#component-state-matrix)
  for every interactive control, or explicitly waive each
  inapplicable state with a one-line justification. The checklist
  template is in
  [`_templates/animation-states.md`](./_templates/animation-states.md).
- Modal screens MUST declare an explicit Esc row matching their
  `severity` per
  [`../ui-routing.md` § Dismissal Policy](../ui-routing.md#dismissal-policy)
  and bind `state.ui.modalStack[top]` instead of per-screen
  `callerRoute` fields.
- When a screen renders errors, `data-contracts.md` MUST list
  [`error-state.schema.json`](../../../content-schema/schemas/error-state.schema.json)
  in its **Content Schemas And Registries** table and type
  `errors.*` bindings as `ErrorState[]`.

### 6.4 Task coupling

- UI implementation tasks list the relevant
  `docs/architecture/wiki/screens/<nn-screen>/` package in their
  **Inputs** and **Acceptance Criteria**.
- Run `npm run generate:wiki` after changing any screen package,
  general diagram, or architecture doc.

---

## 🔍 Sync Check

- **UI: ✔** — Every screen reference resolves: [`screens/`](./screens/) covers `01-main-menu` through `69-dev-ai-inspector`; [`screens/64-network-lobby/`](./screens/64-network-lobby/) exists and the chat-safety hand-off matches [`../chat-safety.md`](../chat-safety.md).
- **Schema: ✔** — [`hotkey.schema.json`](../../../content-schema/schemas/hotkey.schema.json) and [`error-state.schema.json`](../../../content-schema/schemas/error-state.schema.json) exist; both are referenced exactly as the schemas define them.
- **Tasks: ⚠** — Owning task [`tasks/mvp/02-tooling/01-ui-smoke-harness.md`](../../../tasks/mvp/02-tooling/01-ui-smoke-harness.md) lists `scripts/tasks.mjs` as a shared owned path and explicitly outputs the `test:ui-smoke` script + the `done`-hook edit. Today, `scripts/tasks.mjs` does not yet contain the auto-prepend logic and `src/ui/__tests__/screens/` does not yet exist — these are the unimplemented deliverables of that task, not a doc/code mismatch. The README correctly describes the post-task contract.

## ⚠ Issues

- **Stale script reference removed.** The previous revision instructed authors not to run `scripts/rework-legacy-screen-packages.mjs` for final UI work, but that script no longer exists in [`scripts/`](../../../scripts/) (only this README mentioned it). The bullet was dropped because the rule is moot — there is no script to gate. If the migration helper is intentionally archived, no further action is needed; if it is expected to return, restore both the script and the rule in a single PR.
- **`_templates/` was undocumented.** [`_templates/animation-states.md`](./_templates/animation-states.md) and [`_templates/contract-sweep.md`](./_templates/contract-sweep.md) exist and are referenced by screen-package contracts, but the previous folder-structure block omitted them. Added to § 1 and cross-linked from § 6.3.
- **`scripts/tasks.mjs` auto-prepend is forward-looking.** Per [`tasks/mvp/02-tooling/01-ui-smoke-harness.md`](../../../tasks/mvp/02-tooling/01-ui-smoke-harness.md) **Outputs**, the edit to `scripts/tasks.mjs` and the `src/ui/__tests__/screens/` directory are deliverables of that task. They do not exist yet at HEAD. The README describes the contract the task ships; closing the gap is owned by `mvp.02-tooling.01-ui-smoke-harness`, not this audit (Hard Prohibition D — never edit cross-checked files).
