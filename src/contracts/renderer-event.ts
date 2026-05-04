// Generated from content-schema/schemas/renderer-event.schema.json.
// Re-run scripts/generate-contracts-from-schemas.mjs after the schema
// changes. Hand-edits to this file will be overwritten.

export interface HexCoord {
  readonly q: number;
  readonly r: number;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export type SelectionTarget =
  | { readonly kind: "hero" | "stack" | "building" | "tile"; readonly id: string }
  | { readonly kind: "none" };

export interface SelectionChangedEvent {
  readonly kind: "SELECTION_CHANGED";
  readonly payload: { readonly target: SelectionTarget };
}

export interface CameraFocusedEvent {
  readonly kind: "CAMERA_FOCUSED";
  readonly payload: {
    readonly target: HexCoord;
    readonly zoom: number;
    readonly reason?: "user" | "engine-event" | "init" | "snap-to-active";
  };
}

export interface AnimationStartedEvent {
  readonly kind: "ANIMATION_STARTED";
  readonly payload: {
    readonly timelineId: string;
    readonly sourceEventKind: string;
  };
}

export interface AnimationFinishedEvent {
  readonly kind: "ANIMATION_FINISHED";
  readonly payload: { readonly timelineId: string };
}

export interface DamageNumberEvent {
  readonly kind: "DAMAGE_NUMBER";
  readonly payload: {
    readonly amount: number;
    readonly anchor: HexCoord;
    readonly screen?: ScreenPoint;
    readonly variant?: "damage" | "heal" | "miss" | "block" | "crit";
  };
}

export interface TileRevealedEvent {
  readonly kind: "TILE_REVEALED";
  readonly payload: {
    readonly tiles: readonly HexCoord[];
    readonly playerId?: number;
  };
}

export interface EffectTriggeredEvent {
  readonly kind: "EFFECT_TRIGGERED";
  readonly payload: {
    readonly effectId: string;
    readonly anchor: HexCoord;
    readonly durationMs?: number;
  };
}

export interface ContextLostEvent {
  readonly kind: "CONTEXT_LOST";
  readonly payload: {
    readonly reason?: "tab-backgrounded" | "gpu-reset" | "out-of-memory" | "unknown";
  };
}

export interface ContextRestoredEvent {
  readonly kind: "CONTEXT_RESTORED";
  readonly payload: {
    readonly rebindMs?: number;
  };
}

export type RendererEvent =
  | SelectionChangedEvent
  | CameraFocusedEvent
  | AnimationStartedEvent
  | AnimationFinishedEvent
  | DamageNumberEvent
  | TileRevealedEvent
  | EffectTriggeredEvent
  | ContextLostEvent
  | ContextRestoredEvent;

export type RendererEventKind = RendererEvent["kind"];
