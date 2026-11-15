import { assumption } from "../data/assumptions";
import { INDICATORS, type ActiveEvent, type DayRecord, type EventType, type IndicatorId } from "../data/types";
import { gaussian, mulberry32 } from "./rng";

interface InternalDay {
  day: number;
  values: Record<IndicatorId, number>;
  events: string[];
}

const EVENT_LABEL: Record<EventType, string> = {
  solarParticle: "Solar particle event",
  sleepDisruption: "Sleep disruption",
  isolationMood: "Isolation low mood",
};

function clampIndicator(id: IndicatorId, value: number): number {
  return Math.min(assumption(`indicator.${id}.max`), Math.max(assumption(`indicator.${id}.min`), value));
}

function emptyValues(): Record<IndicatorId, number> {
  return {
    restingHr: 0,
    systolicBp: 0,
    diastolicBp: 0,
    glucose: 0,
    temperature: 0,
    sleepHours: 0,
    mood: 0,
    radiationDose: 0,
    exerciseMin: 0,
  };
}

function publish(rows: InternalDay[]): DayRecord[] {
  let cumulative = 0;
  return rows.map((row) => {
    cumulative += row.values.radiationDose;
    return {
      day: row.day,
      events: row.events,
      values: { ...row.values, radiationDose: cumulative },
    };
  });
}

function toInternal(series: DayRecord[]): InternalDay[] {
  return series.map((row, index) => {
    const previous = index === 0 ? 0 : series[index - 1].values.radiationDose;
    return {
      day: row.day,
      events: [...row.events],
      values: {
        ...row.values,
        radiationDose: row.values.radiationDose - previous,
      },
    };
  });
}

export function generateBaseSeries(seed: number): DayRecord[] {
  const rng = mulberry32(seed);
  const days = assumption("mission.days");
  const baselineDays = assumption("baseline.days");
  const clampSigma = assumption("sim.noiseClampSigma");
  const personal: Record<IndicatorId, number> = emptyValues();

  for (const id of INDICATORS) {
    const center = assumption(`indicator.${id}.center`);
    const spread = assumption(`indicator.${id}.spread`);
    personal[id] = center + (rng() * 2 - 1) * spread;
  }

  const rows: InternalDay[] = [];
  for (let day = 1; day <= days; day += 1) {
    const values = emptyValues();
    const driftDays = Math.max(0, day - baselineDays);
    for (const id of INDICATORS) {
      const sigma = assumption(`indicator.${id}.sigma`);
      const noise = Math.max(-clampSigma, Math.min(clampSigma, gaussian(rng))) * sigma;
      let drift = assumption(`indicator.${id}.driftPerDay`) * driftDays;
      if (id === "mood") {
        drift =
          assumption("indicator.mood.driftPerDay") * driftDays +
          assumption("indicator.mood.distanceDriftPerDay") * driftDays;
      }
      values[id] = clampIndicator(id, personal[id] + noise + drift);
    }
    rows.push({ day, values, events: [] });
  }
  return publish(rows);
}

function eventDelta(type: EventType, id: IndicatorId): number {
  if (type === "solarParticle") {
    if (id === "restingHr") return assumption("event.solarParticle.restingHr");
    if (id === "systolicBp") return assumption("event.solarParticle.systolicBp");
    if (id === "sleepHours") return assumption("event.solarParticle.sleepHours");
    if (id === "mood") return assumption("event.solarParticle.mood");
    if (id === "radiationDose") return assumption("event.solarParticle.radiationDaily");
  }
  if (type === "sleepDisruption") {
    if (id === "sleepHours") return assumption("event.sleepDisruption.sleepHours");
    if (id === "mood") return assumption("event.sleepDisruption.mood");
  }
  if (type === "isolationMood") {
    if (id === "mood") return assumption("event.isolationMood.mood");
    if (id === "sleepHours") return assumption("event.isolationMood.sleepHours");
  }
  return 0;
}

export function applyEvents(series: DayRecord[], events: ActiveEvent[]): DayRecord[] {
  const rows = toInternal(series);
  for (const event of events) {
    const duration = assumption(`event.${event.type}.duration`);
    const label = EVENT_LABEL[event.type];
    for (const row of rows) {
      if (row.day < event.startDay || row.day >= event.startDay + duration) continue;
      if (!row.events.includes(label)) row.events.push(label);
      for (const id of INDICATORS) {
        row.values[id] = clampIndicator(id, row.values[id] + eventDelta(event.type, id));
      }
    }
  }
  return publish(rows);
}

export function buildSeries(options: {
  seed: number;
  events: ActiveEvent[];
  imported?: DayRecord[] | null;
}): DayRecord[] {
  const base = options.imported ?? generateBaseSeries(options.seed);
  return applyEvents(base, options.events);
}

export const EVENT_COPY: Record<EventType, string> = EVENT_LABEL;
