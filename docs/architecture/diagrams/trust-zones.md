# Diagram — Trust Zones

> Source plan:
> [`docs/implementation-plans/31-trust-boundaries-and-logging-monitoring-plan.md`](../../implementation-plans/31-trust-boundaries-and-logging-monitoring-plan.md).
> Owner doc: [`trust-boundaries.md`](../trust-boundaries.md).

The diagram below names every cross-zone arrow and the gate that
validates it. Read together with
[`trust-boundaries.md`](../trust-boundaries.md) § 3 (per-component
matrix).

```mermaid
flowchart LR
  subgraph Browser["Browser tab (untrusted)"]
    UI["UI / React"]
    UIs["URL / DOM events"] --> UI
    UI --> CR["content-runtime adapter"]
    CR --> Engine
    subgraph Engine["TRUSTED CORE: src/engine + src/rules + src/content-schema"]
      Reducer["pure reducer"]
      Registries["registries"]
    end
    Worker["Web Worker (AI bot)"]
    Engine -- "view projection" --> Worker
    Worker -- "MOVE_RESULT (worker-message.schema.json)" --> Reducer
    Persist["Persistence adapter"]
    Persist -- "save.schema.json + envelope MAC" --> Reducer
    Reducer -- "command log" --> Persist
    Net["Net adapter"]
    Reducer -- "command envelope (HMAC)" --> Net
    Net -- "command envelope (HMAC)" --> Reducer
  end

  Pack["Pack archive on disk"]
  Pack -- "manifest schema + contentHash + Ed25519" --> CR

  subgraph Signaling["signaling server (stateless)"]
    SigEnv["envelope schema gate"]
  end
  Net -- "WSS frame (signaling-message.schema.json)" --> SigEnv
  SigEnv -- "forwarded SDP/ICE" --> NetPeer["peer Net adapter"]

  subgraph Peer["peer browser"]
    PeerEngine["peer trusted core"]
  end
  NetPeer -- "DataChannel command (HMAC)" --> PeerEngine
  PeerEngine -- "chat (chat-message.schema.json)" --> UI

  subgraph Gateway["AI gateway service"]
    PromptHygiene["Stage 1.5 prompt hygiene"]
    OutputValidation["Stage 3-6 output validation"]
  end
  Net -- "rate-limited request" --> PromptHygiene
  PromptHygiene -- "system + user prompt" --> Provider["Anthropic / OpenAI"]
  Provider -- "structured JSON" --> OutputValidation
  OutputValidation -- "validated pack candidate" --> CR

  TURN["TURN relay (future)"]
  NetPeer <-- "DTLS-only payload" --> TURN

  Host["Hosting provider env"]
  Host -- "secrets (allow-list)" --> Gateway
  Host -- "secrets (allow-list)" --> Signaling

  Desktop["Future desktop wrapper"]
  Desktop -- "fs.allowlist" --> UIs
```

The diagram is read-only; modifications must edit
[`trust-boundaries.md`](../trust-boundaries.md) § 3 first and then
mirror the change here.
