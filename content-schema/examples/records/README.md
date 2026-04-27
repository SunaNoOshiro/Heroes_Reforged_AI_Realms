# Canonical Record Fixtures

This folder contains standalone examples for individual schema kinds.

Use these files when you need to understand a record in isolation
without loading an entire pack. They are especially useful for:

- schema authoring
- validator work
- task docs that need one concrete example
- AI prompts that need a small, representative fixture

## What Belongs Here

- one file per record kind when the record can exist independently
- examples that stay small and focused on the record itself
- records that other examples may reference by ID

## What Does Not Belong Here

- pack manifests
- multi-record pack layouts
- generated output blobs from the AI boundary
- records that are owned by a shared library pack (skills, for
  example, live under [`../packs/shared-skills/`](../packs/shared-skills/)
  rather than here — a record is either standalone *or* pack-owned,
  not both)

For end-to-end pack structure, use [`../packs/`](../packs/).
