import type { BodySystem, EventType, HazardId, IndicatorId, MissionContext } from "./types";

export const HAZARD_LABEL: Record<HazardId, string> = {
  radiation: "Space radiation",
  isolation: "Isolation and confinement",
  distance: "Distance from Earth",
  gravity: "Gravity fields",
  closed: "Hostile closed environments",
};

export const CONTEXT_LABEL: Record<MissionContext, string> = {
  iss: "ISS",
  lunar: "Lunar base",
  mars: "Mars transit",
};

export const EVENT_LABEL: Record<EventType, string> = {
  solarParticle: "Solar particle event",
  sleepDisruption: "Sleep disruption",
  isolationMood: "Isolation low mood",
};

export const SYSTEM_LABEL: Record<BodySystem, { title: string; short: string }> = {
  cardiovascular: { title: "Cardiovascular", short: "Heart" },
  musculoskeletal: { title: "Musculoskeletal", short: "Muscle and bone" },
  brain: { title: "Brain and behavioural", short: "Brain" },
  sleep: { title: "Sleep", short: "Sleep" },
  immune: { title: "Immune", short: "Immune" },
  vision: { title: "Vision", short: "Vision" },
};

export const SYSTEM_COPY: Record<BodySystem, { role: string; hazards: string; watch: string }> = {
  cardiovascular: {
    role: "Moves blood so the body can trade oxygen, heat, and nutrients.",
    hazards: "In this simulation the gravity-field hazard is represented by resting heart rate, blood pressure, and exercise time. Those links are assumptions.",
    watch: "AURA compares the recent pattern with this astronaut's own first 14 days. It does not use a population cutoff.",
  },
  musculoskeletal: {
    role: "Supports posture, movement, and load.",
    hazards: "This build has no bone or muscle measurement. The score follows exercise minutes, as a stand-in for how the gravity-field hazard is being countered. That stand-in is an assumption.",
    watch: "A falling exercise pattern can raise this score even when heart rate still looks quiet.",
  },
  brain: {
    role: "Covers mood, attention, and how the crew member says they feel.",
    hazards: "Isolation and distance from Earth are attached to mood. Sleep from the closed-environment hazard is included at a lower weight. Those links are assumptions.",
    watch: "Read the mood score as a self-check on the 0 to 10 scale used in this simulation, not as a diagnosis.",
  },
  sleep: {
    role: "Restores attention and supports the next day's work.",
    hazards: "The closed-environment hazard is attached to sleep hours. Mood is included because a short night and a low mood often get logged together in this model. That pairing is an assumption.",
    watch: "The useful comparison is with this person's own baseline nights, not with a fixed hour target.",
  },
  immune: {
    role: "Responds to infection and to strain on the body.",
    hazards: "Radiation dose rate, sleep, temperature, and glucose feed this score. This is not a lab immune panel. The mix is an assumption.",
    watch: "A higher score means several of those signals drifted together. It does not name an illness.",
  },
  vision: {
    role: "Covers eyesight and visual comfort.",
    hazards: "No eye test is in this simulation. The score follows the radiation dose rate only, which is a weak stand-in. Treat a quiet vision score as missing data, not as proof that vision is fine.",
    watch: "Use a real vision check from the crew medical kit when eyesight changes. This screen cannot see that.",
  },
};

