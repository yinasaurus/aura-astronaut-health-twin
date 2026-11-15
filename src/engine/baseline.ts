import { assumption } from "../data/assumptions";
import { ADVERSE_DIRECTION } from "../data/model";
import { INDICATORS, type DayRecord, type IndicatorId, type IndicatorStat } from "../data/types";

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function sampleSd(values: number[]): number {
  if (values.length < 2) return 0;
  const center = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function dailyRadiation(series: DayRecord[]): number[] {
  return series.map((row, index) => {
    if (index === 0) return row.values.radiationDose;
    return row.values.radiationDose - series[index - 1].values.radiationDose;
  });
}

function comparedValue(series: DayRecord[], dailyDose: number[], id: IndicatorId, index: number): number {
  if (id === "radiationDose") return dailyDose[index] ?? 0;
  return series[index]?.values[id] ?? 0;
}

function windowMean(
  series: DayRecord[],
  dailyDose: number[],
  id: IndicatorId,
  startIndex: number,
  endIndex: number,
): number {
  const values: number[] = [];
  for (let index = Math.max(0, startIndex); index <= endIndex; index += 1) {
    values.push(comparedValue(series, dailyDose, id, index));
  }
  return mean(values);
}

export function indicatorStats(series: DayRecord[], day: number): IndicatorStat[] {
  const baselineDays = assumption("baseline.days");
  const trendDays = assumption("trend.days");
  const index = day - 1;
  const dailyDose = dailyRadiation(series);
  const baselineEnd = Math.min(series.length, baselineDays) - 1;

  return INDICATORS.map((id) => {
    const baselineValues: number[] = [];
    for (let cursor = 0; cursor <= baselineEnd; cursor += 1) {
      baselineValues.push(comparedValue(series, dailyDose, id, cursor));
    }
    const baseline = mean(baselineValues);
    const sd = Math.max(sampleSd(baselineValues), assumption(`indicator.${id}.sigma`));
    const current = series[index]?.values[id] ?? baseline;
    const compared = comparedValue(series, dailyDose, id, index);
    const recentStart = index - (trendDays - 1);
    const recentMean = windowMean(series, dailyDose, id, recentStart, index);
    const priorMean = windowMean(series, dailyDose, id, recentStart - trendDays, recentStart - 1);
    const trend5 = index + 1 < baselineDays ? 0 : recentMean - priorMean;
    const z = index + 1 < baselineDays || sd === 0 ? 0 : (recentMean - baseline) / sd;
    const direction = ADVERSE_DIRECTION[id];
    const adverseZ = direction === "low" ? Math.max(0, -z) : direction === "high" ? Math.max(0, z) : Math.abs(z);
    const pctVsBaseline = baseline === 0 ? null : ((recentMean - baseline) / baseline) * 100;
    return {
      id,
      baseline,
      sd,
      current,
      compared,
      recentMean,
      z,
      adverseZ,
      trend5,
      pctVsBaseline,
    };
  });
}
