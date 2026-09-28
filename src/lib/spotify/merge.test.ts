import { describe, expect, it } from "vitest";
import { daily, historyFile } from "../../test/fixtures.ts";
import { loadExports } from "./exports.ts";
import {
  countsDisagree,
  findGaps,
  mergeExports,
  type Overlap,
} from "./merge.ts";

describe("mergeExports", () => {
  it("keeps every stream when exports don't overlap", () => {
    const exports = loadExports([
      historyFile("2024", 0, daily("2024-01-01", "2024-01-10")),
      historyFile("2025", 0, daily("2025-01-01", "2025-01-10")),
    ]);
    const { records, overlaps } = mergeExports(exports);
    expect(records).toHaveLength(20);
    expect(overlaps).toEqual([]);
  });

  it("uses the newer export where two overlap", () => {
    const exports = loadExports([
      historyFile("older", 0, daily("2025-01-01", "2025-01-20")),
      historyFile("newer", 0, daily("2025-01-11", "2025-01-31")),
    ]);
    const { records, overlaps } = mergeExports(exports);
    expect(records).toHaveLength(31); // one a day, no doubles
    expect(overlaps).toEqual([
      {
        older: "older",
        newer: "newer",
        from: "2025-01-11 12:00",
        to: "2025-01-20 12:00",
        olderCount: 10,
        newerCount: 10,
      },
    ]);
  });

  it("doesn't double-count tracks Spotify renamed between exports", () => {
    const exports = loadExports([
      historyFile(
        "older",
        0,
        daily("2025-01-01", "2025-01-20", "Paper Lanterns - 2019 Remaster"),
      ),
      historyFile(
        "newer",
        0,
        daily("2025-01-11", "2025-01-31", "Paper Lanterns"),
      ),
    ]);
    const { records } = mergeExports(exports);
    const titles = (from: string, to: string) =>
      new Set(
        records
          .filter((r) => from <= r.endTime && r.endTime <= to)
          .map((r) => r.trackName),
      );
    expect(records).toHaveLength(31);
    expect(titles("2025-01-01", "2025-01-11")).toEqual(
      new Set(["Paper Lanterns - 2019 Remaster"]),
    );
    expect(titles("2025-01-11", "2025-02-01")).toEqual(
      new Set(["Paper Lanterns"]),
    );
  });

  it("treats the export that ends last as newer, whatever its name", () => {
    const exports = loadExports([
      historyFile("a", 0, daily("2025-01-01", "2025-01-31")),
      historyFile("b", 0, daily("2024-12-01", "2025-01-15")),
    ]);
    expect(mergeExports(exports).overlaps).toMatchObject([
      { older: "b", newer: "a" },
    ]);
  });

  it("uses only one copy of an export added twice", () => {
    const streams = daily("2025-01-01", "2025-01-31");
    const exports = loadExports([
      historyFile("2026-09", 0, streams),
      historyFile("2026-09 copy", 0, streams),
    ]);
    const { records, overlaps } = mergeExports(exports);
    expect(records).toEqual(streams);
    expect(overlaps).toMatchObject([
      {
        older: "2026-09 copy",
        newer: "2026-09",
        olderCount: 31,
        newerCount: 31,
      },
    ]);
  });

  it("fills a newer export's missing file from an older export", () => {
    const exports = loadExports([
      historyFile("older", 0, daily("2025-01-01", "2025-01-22", "Older Copy")),
      historyFile("newer", 0, daily("2025-01-11", "2025-01-15")),
      // no file 1, which would cover 16–20 January
      historyFile("newer", 2, daily("2025-01-21", "2025-01-31")),
    ]);
    const { records } = mergeExports(exports);
    const onDay = (day: string) =>
      records.filter((r) => r.endTime.startsWith(day)).map((r) => r.trackName);
    expect(records).toHaveLength(31);
    expect(onDay("2025-01-18")).toEqual(["Older Copy"]);
    expect(onDay("2025-01-21")).toEqual(["Paper Lanterns"]);
    expect(findGaps(exports)).toEqual([]);
  });
});

describe("countsDisagree", () => {
  const overlap = (olderCount: number, newerCount: number): Overlap => ({
    older: "older",
    newer: "newer",
    from: "2025-01-01 00:00",
    to: "2025-01-31 23:59",
    olderCount,
    newerCount,
  });

  it("allows a difference of up to 10 streams", () => {
    expect(countsDisagree(overlap(100, 110))).toBe(false);
    expect(countsDisagree(overlap(111, 100))).toBe(true);
  });

  it("allows a difference of up to 2% for bigger overlaps", () => {
    expect(countsDisagree(overlap(1000, 1020))).toBe(false);
    expect(countsDisagree(overlap(1000, 1021))).toBe(true);
  });
});

describe("findGaps", () => {
  it("finds the stretch between exports that don't overlap", () => {
    const exports = loadExports([
      historyFile("2024", 0, daily("2024-01-01", "2024-01-10")),
      historyFile("2025", 0, daily("2025-01-01", "2025-01-10")),
    ]);
    expect(findGaps(exports)).toEqual([
      { from: "2024-01-10 12:00", to: "2025-01-01 12:00" },
    ]);
  });

  it("finds a missing file that no other export covers", () => {
    const exports = loadExports([
      historyFile("export", 0, daily("2025-01-01", "2025-01-10")),
      historyFile("export", 2, daily("2025-01-21", "2025-01-31")),
    ]);
    expect(findGaps(exports)).toEqual([
      { from: "2025-01-10 12:00", to: "2025-01-21 12:00" },
    ]);
  });

  it("measures a gap from the furthest point covered so far", () => {
    const exports = loadExports([
      historyFile("long", 0, daily("2025-01-01", "2025-01-31")),
      historyFile("short", 0, daily("2025-01-05", "2025-01-10")),
      historyFile("later", 0, daily("2025-02-05", "2025-02-06")),
    ]);
    expect(findGaps(exports)).toEqual([
      { from: "2025-01-31 12:00", to: "2025-02-05 12:00" },
    ]);
  });

  it("finds no gap between exports that meet at the same minute", () => {
    const exports = loadExports([
      historyFile("2025-01", 0, daily("2025-01-01", "2025-01-10")),
      historyFile("2025-02", 0, daily("2025-01-10", "2025-01-20")),
    ]);
    expect(findGaps(exports)).toEqual([]);
  });

  it("finds nothing without exports", () => {
    expect(findGaps([])).toEqual([]);
  });
});
