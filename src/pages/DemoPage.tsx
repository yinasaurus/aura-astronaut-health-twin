import { useCallback, useEffect, useRef, useState } from "react";
import { crewById } from "../data/crew";
import { assessDay } from "../engine/assess";
import { buildSeries } from "../engine/simulate";
import { MissionView } from "../components/MissionView";
import { useMission } from "../store/mission";

export function DemoPage() {
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
      }, 11000),
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
      }, 17000),
      window.setTimeout(() => {
        useMission.getState().setCommDelay(true);
        setStep(4);
      }, 22000),
      window.setTimeout(() => {
        const state = useMission.getState();
        state.setCommDelay(false);
        state.setPacketOpen(true);
        setStep(5);
      }, 27000),
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
