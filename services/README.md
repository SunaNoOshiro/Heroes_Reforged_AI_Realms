# services

Optional backend adapters live here.

Examples:

- `ai-gateway/`
  Secret-holding or policy-enforcing AI endpoints.
- `signaling/`
  Multiplayer signaling service.

Keep service boundaries thin and explicit. They should adapt external
systems, not duplicate deterministic engine logic.
