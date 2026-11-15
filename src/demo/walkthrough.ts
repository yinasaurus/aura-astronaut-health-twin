export type WalkthroughAction = "move" | "click" | "wait";

export interface WalkthroughFollowUp {
  targetTestId: string;
  action: WalkthroughAction;
  atMs: number;
}

export interface WalkthroughStep {
  id: string;
  caption: string;
  targetTestId: string;
  action: WalkthroughAction;
  durationMs: number;
  followUps?: WalkthroughFollowUp[];
}

export const WALKTHROUGH_SPEEDS = [0.5, 1, 1.5, 2] as const;
export type WalkthroughSpeed = (typeof WALKTHROUGH_SPEEDS)[number];

export interface WalkthroughTarget {
  left: number;
  top: number;
  width: number;
  height: number;
  click: () => void;
}

export interface WalkthroughFrame {
  status: "playing" | "paused" | "stopped" | "done";
  stepIndex: number;
  stepCount: number;
  caption: string;
  skippedIds: string[];
  cursor: { x: number; y: number } | null;
  ring: { left: number; top: number; width: number; height: number } | null;
  ripple: boolean;
  rippleSerial: number;
  speed: WalkthroughSpeed;
}

export const SEEK_LIMIT_MS = 2000;
export const SKIP_HOLD_MS = 700;
export const SKIP_CAPTION = "Step skipped";
export const WALKTHROUGH_END_CAPTION = "End of the story";
const GLIDE_MS = 720;
const GLIDE_REDUCED_MS = 60;
const RIPPLE_MS = 420;
const RIPPLE_REDUCED_MS = 80;

/** About 30 seconds when each target is already on screen. Glide time is included in each step. */
export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "body",
    caption: "Day 60. Every system is green, and the body twin is quiet.",
    targetTestId: "body-twin",
    action: "move",
    durationMs: 4200,
  },
  {
    id: "heart",
    caption: "The heart system is selected. The ghost outline is this astronaut's own baseline.",
    targetTestId: "system-cardiovascular",
    action: "click",
    durationMs: 4200,
    followUps: [{ targetTestId: "ghost-toggle", action: "click", atMs: 1600 }],
  },
  {
    id: "inject",
    caption: "A solar particle event is injected. The colour can stay green while the readings start to move.",
    targetTestId: "inject-solar-particle",
    action: "click",
    durationMs: 3400,
  },
  {
    id: "advance",
    caption: "The day advances to 64. Combined drifts can turn a system amber without one number crossing a personal cutoff.",
    targetTestId: "advance-day",
    action: "click",
    durationMs: 3800,
  },
  {
    id: "reasons",
    caption: "The panel gives the plain-language reasons behind the score.",
    targetTestId: "flagged-system",
    action: "click",
    durationMs: 3800,
    followUps: [{ targetTestId: "system-reasons", action: "move", atMs: 1400 }],
  },
  {
    id: "delay",
    caption: "Comm delay is on, so the offline self-care prompts show. Delay off again, and the packet can open.",
    targetTestId: "delay-toggle",
    action: "click",
    durationMs: 5600,
    followUps: [
      { targetTestId: "self-care", action: "move", atMs: 1800 },
      { targetTestId: "delay-toggle", action: "click", atMs: 3800 },
    ],
  },
  {
    id: "packet",
    caption: "The flight surgeon packet is open.",
    targetTestId: "packet-button",
    action: "click",
    durationMs: 2800,
    followUps: [{ targetTestId: "packet-header", action: "move", atMs: 0 }],
  },
  {
    id: "end",
    caption: WALKTHROUGH_END_CAPTION,
    targetTestId: "packet-header",
    action: "wait",
    durationMs: 2200,
  },
];

export function plannedClicks(steps: WalkthroughStep[]): string[] {
  const ids: string[] = [];
  for (const step of steps) {
    if (step.action === "click") ids.push(step.targetTestId);
    for (const follow of step.followUps ?? []) {
      if (follow.action === "click") ids.push(follow.targetTestId);
    }
  }
  return ids;
}

type FindTarget = (testId: string) => WalkthroughTarget | null;
type Phase = "seek" | "act" | "skip";

