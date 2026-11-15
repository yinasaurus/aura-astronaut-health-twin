import { useEffect, useRef, useState } from "react";
import { assumption } from "../data/assumptions";
import { crewById } from "../data/crew";
import { buildPacket } from "../engine/packet";
import { useMission } from "../store/mission";
import { useAssessment } from "../store/selectors";

async function downloadPdf(text: string, day: number) {
  const { jsPDF } = await import("jspdf");
  const safe = text.replaceAll("°", " deg");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const lines = doc.splitTextToSize(safe, 500) as string[];
  let y = 48;
  for (const line of lines) {
    if (y > 780) {
      doc.addPage();
      y = 48;
    }
    doc.text(line, 48, y);
    y += 14;
  }
  doc.save(`aura-flight-surgeon-packet-day-${day}.pdf`);
}

export function PacketDrawer() {
  const open = useMission((state) => state.packetOpen);
  const setOpen = useMission((state) => state.setPacketOpen);
  const day = useMission((state) => state.day);
  const crewId = useMission((state) => state.crewId);
  const context = useMission((state) => state.context);
  const delayMinutes = useMission((state) => state.delayMinutes);
  const log = useMission((state) => state.log);
  const { stats, systems } = useAssessment();
  const [copyNote, setCopyNote] = useState("");
  const [pdfNote, setPdfNote] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  function showCopyFallback() {
    setCopyNote("Clipboard was blocked. Select the text above and copy it.");
    const area = textRef.current;
    if (!area) return;
    area.focus();
    area.select();
  }

  const text = buildPacket({
    crew: crewById(crewId),
    day,
    missionDays: assumption("mission.days"),
    context,
    delayMinutes,
    assessment: { stats, systems },
    actions: log,
  });

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
    <div className="fixed inset-0 z-30 flex justify-end bg-[#07111c]/70" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="packet-title"
        className="hud-frame m-4 flex h-[calc(100%-2rem)] w-full max-w-xl flex-col p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="packet-title" className="font-mono text-sm tracking-[0.16em] text-[#9ad7ea]">
            FLIGHT SURGEON PACKET
          </h2>
          <button type="button" className="rounded-md border border-[#245066] px-3 py-1 text-sm" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        <textarea
          ref={textRef}
          readOnly
          className="mt-3 min-h-0 flex-1 rounded-md border border-[#245066] bg-[#07111c] p-3 font-mono text-xs leading-5 text-[#e8f6ff]"
          value={text}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md bg-[#8ef6ff] px-3 py-2 text-sm font-semibold text-[#04202a]"
            onClick={() => {
              const write = navigator.clipboard?.writeText;
              if (!write) {
                showCopyFallback();
                return;
              }
              void write.call(navigator.clipboard, text).then(
                () => setCopyNote("Copied."),
                () => showCopyFallback(),
              );
            }}
          >
            Copy text
          </button>
          {copyNote && (
            <p className="text-sm text-[#d5e7f4]" role="status">
              {copyNote}
            </p>
          )}
          <button
            type="button"
            className="rounded-md border border-[#8ef6ff] px-3 py-2 text-sm"
            onClick={() => {
              void downloadPdf(text, day).then(
                () => setPdfNote("Downloaded"),
                () => setPdfNote("The PDF did not download."),
              );
            }}
          >
            Export PDF
          </button>
          {pdfNote && (
            <p className="text-sm text-[#d5e7f4]" role="status">
              {pdfNote}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
