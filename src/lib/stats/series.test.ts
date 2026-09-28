import { describe, expect, it } from "vitest";
import { stream } from "../../test/fixtures.ts";
import { buildHistory } from "../history.ts";
import { series, weekdayHour } from "./series.ts";

const { streams } = buildHistory(
  [
    stream("2025-01-07 09:00", "Sundial", "Jo Example", 60_000),
    stream("2025-01-08 09:00", "Paper Lanterns", "The Test Pilots", 180_000),
    stream("2025-01-08 09:10", "Sundial", "Jo Example", 200_000),
    stream("2025-01-08 09:20", "Night Bus", "The Test Pilots", 10_000),
    stream("2025-01-20 09:00", "Paper Lanterns", "The Test Pilots", 180_000),
    stream("2025-02-03 09:00", "Paper Lanterns", "The Test Pilots", 180_000),
  ],
  [],
);

describe("series", () => {
  it("has every day, including empty ones", () => {
    const days = series(
      streams,
      { first: "2025-01-08", last: "2025-01-10" },
      "day",
      [],
    );
    expect(days).toEqual([
      {
        key: "2025-01-08",
        first: "2025-01-08",
        last: "2025-01-08",
        ms: 390_000,
        streams: 3,
        plays: 2,
        // Jo Example: one 200s stream to The Test Pilots' two for 190s
        topArtist: 0,
        partial: false,
      },
      {
        key: "2025-01-09",
        first: "2025-01-09",
        last: "2025-01-09",
        ms: 0,
        streams: 0,
        plays: 0,
        topArtist: null,
        partial: false,
      },
      {
        key: "2025-01-10",
        first: "2025-01-10",
        last: "2025-01-10",
        ms: 0,
        streams: 0,
        plays: 0,
        topArtist: null,
        partial: false,
      },
    ]);
  });

  it("runs weeks Monday to Sunday, marking weeks cut off by the period", () => {
    const weeks = series(
      streams,
      { first: "2025-01-08", last: "2025-01-21" },
      "week",
      [],
    );
    expect(
      weeks.map(({ key, first, last, ms, partial }) => ({
        key,
        first,
        last,
        ms,
        partial,
      })),
    ).toEqual([
      {
        key: "2025-W02",
        first: "2025-01-06",
        last: "2025-01-12",
        ms: 390_000,
        partial: true,
      },
      {
        key: "2025-W03",
        first: "2025-01-13",
        last: "2025-01-19",
        ms: 0,
        partial: false,
      },
      {
        key: "2025-W04",
        first: "2025-01-20",
        last: "2025-01-26",
        ms: 180_000,
        partial: true,
      },
    ]);
  });

  it("marks months cut off by the period or with days of no data", () => {
    const months = series(
      streams,
      { first: "2025-01-15", last: "2025-03-31" },
      "month",
      ["2025-02-10"],
    );
    expect(
      months.map(({ key, ms, partial }) => ({ key, ms, partial })),
    ).toEqual([
      { key: "2025-01", ms: 180_000, partial: true },
      { key: "2025-02", ms: 180_000, partial: true },
      { key: "2025-03", ms: 0, partial: false },
    ]);
  });

  it("ignores streams outside the period", () => {
    const [day] = series(
      streams,
      { first: "2025-01-07", last: "2025-01-07" },
      "day",
      [],
    );
    expect(day).toMatchObject({ ms: 60_000, streams: 1 });
  });

  it("picks the first artist to appear when two have the same time", () => {
    const { streams } = buildHistory(
      [
        stream("2025-01-01 09:00", "A", "Jo Example"),
        stream("2025-01-01 09:05", "B", "The Test Pilots"),
      ],
      [],
    );
    const [day] = series(
      streams,
      { first: "2025-01-01", last: "2025-01-01" },
      "day",
      [],
    );
    expect(day.topArtist).toBe(0);
  });
});

describe("weekdayHour", () => {
  it("adds up listening by local weekday, Monday first, and hour", () => {
    const { streams } = buildHistory(
      [
        stream("2025-01-06 09:15", "A", "B", 60_000), // Monday 09:15
        stream("2025-01-06 09:45", "A", "B", 60_000),
        // Sunday in UTC, but Monday 00:30 in UK summer time
        stream("2025-07-06 23:30", "A", "B", 60_000),
      ],
      [],
    );
    const grid = weekdayHour(streams);
    expect(grid).toHaveLength(7);
    expect(grid[0][9]).toBe(120_000);
    expect(grid[0][0]).toBe(60_000);
    expect(grid[6][23]).toBe(0);
  });
});
