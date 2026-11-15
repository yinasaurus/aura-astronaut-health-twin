import type { CrewMember } from "./types";

/** Fictional crew. These are not real astronauts. */
export const CREW: CrewMember[] = [
  { id: "nova", name: "Nova Reyes", role: "Commander", seed: 11 },
  { id: "elias", name: "Elias Ward", role: "Pilot", seed: 29 },
  { id: "amira", name: "Amira Shah", role: "Mission specialist", seed: 47 },
  { id: "jonah", name: "Jonah Peck", role: "Flight engineer", seed: 83 },
];

export function crewById(id: string): CrewMember {
  const found = CREW.find((member) => member.id === id);
  if (!found) throw new Error(`Unknown crew member ${id}`);
  return found;
}
