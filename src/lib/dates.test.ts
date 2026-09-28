import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  formatLocal,
  isoWeek,
  toLocal,
  weekday,
} from "./dates.ts";

// vite.config.ts runs the tests in UK time
it("runs in UK time", () => {
  expect(new Date(2025, 6, 1).getTimezoneOffset()).toBe(-60);
});

describe("toLocal", () => {
  it("leaves winter times alone", () => {
    expect(toLocal("2025-01-15 23:30")).toEqual({
      time: Date.UTC(2025, 0, 15, 23, 30),
      day: "2025-01-15",
      hour: 23,
      minute: 30,
    });
  });

  it("adds an hour in summer, which can move a stream to the next day", () => {
    expect(toLocal("2025-07-01 23:30")).toMatchObject({
      day: "2025-07-02",
      hour: 0,
      minute: 30,
    });
  });

  it("changes to summer time at 1am UTC on the last Sunday in March", () => {
    expect(toLocal("2025-03-30 00:59")).toMatchObject({ hour: 0, minute: 59 });
    expect(toLocal("2025-03-30 01:00")).toMatchObject({ hour: 2, minute: 0 });
  });

  it("changes back at 1am UTC on the last Sunday in October", () => {
    expect(toLocal("2025-10-26 00:30")).toMatchObject({ hour: 1, minute: 30 });
    expect(toLocal("2025-10-26 01:30")).toMatchObject({ hour: 1, minute: 30 });
  });
});

describe("formatLocal", () => {
  it("writes the local date and time", () => {
    expect(formatLocal(toLocal("2025-07-01 23:05"))).toBe("2025-07-02 00:05");
  });
});

describe("addDays", () => {
  it.each([
    ["2024-02-28", 1, "2024-02-29"],
    ["2025-02-28", 1, "2025-03-01"],
    ["2024-12-31", 1, "2025-01-01"],
    ["2025-03-01", -1, "2025-02-28"],
    ["2025-03-29", 2, "2025-03-31"],
    ["2025-01-01", 365, "2026-01-01"],
  ])("%s + %i days is %s", (day, n, expected) => {
    expect(addDays(day, n)).toBe(expected);
  });
});

describe("daysBetween", () => {
  it("counts whole days, even when the clocks change", () => {
    expect(daysBetween("2025-03-29", "2025-03-31")).toBe(2);
    expect(daysBetween("2025-01-01", "2025-01-01")).toBe(0);
    expect(daysBetween("2025-01-02", "2025-01-01")).toBe(-1);
  });
});

describe("weekday", () => {
  it("counts from Monday", () => {
    expect(weekday("2025-01-06")).toBe(0); // a Monday
    expect(weekday("2025-01-12")).toBe(6); // a Sunday
  });
});

describe("isoWeek", () => {
  it.each([
    ["2025-01-01", "2025-W01"],
    ["2024-12-30", "2025-W01"],
    ["2024-12-29", "2024-W52"],
    ["2021-01-03", "2020-W53"],
    ["2026-12-31", "2026-W53"],
    ["2025-06-15", "2025-W24"],
  ])("puts %s in %s", (day, week) => {
    expect(isoWeek(day)).toBe(week);
  });
});
