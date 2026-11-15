import { ASSUMPTIONS } from "./assumptions";
import { RESOURCE_LINKS } from "./links";

export function toSourcesMarkdown(): string {
  const rows = ASSUMPTIONS.map(
    (item) =>
      `| \`${item.id}\` | ${item.value} | ${item.unit} | ${item.hazard} | ${item.evidenceLevel} | ${item.source} | ${item.rationale} |`,
  ).join("\n");
  const links = RESOURCE_LINKS.map(
    (link) => `- [${link.title}](${link.url}) — ${link.publisher}. ${link.about}`,
  ).join("\n");
  const verify = ASSUMPTIONS.map((item) => `- [ ] \`${item.id}\` — ${item.rationale}`).join("\n");

  return `# Sources

AURA's crew series is simulated. No parameter below is a published measurement. \`evidenceLevel\` is \`assumption\` and \`source\` is \`ASSUMPTION\` for every row until the team supplies a value and a citation together. The local file \`data.txt\` lists NASA and CSA pages. Those pages were not used as numeric inputs. There is no \`data/raw\` measurement file in this project.

## Resource pages

${links}

## Simulation parameters

| id | value | unit | hazard | evidence | source | rationale |
| --- | --- | --- | --- | --- | --- | --- |
${rows}

## Rules that are not a single number

- Personal baseline = mean and sample standard deviation of mission days 1–14 for each astronaut and each indicator.
- z uses the latest 5-day mean of the compared value, not a single reading. For radiation, the compared value is the daily dose rate. The screen still shows the running total.
- Sample standard deviation is floored at the placeholder sigma so a very quiet fortnight does not inflate z.
- Adverse direction: heart rate, blood pressure, glucose, and radiation rate are adverse when high; sleep, mood, and exercise are adverse when low; temperature is adverse in either direction.
- A system score averages the capped adverse z of the indicators that cleared the mild mark, then multiplies by a smaller factor when only one indicator cleared it.
- The crew display confirms a system only when its score is in the amber or red band, at least two mild signals are trending the adverse way, and that pattern has held for the stored persistence length. The validation page sweeps those lengths and does not hardcode the chart.
- Mission setting (ISS, lunar base, Mars transit) multiplies those weights. It does not rewrite the series.
- Mood's setting multiplier is the average of the isolation weight and the distance-from-Earth weight.
- Vision uses radiation dose rate only. Musculoskeletal uses exercise minutes only. Both gaps are called out in the interface.
- Fixed population bands exist only on the validation page, as the comparison method. They are reference-style assumptions, not clinical limits, and they are not used for the crew display.

## To verify

Replace any row below only when you have both a number and a citation. Until then it stays an assumption.

${verify}

- [ ] Confirm the 22-minute one-way delay against a cited Mars distance and link budget before anyone describes it as a fact.
- [ ] Confirm that a 14-day personal baseline and a 5-day trend are acceptable to the flight-surgeon reviewers you show this to.
- [ ] Do not describe the validation chart as a clinical study. It is a comparison of three rules on simulated crews.

## Paper citations

No paper citation is attached in this build. Add one here only with the number it supports.

| Placeholder | Number it would support | Citation | Status |
| --- | --- | --- | --- |
| P1 |  |  | TO ADD |
| P2 |  |  | TO ADD |
| P3 |  |  | TO ADD |
`;
}
