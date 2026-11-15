import { Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from "recharts";

export function Sparkline({
  points,
  baseline,
}: {
  points: { day: number; value: number }[];
  baseline: number | null;
}) {
  return (
    <div className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
          <YAxis hide domain={["auto", "auto"]} />
          {baseline !== null && <ReferenceLine y={baseline} stroke="#ffb020" strokeDasharray="3 3" />}
          <Line type="monotone" dataKey="value" stroke="#8ef6ff" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
