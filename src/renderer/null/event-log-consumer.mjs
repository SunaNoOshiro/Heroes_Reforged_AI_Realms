// Event-log consumer used by the null renderer (and reused by the
// animation debug overlay). Pure function:
//   consumeEventLog(events, registries) -> AnimationTrace
//
// AnimationTrace pins, for each input event, the sequence(s) the
// renderer would play, the channel they would play on, and the
// per-frame events (damage popups, sound cues, vfx phases, status
// overlays) they would emit at cosmetic time.
//
// The renderer is a pure consumer: this module never mutates engine
// state, never calls back into rules, and never reads wall-clock
// time. It is the test-friendly substitute for the WebGL2 renderer.
//
// See:
//   - docs/architecture/animation-contract.md
//   - docs/architecture/diagrams/11-attack-anim.md
//   - docs/architecture/diagrams/12-spell-anim.md

const PRIORITY = Object.freeze({
  dying: 9,
  defeated: 8,
  hurt: 7,
  attacking: 6,
  casting: 5,
  defending: 4,
  waiting: 3,
  walking: 2,
  idle: 1
});

function priorityOf(sequenceName) {
  return PRIORITY[sequenceName] ?? 0;
}

function trackOf(sequence) {
  return sequence.channel ?? "body";
}

function locateSequence(animationSet, sequenceName) {
  if (animationSet.sequences && animationSet.sequences[sequenceName]) {
    return { trackName: "body", sequence: animationSet.sequences[sequenceName] };
  }
  if (animationSet.tracks) {
    for (const [trackName, track] of Object.entries(animationSet.tracks)) {
      if (track?.sequences?.[sequenceName]) {
        return { trackName, sequence: track.sequences[sequenceName] };
      }
    }
  }
  return null;
}

function expandSequenceEvents(sequence) {
  if (Array.isArray(sequence.events)) {
    return sequence.events.map((e) => ({ ...e }));
  }
  if (sequence.eventFrame !== undefined) {
    return [{ frame: sequence.eventFrame, kind: "damage", ref: "primary" }];
  }
  return [];
}

function durationMs(sequence) {
  if (!sequence?.frames || !sequence.fps) return 0;
  return Math.round((sequence.frames.length * 1000) / sequence.fps);
}

export function consumeEventLog(events, registries = {}) {
  const animations = registries.animations ?? new Map();
  const sounds = registries.sounds ?? new Map();
  const vfx = registries.vfx ?? new Map();
  const statuses = registries.statuses ?? new Map();

  const trace = {
    timelines: [],   // one per played sequence
    cuesEmitted: [], // damage / sound / vfx / status, in event-log order
    warnings: [],
    invariants: {
      damageEverEmittedFromRenderer: false
    }
  };

  // Order timelines by event-log index for deterministic snapshots.
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    if (!event || !event.animId || !event.sequence) continue;

    const animSet = animations.get(event.animId);
    if (!animSet) {
      trace.warnings.push(
        `event[${i}] (${event.kind}): unknown animId "${event.animId}"`
      );
      continue;
    }

    const located = locateSequence(animSet, event.sequence);
    if (!located) {
      trace.warnings.push(
        `event[${i}] (${event.kind}): sequence "${event.sequence}" not found in "${event.animId}"`
      );
      continue;
    }

    const { trackName, sequence } = located;
    const channel = trackOf(sequence) === trackName ? trackName : trackOf(sequence);
    const cues = expandSequenceEvents(sequence);

    // Validate per-event refs resolve.
    for (const cue of cues) {
      if (cue.frame >= sequence.frames.length) {
        trace.warnings.push(
          `event[${i}] cue at frame ${cue.frame} out of range [0..${sequence.frames.length - 1}] for "${event.sequence}"`
        );
      }
      if (cue.kind === "sound" && !sounds.has(cue.ref)) {
        trace.warnings.push(
          `event[${i}] cue "sound" ref "${cue.ref}" does not resolve`
        );
      } else if (cue.kind === "vfx" && !vfx.has(cue.ref)) {
        trace.warnings.push(
          `event[${i}] cue "vfx" ref "${cue.ref}" does not resolve`
        );
      } else if (cue.kind === "status" && !statuses.has(cue.ref)) {
        trace.warnings.push(
          `event[${i}] cue "status" ref "${cue.ref}" does not resolve`
        );
      }
      // Cosmetic damage-cue emission: this is a pure surface for the
      // floating "47" popup, not a damage application. The renderer
      // never mutates engine state. The test suite asserts that no
      // cue.kind === "damage" was triggered without a corresponding
      // pre-existing engine event in events[].
    }

    trace.timelines.push({
      eventIndex: i,
      animId: event.animId,
      sequenceName: event.sequence,
      trackName,
      channel,
      priority: priorityOf(event.sequence),
      frames: sequence.frames.slice(),
      fps: sequence.fps,
      durationMs: durationMs(sequence),
      cues
    });

    for (const cue of cues) {
      trace.cuesEmitted.push({
        eventIndex: i,
        animId: event.animId,
        sequenceName: event.sequence,
        ...cue
      });
    }
  }

  return trace;
}

export function priorityForSequence(sequenceName) {
  return priorityOf(sequenceName);
}

export const PRIORITY_TABLE = PRIORITY;
