# src/ai/providers

Concrete adapters for model vendors or local implementations.

Rules:

- do not import these directly from UI components
- hide SDK-specific request/response details here
- adapt outputs into the contracts declared in `../contracts/`
