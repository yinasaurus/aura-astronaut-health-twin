import { useMemo } from "react";
import { crewById } from "../data/crew";
import { assessDay } from "../engine/assess";
import { buildSeries } from "../engine/simulate";
import { useMission } from "./mission";

export function useCrewSeries() {
  const crewId = useMission((state) => state.crewId);
  const events = useMission((state) => state.events[crewId]);
  const imported = useMission((state) => state.imports[crewId]);
  const seed = crewById(crewId).seed;
  return useMemo(
    () => buildSeries({ seed, events, imported: imported ?? null }),
    [seed, events, imported],
  );
}

export function useAssessment() {
  const series = useCrewSeries();
  const day = useMission((state) => state.day);
  const context = useMission((state) => state.context);
  return useMemo(() => ({ series, ...assessDay(series, day, context) }), [series, day, context]);
}