export const LEARN: Record<IndicatorId, { measure: string; why: string; read: string }> = {
  restingHr: {
    measure: "Count heart rate while sitting still, using the method in the crew medical kit. Take it the same way each time you add it to the baseline.",
    why: "A change from your own usual rate can show that the cardiovascular pattern is drifting. This app does not say what causes it.",
    read: "Look at the 5-day mean against your first 14 days. One high reading is not the score. The z value says how far the recent mean sits from your own spread.",
  },
  systolicBp: {
    measure: "Use the blood-pressure method in the crew medical kit, at rest, with the cuff your crew already trusts. Write down the higher number.",
    why: "Systolic pressure is one of the cardiovascular signals AURA can combine with heart rate and exercise.",
    read: "Compare the recent mean with your baseline. The app does not mark a universal 'normal' pressure.",
  },
  diastolicBp: {
    measure: "Record the lower blood-pressure number from the same reading as systolic.",
    why: "It is a second blood-pressure signal so one number does not have to carry the whole cardiovascular score.",
    read: "Read it the same way as systolic: your recent mean versus your own baseline.",
  },
  glucose: {
    measure: "Use the glucose method in the crew medical kit and record the value in mg/dL, which is the unit this simulation stores.",
    why: "Glucose is included as a closed-environment signal. This app does not diagnose a metabolic condition.",
    read: "A drift matters here only as part of your own pattern. The unit mg/dL is a simulation choice.",
  },
  temperature: {
    measure: "Take temperature with the crew medical kit, at a similar time of day, and record Celsius.",
    why: "Temperature can move with strain, illness, or the environment. AURA only sees the number you enter or the simulated series.",
    read: "Both a rise and a fall count as drift, because this signal has no single 'bad' direction in the model.",
  },
  sleepHours: {
    measure: "Log the hours you actually slept. A diary is enough for this simulation. Use the same rule each day.",
    why: "Sleep is the main signal for the sleep system and a supporting signal for mood and immune scores.",
    read: "Shorter than your own baseline is the adverse direction. A single short night is scored more quietly than several nights together.",
  },
  mood: {
    measure: "Once a day, score how you feel from 0 to 10. Use the same meaning for the ends of the scale every day. This scale was invented for the simulation.",
    why: "Mood is the main behavioural signal, tied here to isolation and to distance from Earth.",
    read: "Lower than your own baseline is the adverse direction. It is a self-report, not a clinical test.",
  },
  radiationDose: {
    measure: "Add the daily dose from the crew radiation monitor, in mSv. The screen keeps a running total. The drift math uses the daily rate so the total does not look 'high' only because time passed.",
    why: "Radiation is the hazard signal for the immune score and the only signal for the vision score in this build.",
    read: "Read both numbers: the running total, and the recent daily rate versus your early-mission daily rate.",
  },
  exerciseMin: {
    measure: "Log minutes of planned exercise. Count the session you actually completed.",
    why: "Exercise minutes stand in for the gravity-field countermeasure. This build has no bone or muscle scan.",
    read: "Fewer minutes than your own baseline is the adverse direction. It can move the heart and the musculoskeletal scores.",
  },
};

export const CONTEXT_NOTE: Record<MissionContext, string> = {
  iss: "ISS weights distance from Earth lower, so mood shifts count less than they do on the Mars setting. The underlying series does not change.",
  lunar: "Lunar base sits between ISS and Mars on distance, and it lowers the gravity-field weight. The underlying series does not change.",
  mars: "Mars transit raises the weights on radiation, isolation, distance, and the closed environment. The same readings can score higher than they would on ISS.",
};

export function protocolSteps(system: BodySystem): string[] {
  const shared = [
    "Repeat today's measurements the same way you built your baseline.",
    "Note sleep, fluids, food, exercise, and the radiation log for the same days.",
    "If you feel worse, or the flag is still there on the next check, keep the flight-surgeon message queued.",
    "These lines are decision-support prompts, not a treatment order.",
  ];
  const extra: Record<BodySystem, string> = {
    cardiovascular: "Pause hard exercise until you have repeated the heart rate and blood pressure at rest.",
    musculoskeletal: "If exercise time dropped, record what got in the way. Do not invent a workout you did not do.",
    brain: "Tell a crewmate how you scored your mood. Do not treat the score as a diagnosis.",
    sleep: "Protect the next sleep window: dim lights and park non-urgent tasks where the timeline allows.",
    immune: "Check temperature again later in the day and keep the radiation log next to the symptom note.",
    vision: "This score cannot see your eyes. If vision changed, use the crew eye check and say so in the queued message.",
  };
  return [extra[system], ...shared];
}
