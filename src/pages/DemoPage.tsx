import { useCallback, useEffect, useRef, useState } from "react";
import { crewById } from "../data/crew";
import { assessDay } from "../engine/assess";
import { buildSeries } from "../engine/simulate";
import { MissionView } from "../components/MissionView";
import { WalkthroughOverlay } from "../components/WalkthroughOverlay";
import { useMission } from "../store/mission";

type DemoMode = "guided" | "classic";

export function DemoPage() {
  const [mode, setMode] = useState<DemoMode>("guided");
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Demo mode">
        <button
          type="button"
          className={`walkthrough-control rounded-md border px-3 py-2 text-sm ${mode === "guided" ? "border-[#8ef6ff]" : "border-[#245066]"}`}
          aria-pressed={mode === "guided"}
          data-testid="demo-mode-guided"
          onClick={() => setMode("guided")}
        >
          Guided walkthrough
        </button>
        <button
          type="button"
          className={`walkthrough-control rounded-md border px-3 py-2 text-sm ${mode === "classic" ? "border-[#8ef6ff]" : "border-[#245066]"}`}
          aria-pressed={mode === "classic"}
          data-testid="demo-mode-classic"
          onClick={() => setMode("classic")}
        >
          Classic demo
        </button>
      </div>
      {mode === "guided" ? <GuidedDemo /> : <ClassicDemo />}
    </div>
  );
}

function GuidedDemo() {
  const [note, setNote] = useState<string | undefined>();
  const onEndCaption = useCallback((caption: string | undefined) => setNote(caption), []);
  return (
    <>
      <MissionView guided demoNote={note} />
      <WalkthroughOverlay onEndCaption={onEndCaption} />
    </>
  );
}

function ClassicDemo() {
  const [step, setStep] = useState(0);
  const timers = useRef<number[]>([]);

  const run = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    useMission.getState().resetStory();
    setStep(0);
    timers.current = [
      window.setTimeout(() => {
        useMission.getState().inject("solarParticle");
        setStep(1);
      }, 5000),
      window.setTimeout(() => {
        useMission.getState().setDay(64);
        setStep(2);
      }, 10000),
      window.setTimeout(() => {
        const state = useMission.getState();
        const series = buildSeries({
          seed: crewById(state.crewId).seed,
          events: state.events[state.crewId],
          imported: state.imports[state.crewId] ?? null,
        });
        const flagged = assessDay(series, 64, state.context).systems.find((system) => system.level !== "green");
        if (flagged) state.setSystem(flagged.system);
        setStep(3);
      }, 15000),
      window.setTimeout(() => {
        useMission.getState().setCommDelay(true);
        setStep(4);
      }, 20000),
      window.setTimeout(() => {
        const state = useMission.getState();
        state.setCommDelay(false);
        state.setPacketOpen(true);
        setStep(5);
      }, 24000),
      window.setTimeout(() => {
        setStep(6);
      }, 31000),
    ];
  }, []);

  useEffect(() => {
    run();
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "r") return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      event.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("keydown", onKey);
    };
  }, [run]);

  return <MissionView demoStep={step} />;
}
