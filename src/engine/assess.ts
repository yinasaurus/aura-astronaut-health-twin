import type { Assessment, DayRecord, MissionContext } from "../data/types";
import { indicatorStats } from "./baseline";
import { scoreSystems } from "./compound";

export function assessDay(series: DayRecord[], day: number, context: MissionContext): Assessment {
  const stats = indicatorStats(series, day);
  const systems = scoreSystems(stats, context, day);
  return { stats, systems };
}
