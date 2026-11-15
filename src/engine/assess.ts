import { assumption } from "../data/assumptions";
import type { Assessment, DayRecord, MissionContext } from "../data/types";
import { indicatorStats } from "./baseline";
import { applyPersistence, scoreSystems } from "./compound";

export function assessDay(series: DayRecord[], day: number, context: MissionContext): Assessment {
  const persistDays = assumption("score.persistDays");
  const start = Math.max(1, day - persistDays + 1);
  const frames: Assessment[] = [];
  for (let cursor = start; cursor <= day; cursor += 1) {
    const stats = indicatorStats(series, cursor);
    frames.push({ stats, systems: scoreSystems(stats, context, cursor) });
  }
  const today = frames[frames.length - 1];
  return { stats: today.stats, systems: applyPersistence(frames, persistDays) };
}
