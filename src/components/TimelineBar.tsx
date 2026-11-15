import { FileUp, Pause, Play, RadioTower } from "lucide-react";
import { useRef } from "react";
import { assumption } from "../data/assumptions";
import { CREW } from "../data/crew";
import { EVENT_LABEL } from "../data/content";
import type { EventType } from "../data/types";
import { parseCrewCsv, templateCsv } from "../engine/csv";
import { useMission } from "../store/mission";

const EVENTS: EventType[] = ["solarParticle", "sleepDisruption", "isolationMood"];

export function TimelineBar({ demoMode, showAdvance = false }: { demoMode: boolean; showAdvance?: boolean }) {
  const day = useMission((state) => state.day);
  const playing = useMission((state) => state.playing);
  const crewId = useMission((state) => state.crewId);
  const commDelayOn = useMission((state) => state.commDelayOn);
  const delayMinutes = useMission((state) => state.delayMinutes);
  const ghost = useMission((state) => state.ghost);
  const importNote = useMission((state) => state.importNote);
  const setDay = useMission((state) => state.setDay);
  const setPlaying = useMission((state) => state.setPlaying);
  const setCrew = useMission((state) => state.setCrew);
  const inject = useMission((state) => state.inject);
  const setCommDelay = useMission((state) => state.setCommDelay);
  const setDelayMinutes = useMission((state) => state.setDelayMinutes);
  const setGhost = useMission((state) => state.setGhost);
  const setPacketOpen = useMission((state) => state.setPacketOpen);
  const setLearnOpen = useMission((state) => state.setLearnOpen);
  const loadImport = useMission((state) => state.loadImport);
  const clearImport = useMission((state) => state.clearImport);
  const fileRef = useRef<HTMLInputElement>(null);
  const missionDays = assumption("mission.days");
  const delayMax = assumption("comm.delayMax");

  function downloadTemplate() {
    const blob = new Blob([templateCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "aura-log-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const parsed = parseCrewCsv(await file.text());
    if ("error" in parsed) {
      useMission.setState({ importNote: parsed.error });
      return;
    }
    loadImport(crewId, parsed.rows);
  }

  return (
    <section className="hud-frame mt-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-[#8ef6ff] px-3 py-2 text-sm font-semibold text-[#04202a] disabled:opacity-40"
          disabled={demoMode}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
          {playing ? "Pause" : "Play"}
        </button>
        <label className="flex min-w-56 flex-1 items-center gap-3 text-sm">
          <span className="font-mono text-xs tracking-[0.14em] text-[#9ad7ea]">DAY {day}</span>
          <input
            className="w-full accent-[#8ef6ff]"
            type="range"
            min={1}
            max={missionDays}
            value={day}
            aria-label="Mission day"
            onChange={(event) => {
              setPlaying(false);
              setDay(Number(event.target.value));
            }}
          />
          <span className="font-mono text-xs text-[#d5e7f4]">of {missionDays}</span>
        </label>
        {showAdvance && (
          <button
            type="button"
            data-testid="advance-day"
            className="rounded-md border border-[#8ef6ff] px-3 py-2 text-sm"
            onClick={() => {
              setPlaying(false);
              setDay(64);
            }}
          >
            Advance to day 64
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {CREW.map((member) => (
          <button
            key={member.id}
            type="button"
            aria-pressed={crewId === member.id}
            className={`rounded-md border px-3 py-2 text-sm ${crewId === member.id ? "border-[#8ef6ff] bg-[#123246]" : "border-[#245066]"}`}
            onClick={() => setCrew(member.id)}
          >
            {member.name}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {EVENTS.map((type) => (
          <button
            key={type}
            type="button"
            data-testid={type === "solarParticle" ? "inject-solar-particle" : undefined}
            className="rounded-md border border-[#ffb020] px-3 py-2 text-sm text-[#ffe2ad]"
            onClick={() => inject(type)}
          >
            Inject {EVENT_LABEL[type]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="delay-toggle"
          aria-pressed={commDelayOn}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${commDelayOn ? "bg-[#ffb020] text-[#2a1c04]" : "border border-[#245066]"}`}
          onClick={() => setCommDelay(!commDelayOn)}
        >
          <RadioTower aria-hidden="true" className="size-4" />
          {commDelayOn ? "Delay on" : "Delay off"}
        </button>
        <label className="flex items-center gap-2 text-sm">
          One-way delay
          <input
            className="w-16 rounded border border-[#245066] bg-[#07111c] px-2 py-1 font-mono"
            type="number"
            min={0}
            max={delayMax}
            step={1}
            value={delayMinutes}
            aria-label="One-way delay in minutes"
            onChange={(event) => setDelayMinutes(Number(event.target.value))}
          />
          min
        </label>
        <button type="button" data-testid="ghost-toggle" className="rounded-md border border-[#245066] px-3 py-2 text-sm" aria-pressed={ghost} onClick={() => setGhost(!ghost)}>
          {ghost ? "Hide baseline ghost" : "Show baseline ghost"}
        </button>
        <button type="button" className="rounded-md border border-[#245066] px-3 py-2 text-sm" onClick={() => setLearnOpen(true)}>
          Learn the indicators
        </button>
        <button
          type="button"
          data-testid="packet-button"
          className="rounded-md border border-[#8ef6ff] px-3 py-2 text-sm disabled:opacity-40"
          disabled={commDelayOn}
          onClick={() => setPacketOpen(true)}
        >
          Flight surgeon packet
        </button>
      </div>
      {commDelayOn && (
        <p className="mt-3 rounded-md border border-[#ffb020] bg-[#2a1c04] px-3 py-2 text-sm text-[#ffe2ad]" role="status">
          Message queued. One-way delay {delayMinutes} minutes. Self-care prompts are in the system panel. The packet stays closed until the delay is off.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button type="button" className="inline-flex items-center gap-2 rounded-md border border-[#245066] px-3 py-2" onClick={() => fileRef.current?.click()}>
          <FileUp aria-hidden="true" className="size-4" />
          Load a daily log
        </button>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept=".csv,text/csv"
          aria-label="Daily log CSV"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <button type="button" className="rounded-md border border-[#245066] px-3 py-2" onClick={downloadTemplate}>
          Download a CSV template
        </button>
        <button type="button" className="rounded-md border border-[#245066] px-3 py-2" onClick={clearImport}>
          Use simulated series
        </button>
        {importNote && <p className="text-[#d5e7f4]">{importNote}</p>}
      </div>
    </section>
  );
}