function center(target: WalkthroughTarget) {
  return { x: target.left + target.width / 2, y: target.top + target.height / 2 };
}

function safeFind(find: FindTarget, testId: string): WalkthroughTarget | null {
  try {
    const target = find(testId);
    if (!target || target.width <= 0 || target.height <= 0) return null;
    return target;
  } catch {
    return null;
  }
}

function safeClick(target: WalkthroughTarget) {
  try {
    target.click();
  } catch {
    // A failed click must not stop the remaining steps.
  }
}

export function createWalkthroughRunner(options?: {
  steps?: WalkthroughStep[];
  reducedMotion?: boolean;
  onReset?: () => void;
}) {
  const steps = options?.steps ?? WALKTHROUGH_STEPS;
  let status: WalkthroughFrame["status"] = "paused";
  let stepIndex = 0;
  let phase: Phase = "seek";
  let seekElapsed = 0;
  let actElapsed = 0;
  let skipElapsed = 0;
  let speed: WalkthroughSpeed = 0.5;
  let reducedMotion = options?.reducedMotion ?? false;
  let skippedIds: string[] = [];
  let caption = steps[0]?.caption ?? WALKTHROUGH_END_CAPTION;
  let cursor: { x: number; y: number } | null = null;
  let to = { x: 0, y: 0 };
  let ring: WalkthroughFrame["ring"] = null;
  let ripple = false;
  let rippleSerial = 0;
  let rippleUntil = -1;
  let clickedMain = false;
  let stickId: string | null = null;
  const followDone = new Set<number>();

  function glideLimit(step: WalkthroughStep) {
    return Math.min(step.durationMs, reducedMotion ? GLIDE_REDUCED_MS : GLIDE_MS);
  }

  function frame(): WalkthroughFrame {
    const hidden = status === "stopped" || status === "done";
    return {
      status,
      stepIndex,
      stepCount: steps.length,
      caption,
      skippedIds: [...skippedIds],
      cursor: hidden ? null : cursor,
      ring: hidden ? null : ring,
      ripple: hidden ? false : ripple,
      rippleSerial,
      speed,
    };
  }

  function beginStep() {
    phase = "seek";
    seekElapsed = 0;
    actElapsed = 0;
    skipElapsed = 0;
    clickedMain = false;
    stickId = null;
    followDone.clear();
    ripple = false;
    rippleUntil = -1;
    ring = null;
    const step = steps[stepIndex];
    if (step) caption = step.caption;
  }

  function finish() {
    status = "done";
    caption = steps[steps.length - 1]?.caption ?? WALKTHROUGH_END_CAPTION;
    ripple = false;
  }

  function advance() {
    stepIndex += 1;
    if (stepIndex >= steps.length) finish();
    else beginStep();
  }

  function markSkip(step: WalkthroughStep) {
    if (!skippedIds.includes(step.id)) skippedIds = [...skippedIds, step.id];
    caption = SKIP_CAPTION;
    phase = "skip";
    skipElapsed = 0;
    ring = null;
    ripple = false;
  }

  function arm(target: WalkthroughTarget) {
    to = center(target);
    ring = { left: target.left, top: target.top, width: target.width, height: target.height };
    actElapsed = 0;
    clickedMain = false;
    stickId = null;
    followDone.clear();
    phase = "act";
  }

  /** Ease from the cursor's current point so a moving target does not make it jump. */
  function approach(ms: number) {
    if (!cursor) {
      cursor = { x: to.x, y: Math.max(8, to.y - 56) };
    }
    if (reducedMotion) {
      cursor = { x: to.x, y: to.y };
      return;
    }
    const rate = 1 - Math.exp(-Math.max(0, ms) / 170);
    cursor = {
      x: cursor.x + (to.x - cursor.x) * rate,
      y: cursor.y + (to.y - cursor.y) * rate,
    };
  }

  function distanceToTarget() {
    if (!cursor) return Number.POSITIVE_INFINITY;
    return Math.hypot(cursor.x - to.x, cursor.y - to.y);
  }

  function tick(dt: number, find: FindTarget): WalkthroughFrame {
    if (status !== "playing") return frame();
    let budget = Math.max(0, dt) * speed;
    let guard = 0;
    while (budget > 0 && status === "playing" && guard < 40) {
      guard += 1;
      const step = steps[stepIndex];
      if (!step) {
        finish();
        break;
      }
      if (phase === "seek") {
        const target = safeFind(find, step.targetTestId);
        if (target) {
          arm(target);
          continue;
        }
        const room = SEEK_LIMIT_MS - seekElapsed;
        const used = Math.min(budget, Math.max(0, room));
        seekElapsed += used;
        budget -= used;
        if (seekElapsed >= SEEK_LIMIT_MS) markSkip(step);
        continue;
      }
      if (phase === "skip") {
        const room = SKIP_HOLD_MS - skipElapsed;
        const used = Math.min(budget, Math.max(0, room));
        skipElapsed += used;
        budget -= used;
        caption = SKIP_CAPTION;
        if (skipElapsed >= SKIP_HOLD_MS) advance();
        continue;
      }
      if (actElapsed >= step.durationMs) {
        advance();
        continue;
      }
      const limit = glideLimit(step);
      const room = step.durationMs - actElapsed;
      const used = Math.min(budget, Math.max(0, room));
      if (used <= 0) break;
      const nextElapsed = actElapsed + used;
      const main = safeFind(find, step.targetTestId);
      if (!clickedMain && step.action === "click" && nextElapsed >= limit && main) {
        safeClick(main);
        clickedMain = true;
        rippleSerial += 1;
        rippleUntil = nextElapsed + (reducedMotion ? RIPPLE_REDUCED_MS : RIPPLE_MS);
      }
      if (step.action !== "click") clickedMain = true;
      let pending: { index: number; follow: WalkthroughFollowUp; found: WalkthroughTarget; readyAt: number } | null = null;
      let waitingForFollow = false;
      if (clickedMain) {
        for (const [index, follow] of (step.followUps ?? []).entries()) {
          if (followDone.has(index)) continue;
          const readyAt = Math.max(follow.atMs, limit);
          if (nextElapsed < readyAt) continue;
          const found = safeFind(find, follow.targetTestId);
          if (!found) {
            waitingForFollow = true;
            continue;
          }
          pending = { index, follow, found, readyAt };
          stickId = follow.targetTestId;
          break;
        }
      }
      const focus = stickId ? safeFind(find, stickId) : main;
      if (focus) {
        to = center(focus);
        ring = { left: focus.left, top: focus.top, width: focus.width, height: focus.height };
      }
      if (waitingForFollow && !stickId) ring = null;
      approach(used);
      if (pending) {
        const since = nextElapsed - pending.readyAt;
        const arrived = distanceToTarget() < 18 || since >= 520 || reducedMotion;
        if (arrived) {
          followDone.add(pending.index);
          if (pending.follow.action === "click") {
            safeClick(pending.found);
            rippleSerial += 1;
            rippleUntil = nextElapsed + (reducedMotion ? RIPPLE_REDUCED_MS : RIPPLE_MS);
          }
        }
      }
      if (step.action === "click" && !clickedMain && nextElapsed >= step.durationMs) {
        budget -= used;
        markSkip(step);
        continue;
      }
      actElapsed = nextElapsed;
      budget -= used;
      ripple = actElapsed < rippleUntil;
      if (actElapsed >= step.durationMs) advance();
    }
    return frame();
  }

  return {
    tick,
    frame,
    start() {
      if (status === "done") {
        this.reset();
        return;
      }
      status = "playing";
    },
    pause() {
      if (status === "playing") status = "paused";
    },
    stop() {
      if (status === "done") return;
      status = "stopped";
      ripple = false;
    },
    reset() {
      stepIndex = 0;
      skippedIds = [];
      cursor = null;
      ring = null;
      ripple = false;
      status = "playing";
      beginStep();
      options?.onReset?.();
    },
    skip() {
      if (status === "done") return;
      advance();
    },
    setSpeed(next: WalkthroughSpeed) {
      speed = next;
    },
    setReducedMotion(next: boolean) {
      reducedMotion = next;
    },
  };
}
