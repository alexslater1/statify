import { describe, expect, it } from "vitest";
import { addDays, formatLocal, toLocal } from "./dates.ts";

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
