export const INDICATORS = [
  "restingHr",
  "systolicBp",
  "diastolicBp",
  "glucose",
  "temperature",
  "sleepHours",
  "mood",
  "radiationDose",
  "exerciseMin",
] as const;

export type IndicatorId = (typeof INDICATORS)[number];

export const HAZARDS = [
  "radiation",
  "isolation",
  "distance",
  "gravity",
  "closed",
] as const;

export type HazardId = (typeof HAZARDS)[number];

export const SYSTEMS = [
  "cardiovascular",
  "musculoskeletal",
  "brain",
  "sleep",
  "immune",
  "vision",
] as const;

export type BodySystem = (typeof SYSTEMS)[number];

export type RiskLevel = "green" | "amber" | "red";

export type MissionContext = "iss" | "lunar" | "mars";

export type EventType = "solarParticle" | "sleepDisruption" | "isolationMood";

export interface Assumption {
  id: string;
  value: number;
  unit: string;
  hazard: HazardId | "none";
  rationale: string;
  source: string;
  evidenceLevel: "published" | "assumption";
}

export interface DayRecord {
  day: number;
  values: Record<IndicatorId, number>;
  events: string[];
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  seed: number;
}

export interface IndicatorStat {
  id: IndicatorId;
  baseline: number;
  sd: number;
  current: number;
  compared: number;
  recentMean: number;
  z: number;
  adverseZ: number;
  trend5: number;
  pctVsBaseline: number | null;
}

export interface Contribution {
  id: IndicatorId;
  adverseZ: number;
  weight: number;
  included: boolean;
}

export interface SystemRisk {
  system: BodySystem;
  score: number;
  level: RiskLevel;
  confidence: number;
  reasons: string[];
  escalate: boolean;
  contributions: Contribution[];
}

export interface ActiveEvent {
  id: string;
  type: EventType;
  startDay: number;
}

export interface ActionEntry {
  day: number;
  text: string;
}

export interface Assessment {
  stats: IndicatorStat[];
  systems: SystemRisk[];
}
