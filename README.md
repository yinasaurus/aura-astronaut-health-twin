# AURA

A personal-baseline health twin for a simulated Mars-transit crew. AURA is decision support for the story of a long mission, when a message to Earth can take minutes. It is not a medical device and it does not use real crew records.

**Simulated data. Decision support for crew, not a medical diagnosis.**

## Run

```bash
npm install
npm test
npm run dev
```

Open the local URL Vite prints. The app has no backend and does not call the network at runtime. `/demo` opens a guided walkthrough by default: a cursor in the page clicks the real controls through an eight-step story of about 30 seconds. Classic demo keeps the earlier timed auto-play. Press `R` to restart either one. Space pauses the walkthrough, and Esc stops it.

## What the screens do

- **Mission** — four fictional astronauts, a 180-day series, a rotatable body twin, and a compound-risk panel.
- **Demo** — Guided walkthrough (default) or Classic demo. Both start on day 60 with every system quiet, inject a solar particle event, reach day 64 with at least one amber system, show the plain-language reasons, turn comm delay on for the offline self-care prompts, then open the flight surgeon packet. The walkthrough drives those controls with an on-screen cursor. Classic demo plays the same story on a timer. The choice is kept in memory only.
- **Validation** — 200 seeded simulated crews. Three rules are compared. The table and charts are computed in the browser.
- **Sources** — every simulation parameter. All of them are assumptions.
- **Limitations** — what this build does not know.

## How a score is made

1. Each astronaut has a personal baseline: the mean and sample standard deviation of days 1–14.
2. z compares the latest 5-day mean with that baseline. Radiation z uses the daily dose rate. The screen still shows the running total.
3. A body-system score averages the mild adverse z values. One mild signal is scored lower than several signals moving together.
4. ISS, lunar base, and Mars transit change risk weights. They do not rewrite the series.
5. Green, amber, and red are display bands stored in `src/data/assumptions.ts`. They are not clinical limits.

The main path does not use a population cutoff. Fixed bands appear only as the comparison rule on the validation page.

## Challenge checklist

| Brief | Where it shows up |
| --- | --- |
| Clickable body parts | The 3D twin and the labelled system buttons. Colour is paired with the words GREEN, AMBER, and RED. |
| Colour coding | Quiet / Watch / Review chips on each system, plus the overall status. |
| Dynamic charts | Sparklines on the selected system. Validation bar charts are computed on that page. |
| Instructions for non-experts | Learn panel: how to measure, why the number is here, how to read it against a personal baseline. |
| Any-input data | “Load a daily log” accepts a CSV. A template download uses the same columns. Loaded logs are still not medical records. |
| Heart rate, blood pressure, blood sugar, temperature, sleep, mood | Resting heart rate, systolic and diastolic pressure, glucose, temperature, sleep hours, and mood score. Exercise minutes and cumulative radiation dose are included as well. |
| Five hazards | Radiation, isolation and confinement, distance from Earth, gravity fields, and hostile closed environments. Each assumption names the hazard it is attached to. |
| Self-care prompts | Self-care prompts appear when the delay is on, or when a system is amber or red. The delay control is configurable up to the assumption `comm.delayMax`. The flight surgeon packet, copy, and PDF stay available when the delay is off. |

Crew Care Quests are not in this build.

## Layout

```text
src/data/assumptions.ts   every numeric parameter
src/engine                simulation, baseline, compound score, validation, packet
src/demo                 guided walkthrough script and step runner
src/components            HUD, body twin, panel, packet, learn, walkthrough overlay
src/pages                 demo, validation, sources, limitations
SOURCES.md                same parameters, to-verify list, empty citation placeholders
REFERENCES.md             libraries, fonts, icons, and NASA pages
data.txt                  resource list supplied with the project
```

No downloaded 3D model is used. The body is built from spheres, capsules, and a torus in the scene.
