# Generation Fixtures

This folder holds example inputs and outputs for the provider-neutral
generation boundary defined in
[`docs/architecture/ai-integration.md`](../../../docs/architecture/ai-integration.md).

## Files

- `emberwild.generation-request.json` — an example request that an
  orchestration layer would pass to `GenerationProvider.generateStructured`.
  Validates against
  [`generation-request.schema.json`](../../schemas/generation-request.schema.json).
- `emberwild.generated-faction.json` — an example raw output that a
  provider would return. Validates against
  [`generated-faction.schema.json`](../../schemas/generated-faction.schema.json).

The validation pipeline converts a `generated-faction` blob into a
loadable pack by: validating each record against its own schema, running
the coherence pass, running the auto-balancer, then emitting a manifest
with `contentHash`.
