import { useEffect } from "react";
import { assumption } from "../data/assumptions";
import { crewById } from "../data/crew";
import { CONTEXT_LABEL } from "../data/content";
import type { BodySystem, MissionContext, RiskLevel } from "../data/types";
import { useMission } from "../store/mission";
import { useAssessment } from "../store/selectors";
import { BodyTwin } from "./BodyTwin";
import { LearnDialog } from "./LearnDialog";
import { levelChip, worstLevel } from "./levels";
import { PacketDrawer } from "./PacketDrawer";
import { SidePanel } from "./SidePanel";
import { TimelineBar } from "./TimelineBar";

const DEMO_STEPS = [
  "Day 60. Every system is quiet.",
  "Solar particle event injected. Colour stays green while the readings start to move.",
  "Day 64. Combined drifts have turned at least one system amber. No single indicator has crossed the personal z cutoff.",
  "The open system names the exact signals behind the score.",
  "Comm delay is on. Self-care prompts are in the panel, and the flight-surgeon note is queued.",
  "Delay is off. The flight surgeon packet is open.",
  "The flight surgeon packet stays open. End of the story.",
];

const CONTEXTS: MissionContext[] = ["iss", "lunar", "mars"];

export function MissionView({ demoStep }: { demoStep?: number }) {
  const day = useMission((state) => state.day);
  const playing = useMission((state) => state.playing);
  const crewId = useMission((state) => state.crewId);
  const systemId = useMission((state) => state.system);
  const context = useMission((state) => state.context);
  const setContext = useMission((state) => state.setContext);
  const { series, stats, systems } = useAssessment();
  const selected = systems.find((system) => system.system === systemId) ?? systems[0];
  const levels = Object.fromEntries(systems.map((system) => [system.system, system.level])) as Record<BodySystem, RiskLevel>;
  const overall = levelChip(worstLevel(systems.map((system) => system.level)));
  const crew = crewById(crewId);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const state = useMission.getState();
      if (state.day >= assumption("mission.days")) {
        state.setPlaying(false);
        return;
      }
      state.setDay(state.day + 1);
    }, 450);
    return () => window.clearInterval(id);
  }, [playing]);

  return (
    <div>
      {demoStep !== undefined && (
        <div className="mb-3 h-20 overflow-hidden rounded-md border border-[#8ef6ff] px-4 py-2" aria-live="polite">
          <p className="font-mono text-xs tracking-[0.14em] text-[#9ad7ea]">
            DEMO · STEP {demoStep + 1} OF {DEMO_STEPS.length} · PRESS R TO RESET
          </p>
          <p className="mt-1 text-sm leading-5">{DEMO_STEPS[demoStep]}</p>
          <div className="mt-2 h-1 bg-[#123246]">
            <div className="h-full bg-[#8ef6ff]" style={{ width: `${((demoStep + 1) / DEMO_STEPS.length) * 100}%` }} />
          </div>
        </div>
      )}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-mono text-2xl tracking-[0.16em]">AURA</h1>
          <p className="text-sm text-[#d5e7f4]">
            {crew.name}, {crew.role}. Day {day}. Baseline from days 1–14. {CONTEXT_LABEL[context]} weights.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className={`rounded px-3 py-2 font-mono text-sm font-semibold ${overall.className}`} role="status">
            {overall.label}
          </p>
          <div className="flex gap-2" role="group" aria-label="Mission setting">
            {CONTEXTS.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={context === item}
                className={`rounded-md border px-3 py-2 text-sm ${context === item ? "border-[#8ef6ff]" : "border-[#245066]"}`}
                onClick={() => setContext(item)}
              >
                {CONTEXT_LABEL[item]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <BodyTwin levels={levels} />
        <SidePanel day={day} stats={stats} system={selected} series={series} />
      </div>
      <TimelineBar demoMode={demoStep !== undefined} />
      <PacketDrawer demoNote={demoStep === DEMO_STEPS.length - 1 ? DEMO_STEPS[demoStep] : undefined} />
      <LearnDialog />
    </div>
  );
}
