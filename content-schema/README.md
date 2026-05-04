# content-schema

This folder is the canonical home for machine-readable content
contracts and canonical example JSON.

## Purpose

- define the JSON shapes used by packs
- give docs and examples one concrete source of truth
- keep schemas separate from runtime implementation code
- keep AI agents anchored to canonical examples instead of ad-hoc prose

## Layout

```text
content-schema/
  schemas/              canonical JSON Schema files
  examples/
    records/            standalone canonical records
    packs/              end-to-end example packs
    generation/         AI-generation boundary fixtures
```

## Current Scope

The schemas here are the current public contract for packs and
generation payloads. They currently cover:

- manifest
- faction
- unit
- hero
- building
- ability
- hero class
- skill
- ruleset
- scenario
- asset index
- localization
- world
- spell
- artifact
- adventure building
- map object
- neutral stack template
- town presentation
- animation
- vfx
- sound set
- AI generation request / generated faction
- chat message envelope (lobby chat)
- report bundle (peer-behavior / AI-UGC reports)
- content report (UGC content-target report)
- privacy options (per-installation privacy preferences)
- save record (exportable save consumed by save-import flow)
- publisher registry (known-publisher signing-key list)
- pack revocation list (client-local user-decision revocations)
- trust store (per-installation user pack-trust decisions)
- signature error (closed pack-signature error vocabulary)
- signaling error (closed signaling-server error vocabulary; wire vs. owner-notice)
- audit log entry (local on-device privacy/consent journal)
- erasure receipt (verifiable receipt for `REQUEST_ERASURE_RECEIPT`)

## Relationship To Other Folders

- `docs/architecture/schema-matrix.md`
  Explains the meaning of record kinds and points to canonical examples.
- `examples/`
  Holds canonical fixtures. Some are standalone records; some are full
  packs.
- `src/content-schema/`
  Future validators, migration helpers, and schema-loading runtime code.
- `../docs/architecture/pack-contract.md`
  Canonical manifest fields and pack layout rules.
- `../research/deep-research-report.md`
  Balance corridor and numeric ranges that content authors should stay
  inside unless the docs are updated first.

## Canonicality Rule

If a record shape changes, update:

1. the schema file here
2. the sample/example JSON that uses it
3. the docs that explain it

Do not create a second "template" copy of the same contract elsewhere.
