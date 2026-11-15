import { CONTEXT_NOTE, protocolSteps, SYSTEM_COPY, SYSTEM_LABEL } from "../data/content";
import { SYSTEM_MEMBERS } from "../data/model";
import type { DayRecord, IndicatorStat, SystemRisk } from "../data/types";
import { formatIndicator, formatNumber, formatPct, formatSigned, INDICATOR_META } from "../engine/format";
import { useMission } from "../store/mission";
import { levelChip } from "./levels";
import { Sparkline } from "./Sparkline";

export function SidePanel({
  day,
  stats,
  system,
  series,
}: {
  day: number;
  stats: IndicatorStat[];
  system: SystemRisk;
  series: DayRecord[];
}) {
  const context = useMission((state) => state.context);
  const commDelayOn = useMission((state) => state.commDelayOn);
  const showCare = commDelayOn || system.level === "amber" || system.level === "red";
  const logAction = useMission((state) => state.logAction);
  const copy = SYSTEM_COPY[system.system];
  const chip = levelChip(system.level);
  const members = SYSTEM_MEMBERS[system.system];
  const byId = new Map(stats.map((stat) => [stat.id, stat]));
  const start = Math.max(0, day - 14);

  return (
    <aside className="hud-frame flex h-[clamp(22rem,calc(100dvh-16rem),34rem)] flex-col overflow-hidden">
      <div className="border-b border-[#245066] px-4 py-3">
        <p className="font-mono text-xs tracking-[0.18em] text-[#9ad7ea]">{SYSTEM_LABEL[system.system].title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded px-2 py-1 font-mono text-xs font-semibold ${chip.className}`}>{chip.label}</span>
          <span className="font-mono text-sm text-[#e8f6ff]">Score {formatNumber(system.score, 0)}</span>
          <span className="text-sm text-[#d5e7f4]">Confidence {formatNumber(system.confidence, 2)}</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-3">
        <p className="text-sm leading-6 text-[#e8f6ff]">{copy.role}</p>
        <p className="text-sm leading-6 text-[#d5e7f4]">{copy.hazards}</p>
        <p className="text-sm leading-6 text-[#d5e7f4]">{copy.watch}</p>
        <p className="text-sm leading-6 text-[#d5e7f4]">{CONTEXT_NOTE[context]}</p>
        {system.escalate && (
          <p className="rounded-md border border-[#ff4d67] bg-[#3a1020] px-3 py-2 text-sm text-[#ffe4ea]">
            This pattern is marked for flight-surgeon review under the current assumption rules. It is not a diagnosis.
          </p>
        )}
        <div>
          <h3 className="font-mono text-xs tracking-[0.16em] text-[#9ad7ea]">WHY</h3>
          <ul className="mt-2 space-y-2">
            {system.reasons.map((reason) => (
              <li key={reason} className="text-sm leading-6 text-[#e8f6ff]">
                {reason}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-mono text-xs tracking-[0.16em] text-[#9ad7ea]">SIGNALS</h3>
          <ul className="mt-2 space-y-3">
            {members.map((member) => {
              const stat = byId.get(member.id);
              const contribution = system.contributions.find((item) => item.id === member.id);
              if (!stat || !contribution) return null;
              const meta = INDICATOR_META[member.id];
              const points = series.slice(start, day).map((row) => ({ day: row.day, value: row.values[member.id] }));
              return (
                <li key={member.id} className="rounded-md border border-[#245066] p-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm">{meta.label}</span>
                    <span className="font-mono text-sm">{formatIndicator(member.id, stat.current)}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-[#d5e7f4]">
                    5-day {formatPct(stat.pctVsBaseline)} vs baseline · z {formatSigned(stat.z, 1)} · trend {formatSigned(stat.trend5, meta.decimals)}
                    {contribution.included ? " · in the score" : " · below the mild mark"}
                  </p>
                  <Sparkline points={points} baseline={member.id === "radiationDose" ? null : stat.baseline} />
                </li>
              );
            })}
          </ul>
        </div>
        {showCare ? (
          <div>
            <h3 className="font-mono text-xs tracking-[0.16em] text-[#9ad7ea]">
              {commDelayOn ? "SELF-CARE WHILE THE LINK IS DELAYED" : "SELF-CARE PROMPTS"}
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#e8f6ff]">
              {protocolSteps(system.system).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 rounded-md border border-[#8ef6ff] px-3 py-2 text-sm"
              onClick={() => logAction(`Logged a self-care check for ${SYSTEM_LABEL[system.system].title}.`)}
            >
              Log that I followed this check
            </button>
          </div>
        ) : (
          <p className="text-sm leading-6 text-[#d5e7f4]">
            The delay control is off, so the flight surgeon packet is available. Turn the delay on to see the offline self-care prompts.
          </p>
        )}
      </div>
    </aside>
  );
}
