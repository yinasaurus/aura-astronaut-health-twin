import type { BodySystem, HazardId, IndicatorId } from "./types";

/** Which hazard a drift parameter is attached to. This mapping is a model choice, not a published result. */
export const PRIMARY_HAZARD: Record<IndicatorId, HazardId> = {
  restingHr: "gravity",
  systolicBp: "gravity",
  diastolicBp: "gravity",
  glucose: "closed",
  temperature: "closed",
  sleepHours: "closed",
  mood: "isolation",
  radiationDose: "radiation",
  exerciseMin: "gravity",
};

export type AdverseDirection = "high" | "low" | "either";

export const ADVERSE_DIRECTION: Record<IndicatorId, AdverseDirection> = {
  restingHr: "high",
  systolicBp: "high",
  diastolicBp: "high",
  glucose: "high",
  temperature: "either",
  sleepHours: "low",
  mood: "low",
  radiationDose: "high",
  exerciseMin: "low",
};

export interface SystemMember {
  id: IndicatorId;
  weightId: string;
}

/**
 * Which indicators feed each body system.
 * Vision and bone have no direct measurement in this indicator set.
 * Vision uses the radiation dose rate only. Musculoskeletal uses exercise minutes only.
 */
export const SYSTEM_MEMBERS: Record<BodySystem, SystemMember[]> = {
  cardiovascular: [
    { id: "restingHr", weightId: "weight.cardiovascular.restingHr" },
    { id: "systolicBp", weightId: "weight.cardiovascular.systolicBp" },
    { id: "diastolicBp", weightId: "weight.cardiovascular.diastolicBp" },
    { id: "exerciseMin", weightId: "weight.cardiovascular.exerciseMin" },
  ],
  musculoskeletal: [{ id: "exerciseMin", weightId: "weight.musculoskeletal.exerciseMin" }],
  brain: [
    { id: "mood", weightId: "weight.brain.mood" },
    { id: "sleepHours", weightId: "weight.brain.sleepHours" },
  ],
  sleep: [
    { id: "sleepHours", weightId: "weight.sleep.sleepHours" },
    { id: "mood", weightId: "weight.sleep.mood" },
  ],
  immune: [
    { id: "radiationDose", weightId: "weight.immune.radiationDose" },
    { id: "sleepHours", weightId: "weight.immune.sleepHours" },
    { id: "temperature", weightId: "weight.immune.temperature" },
    { id: "glucose", weightId: "weight.immune.glucose" },
  ],
  vision: [{ id: "radiationDose", weightId: "weight.vision.radiationDose" }],
};
