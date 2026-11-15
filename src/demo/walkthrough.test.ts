import { describe, expect, it } from "vitest";
import {
  createWalkthroughRunner,
  plannedClicks,
  SEEK_LIMIT_MS,
  SKIP_CAPTION,
  SKIP_HOLD_MS,
  WALKTHROUGH_END_CAPTION,
  WALKTHROUGH_STEPS,
  type WalkthroughStep,
  type WalkthroughTarget,
} from "./walkthrough";

function hit(id: string, clicks: string[], box?: Partial<WalkthroughTarget>): WalkthroughTarget {
  return {
    left: box?.left ?? 10,
    top: box?.top ?? 20,
    width: box?.width ?? 40,
    height: box?.height ?? 20,
    click: () => clicks.push(id),
  };
}

function present(ids: string[], clicks: string[]) {
  const known = new Set(ids);
  return (testId: string) => (known.has(testId) ? hit(testId, clicks) : null);
}

describe("walkthrough runner", () => {
  it("keeps the story steps in order and about 30 seconds", () => {
    expect(WALKTHROUGH_STEPS.map((step) => step.id)).toEqual([
      "body",
      "heart",
      "inject",
      "advance",
      "reasons",
      "delay",
      "packet",
      "end",
    ]);
    expect(WALKTHROUGH_STEPS[WALKTHROUGH_STEPS.length - 1]?.caption).toBe(WALKTHROUGH_END_CAPTION);
    expect(plannedClicks(WALKTHROUGH_STEPS)).toEqual([
      "system-cardiovascular",
      "ghost-toggle",
      "inject-solar-particle",
      "advance-day",
      "flagged-system",
      "delay-toggle",
      "delay-toggle",
      "packet-button",
    ]);
    const total = WALKTHROUGH_STEPS.reduce((sum, step) => sum + step.durationMs, 0);
    expect(total).toBeGreaterThanOrEqual(28000);
    expect(total).toBeLessThanOrEqual(32000);
  });

  it("clicks targets in script order", () => {
    const clicks: string[] = [];
    const ids = WALKTHROUGH_STEPS.flatMap((step) => [step.targetTestId, ...(step.followUps ?? []).map((follow) => follow.targetTestId)]);
    const runner = createWalkthroughRunner({ reducedMotion: true });
    runner.setSpeed(1);
    runner.start();
    const find = present(ids, clicks);
    for (let i = 0; i < 80; i += 1) runner.tick(500, find);
    expect(clicks).toEqual(plannedClicks(WALKTHROUGH_STEPS));
    expect(runner.frame().status).toBe("done");
    expect(runner.frame().caption).toBe(WALKTHROUGH_END_CAPTION);
    expect(runner.frame().skippedIds).toEqual([]);
  });

  it("skips a missing target, says so, and continues", () => {
    const clicks: string[] = [];
    const steps: WalkthroughStep[] = [
      { id: "gone", caption: "Missing step", targetTestId: "gone", action: "click", durationMs: 800 },
      { id: "here", caption: "Present step", targetTestId: "here", action: "click", durationMs: 800 },
    ];
    const runner = createWalkthroughRunner({ steps, reducedMotion: true });
    runner.setSpeed(1);
    runner.start();
    const find = (testId: string) => {
      if (testId === "gone") throw new Error("target lookup failed");
      return testId === "here" ? hit(testId, clicks) : null;
    };
    const skipped = runner.tick(SEEK_LIMIT_MS, find);
    expect(skipped.caption).toBe(SKIP_CAPTION);
    expect(skipped.skippedIds).toEqual(["gone"]);
    expect(clicks).toEqual([]);
    const done = runner.tick(SKIP_HOLD_MS + 2000, find);
    expect(clicks).toEqual(["here"]);
    expect(done.status).toBe("done");
    expect(done.skippedIds).toEqual(["gone"]);
  });

  it("continues when a follow-up target is missing", () => {
    const clicks: string[] = [];
    const steps: WalkthroughStep[] = [
      {
        id: "main",
        caption: "Main",
        targetTestId: "main",
        action: "click",
        durationMs: 1000,
        followUps: [{ targetTestId: "missing-follow", action: "click", atMs: 200 }],
      },
      { id: "after", caption: "After", targetTestId: "after", action: "click", durationMs: 400 },
    ];
    const runner = createWalkthroughRunner({ steps, reducedMotion: true });
    runner.setSpeed(1);
    runner.start();
    const find = present(["main", "after"], clicks);
    for (let i = 0; i < 20; i += 1) runner.tick(200, find);
    expect(clicks).toEqual(["main", "after"]);
    expect(runner.frame().status).toBe("done");
    expect(runner.frame().skippedIds).toEqual([]);
  });

  it("glides toward a target without jumping past it", () => {
    const steps: WalkthroughStep[] = [{ id: "move", caption: "Move", targetTestId: "move", action: "move", durationMs: 2000 }];
    const runner = createWalkthroughRunner({ steps, reducedMotion: false });
    runner.setSpeed(1);
    runner.start();
    const target = { left: 400, top: 300, width: 40, height: 20, click: () => undefined };
    let previous = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 30; i += 1) {
      const cursor = runner.tick(16, () => target).cursor;
      expect(cursor).toBeTruthy();
      const remaining = Math.hypot((cursor?.x ?? 0) - 420, (cursor?.y ?? 0) - 310);
      expect(remaining).toBeLessThanOrEqual(previous + 0.01);
      previous = remaining;
    }
    expect(previous).toBeLessThan(40);
  });

  it("reset returns to the first step and asks the story to reset", () => {
    const clicks: string[] = [];
    let resets = 0;
    const steps: WalkthroughStep[] = [
      { id: "one", caption: "One", targetTestId: "one", action: "click", durationMs: 400 },
      { id: "two", caption: "Two", targetTestId: "two", action: "click", durationMs: 400 },
    ];
    const runner = createWalkthroughRunner({
      steps,
      reducedMotion: true,
      onReset: () => {
        resets += 1;
      },
    });
    runner.setSpeed(1);
    runner.start();
    runner.tick(1000, present(["one", "two"], clicks));
    expect(runner.frame().stepIndex).toBeGreaterThan(0);
    runner.reset();
    expect(resets).toBe(1);
    const fresh = runner.frame();
    expect(fresh.stepIndex).toBe(0);
    expect(fresh.status).toBe("playing");
    expect(fresh.skippedIds).toEqual([]);
    expect(fresh.caption).toBe("One");
    const again: string[] = [];
    for (let i = 0; i < 20; i += 1) runner.tick(200, present(["one", "two"], again));
    expect(again).toEqual(["one", "two"]);
    expect(runner.frame().status).toBe("done");
  });

  it("starts at half speed and keeps the packet ring on the title", () => {
    const steps: WalkthroughStep[] = [
      {
        id: "packet",
        caption: "The flight surgeon packet is open.",
        targetTestId: "packet-button",
        action: "click",
        durationMs: 2000,
        followUps: [{ targetTestId: "packet-header", action: "move", atMs: 0 }],
      },
    ];
    const runner = createWalkthroughRunner({ steps, reducedMotion: true });
    expect(runner.frame().speed).toBe(0.5);
    runner.setSpeed(1);
    runner.start();
    const find = (testId: string) => {
      if (testId === "packet-button") return hit(testId, [], { left: 10, top: 400, width: 120, height: 32 });
      if (testId === "packet-header") return hit(testId, [], { left: 640, top: 48, width: 280, height: 28 });
      return null;
    };
    const opened = runner.tick(80, find);
    expect(opened.ring).toMatchObject({ left: 640, top: 48, width: 280, height: 28 });
    const later = runner.tick(900, find);
    expect(later.ring).toMatchObject({ left: 640, top: 48, width: 280, height: 28 });
    expect(later.cursor).toMatchObject({ x: 780, y: 62 });
  });

  it("waits when the packet title appears after the button click", () => {
    let titleReady = false;
    const steps: WalkthroughStep[] = [
      {
        id: "packet",
        caption: "The flight surgeon packet is open.",
        targetTestId: "packet-button",
        action: "click",
        durationMs: 2000,
        followUps: [{ targetTestId: "packet-header", action: "move", atMs: 0 }],
      },
    ];
    const runner = createWalkthroughRunner({ steps, reducedMotion: true });
    runner.setSpeed(1);
    runner.start();
    const find = (testId: string) => {
      if (testId === "packet-button") return hit(testId, [], { left: 10, top: 400, width: 120, height: 32 });
      if (testId === "packet-header" && titleReady) return hit(testId, [], { left: 640, top: 48, width: 280, height: 28 });
      return null;
    };
    const early = runner.tick(80, find);
    expect(early.ring).toBeNull();
    titleReady = true;
    const moved = runner.tick(40, find);
    expect(moved.ring).toMatchObject({ left: 640, top: 48, width: 280, height: 28 });
    const held = runner.tick(700, find);
    expect(held.ring).toMatchObject({ left: 640, top: 48 });
  });
});
