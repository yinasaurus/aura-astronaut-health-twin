import { assumption } from "../data/assumptions";
import { INDICATORS, type DayRecord, type EventType, type IndicatorId } from "../data/types";
import { assessDay } from "./assess";
import { dailyRadiation } from "./baseline";
import { mulberry32 } from "./rng";
import { applyEvents, generateBaseSeries } from "./simulate";

export interface MethodScore {
  id: "population" | "personalZ" | "compound";
  label: string;
  medianLeadDays: number | null;
  detected: number;
  events: number;
  falseAlarms: number;
  falseAlarmsPer100: number;
  crewDays: number;
}

export interface ValidationReport {
  crews: number;
  crewDays: number;
  methods: MethodScore[];
  definition: string;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

export function ratePer100(count: number, days: number): number {
  if (days <= 0) return 0;
  return (count / days) * 100;
}

function outsideBand(id: IndicatorId, value: number): boolean {
  return value < assumption(`population.${id}.low`) || value > assumption(`population.${id}.high`);
}

function populationFlag(series: DayRecord[], day: number, dailyDose: number[]): boolean {
  const index = day - 1;
  const row = series[index];
  if (!row) return false;
  return INDICATORS.some((id) => {
    const value = id === "radiationDose" ? dailyDose[index] : row.values[id];
    return outsideBand(id, value);
  });
}

const EVENT_TYPES: EventType[] = ["solarParticle", "sleepDisruption", "isolationMood"];

export function evaluateMethods(): ValidationReport {
  const crews = assumption("validation.crews");
  const missionDays = assumption("mission.days");
  const baselineDays = assumption("baseline.days");
  const earliest = assumption("validation.eventEarliest");
  const latest = assumption("validation.eventLatest");
  const singleZ = assumption("score.singleIndicatorZ");
  const crewDaysEach = missionDays - baselineDays + 1;
  const leads: Record<MethodScore["id"], number[]> = { population: [], personalZ: [], compound: [] };
  const falseAlarms: Record<MethodScore["id"], number> = { population: 0, personalZ: 0, compound: 0 };
  let events = 0;

  for (let crew = 0; crew < crews; crew += 1) {
    const rng = mulberry32(9000 + crew * 17);
    const start = earliest + Math.floor(rng() * (latest - earliest + 1));
    const type = EVENT_TYPES[crew % EVENT_TYPES.length];
    const duration = assumption(`event.${type}.duration`);
    const peak = Math.min(missionDays, start + duration - 1);
    const series = applyEvents(generateBaseSeries(7100 + crew), [
      { id: `eval-${crew}`, type, startDay: start },
    ]);
    const dailyDose = dailyRadiation(series);
    events += 1;
    const first: Record<MethodScore["id"], number | null> = {
      population: null,
      personalZ: null,
      compound: null,
    };

    for (let day = baselineDays; day <= missionDays; day += 1) {
      const inWindow = day >= start && day <= peak;
      const assessment = assessDay(series, day, "mars");
      const flags = {
        population: populationFlag(series, day, dailyDose),
        personalZ: assessment.stats.some((stat) => stat.adverseZ >= singleZ),
        compound: assessment.systems.some((system) => system.level === "amber" || system.level === "red"),
      };
      (Object.keys(flags) as MethodScore["id"][]).forEach((method) => {
        if (!flags[method]) return;
        if (inWindow) {
          if (first[method] === null) first[method] = day;
        } else {
          falseAlarms[method] += 1;
        }
      });
    }

    (Object.keys(first) as MethodScore["id"][]).forEach((method) => {
      const detected = first[method];
      if (detected !== null) leads[method].push(peak - detected);
    });
  }

  const totalCrewDays = crews * crewDaysEach;
  const methods: MethodScore[] = [
    {
      id: "population",
      label: "Fixed bands",
      medianLeadDays: median(leads.population),
      detected: leads.population.length,
      events,
      falseAlarms: falseAlarms.population,
      falseAlarmsPer100: ratePer100(falseAlarms.population, totalCrewDays),
      crewDays: totalCrewDays,
    },
    {
      id: "personalZ",
      label: "Personal z-score",
      medianLeadDays: median(leads.personalZ),
      detected: leads.personalZ.length,
      events,
      falseAlarms: falseAlarms.personalZ,
      falseAlarmsPer100: ratePer100(falseAlarms.personalZ, totalCrewDays),
      crewDays: totalCrewDays,
    },
    {
      id: "compound",
      label: "AURA compound",
      medianLeadDays: median(leads.compound),
      detected: leads.compound.length,
      events,
      falseAlarms: falseAlarms.compound,
      falseAlarmsPer100: ratePer100(falseAlarms.compound, totalCrewDays),
      crewDays: totalCrewDays,
    },
  ];

  return {
    crews,
    crewDays: totalCrewDays,
    methods,
    definition:
      "Lead time is the injected event's last day minus the first flagged day inside that event. Days outside an injected event count as false alarms, including slow hazard drift. The fixed bands and the z cutoff are assumptions, not clinical limits.",
  };
}
