import { useEffect, useRef, useState } from "react";
import {
  createWalkthroughRunner,
  WALKTHROUGH_END_CAPTION,
  WALKTHROUGH_SPEEDS,
  WALKTHROUGH_STEPS,
  type WalkthroughFrame,
  type WalkthroughTarget,
} from "../demo/walkthrough";
import { useMission } from "../store/mission";

const CAPTION_CLEARANCE = 196;
let revealFrame = 0;

function fitDelta(top: number, bottom: number, limitTop: number, limitBottom: number) {
  if (top < limitTop) return top - limitTop;
  if (bottom > limitBottom) return bottom - limitBottom;
  return 0;
}

function revealTarget(element: HTMLElement, immediate: boolean) {
  window.cancelAnimationFrame(revealFrame);
  const start = element.getBoundingClientRect();
  const moves: { node: HTMLElement; from: number; to: number }[] = [];
  let shift = 0;
  let parent = element.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    const canScroll = /(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight + 2;
    if (canScroll && parent.tagName !== "TEXTAREA") {
      const parentBox = parent.getBoundingClientRect();
      const delta = fitDelta(start.top + shift, start.bottom + shift, parentBox.top + 12, parentBox.bottom - 12);
      if (Math.abs(delta) > 1) {
        moves.push({ node: parent, from: parent.scrollTop, to: parent.scrollTop + delta });
        shift -= delta;
      }
    }
    parent = parent.parentElement;
  }
  const page = document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null;
  const pageDelta = fitDelta(start.top + shift, start.bottom + shift, 12, window.innerHeight - CAPTION_CLEARANCE);
  if (page && Math.abs(pageDelta) > 1) moves.push({ node: page, from: page.scrollTop, to: page.scrollTop + pageDelta });
  if (moves.length === 0) return;
  const distance = Math.max(...moves.map((move) => Math.abs(move.to - move.from)));
  const apply = (amount: number) => {
    for (const move of moves) move.node.scrollTop = move.from + (move.to - move.from) * amount;
  };
  if (immediate || distance < 28) {
    apply(1);
    return;
  }
  const duration = Math.min(420, Math.max(220, 160 + distance * 0.22));
  const started = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - started) / duration);
    apply(1 - (1 - t) ** 3);
    if (t < 1) revealFrame = window.requestAnimationFrame(step);
  };
  revealFrame = window.requestAnimationFrame(step);
}

function resetGuidedStory() {
  const state = useMission.getState();
  state.resetStory();
  state.setGhost(false);
}

