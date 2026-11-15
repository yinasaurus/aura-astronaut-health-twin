import type { IndicatorId } from "../data/types";

export interface IndicatorMeta {
  label: string;
  short: string;
  unit: string;
  decimals: number;
}

export const INDICATOR_META: Record<IndicatorId, IndicatorMeta> = {
  restingHr: { label: "Resting heart rate", short: "Heart rate", unit: "bpm", decimals: 0 },
  systolicBp: { label: "Systolic blood pressure", short: "Systolic", unit: "mmHg", decimals: 0 },
  diastolicBp: { label: "Diastolic blood pressure", short: "Diastolic", unit: "mmHg", decimals: 0 },
  glucose: { label: "Blood glucose", short: "Glucose", unit: "mg/dL", decimals: 0 },
  temperature: { label: "Body temperature", short: "Temperature", unit: "°C", decimals: 2 },
  sleepHours: { label: "Sleep", short: "Sleep", unit: "h", decimals: 2 },
  mood: { label: "Mood score", short: "Mood", unit: "score", decimals: 1 },
  radiationDose: { label: "Cumulative radiation dose", short: "Radiation", unit: "mSv", decimals: 2 },
  exerciseMin: { label: "Exercise", short: "Exercise", unit: "min", decimals: 0 },
};

export function formatNumber(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

export function formatIndicator(id: IndicatorId, value: number): string {
  const meta = INDICATOR_META[id];
  return `${formatNumber(value, meta.decimals)} ${meta.unit}`;
}

export function formatPct(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "n/a";
  const sign = value > 0 ? "+" : "";
  const digits = Math.abs(value) >= 10 ? 0 : 1;
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatSigned(value: number, decimals: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}`;
}
