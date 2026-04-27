# examples

This folder holds canonical fixtures used by docs, validators, and AI
agents.

These files are examples, but they are not throwaway samples. They are
part of the contract surface for the repo.

## Subfolders

- `records/`
  Standalone records used to show one schema in isolation.
- `packs/`
  End-to-end pack examples that demonstrate manifest layout,
  cross-record references, and asset indirection.
- `generation/`
  Provider-neutral request/response fixtures for AI generation.

## Usage Rule

- Reach for `records/` when you need one focused schema example.
- Reach for `packs/` when you need to see how multiple records compose
  into a loadable pack.
- Reach for `generation/` when you are working on the AI boundary rather
  than the pack runtime itself.

There is no separate `templates/` layer. These fixtures are the
templates.