export function WalkthroughOverlay({ onEndCaption }: { onEndCaption: (caption: string | undefined) => void }) {
  const runnerRef = useRef<ReturnType<typeof createWalkthroughRunner> | null>(null);
  if (!runnerRef.current) {
    runnerRef.current = createWalkthroughRunner({
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      onReset: resetGuidedStory,
    });
  }
  const runner = runnerRef.current;
  const [frame, setFrame] = useState<WalkthroughFrame>(() => runner.frame());
  const seenTarget = useRef("");
  const endNote = useRef<string | undefined>(undefined);
  const onEndRef = useRef(onEndCaption);
  const cursorRef = useRef<SVGSVGElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const published = useRef("");
  const [ripple, setRipple] = useState<{ serial: number; x: number; y: number } | null>(null);
  onEndRef.current = onEndCaption;

  useEffect(() => {
    const runner = runnerRef.current;
    if (!runner) return;
    const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const readTarget = (testId: string): WalkthroughTarget | null => {
      try {
        const element = document.querySelector(`[data-testid="${CSS.escape(testId)}"]`);
        if (!(element instanceof HTMLElement)) return null;
        if (seenTarget.current !== testId) {
          const style = getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return null;
          seenTarget.current = testId;
          revealTarget(element, reduced());
        }
        const box = element.getBoundingClientRect();
        if (box.width <= 0 || box.height <= 0) return null;
        return {
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          click: () => element.click(),
        };
      } catch {
        return null;
      }
    };
    const publish = (next: WalkthroughFrame) => {
      const cursorEl = cursorRef.current;
      if (cursorEl) {
        if (next.cursor) {
          cursorEl.style.display = "block";
          cursorEl.style.transform = `translate3d(${next.cursor.x}px, ${next.cursor.y}px, 0)`;
        } else {
          cursorEl.style.display = "none";
        }
      }
      const ringEl = ringRef.current;
      if (ringEl) {
        if (next.ring) {
          ringEl.style.display = "block";
          ringEl.style.width = `${next.ring.width + 8}px`;
          ringEl.style.height = `${next.ring.height + 8}px`;
          ringEl.style.transform = `translate3d(${next.ring.left - 4}px, ${next.ring.top - 4}px, 0)`;
        } else {
          ringEl.style.display = "none";
        }
      }
      const key = `${next.status}|${next.stepIndex}|${next.caption}|${next.speed}|${next.skippedIds.join(",")}|${next.rippleSerial}`;
      if (published.current === key) return;
      published.current = key;
      setFrame(next);
      if (next.ripple && next.cursor) setRipple({ serial: next.rippleSerial, x: next.cursor.x, y: next.cursor.y });
      const note = next.caption === WALKTHROUGH_END_CAPTION ? WALKTHROUGH_END_CAPTION : undefined;
      if (endNote.current !== note) {
        endNote.current = note;
        onEndRef.current(note);
      }
    };
    resetGuidedStory();
    seenTarget.current = "";
    runner.setReducedMotion(reduced());
    runner.start();
    publish(runner.frame());
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(34, Math.max(0, now - last));
      last = now;
      publish(runner.tick(dt, readTarget));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onKey = (event: KeyboardEvent) => {
      const tag = event.target instanceof HTMLElement ? event.target.tagName : "";
      const field = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (event.key === " " || event.code === "Space") {
        if (field || tag === "BUTTON" || tag === "A") return;
        event.preventDefault();
        event.stopPropagation();
        const status = runner.frame().status;
        if (status === "playing") runner.pause();
        else runner.start();
        publish(runner.frame());
        return;
      }
      if (event.key === "Escape") {
        const status = runner.frame().status;
        if (status === "playing" || status === "paused") {
          event.preventDefault();
          event.stopImmediatePropagation();
          runner.stop();
          publish(runner.frame());
        }
        return;
      }
      if (event.key.toLowerCase() === "r") {
        if (field) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        seenTarget.current = "";
        runner.reset();
        publish(runner.frame());
      }
    };
    window.addEventListener("keydown", onKey, true);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => runner.setReducedMotion(media.matches);
    media.addEventListener("change", onMotion);
    return () => {
      cancelAnimationFrame(raf);
      window.cancelAnimationFrame(revealFrame);
      window.removeEventListener("keydown", onKey, true);
      media.removeEventListener("change", onMotion);
      runner.stop();
      if (endNote.current) {
        endNote.current = undefined;
        onEndRef.current(undefined);
      }
    };
  }, []);

  const current = frame.status === "done" ? frame.stepCount : Math.min(frame.stepCount, frame.stepIndex + 1);
  const playing = frame.status === "playing";
  const docked = frame.status === "done" || frame.status === "stopped";

  return (
    <>
      <div ref={ringRef} aria-hidden="true" className="walkthrough-ring" />
      {ripple && (
        <span key={ripple.serial} aria-hidden="true" className="walkthrough-ripple" style={{ left: ripple.x, top: ripple.y }} />
      )}
      <svg ref={cursorRef} aria-hidden="true" className="walkthrough-cursor" viewBox="0 0 24 24" width="28" height="28">
        <path d="M2 1 L2 18 L7.2 13.4 L11.2 21 L14.4 19.6 L10.2 12 L17.2 12 Z" fill="#f4fbff" stroke="#04202a" strokeWidth="1.2" />
      </svg>
      <div className={docked ? "relative mt-4 rounded-md border border-[#245066] bg-[#07111c] p-3" : "pointer-events-none fixed inset-x-0 bottom-0 z-[42] border-t border-[#245066] bg-[#07111c] p-3"}>
        <div className="pointer-events-none mx-auto max-w-6xl rounded-md border border-[#8ef6ff] bg-[#07111c] px-4 py-2" aria-live="polite" aria-atomic="true">
          <p className="font-mono text-xs tracking-[0.14em] text-[#9ad7ea]">STEP {current} OF {frame.stepCount}</p>
          <p className="mt-1 text-sm leading-5" data-testid="walkthrough-caption">
            {frame.caption}
          </p>
          <div className="mt-2 h-1 bg-[#123246]" aria-hidden="true">
            <div className="h-full bg-[#8ef6ff]" style={{ width: `${frame.stepCount === 0 ? 0 : (current / frame.stepCount) * 100}%` }} />
          </div>
        </div>
        <div className="pointer-events-auto mx-auto mt-2 flex max-w-6xl flex-wrap items-center gap-2 rounded-md border border-[#245066] bg-[#07111c] p-2">
          <button type="button" className="walkthrough-control rounded-md bg-[#8ef6ff] px-3 py-2 text-sm font-semibold text-[#04202a]" data-testid="walkthrough-play" onClick={() => {
            const runner = runnerRef.current;
            if (!runner) return;
            if (runner.frame().status === "playing") runner.pause();
            else runner.start();
            setFrame(runner.frame());
          }}>
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" className="walkthrough-control rounded-md border border-[#245066] px-3 py-2 text-sm" data-testid="walkthrough-restart" onClick={() => {
            seenTarget.current = "";
            runnerRef.current?.reset();
            if (runnerRef.current) setFrame(runnerRef.current.frame());
          }}>
            Restart
          </button>
          <button type="button" className="walkthrough-control rounded-md border border-[#245066] px-3 py-2 text-sm disabled:opacity-40" data-testid="walkthrough-skip" disabled={frame.status === "done"} onClick={() => {
            runnerRef.current?.skip();
            if (runnerRef.current) setFrame(runnerRef.current.frame());
          }}>
            Skip step
          </button>
          <div className="flex gap-2" role="group" aria-label="Walkthrough speed">
            {WALKTHROUGH_SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                className={`walkthrough-control rounded-md border px-3 py-2 text-sm ${frame.speed === speed ? "border-[#8ef6ff]" : "border-[#245066]"}`}
                aria-pressed={frame.speed === speed}
                data-testid={`walkthrough-speed-${String(speed).replace(".", "-")}`}
                onClick={() => {
                  runnerRef.current?.setSpeed(speed);
                  if (runnerRef.current) setFrame(runnerRef.current.frame());
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
          <p className="text-xs text-[#d5e7f4]">Space play or pause · R restart · Esc stop</p>
        </div>
      </div>
      <section className={docked ? "mt-4" : "mt-4 pb-40"} aria-label="Walkthrough transcript" data-testid="walkthrough-transcript">
        <h2 className="font-mono text-xs tracking-[0.16em] text-[#9ad7ea]">TRANSCRIPT</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6">
          {WALKTHROUGH_STEPS.map((step, index) => {
            const skipped = frame.skippedIds.includes(step.id);
            const active = frame.status !== "done" && index === frame.stepIndex;
            return (
              <li key={step.id} aria-current={active ? "step" : undefined} className={active ? "text-[#8ef6ff]" : "text-[#d5e7f4]"}>
                {step.caption}
                {skipped ? " (skipped)" : ""}
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
