import { assumption } from "../data/assumptions";
import { ADVERSE_DIRECTION, PRIMARY_HAZARD, SYSTEM_MEMBERS } from "../data/model";
import { SYSTEMS, type IndicatorId, type IndicatorStat, type MissionContext, type SystemRisk } from "../data/types";
import { formatIndicator, formatNumber, formatPct, formatSigned, INDICATOR_META } from "./format";

function hazardWeight(context: MissionContext, id: IndicatorId): number {
  if (id === "mood") {
    return (assumption(`context.${context}.isolation`) + assumption(`context.${context}.distance`)) / 2;
  }
  return assumption(`context.${context}.${PRIMARY_HAZARD[id]}`);
}

export function trendIsAdverse(stat: IndicatorStat): boolean {
  const direction = ADVERSE_DIRECTION[stat.id];
  if (direction === "high") return stat.trend5 > 0;
  if (direction === "low") return stat.trend5 < 0;
  return stat.z !== 0 && Math.sign(stat.trend5) === Math.sign(stat.z);
}

function levelFor(score: number): SystemRisk["level"] {
  if (score >= assumption("score.red")) return "red";
  if (score >= assumption("score.amber")) return "amber";
  return "green";
}

function reasonFor(stat: IndicatorStat): string {
  const meta = INDICATOR_META[stat.id];
  const trendUnit = stat.id === "radiationDose" ? "mSv/day" : meta.unit;
  const comparedText =
    stat.id === "radiationDose"
      ? `Today's running total is ${formatIndicator(stat.id, stat.current)}. The recent daily rate averages ${formatNumber(stat.recentMean, 3)} mSv/day`
      : `Today's reading is ${formatIndicator(stat.id, stat.current)}. The 5-day mean is ${formatNumber(stat.recentMean, meta.decimals)} ${meta.unit}`;
  return `${meta.label}: ${comparedText}, ${formatPct(stat.pctVsBaseline)} versus the personal baseline of ${formatNumber(stat.baseline, stat.id === "radiationDose" ? 3 : meta.decimals)} ${stat.id === "radiationDose" ? "mSv/day" : meta.unit} (z ${formatSigned(stat.z, 1)}). The 5-day change is ${formatSigned(stat.trend5, stat.id === "radiationDose" ? 3 : meta.decimals)} ${trendUnit}.`;
}

export function scoreSystems(stats: IndicatorStat[], context: MissionContext, day: number): SystemRisk[] {
  const byId = new Map(stats.map((stat) => [stat.id, stat]));
  const baselineDays = assumption("baseline.days");
  const mildZ = assumption("score.mildZ");
  const zScale = assumption("score.zScale");

  return SYSTEMS.map((system) => {
    const members = SYSTEM_MEMBERS[system];
    if (day < baselineDays) {
      return {
        system,
        score: 0,
        level: "green" as const,
        confidence: assumption("score.greenConfidence"),
        escalate: false,
        contributions: members.map((member) => ({
          id: member.id,
          adverseZ: 0,
          weight: assumption(member.weightId),
          included: false,
        })),
        reasons: [
          `Personal baseline is still forming (day ${day} of ${baselineDays}). Drift scoring starts after that window.`,
        ],
      };
    }

    const contributions = members.map((member) => {
      const stat = byId.get(member.id);
      const adverseZ = stat?.adverseZ ?? 0;
      const weight = assumption(member.weightId) * hazardWeight(context, member.id);
      return {
        id: member.id,
        adverseZ,
        weight,
        included: adverseZ >= mildZ,
      };
    });

    const included = contributions.filter((item) => item.included);
    let weighted = 0;
    for (const item of included) {
      const unit = Math.min(item.adverseZ / zScale, 1);
      weighted += item.weight * unit;
    }
    const includedWeight = included.reduce((sum, item) => sum + item.weight, 0);
    const average = includedWeight === 0 ? 0 : weighted / includedWeight;
    const factor = included.length >= 2 ? assumption("score.multiSignalFactor") : assumption("score.singleSignalFactor");
    const score = Math.max(0, Math.min(100, 100 * average * (included.length === 0 ? 0 : factor)));
    const level = levelFor(score);
    const trendAligned =
      included.length === 0
        ? 0
        : included.filter((item) => {
            const stat = byId.get(item.id);
            return stat ? trendIsAdverse(stat) : false;
          }).length / included.length;
    const agreement = members.length === 0 ? 0 : included.length / members.length;
    const confidence =
      included.length === 0
        ? assumption("score.greenConfidence")
        : Math.max(
            0,
            Math.min(
              1,
              0.3 + assumption("score.confidenceAgreement") * agreement + assumption("score.confidenceTrend") * trendAligned,
            ),
          );
    const escalate =
      level === "red" ||
      (level === "amber" &&
        confidence >= assumption("score.escalateConfidence") &&
        included.length >= assumption("score.escalateMinSignals"));

    const reasons: string[] = [];
    if (included.length === 0) {
      reasons.push("No indicator in this system is above the mild personal-drift mark. This is not a population limit.");
    } else {
      reasons.push(
        included.length === 1
          ? "One mild drift is present. A single mild signal is scored lower than several signals moving together."
          : `${included.length} mild drifts are moving together. None of these comparisons uses a population cutoff.`,
      );
      for (const item of included) {
        const stat = byId.get(item.id);
        if (stat) reasons.push(reasonFor(stat));
      }
    }
    if (system === "vision") {
      reasons.push("No eye measurement is in this simulation. The vision score follows the radiation dose rate only.");
    }
    if (system === "musculoskeletal") {
      reasons.push("No bone or muscle measurement is in this simulation. This score follows exercise minutes only.");
    }

    return { system, score, level, confidence, reasons, escalate, contributions };
  });
}

export function adverseTrendCount(system: SystemRisk, stats: IndicatorStat[]): number {
  return system.contributions.filter((item) => item.included).filter((item) => {
    const stat = stats.find((row) => row.id === item.id);
    return stat ? trendIsAdverse(stat) : false;
  }).length;
}

/** Amber or red, with enough mild signals still moving the adverse way. */
export function dayConfirmed(system: SystemRisk, stats: IndicatorStat[]): boolean {
  return system.score >= assumption("score.amber") && adverseTrendCount(system, stats) >= assumption("score.persistMinSignals");
}

export function streakHeld(flags: boolean[], persistDays: number): boolean {
  if (persistDays <= 0 || flags.length < persistDays) return false;
  for (let index = flags.length - persistDays; index < flags.length; index += 1) {
    if (!flags[index]) return false;
  }
  return true;
}

export function applyPersistence(frames: { stats: IndicatorStat[]; systems: SystemRisk[] }[], persistDays: number): SystemRisk[] {
  const today = frames[frames.length - 1];
  if (!today) return [];
  return today.systems.map((system) => {
    const flags = frames.map((frame) => {
      const match = frame.systems.find((item) => item.system === system.system);
      return match ? dayConfirmed(match, frame.stats) : false;
    });
    if (system.level === "green" || streakHeld(flags, persistDays)) return system;
    return {
      ...system,
      level: "green" as const,
      escalate: false,
      reasons: [
        ...system.reasons,
        `The score is in a watch band, but it is not confirmed. Confirmation needs at least ${assumption("score.persistMinSignals")} mild signals trending the adverse way, on this system, for ${persistDays} consecutive days.`,
      ],
    };
  });
}
