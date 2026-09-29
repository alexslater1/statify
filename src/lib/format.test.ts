import { describe, expect, it } from "vitest";
import {
  countOf,
  formatDay,
  formatDays,
  formatLength,
  formatList,
  formatMinute,
  formatMonth,
  formatNumber,
} from "./format.ts";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatNumber", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1000, "1,000"],
    [72698, "72,698"],
    [1234567, "1,234,567"],
  ])("writes %d as %s", (n, text) => {
    expect(formatNumber(n)).toBe(text);
  });
});

describe("countOf", () => {
  it("uses the singular for one only", () => {
    expect(countOf(1, "stream")).toBe("1 stream");
    expect(countOf(0, "stream")).toBe("0 streams");
    expect(countOf(6890, "stream")).toBe("6,890 streams");
  });

  it("takes an irregular plural", () => {
    expect(countOf(2, "was", "were")).toBe("2 were");
  });
});

describe("formatDay", () => {
  it("writes the day, short month and year", () => {
    expect(formatDay("2025-11-07")).toBe("7 Nov 2025");
    expect(formatDay("2024-01-31")).toBe("31 Jan 2024");
    expect(formatDay("2026-12-01")).toBe("1 Dec 2026");
  });
});

describe("formatMonth", () => {
  it("writes the short month and year", () => {
    expect(formatMonth("2025-11")).toBe("Nov 2025");
    expect(formatMonth("2026-01")).toBe("Jan 2026");
    expect(formatMonth("2024-12")).toBe("Dec 2024");
  });
});

describe("formatDays", () => {
  it("gives the year once when both days share it", () => {
    expect(formatDays("2025-09-18", "2025-11-07")).toBe("18 Sep – 7 Nov 2025");
  });

  it("gives both years when they differ", () => {
    expect(formatDays("2024-11-06", "2025-11-07")).toBe(
      "6 Nov 2024 – 7 Nov 2025",
    );
  });

  it("gives one day once", () => {
    expect(formatDays("2025-02-21", "2025-02-21")).toBe("21 Feb 2025");
  });
});

describe("formatMinute", () => {
  it("adds the time to the day", () => {
    expect(formatMinute("2025-11-07 06:05")).toBe("7 Nov 2025, 06:05");
  });
});

describe("formatLength", () => {
  it.each([
    [0, "0 minutes"],
    [MINUTE, "1 minute"],
    [59 * MINUTE, "59 minutes"],
    [HOUR, "1 hour"],
    [90 * MINUTE, "2 hours"],
    [2 * DAY - MINUTE, "48 hours"],
    [2 * DAY, "2 days"],
    [3 * DAY - MINUTE, "2 days"],
    [315 * DAY + 5 * HOUR, "315 days"],
  ])("writes %d ms as %s", (ms, text) => {
    expect(formatLength(ms)).toBe(text);
  });
});

describe("formatList", () => {
  it.each([
    [[], ""],
    [["a"], "a"],
    [["a", "b"], "a and b"],
    [["a", "b", "c"], "a, b and c"],
  ])("joins %j as %j", (items, text) => {
    expect(formatList(items)).toBe(text);
  });
});
