import { create } from "zustand";
import { assumption } from "../data/assumptions";
import { crewById } from "../data/crew";
import { EVENT_LABEL } from "../data/content";
import type { ActionEntry, ActiveEvent, BodySystem, DayRecord, EventType, MissionContext } from "../data/types";

interface MissionState {
  day: number;
  playing: boolean;
  crewId: string;
  system: BodySystem;
  context: MissionContext;
  commDelayOn: boolean;
  delayMinutes: number;
  ghost: boolean;
  packetOpen: boolean;
  learnOpen: boolean;
  events: Record<string, ActiveEvent[]>;
  log: ActionEntry[];
  imports: Record<string, DayRecord[] | undefined>;
  importNote: string;
  setDay: (day: number) => void;
  setPlaying: (playing: boolean) => void;
  setCrew: (crewId: string) => void;
  setSystem: (system: BodySystem) => void;
  setContext: (context: MissionContext) => void;
  setCommDelay: (on: boolean) => void;
  setDelayMinutes: (minutes: number) => void;
  setGhost: (ghost: boolean) => void;
  setPacketOpen: (open: boolean) => void;
  setLearnOpen: (open: boolean) => void;
  inject: (type: EventType) => void;
  logAction: (text: string) => void;
  loadImport: (crewId: string, rows: DayRecord[]) => void;
  clearImport: () => void;
  resetStory: () => void;
}

const missionDays = () => assumption("mission.days");

function emptyEvents(): Record<string, ActiveEvent[]> {
  return { nova: [], elias: [], amira: [], jonah: [] };
}

export const useMission = create<MissionState>((set, get) => ({
  day: 60,
  playing: false,
  crewId: "nova",
  system: "cardiovascular",
  context: "mars",
  commDelayOn: false,
  delayMinutes: assumption("comm.delayMinutes"),
  ghost: true,
  packetOpen: false,
  learnOpen: false,
  events: emptyEvents(),
  log: [],
  imports: {},
  importNote: "",
  setDay: (day) => set({ day: Math.min(missionDays(), Math.max(1, Math.round(day))) }),
  setPlaying: (playing) => set({ playing }),
  setCrew: (crewId) => set({ crewId, importNote: "" }),
  setSystem: (system) => set({ system }),
  setContext: (context) => {
    const label = context === "iss" ? "ISS" : context === "lunar" ? "Lunar base" : "Mars transit";
    set((state) => ({
      context,
      log: [...state.log, { day: state.day, text: `Mission setting set to ${label}. Risk weights changed. The series was not rewritten.` }],
    }));
  },
  setCommDelay: (on) => {
    const state = get();
    const minutes = state.delayMinutes;
    set({
      commDelayOn: on,
      packetOpen: on ? false : state.packetOpen,
      log: [
        ...state.log,
        {
          day: state.day,
          text: on
            ? `Comm delay on. A note to the flight surgeon is queued. One-way delay control: ${minutes} minutes.`
            : "Comm delay off. The queued note can be sent as a flight surgeon packet.",
        },
      ],
    });
  },
  setDelayMinutes: (minutes) => {
    const max = assumption("comm.delayMax");
    const next = Math.min(max, Math.max(0, minutes));
    set({ delayMinutes: next });
  },
  setGhost: (ghost) => set({ ghost }),
  setPacketOpen: (open) => set({ packetOpen: open }),
  setLearnOpen: (open) => set({ learnOpen: open }),
  inject: (type) => {
    const state = get();
    const event: ActiveEvent = {
      id: `${type}-${state.day}-${state.events[state.crewId].length}`,
      type,
      startDay: state.day,
    };
    set({
      events: {
        ...state.events,
        [state.crewId]: [...state.events[state.crewId], event],
      },
      log: [...state.log, { day: state.day, text: `Injected ${EVENT_LABEL[type]} for ${crewById(state.crewId).name}.` }],
    });
  },
  logAction: (text) => {
    const state = get();
    set({ log: [...state.log, { day: state.day, text }] });
  },
  loadImport: (crewId, rows) =>
    set((state) => ({
      imports: { ...state.imports, [crewId]: rows },
      events: { ...state.events, [crewId]: [] },
      importNote: `Loaded a daily log for ${crewById(crewId).name}. Injected events for this person were cleared.`,
    })),
  clearImport: () =>
    set((state) => ({
      imports: { ...state.imports, [state.crewId]: undefined },
      importNote: "Cleared the loaded log. The simulated series is showing again.",
    })),
  resetStory: () =>
    set({
      day: 60,
      playing: false,
      crewId: "nova",
      system: "cardiovascular",
      context: "mars",
      commDelayOn: false,
      delayMinutes: assumption("comm.delayMinutes"),
      ghost: true,
      packetOpen: false,
      learnOpen: false,
      events: emptyEvents(),
      log: [{ day: 60, text: "Story reset. Day 60, no injected events." }],
      imports: {},
      importNote: "",
    }),
}));
