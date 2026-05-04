# Implementation Report: 20 — Save Imports & Pack Trust Prompts

> Companion to
> [`docs/implementation-plans/20-save-imports-and-pack-trust-prompts-plan.md`](./20-save-imports-and-pack-trust-prompts-plan.md).
> Records what was actually applied to the repository on 2026-05-04.

---

## Summary

All artifacts called out in the plan's "In scope" list landed in this
pass. `npm run validate`, `npm test`, and `npm run all` (validate +
generate:wiki + generate:task-system-report) are green.

The plan's screen and task numbers were rebased to next-free slots
because the literal numbers (66/67/68 for screens; 06/07/08 for
persistence; 21–24 for content-schemas) were already taken. Final
mapping:

- Screens **70-save-import**, **71-pack-manager**, **72-pack-trust-prompt**
  (plan referred to 66/67/68; those are debug screens).
- Persistence tasks **10**, **11**, **12** (plan referred to 06/07/08;
  those are autosave/snapshot-rebase/migration-registry).
- Content-schema tasks **28**, **29**, **30**, **31** (plan referred
  to 21/22/23/24; those are error-state / validation-error /
  schema-migration / enum-lifecycle).

This is documented as Assumption A1 below.

---

## What landed

### Schemas (4 new + 1 extension)

| File | Purpose |
| --- | --- |
| [`content-schema/schemas/save.schema.json`](../../content-schema/schemas/save.schema.json) | Closed shape for an exportable save record; pinned by `pack-trust.md` § Save Version Bounds. |
| [`content-schema/schemas/publisher-registry.schema.json`](../../content-schema/schemas/publisher-registry.schema.json) | Known-publisher signing-key list driving `tier=signed-known`. |
| [`content-schema/schemas/pack-revocation-list.schema.json`](../../content-schema/schemas/pack-revocation-list.schema.json) | Client-local user-decision revocation surface. |
| [`content-schema/schemas/trust-store.schema.json`](../../content-schema/schemas/trust-store.schema.json) | Per-installation persisted user trust decisions. |
| [`content-schema/schemas/manifest.schema.json`](../../content-schema/schemas/manifest.schema.json) | Added optional `contentRating` object (advisory only). |

Canonical examples authored under `content-schema/examples/save/`,
`publisher-registry/`, `pack-revocation-list/`, `trust-store/`.

