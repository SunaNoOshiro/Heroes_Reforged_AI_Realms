// @hr/contracts — re-export surface.
//
// Consumers usually import from "@hr/contracts" directly:
//   import type { Rng, PackRegistry, RendererEvent } from "@hr/contracts";
//
// Per-file imports stay supported for tree-shaking purity:
//   import type { Rng } from "@hr/contracts/rng";

export type { Rng, RngStream } from "./rng.js";
export type { Clock } from "./clock.js";
export type { IdAllocator, IdAllocatorKind } from "./id-allocator.js";
export type {
  PackId,
  PackRegistry,
  ResolvedAsset
} from "./pack-registry.js";
export type {
  AssetHandle,
  AssetLoader,
  AudioHandle,
  TextureHandle
} from "./asset-loader.js";
export type {
  CommandBus,
  CommandEnvelope,
  CommandMetadata
} from "./command-bus.js";
export type { NetMessage, NetTransport } from "./net-transport.js";
export type {
  AnimationFinishedEvent,
  AnimationStartedEvent,
  CameraFocusedEvent,
  ContextLostEvent,
  ContextRestoredEvent,
  DamageNumberEvent,
  EffectTriggeredEvent,
  HexCoord,
  RendererEvent,
  RendererEventKind,
  ScreenPoint,
  SelectionChangedEvent,
  SelectionTarget,
  TileRevealedEvent
} from "./renderer-event.js";
export type {
  AnyReport,
  BalanceReport,
  BalanceReportMetrics,
  CoherenceReport,
  ReportFinding,
  ReportSeverity,
  ReportVerdict,
  ValidationReport
} from "./reports.js";
