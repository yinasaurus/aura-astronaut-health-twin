import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { evaluateMethods, type ValidationReport } from "../engine/metrics";

export function ValidationPage() {
  const [report, setReport] = useState<ValidationReport | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setReport(evaluateMethods()), 40);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-[#9ad7ea]">VALIDATION</p>
        <h1 className="mt-1 text-3xl">Three rules, same simulated crews</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#d5e7f4]">
          Tested on simulated data only. The chart is computed in this browser when the page opens. Nothing on this page is a hardcoded result.
        </p>
      </div>
      {!report && <p className="rounded-md border border-[#245066] px-4 py-6">Running the seeded crews on this device…</p>}
      {report && (
        <>
          <p className="text-sm leading-6 text-[#d5e7f4]">{report.definition}</p>
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
          <div className="overflow-auto rounded-md border border-[#245066]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#102536] text-[#d5e7f4]">
                <tr>
                  <th className="px-3 py-2 font-medium">Rule</th>
                  <th className="px-3 py-2 font-medium">Detected</th>
                  <th className="px-3 py-2 font-medium">Median lead (days)</th>
                  <th className="px-3 py-2 font-medium">False alarms / 100 crew-days</th>
                </tr>
              </thead>
              <tbody>
                {report.methods.map((method) => (
                  <tr key={method.id} className="border-t border-[#245066]">
                    <td className="px-3 py-2">{method.label}</td>
                    <td className="px-3 py-2">
                      {method.detected} / {method.events}
                    </td>
                    <td className="px-3 py-2">{method.medianLeadDays === null ? "Not detected" : method.medianLeadDays.toFixed(1)}</td>
                    <td className="px-3 py-2">{method.falseAlarmsPer100.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
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
