import type { ActionEntry, Assessment, CrewMember, MissionContext } from "../data/types";
import { formatIndicator, formatNumber, formatPct, formatSigned, INDICATOR_META } from "./format";
import { SYSTEM_LABEL } from "../data/content";

export const DISCLAIMER = "Simulated data. Decision support for crew, not a medical diagnosis.";

export function buildPacket(input: {
  crew: CrewMember;
  day: number;
  missionDays: number;
  context: MissionContext;
  delayMinutes: number;
  assessment: Assessment;
  actions: ActionEntry[];
}): string {
  const { crew, day, missionDays, context, delayMinutes, assessment, actions } = input;
  const lines: string[] = [
    "AURA FLIGHT SURGEON PACKET",
    DISCLAIMER,
    "Tested and shown as a simulation. Not clinical validation.",
    "",
    `Crew: ${crew.name}, ${crew.role}`,
    `Mission day: ${day} of ${missionDays}`,
    `Setting: ${context}`,
    `One-way delay control: ${delayMinutes} minutes`,
    "",
    "SYSTEM FLAGS",
  ];

  for (const system of assessment.systems) {
    lines.push(
      `${SYSTEM_LABEL[system.system].title}: score ${formatNumber(system.score, 0)}, ${system.level}, confidence ${formatNumber(system.confidence, 2)}, review ${system.escalate ? "yes" : "no"}`,
    );
    for (const reason of system.reasons) lines.push(`- ${reason}`);
  }

  lines.push("", "INDICATORS VERSUS THIS CREW MEMBER'S FIRST 14 DAYS");
  for (const stat of assessment.stats) {
    const meta = INDICATOR_META[stat.id];
    lines.push(
      `${meta.label}: today ${formatIndicator(stat.id, stat.current)}; 5-day mean ${formatNumber(stat.recentMean, meta.decimals)} ${stat.id === "radiationDose" ? "mSv/day" : meta.unit}; baseline ${formatNumber(stat.baseline, stat.id === "radiationDose" ? 3 : meta.decimals)}; ${formatPct(stat.pctVsBaseline)}; z ${formatSigned(stat.z, 1)}; 5-day change ${formatSigned(stat.trend5, meta.decimals)}`,
    );
  }

  lines.push("", "ACTIONS LOGGED IN THIS SESSION");
  if (actions.length === 0) lines.push("- None logged.");
  for (const action of actions) lines.push(`- Day ${action.day}: ${action.text}`);

  lines.push("", DISCLAIMER);
  return lines.join("\n");
}