[`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
extended with the four new file→schema suffix mappings so example
records validate.

### Architecture docs

- [`docs/architecture/pack-trust.md`](../architecture/pack-trust.md)
  authored end-to-end with sections: Resource Limits, Save
  Quarantine, Save Version Bounds, Trust Anchors, Safe Mode, Modded
  Indicator, Trust & Safety Phrasing, Content Rating, Platform
  Posture, Error Codes.
- [`docs/architecture/pack-contract.md`](../architecture/pack-contract.md)
  added § Trust Anchors, § Resource Limits, and `contentRating`
  bullet under Trust Fields.
- [`docs/architecture/command-schema.md`](../architecture/command-schema.md)
  added § Save-Import & Pack-Trust Commands listing every new
  command and its owning task.
- [`docs/architecture/schema-matrix.md`](../architecture/schema-matrix.md)
  added four new rows.
- [`content-schema/README.md`](../../content-schema/README.md) lists
  the four new schemas.
- [`docs/architecture/diagrams/24-save-flow.md`](../architecture/diagrams/24-save-flow.md)
  cross-links the import pre-checks.
- [`docs/architecture/diagrams/25-load-flow.md`](../architecture/diagrams/25-load-flow.md)
  rebuilt to show size → ratio → schema-validate → version-bound →
  migration → quarantine → pack → tamper terminals.
- [`docs/architecture/screen-command-coverage.json`](../architecture/screen-command-coverage.json)
  registered new command tokens as out-of-scope with owning task ids.
- [`README.md`](../../README.md) one-line link to pack-trust.md
  § Platform Posture beside the existing browser-first claim.

### Screen packages

Three new packages under
[`docs/architecture/wiki/screens/`](../architecture/wiki/screens/),
each with the canonical five files (mockup.html, spec.md,
interactions.md, data-contracts.md, architecture.md):

- [`70-save-import/`](../architecture/wiki/screens/70-save-import/) —
  quarantined save-import flow.
- [`71-pack-manager/`](../architecture/wiki/screens/71-pack-manager/) —
  installed-pack table with trust audit + revoke.
- [`72-pack-trust-prompt/`](../architecture/wiki/screens/72-pack-trust-prompt/) —
  per-pack trust review with tier ribbon, capability disclosure,
  transitive consent, scope picker.

`docs/architecture/wiki/screens/index.json` registers them under
`system-dialogs`.

### Existing screens edited

- [`55-save-load/`](../architecture/wiki/screens/55-save-load/)
  interactions and data-contracts gained `Import…` action,
  `RESTORE_OVERWRITTEN_SAVE`, the recycle-ring selector, and the
  staging selector.
- [`54-system-menu/`](../architecture/wiki/screens/54-system-menu/)
  gained `Manage packs…` and `Safe mode (disable all packs)`
  actions.
- [`19-status-bar/`](../architecture/wiki/screens/19-status-bar/)
  gained the `moddedIndicator` selector binding and the
  `ui.status-bar.modded.*` localization keys.

### Tasks

Authored:

- [`tasks/mvp/02-content-schemas/28-save-schema.md`](../../tasks/mvp/02-content-schemas/28-save-schema.md)
- [`tasks/mvp/02-content-schemas/29-publisher-registry-schema.md`](../../tasks/mvp/02-content-schemas/29-publisher-registry-schema.md)
- [`tasks/mvp/02-content-schemas/30-pack-revocation-list-schema.md`](../../tasks/mvp/02-content-schemas/30-pack-revocation-list-schema.md)
- [`tasks/mvp/02-content-schemas/31-trust-store-schema.md`](../../tasks/mvp/02-content-schemas/31-trust-store-schema.md)
- [`tasks/mvp/08-persistence/10-save-schema-and-validator.md`](../../tasks/mvp/08-persistence/10-save-schema-and-validator.md)
- [`tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md`](../../tasks/mvp/08-persistence/11-save-import-screen-and-quarantine.md)
- [`tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md`](../../tasks/mvp/08-persistence/12-pack-trust-prompt-and-manager.md)

Edited:

- [`tasks/mvp/02-content-schemas.md`](../../tasks/mvp/02-content-schemas.md)
  module index — added 28–31.
- [`tasks/mvp/08-persistence.md`](../../tasks/mvp/08-persistence.md)
  module index — added 10–12.
- [`tasks/mvp/08-persistence/05-export-import-json.md`](../../tasks/mvp/08-persistence/05-export-import-json.md)
  — `Read First` extended; depends on 10 and 11; acceptance note
  routes the import path through Task 11.

---

## Validation

```text
$ npm run validate
... 18 sub-validators all pass; final asset-index --check: 0 drifted packs.

$ npm test
1..32  pass 32  fail 0

$ npm run all
... validate + generate:wiki + generate:task-system-report all green.
generate:wiki built docs/architecture/architecture-wiki.html (2533.8 KB);
72 UI screen packages indexed.
```

---

## Assumptions

- **A1 (numbering)** — Plan referred to screen IDs 66/67/68 and task
  IDs 06/07/08 (persistence) plus 21–24 (content-schemas) which
  were already taken at time of implementation. Per the plan's own
  rule "next free slot per directory", these were rebased to
  70/71/72, 10/11/12, and 28–31 respectively. The plan's locked
  decisions (architecture, schemas, flows) are preserved verbatim;
  only the integer slot ids shifted.
- **A2 (locale data)** — Plan § "Localization keys" anticipates a
  Plan 14 (localization) deliverable that has not landed. This
  pass declares all `ui.save-import.*` and `ui.pack-trust.*` keys
  inside `pack-trust.md` § Error Codes and the screen
  data-contracts files, but no locale data file is shipped. Plan
  14's eventual locale file is the canonical home; until then the
  keys live in the screen packages.
- **A3 (signature verification)** — Plan calls for ed25519
  verification via Web Crypto. The runtime hook lives in the new
  `src/content-runtime/signature.ts` path declared by Task
  `mvp.08-persistence.12-pack-trust-prompt-and-manager`; no
  TypeScript implementation was authored in this pass (the repo is
  contracts-first), and the verifier is documented as the sole
  legal source of `tier=signature-failed`.

---

## Blockers

None.

---

## Commit Message

```
Implement save-imports-and-pack-trust-prompts plan

Land the contracts plan from docs/implementation-plans/
20-save-imports-and-pack-trust-prompts-plan.md: four new schemas
(save, publisher-registry, pack-revocation-list, trust-store), an
optional manifest.contentRating, the safety-policy doc
docs/architecture/pack-trust.md, and three new screen packages
70-save-import / 71-pack-manager / 72-pack-trust-prompt with edits to
the existing 19-status-bar / 54-system-menu / 55-save-load packages,
the save/load diagrams, command-schema.md, schema-matrix.md, and the
persistence + content-schemas task trees. Numbering shifted to
next-free slots because the plan's literal IDs were already taken.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```
