import type { RiskLevel } from "../data/types";

export function worstLevel(levels: RiskLevel[]): RiskLevel {
  if (levels.includes("red")) return "red";
  if (levels.includes("amber")) return "amber";
  return "green";
}

export function levelChip(level: RiskLevel): { label: string; className: string } {
  if (level === "red") return { label: "RED · Review", className: "bg-[#ff4d67] text-[#2a0610]" };
  if (level === "amber") return { label: "AMBER · Watch", className: "bg-[#ffb020] text-[#2a1c04]" };
  return { label: "GREEN · Quiet", className: "bg-[#3ee0a6] text-[#04291c]" };
}
