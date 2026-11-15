import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { assumption } from "../data/assumptions";
import { evaluateMethods, fixedBandFalseAlarmMultiple, type ValidationReport } from "../engine/metrics";

const SIMULATOR_NOTE =
  "Results come from our own simulator and detector. They show how the methods behave under our assumptions, not clinical performance. Tested on simulated data only.";

export function ValidationPage() {
  const [report, setReport] = useState<ValidationReport | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setReport(evaluateMethods()), 40);
    return () => window.clearTimeout(id);
  }, []);

  const amber = assumption("score.amber");
  const minSignals = assumption("score.persistMinSignals");

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-[#9ad7ea]">VALIDATION</p>
        <h1 className="mt-1 text-3xl">Three rules, same simulated crews</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#d5e7f4]">{SIMULATOR_NOTE}</p>
      </div>
      {!report && <p className="rounded-md border border-[#245066] px-4 py-6">Running the seeded crews on this device…</p>}
      {report && (
        <>
          <p className="text-sm leading-6 text-[#d5e7f4]">{report.definition}</p>
          <p className="max-w-3xl text-sm leading-6 text-[#d5e7f4]">
            The fixed-band row uses those reference-style assumptions as written. It was not tightened after this chart was run. A flag
            inside an injected window can be an ordinary day that would have left the band anyway. Read it next to the false-alarm column.
          </p>
          <p className="font-mono text-xs text-[#9ad7ea]">
            {report.crews} crews · {report.crewDays} crew-days
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <Chart
              title="Median detection lead time (days)"
              data={report.methods.map((method) => ({ name: method.label, value: method.medianLeadDays }))}
            />
            <Chart
              title="False alarms per 100 crew-days"
              data={report.methods.map((method) => ({ name: method.label, value: method.falseAlarmsPer100 }))}
            />
          </div>
          <ResultsTable
            rows={report.methods.map((method) => ({
              key: method.id,
              label: method.label,
              detected: method.detected,
              events: method.events,
              lead: method.medianLeadDays,
              falseAlarmsPer100: method.falseAlarmsPer100,
              chosen: false,
            }))}
          />
          <BandBreakdown report={report} />
          <section className="space-y-2">
            <h2 className="text-xl">Persistence sweep</h2>
            <p className="max-w-3xl text-sm leading-6 text-[#d5e7f4]">
              A system is confirmed when its score is at or above the stored amber cutoff ({amber}) and at least {minSignals} mild
              signals are trending the adverse way. The rows change only how many consecutive days that confirmation must hold on the
              same system. The amber cutoff is not swept.
            </p>
            <p className="max-w-3xl text-sm leading-6 text-[#d5e7f4]">{report.selectionRule}</p>
            <ResultsTable
              rows={report.sweep.map((row) => ({
                key: String(row.persistDays),
                label: `${row.persistDays} day${row.persistDays === 1 ? "" : "s"}`,
                detected: row.detected,
                events: row.events,
                lead: row.medianLeadDays,
                falseAlarmsPer100: row.falseAlarmsPer100,
                chosen: row.chosen,
              }))}
              settingLabel="Persistence"
            />
          </section>
        </>
      )}
    </div>
  );
}

function shareText(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

function multipleText(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function BandBreakdown({ report }: { report: ValidationReport }) {
  const multiple = fixedBandFalseAlarmMultiple(report.methods);
  const sentence =
    multiple === null
      ? "Fixed bands detect more events but raise about N times more false alarms; N is computed from the table above."
      : `Fixed bands detect more events but raise about ${multipleText(multiple)} times more false alarms; N is computed from the table above.`;
  return (
    <section className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="overflow-auto rounded-md border border-[#245066]">
        <table className="w-full min-w-[520px] text-left text-sm">
          <caption className="px-3 py-2 text-left text-sm text-[#d5e7f4]">
            Fixed bands only. A flagged day can leave more than one band, so these shares can add up to more than 100%.
          </caption>
          <thead className="bg-[#102536] text-[#d5e7f4]">
            <tr>
              <th className="px-3 py-2 font-medium">Indicator</th>
              <th className="px-3 py-2 font-medium">Share of alarms</th>
              <th className="px-3 py-2 font-medium">Share of false alarms</th>
            </tr>
          </thead>
          <tbody>
            {report.bandShares.map((row) => (
              <tr key={row.id} className="border-t border-[#245066]">
                <td className="px-3 py-2">{row.label}</td>
                <td className="px-3 py-2">{shareText(row.alarmShare)}</td>
                <td className="px-3 py-2">{shareText(row.falseAlarmShare)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm leading-6 text-[#d5e7f4]">{sentence}</p>
    </section>
  );
}

function detectionRate(detected: number, events: number): string {
  if (events <= 0) return "—";
  return `${((detected / events) * 100).toFixed(1)}%`;
}

function ResultsTable({
  rows,
  settingLabel = "Rule",
}: {
  rows: {
    key: string;
    label: string;
    detected: number;
    events: number;
    lead: number | null;
    falseAlarmsPer100: number;
    chosen: boolean;
  }[];
  settingLabel?: string;
}) {
  return (
    <div className="overflow-auto rounded-md border border-[#245066]">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-[#102536] text-[#d5e7f4]">
          <tr>
            <th className="px-3 py-2 font-medium">{settingLabel}</th>
            <th className="px-3 py-2 font-medium">Detection rate</th>
            <th className="px-3 py-2 font-medium">Detected</th>
            <th className="px-3 py-2 font-medium">Median lead (days)</th>
            <th className="px-3 py-2 font-medium">False alarms / 100 crew-days</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.chosen ? "border-t border-[#8ef6ff] bg-[#123044]" : "border-t border-[#245066]"}>
              <td className="px-3 py-2">
                {row.label}
                {row.chosen ? <span className="ml-2 font-mono text-xs text-[#8ef6ff]"> Default</span> : null}
              </td>
              <td className="px-3 py-2">{detectionRate(row.detected, row.events)}</td>
              <td className="px-3 py-2">
                {row.detected} / {row.events}
              </td>
              <td className="px-3 py-2">{row.lead === null ? "Not detected" : row.lead.toFixed(1)}</td>
              <td className="px-3 py-2">{row.falseAlarmsPer100.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Chart({ title, data }: { title: string; data: { name: string; value: number | null }[] }) {
  return (
    <section className="hud-frame p-3">
      <h2 className="mb-2 text-sm">{title}</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="#245066" vertical={false} />
            <XAxis dataKey="name" stroke="#d5e7f4" tick={{ fill: "#d5e7f4", fontSize: 12 }} />
            <YAxis stroke="#d5e7f4" tick={{ fill: "#d5e7f4", fontSize: 12 }} allowDecimals />
            <Tooltip
              contentStyle={{ background: "#07111c", border: "1px solid #245066", color: "#e8f6ff" }}
              formatter={(value) => (value === null || value === undefined ? "Not detected" : Number(value).toFixed(2))}
            />
            <Bar dataKey="value" fill="#8ef6ff" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
