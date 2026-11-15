import { ASSUMPTIONS } from "../data/assumptions";
import { RESOURCE_LINKS } from "../data/links";

export function SourcesPage() {
  const published = ASSUMPTIONS.filter((item) => item.evidenceLevel === "published");
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-[#9ad7ea]">SOURCES</p>
        <h1 className="mt-1 text-3xl">Every number is an assumption</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#d5e7f4]">
          {published.length} parameters are marked published. The resource pages below come from data.txt. They were not used as numeric inputs. The same list is in SOURCES.md, including a to-verify checklist and empty paper-citation placeholders.
        </p>
      </div>
      <ul className="space-y-3">
        {RESOURCE_LINKS.map((link) => (
          <li key={link.id} className="rounded-md border border-[#245066] p-3">
            <a className="text-[#8ef6ff] underline" href={link.url}>
              {link.title}
            </a>
            <p className="mt-1 text-sm text-[#d5e7f4]">
              {link.publisher}. {link.about}
            </p>
          </li>
        ))}
      </ul>
      <div className="overflow-auto rounded-md border border-[#245066]">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-[#102536] text-[#d5e7f4]">
            <tr>
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Value</th>
              <th className="px-3 py-2 font-medium">Unit</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Rationale</th>
            </tr>
          </thead>
          <tbody>
            {ASSUMPTIONS.map((item) => (
              <tr key={item.id} className="border-t border-[#245066]">
                <td className="px-3 py-2 font-mono text-xs">{item.id}</td>
                <td className="px-3 py-2 font-mono">{item.value}</td>
                <td className="px-3 py-2">{item.unit}</td>
                <td className="px-3 py-2">{item.source}</td>
                <td className="px-3 py-2">{item.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
