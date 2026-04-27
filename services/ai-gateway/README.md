# services/ai-gateway

Optional backend boundary for provider-backed AI generation and
moderation.

Use this when:

- provider secrets should stay off the client
- rate limiting or policy enforcement is centralized
- multiple model providers need one stable app-facing interface

Client and orchestration code should depend on the request/response
contract, not on one provider SDK.
