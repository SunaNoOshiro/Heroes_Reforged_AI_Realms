# Schema Files

Canonical JSON Schema files live here.

## Families

- gameplay records:
  `unit`, `hero`, `faction`, `building`, `spell`, `artifact`,
  `adventure-building`, `map-object`, `neutral-stack-template`,
  `ruleset`, `scenario`, `skill`, `hero-class`
- presentation records:
  `animation`, `vfx`, `sound-set`, `town-presentation`
- pack/runtime boundary:
  `manifest`, `asset-index`, `world`
- shared embedded contracts:
  `effect`, `formula`, `targeting`, `condition`, `resource-id`,
  `stat-id`, `status-id`, `target-scope`
- UI presentation contracts:
  `ui-component-registry`, `error-state`, `modal-entry`, `hotkey`
- AI boundary:
  `generation-request`, `generated-faction`

## Working Rules

- every top-level record schema should be closed with
  `additionalProperties: false` unless there is a documented reason not
  to be
- deterministic numeric gameplay values are integers or formula ASTs,
  never free-form strings
- cross-record references use IDs, not file paths

Use [`../examples/`](../examples/) to see how these schemas look in
practice.

## Adding A New Schema

Before writing a new `.schema.json` file, read the "Adding a New
Schema" section of
[`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) — it covers the
`$id` format, the closed-discriminator pattern, example-record
placement, and the CI gates (`validate:contracts`,
`validate:cross-refs`) the new schema must pass. Dropping a schema
in without walking that checklist is the fastest way to silently
break AI-generated content or the runtime loader.
