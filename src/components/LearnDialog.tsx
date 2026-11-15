import { useEffect, useState } from "react";
import { LEARN } from "../data/content";
import { INDICATORS, type IndicatorId } from "../data/types";
import { INDICATOR_META } from "../engine/format";
import { useMission } from "../store/mission";

export function LearnDialog() {
  const open = useMission((state) => state.learnOpen);
  const setOpen = useMission((state) => state.setLearnOpen);
  const [selected, setSelected] = useState<IndicatorId>("restingHr");
  const entry = LEARN[selected];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#07111c]/75 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="learn-title" className="hud-frame max-h-[90vh] w-full max-w-3xl overflow-auto p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="learn-title" className="font-mono text-sm tracking-[0.16em] text-[#9ad7ea]">
            HOW TO READ A NUMBER
          </h2>
          <button type="button" className="rounded-md border border-[#245066] px-3 py-1 text-sm" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {INDICATORS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={selected === id}
              className={`rounded-md border px-3 py-2 text-sm ${selected === id ? "border-[#8ef6ff]" : "border-[#245066]"}`}
              onClick={() => setSelected(id)}
            >
              {INDICATOR_META[id].short}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3 text-sm leading-6">
          <h3 className="font-mono text-xs tracking-[0.14em] text-[#9ad7ea]">HOW TO MEASURE IT HERE</h3>
          <p>{entry.measure}</p>
          <h3 className="font-mono text-xs tracking-[0.14em] text-[#9ad7ea]">WHY IT IS ON THIS SCREEN</h3>
          <p>{entry.why}</p>
          <h3 className="font-mono text-xs tracking-[0.14em] text-[#9ad7ea]">HOW TO READ IT</h3>
          <p>{entry.read}</p>
        </div>
      </section>
    </div>
  );
}
