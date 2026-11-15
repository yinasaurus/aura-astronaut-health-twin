import { readFileSync, writeFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { assumption, ASSUMPTIONS } from "../data/assumptions";
import { CREW } from "../data/crew";
import { toSourcesMarkdown } from "../data/sourcesDoc";
import type { IndicatorStat } from "../data/types";
import { assessDay } from "./assess";
import { indicatorStats } from "./baseline";
import { adverseTrendCount, applyPersistence, dayConfirmed, scoreSystems, streakHeld } from "./compound";
import { evaluateMethods, falseAlarmsPerDetection, fixedBandFalseAlarmMultiple, median, pickPersistence, ratePer100, type MethodScore, type SweepScore } from "./metrics";
import { buildPacket, DISCLAIMER } from "./packet";
import { applyEvents, buildSeries, generateBaseSeries } from "./simulate";

function stat(partial: Partial<IndicatorStat> & Pick<IndicatorStat, "id">): IndicatorStat {
  return {
    baseline: 0,
    sd: 1,
    current: 0,
    compared: 0,
    recentMean: 0,
    z: 0,
    adverseZ: 0,
    trend5: 0,
    pctVsBaseline: 0,
    ...partial,
  };
}

describe("assumptions", () => {
  beforeAll(() => {
    writeFileSync("SOURCES.md", toSourcesMarkdown());
  });

  it("keeps every parameter unpublished", () => {
    for (const item of ASSUMPTIONS) {
      expect(item.evidenceLevel).toBe("assumption");
      expect(item.source).toBe("ASSUMPTION");
    }
  });

  it("lists every id in SOURCES.md", () => {
    const markdown = readFileSync("SOURCES.md", "utf8");
    for (const item of ASSUMPTIONS) expect(markdown).toContain(item.id);
    expect(markdown).toContain("https://www.nasa.gov/hrp/hazards/");
    expect(markdown).toContain("https://www.nasa.gov/hrp/risks/");
  });

  it("matches the generator", () => {
    const next = toSourcesMarkdown();
    writeFileSync("SOURCES.md", next);
    expect(readFileSync("SOURCES.md", "utf8")).toBe(next);
  });
});

describe("baseline and compound risk", () => {
  it("gives a flat series a z near zero after the baseline window", () => {
    const series = generateBaseSeries(11).map((row) => ({
      ...row,
      values: {
        ...row.values,
        restingHr: 64,
        systolicBp: 114,
        diastolicBp: 72,
        glucose: 90,
        temperature: 36.6,
        sleepHours: 7.4,
        mood: 7.6,
        exerciseMin: 80,
        radiationDose: row.day * 0.18,
      },
    }));
    const stats = indicatorStats(series, 60);
    const heart = stats.find((item) => item.id === "restingHr");
    expect(heart?.z ?? 1).toBeCloseTo(0, 5);
  });

  it("scores two mild drifts above one mild drift, and stays under the single-indicator z cutoff", () => {
    const quiet = INDICATOR_QUIET();
    const one = scoreSystems(quiet.map((item) => (item.id === "restingHr" ? { ...item, adverseZ: 1.4, z: 1.4 } : item)), "mars", 60);
    const two = scoreSystems(
      quiet.map((item) => {
        if (item.id === "restingHr" || item.id === "systolicBp") return { ...item, adverseZ: 1.4, z: 1.4 };
        return item;
      }),
      "mars",
      60,
    );
    const heartOne = one.find((item) => item.system === "cardiovascular");
    const heartTwo = two.find((item) => item.system === "cardiovascular");
    expect(heartTwo?.score ?? 0).toBeGreaterThan(heartOne?.score ?? 0);
    expect(heartOne?.level).toBe("green");
    expect(heartTwo?.level).toBe("amber");
    expect(dayConfirmed(heartTwo!, quiet)).toBe(false);
    expect(adverseTrendCount(heartTwo!, quiet)).toBe(0);
    const trending = quiet.map((item) =>
      item.id === "restingHr" || item.id === "systolicBp" ? { ...item, adverseZ: 1.4, z: 1.4, trend5: 0.4 } : item,
    );
    const confirmed = scoreSystems(trending, "mars", 60).find((item) => item.system === "cardiovascular");
    expect(dayConfirmed(confirmed!, trending)).toBe(true);
    expect(adverseTrendCount(confirmed!, trending)).toBe(2);
    const oneTrend = trending.map((item) => (item.id === "systolicBp" ? { ...item, trend5: 0 } : item));
    const partial = scoreSystems(oneTrend, "mars", 60).find((item) => item.system === "cardiovascular");
    expect(adverseTrendCount(partial!, oneTrend)).toBe(1);
    expect(dayConfirmed(partial!, oneTrend)).toBe(false);
    const frame = { stats: trending, systems: scoreSystems(trending, "mars", 60) };
    const persist = assumption("score.persistDays");
    const once = applyPersistence([frame], persist).find((item) => item.system === "cardiovascular");
    const held = applyPersistence(Array.from({ length: persist }, () => frame), persist).find((item) => item.system === "cardiovascular");
    expect(once?.level).toBe(persist > 1 ? "green" : "amber");
    expect(held?.level).toBe("amber");
    expect(held?.reasons.some((reason) => reason.includes("not confirmed"))).toBe(false);
    expect(1.4).toBeLessThan(assumption("score.singleIndicatorZ"));
    expect(heartTwo?.reasons.some((reason) => reason.includes("Resting heart rate"))).toBe(true);
    expect(typeof heartTwo?.escalate).toBe("boolean");
  });

  it("does not treat a lower heart rate as adverse", () => {
    const systems = scoreSystems(
      INDICATOR_QUIET().map((item) => (item.id === "restingHr" ? { ...item, z: -2, adverseZ: 0 } : item)),
      "mars",
      60,
    );
    const heart = systems.find((item) => item.system === "cardiovascular");
    expect(heart?.contributions.find((item) => item.id === "restingHr")?.included).toBe(false);
  });
});

describe("seeded mission", () => {
  it("is deterministic", () => {
    expect(generateBaseSeries(11)).toEqual(generateBaseSeries(11));
  });

  it("starts the demo day green and shows a compound flag by day 64 without a single-indicator cutoff", () => {
    const base = buildSeries({ seed: CREW[0].seed, events: [] });
    const before = assessDay(base, 60, "mars");
    expect(before.systems.every((system) => system.level === "green")).toBe(true);

    const shifted = buildSeries({
      seed: CREW[0].seed,
      events: [{ id: "spe", type: "solarParticle", startDay: 60 }],
    });
    const justInjected = assessDay(shifted, 60, "mars");
    const later = assessDay(shifted, 64, "mars");
    expect(justInjected.systems.every((system) => system.level === "green")).toBe(true);
    expect(shifted[59].values.restingHr).not.toBe(base[59].values.restingHr);
    const persist = assumption("score.persistDays");
    expect(persist).toBeGreaterThan(1);
    const beforeHold = assessDay(shifted, 60 + persist - 1, "mars");
    expect(beforeHold.systems.every((system) => system.level === "green")).toBe(true);
    expect(later.systems.some((system) => system.level === "amber")).toBe(true);
    expect(later.systems.some((system) => system.level === "red")).toBe(false);
    expect(Math.max(...later.stats.map((stat) => stat.adverseZ))).toBeLessThan(assumption("score.singleIndicatorZ"));
  });

  it("changes the series when an event is injected", () => {
    const base = generateBaseSeries(11);
    const shifted = applyEvents(base, [{ id: "sleep", type: "sleepDisruption", startDay: 70 }]);
    expect(shifted[69].values.sleepHours).toBeLessThan(base[69].values.sleepHours);
  });
});

describe("metrics helpers", () => {
  it("computes median and a per-100 rate", () => {
    expect(median([])).toBeNull();
    expect(median([4, 1, 3])).toBe(3);
    expect(median([4, 1])).toBe(2.5);
    expect(ratePer100(5, 100)).toBe(5);
  });

  it("holds a streak only after enough consecutive confirmed days", () => {
    expect(streakHeld([true], 3)).toBe(false);
    expect(streakHeld([true, true], 3)).toBe(false);
    expect(streakHeld([true, true, true], 3)).toBe(true);
    expect(streakHeld([true, false, true], 3)).toBe(false);
    expect(streakHeld([false, true, true, true], 3)).toBe(true);
  });

  it("picks the positive-lead persistence with the fewest false alarms per detection", () => {
    const row = (persistDays: number, detected: number, falseAlarms: number, medianLeadDays: number | null): SweepScore => ({
      persistDays,
      detected,
      events: 10,
      falseAlarms,
      falseAlarmsPer100: ratePer100(falseAlarms, 100),
      medianLeadDays,
      crewDays: 100,
      chosen: false,
    });
    const rows = [row(1, 10, 100, 3), row(2, 8, 40, 1), row(3, 9, 10, 0)];
    expect(falseAlarmsPerDetection(rows[1])).toBe(5);
    expect(pickPersistence(rows).persistDays).toBe(2);
    expect(pickPersistence([row(4, 2, 4, 0), row(5, 1, 9, 0)]).persistDays).toBe(4);
  });

  it("computes the fixed-band false-alarm multiple from the method rows", () => {
    const method = (id: MethodScore["id"], detected: number, falseAlarms: number): MethodScore => ({
      id,
      label: id,
      detected,
      events: 10,
      falseAlarms,
      falseAlarmsPer100: ratePer100(falseAlarms, 100),
      medianLeadDays: 1,
      crewDays: 100,
    });
    expect(fixedBandFalseAlarmMultiple([method("population", 8, 20), method("personalZ", 4, 5), method("compound", 6, 4)])).toBe(5);
    expect(fixedBandFalseAlarmMultiple([method("population", 8, 20), method("compound", 6, 0)])).toBeNull();
  });

  it("stores the persistence length selected by the sweep", () => {
    const report = evaluateMethods();
    const chosen = report.sweep.find((row) => row.chosen);
    expect(chosen).toBeTruthy();
    expect(assumption("score.persistDays")).toBe(chosen?.persistDays);
    expect(report.methods.find((method) => method.id === "compound")?.detected).toBe(chosen?.detected);
    expect(report.sweep.filter((row) => row.chosen)).toHaveLength(1);
    expect(report.bandShares.length).toBeGreaterThan(0);
    const alarmShare = report.bandShares.reduce((sum, row) => sum + row.alarmShare, 0);
    expect(alarmShare).toBeGreaterThanOrEqual(1);
    for (const row of report.bandShares) {
      expect(row.alarmShare).toBeGreaterThanOrEqual(0);
      expect(row.alarmShare).toBeLessThanOrEqual(1);
      expect(row.falseAlarmShare).toBeGreaterThanOrEqual(0);
      expect(row.falseAlarmShare).toBeLessThanOrEqual(1);
    }
    expect(fixedBandFalseAlarmMultiple(report.methods)).toBeGreaterThan(0);
  }, 30000);
});

describe("packet", () => {
  it("names the signals it was given and keeps the disclaimer", () => {
    const series = buildSeries({
      seed: CREW[0].seed,
      events: [{ id: "spe", type: "solarParticle", startDay: 60 }],
    });
    const assessment = assessDay(series, 64, "mars");
    const text = buildPacket({
      crew: CREW[0],
      day: 64,
      missionDays: 180,
      context: "mars",
      delayMinutes: 22,
      assessment,
      actions: [{ day: 60, text: "Injected a solar particle event." }],
    });
    expect(text.startsWith("AURA FLIGHT SURGEON PACKET")).toBe(true);
    expect(text).toContain(DISCLAIMER);
    expect(text).toContain("Resting heart rate");
    expect(text).toContain("Injected a solar particle event.");
  });
});

function INDICATOR_QUIET(): IndicatorStat[] {
  return [
    stat({ id: "restingHr" }),
    stat({ id: "systolicBp" }),
    stat({ id: "diastolicBp" }),
    stat({ id: "glucose" }),
    stat({ id: "temperature" }),
    stat({ id: "sleepHours" }),
    stat({ id: "mood" }),
    stat({ id: "radiationDose" }),
    stat({ id: "exerciseMin" }),
  ];
}
