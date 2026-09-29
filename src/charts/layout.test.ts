import { describe, expect, it } from "vitest";
import {
  columnPath,
  moveAlong,
  moveInCalendar,
  moveInGrid,
  spaced,
  weekColumn,
  yearsBetween,
} from "./layout.ts";

describe("moveAlong", () => {
  it("moves left and right, stopping at the ends", () => {
    expect(moveAlong(3, "ArrowLeft", 5)).toBe(2);
    expect(moveAlong(3, "ArrowRight", 5)).toBe(4);
    expect(moveAlong(0, "ArrowLeft", 5)).toBe(0);
    expect(moveAlong(4, "ArrowRight", 5)).toBe(4);
  });

  it("ignores other keys", () => {
    expect(moveAlong(3, "ArrowUp", 5)).toBeNull();
    expect(moveAlong(3, "a", 5)).toBeNull();
  });
});

describe("moveInGrid", () => {
  // 7 rows of 24, numbered row by row
  it("moves a row or a column at a time", () => {
    expect(moveInGrid(30, "ArrowUp", 7, 24)).toBe(6);
    expect(moveInGrid(30, "ArrowDown", 7, 24)).toBe(54);
    expect(moveInGrid(30, "ArrowLeft", 7, 24)).toBe(29);
    expect(moveInGrid(30, "ArrowRight", 7, 24)).toBe(31);
  });

  it("stops at the edges rather than wrapping", () => {
    expect(moveInGrid(5, "ArrowUp", 7, 24)).toBe(5);
    expect(moveInGrid(24, "ArrowLeft", 7, 24)).toBe(24);
    expect(moveInGrid(47, "ArrowRight", 7, 24)).toBe(47);
    expect(moveInGrid(150, "ArrowDown", 7, 24)).toBe(150);
  });

  it("ignores other keys", () => {
    expect(moveInGrid(30, "Enter", 7, 24)).toBeNull();
  });
});

describe("moveInCalendar", () => {
  const move = (from: string, key: string) =>
    moveInCalendar(from, key, "2025-01-01", "2025-12-31");

  it("goes a week sideways and a day up or down", () => {
    expect(move("2025-03-10", "ArrowLeft")).toBe("2025-03-03");
    expect(move("2025-03-10", "ArrowRight")).toBe("2025-03-17");
    expect(move("2025-03-10", "ArrowUp")).toBe("2025-03-09");
    expect(move("2025-03-10", "ArrowDown")).toBe("2025-03-11");
  });

  it("stays between the first and last day", () => {
    expect(move("2025-01-03", "ArrowLeft")).toBe("2025-01-01");
    expect(move("2025-12-29", "ArrowRight")).toBe("2025-12-31");
    expect(move("2025-01-01", "ArrowUp")).toBe("2025-01-01");
  });

  it("ignores other keys", () => {
    expect(move("2025-03-10", "Home")).toBeNull();
  });
});

describe("yearsBetween", () => {
  it("splits days into calendar years", () => {
    expect(yearsBetween("2024-11-06", "2026-09-18")).toEqual([
      { year: "2024", first: "2024-11-06", last: "2024-12-31" },
      { year: "2025", first: "2025-01-01", last: "2025-12-31" },
      { year: "2026", first: "2026-01-01", last: "2026-09-18" },
    ]);
  });

  it("gives one year for days within it", () => {
    expect(yearsBetween("2025-03-01", "2025-03-02")).toEqual([
      { year: "2025", first: "2025-03-01", last: "2025-03-02" },
    ]);
  });
});

describe("weekColumn", () => {
  it("counts weeks from the one with 1 January, starting on Mondays", () => {
    // 1 January 2025 was a Wednesday, so its week began on 30 December
    expect(weekColumn("2025-01-01")).toBe(0);
    expect(weekColumn("2025-01-05")).toBe(0);
    expect(weekColumn("2025-01-06")).toBe(1);
    expect(weekColumn("2025-12-31")).toBe(52);
    // 1 January 2024 was a Monday
    expect(weekColumn("2024-01-07")).toBe(0);
    expect(weekColumn("2024-01-08")).toBe(1);
  });
});

describe("columnPath", () => {
  it("rounds the top corners by 4 px", () => {
    expect(columnPath(10, 20, 100, 40)).toBe(
      "M10,100V44A4,4 0 0 1 14,40H26A4,4 0 0 1 30,44V100Z",
    );
  });

  it("rounds less when the column is too thin or short", () => {
    expect(columnPath(0, 4, 100, 98)).toBe(
      "M0,100V100A2,2 0 0 1 2,98H2A2,2 0 0 1 4,100V100Z",
    );
  });

  it("draws nothing for an empty column", () => {
    expect(columnPath(10, 20, 100, 100)).toBe("");
  });
});

describe("spaced", () => {
  const middle = (i: number) => i * 10; // 10 px apart

  it("leaves out labels that would crowd the one before", () => {
    const labels = ["a", "b", "c", "d", "e", "f", "g", "h"];
    // The first crowds the second, so it's the one left out
    expect(spaced(labels, middle)).toEqual([1, 5]);
    expect(spaced(labels, middle, 20)).toEqual([1, 3, 5, 7]);
    expect(spaced(labels, middle, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("skips marks without a label", () => {
    expect(spaced(["a", undefined, undefined, "b", "c"], middle, 30)).toEqual([
      0, 3,
    ]);
  });

  it("fits labels in around the ones placed first", () => {
    const months = Array.from({ length: 15 }, (_, i) => `month ${i}`);
    // At 13 px a month and 32 px apart, every third month lines up with 2
    expect(spaced(months, (i) => i * 13, 32, [2, 14])).toEqual([
      2, 5, 8, 11, 14,
    ]);
  });

  it("drops the first label, not the second, when they crowd", () => {
    // Like a chart starting in December: the year shows at January
    expect(
      spaced(["2024", "2025", undefined, undefined, "x"], middle, 30),
    ).toEqual([1, 4]);
  });
});
