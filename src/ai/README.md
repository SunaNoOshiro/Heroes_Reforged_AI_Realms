# src/ai

AI-related modules. Keep heuristic bots, search-based AI, and
AI-assisted generation as separate submodules under this folder.

Planned split:

- `bots/`
  Deterministic heuristic and search-based opponents.
- `generation/`
  Prompt-to-content orchestration, validation, balancing, and reporting.
- `contracts/`
  Provider-neutral interfaces for generation and moderation adapters.
- `providers/`
  Concrete model-provider adapters behind the contracts layer.

Provider-specific SDK calls should stay in `providers/` or optional
backend adapters under `services/`, not in UI components or gameplay
logic.
