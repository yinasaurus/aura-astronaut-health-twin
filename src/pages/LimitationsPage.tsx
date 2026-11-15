export function LimitationsPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-[#9ad7ea]">LIMITATIONS</p>
        <h1 className="mt-1 text-3xl">What this build does not know</h1>
      </div>
      <ul className="list-disc space-y-3 pl-5 text-sm leading-6 text-[#e8f6ff]">
        <li>The crew series is simulated. It is not a medical record, a clinical study, or a validated device.</li>
        <li>Every threshold, weight, drift, and event size is an assumption. None is marked published, because no value arrived with a citation.</li>
        <li>People differ. A personal baseline from 14 simulated days is a demo rule, not a statement about how long a real baseline should be.</li>
        <li>Vision has no eye measurement. Musculoskeletal health has no bone or muscle measurement. A green score there means the stand-in was quiet, not that the body system was examined.</li>
        <li>The compound score can miss a real problem, and it can flag a pattern that would not matter to a flight surgeon. The validation page only compares rules on more simulated crews.</li>
        <li>A flight surgeon remains responsible for medical judgment. AURA is decision support for a story, not a diagnosis and not an order.</li>
        <li>The comm delay is a control on this screen. Turning it on does not send a message anywhere.</li>
        <li>A loaded CSV is trusted as the user typed it. The app does not check it against a medical device.</li>
      </ul>
    </div>
  );
}
