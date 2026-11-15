import { assumption } from "../data/assumptions";
import { INDICATORS, SYSTEMS, type DayRecord, type EventType, type IndicatorId } from "../data/types";
import { dailyRadiation, indicatorStats } from "./baseline";
import { dayConfirmed, scoreSystems } from "./compound";
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

export interface SweepScore {
  persistDays: number;
  medianLeadDays: number | null;
  detected: number;
  events: number;
  falseAlarms: number;
  falseAlarmsPer100: number;
  crewDays: number;
  chosen: boolean;
}

export interface ValidationReport {
  crews: number;
  crewDays: number;
  methods: MethodScore[];
  sweep: SweepScore[];
  definition: string;
  selectionRule: string;
}

export const PERSISTENCE_SELECTION_RULE =
  "The default persistence length is the swept value with the fewest false alarms per detected event, among values whose median lead time is still greater than zero. If none still lead, the lowest false-alarm cost is kept. A tie keeps the shorter persistence. The amber cutoff is not part of this sweep.";

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

export function persistenceCandidates(): number[] {
  return [1, 2, 3, 4, 5].map((index) => assumption(`sweep.persistDays.${index}`));
}

export function falseAlarmsPerDetection(row: Pick<SweepScore, "falseAlarms" | "detected">): number {
  if (row.detected <= 0) return Number.POSITIVE_INFINITY;
  return row.falseAlarms / row.detected;
}

export function pickPersistence(rows: SweepScore[]): SweepScore {
  const leading = rows.filter((row) => (row.medianLeadDays ?? 0) > 0);
  const pool = leading.length > 0 ? leading : rows;
  return pool.reduce((best, row) => {
    const cost = falseAlarmsPerDetection(row);
    const bestCost = falseAlarmsPerDetection(best);
    if (cost < bestCost) return row;
    if (cost === bestCost && row.persistDays < best.persistDays) return row;
    return best;
  });
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

interface Tally {
  leads: number[];
  falseAlarms: number;
}

function emptyTally(): Tally {
  return { leads: [], falseAlarms: 0 };
}

function finishSweep(tally: Tally, persistDays: number, events: number, crewDays: number, chosen: boolean): SweepScore {
  return {
    persistDays,
    medianLeadDays: median(tally.leads),
    detected: tally.leads.length,
    events,
    falseAlarms: tally.falseAlarms,
    falseAlarmsPer100: ratePer100(tally.falseAlarms, crewDays),
    crewDays,
    chosen,
  };
}

const EVENT_TYPES: EventType[] = ["solarParticle", "sleepDisruption", "isolationMood"];

export function evaluateMethods(): ValidationReport {
  const crews = assumption("validation.crews");
  const missionDays = assumption("mission.days");
  const baselineDays = assumption("baseline.days");
  const earliest = assumption("validation.eventEarliest");
  const latest = assumption("validation.eventLatest");
  const singleZ = assumption("score.singleIndicatorZ");
  const candidates = persistenceCandidates();
  const crewDaysEach = missionDays - baselineDays + 1;
  const population = emptyTally();
  const personalZ = emptyTally();
  const compound = new Map<number, Tally>(candidates.map((days) => [days, emptyTally()]));
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
    const first = { population: null as number | null, personalZ: null as number | null };
    const compoundFirst = new Map<number, number | null>(candidates.map((days) => [days, null]));
    const streak = SYSTEMS.map(() => 0);

    for (let day = baselineDays; day <= missionDays; day += 1) {
      const inWindow = day >= start && day <= peak;
      const stats = indicatorStats(series, day);
      const systems = scoreSystems(stats, "mars", day);
      const note = (bucket: Tally, flagged: boolean, seen: number | null): number | null => {
        if (!flagged) return seen;
        if (inWindow) return seen === null ? day : seen;
        bucket.falseAlarms += 1;
        return seen;
      };
      first.population = note(population, populationFlag(series, day, dailyDose), first.population);
      first.personalZ = note(
        personalZ,
        stats.some((stat) => stat.adverseZ >= singleZ),
        first.personalZ,
      );
      const held = candidates.map(() => false);
      systems.forEach((system, index) => {
        streak[index] = dayConfirmed(system, stats) ? streak[index] + 1 : 0;
        candidates.forEach((days, candidateIndex) => {
          if (streak[index] >= days) held[candidateIndex] = true;
        });
      });
      candidates.forEach((days, candidateIndex) => {
        const tally = compound.get(days);
        if (!tally) return;
        const seen = note(tally, held[candidateIndex], compoundFirst.get(days) ?? null);
        compoundFirst.set(days, seen);
      });
    }

    if (first.population !== null) population.leads.push(peak - first.population);
    if (first.personalZ !== null) personalZ.leads.push(peak - first.personalZ);
    candidates.forEach((days) => {
      const seen = compoundFirst.get(days);
      const tally = compound.get(days);
      if (seen != null && tally) tally.leads.push(peak - seen);
    });
  }

  const totalCrewDays = crews * crewDaysEach;
  const preliminary = candidates.map((days) => finishSweep(compound.get(days) ?? emptyTally(), days, events, totalCrewDays, false));
  const picked = pickPersistence(preliminary);
  const sweep = preliminary.map((row) => ({ ...row, chosen: row.persistDays === picked.persistDays }));
  const compoundScore = sweep.find((row) => row.chosen) ?? picked;

  const method = (
    id: MethodScore["id"],
    label: string,
    tally: Tally,
  ): MethodScore => ({
    id,
    label,
    medianLeadDays: median(tally.leads),
    detected: tally.leads.length,
    events,
    falseAlarms: tally.falseAlarms,
    falseAlarmsPer100: ratePer100(tally.falseAlarms, totalCrewDays),
    crewDays: totalCrewDays,
  });

  return {
    crews,
    crewDays: totalCrewDays,
    methods: [
      method("population", "Fixed bands", population),
      method("personalZ", "Personal z-score", personalZ),
      {
        id: "compound",
        label: "AURA compound",
        medianLeadDays: compoundScore.medianLeadDays,
        detected: compoundScore.detected,
        events,
        falseAlarms: compoundScore.falseAlarms,
        falseAlarmsPer100: compoundScore.falseAlarmsPer100,
        crewDays: totalCrewDays,
      },
    ],
    sweep,
    selectionRule: PERSISTENCE_SELECTION_RULE,
    definition:
      "Lead time is the injected event's last day minus the first flagged day inside that event. Days outside an injected event count as false alarms, including slow hazard drift. Fixed bands compare each day with a reference-style range stored as an assumption; any indicator outside its range flags the day. Radiation uses the daily dose rate, not the running total. Personal z flags when any adverse z reaches the stored single-indicator cutoff. The compound rule flags when one body system has stayed confirmed for the selected number of days. Confirmation means the score is in the amber or red band and at least two mild signals are trending the adverse way. These cutoffs are assumptions, not clinical limits.",
  };
}
