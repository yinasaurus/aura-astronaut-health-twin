import { assumption } from "../data/assumptions";
import { INDICATORS, type DayRecord, type IndicatorId } from "../data/types";

const HEADER = ["day", ...INDICATORS].join(",");

export function templateCsv(): string {
  const days = Math.min(14, assumption("mission.days"));
  const lines = [HEADER];
  for (let day = 1; day <= days; day += 1) {
    const values = INDICATORS.map((id) => assumption(`indicator.${id}.center`));
    if (INDICATORS.indexOf("radiationDose") >= 0) {
      const index = INDICATORS.indexOf("radiationDose");
      values[index] = assumption("indicator.radiationDose.center") * day;
    }
    lines.push([String(day), ...values.map((value) => String(value))].join(","));
  }
  return lines.join("\n");
}

export function parseCrewCsv(text: string): { rows: DayRecord[] } | { error: string } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  if (lines.length < 2) return { error: "The file needs a header and at least one data row." };
  const header = lines[0].split(",").map((cell) => cell.trim());
  const missing = ["day", ...INDICATORS].filter((column) => !header.includes(column));
  if (missing.length > 0) return { error: `Missing columns: ${missing.join(", ")}.` };

  const indexOf = new Map(header.map((name, index) => [name, index]));
  const missionDays = assumption("mission.days");
  const rows: DayRecord[] = [];
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = lines[lineIndex].split(",").map((cell) => cell.trim());
    const day = Number(cells[indexOf.get("day") ?? 0]);
    if (!Number.isInteger(day) || day < 1 || day > missionDays) {
      return { error: `Row ${lineIndex + 1} has a day outside 1 to ${missionDays}.` };
    }
    const values = {} as DayRecord["values"];
    for (const id of INDICATORS) {
      const value = Number(cells[indexOf.get(id) ?? -1]);
      if (!Number.isFinite(value)) return { error: `Row ${lineIndex + 1} has a non-numeric ${id}.` };
      values[id as IndicatorId] = value;
    }
    rows.push({ day, values, events: [] });
  }
  rows.sort((a, b) => a.day - b.day);
  const uniqueDays = new Set(rows.map((row) => row.day));
  if (uniqueDays.size !== rows.length) return { error: "Each day can appear only once." };
  if (rows.length < assumption("baseline.days")) {
    return { error: `Load at least ${assumption("baseline.days")} days so a personal baseline can be formed.` };
  }
  if (rows[0].day !== 1) return { error: "The log needs to start on day 1 so the baseline window is present." };

  const filled: DayRecord[] = [];
  for (let day = 1; day <= missionDays; day += 1) {
    const found = rows.find((row) => row.day === day);
    if (found) {
      filled.push(found);
      continue;
    }
    const previous = filled[filled.length - 1];
    if (!previous) return { error: "The log has a gap before the first row." };
    if (rows.some((row) => row.day > day)) return { error: `Day ${day} is missing inside the log.` };
    filled.push({ day, values: { ...previous.values }, events: [] });
  }
  return { rows: filled };
}
