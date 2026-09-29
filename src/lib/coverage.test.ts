import { describe, expect, it } from "vitest";
import { daily, historyFile } from "../test/fixtures.ts";
import { dataProblems, overlapNote } from "./coverage.ts";
import { loadExports } from "./spotify/exports.ts";
import { findGaps, mergeExports } from "./spotify/merge.ts";

function problems(...files: Parameters<typeof loadExports>[0]) {
  const exports = loadExports(files);
  return dataProblems(
    exports,
    mergeExports(exports).overlaps,
    findGaps(exports),
  );
}

describe("overlapNote", () => {
  it("says where two exports overlap and which is used", () => {
    const exports = loadExports([
      historyFile("2025-11", 0, daily("2024-11-06", "2025-11-07")),
      historyFile("2026-09", 0, daily("2025-09-18", "2026-09-18")),
    ]);
    const [overlap] = mergeExports(exports).overlaps;
    expect(overlapNote(overlap)).toBe(
      "18 Sep – 7 Nov 2025 is in two exports, with 51 streams in each. The newer one is used there.",
    );
    expect(overlapNote({ ...overlap, newerCount: 1234 })).toBe(
      "18 Sep – 7 Nov 2025 is in two exports, with 51 streams in the older and 1,234 in the newer. The newer one is used there.",
    );
  });
});

describe("dataProblems", () => {
  it("has none when the exports cover everything and agree", () => {
    expect(
      problems(
        historyFile("2025-11", 0, daily("2024-11-06", "2025-11-07")),
        historyFile("2026-09", 0, daily("2025-09-18", "2026-09-18")),
      ),
    ).toEqual([]);
  });

  it("gives gaps, then missing files, then exports that disagree", () => {
    expect(
      problems(
        historyFile("2025-11", 0, daily("2025-01-01", "2025-01-31")),
        historyFile("2025-11", 2, daily("2025-03-01", "2025-11-07")),
        historyFile("2026-09", 0, daily("2025-09-18", "2025-09-30")),
        historyFile("2026-09", 2, daily("2025-11-20", "2026-09-18")),
      ),
    ).toEqual([
      "No export covers 31 Jan 2025, 12:00 to 1 Mar 2025, 12:00 (29 days), so anything you played then is missing from every stat.",
      "No export covers 7 Nov 2025, 12:00 to 20 Nov 2025, 12:00 (13 days), so anything you played then is missing from every stat.",
      "2025-11 is missing StreamingHistory_music_1.json.",
      "2026-09 is missing StreamingHistory_music_1.json.",
      "Two exports disagree about 18 Sep – 7 Nov 2025, with 51 streams in the older and 13 in the newer, so one may be incomplete. The newer one is used.",
    ]);
  });

  it("names every missing file", () => {
    expect(
      problems(
        historyFile("export", 0, daily("2025-01-01", "2025-01-01")),
        historyFile("export", 3, daily("2025-01-05", "2025-01-05")),
      ),
    ).toContain(
      "export is missing StreamingHistory_music_1.json and StreamingHistory_music_2.json.",
    );
  });

  it("gives times in local time", () => {
    // 12:00 UTC is 13:00 in UK summer time
    expect(
      problems(
        historyFile("export", 0, daily("2025-07-01", "2025-07-01")),
        historyFile("export", 2, daily("2025-07-03", "2025-07-03")),
      )[0],
    ).toContain(
      "No export covers 1 Jul 2025, 13:00 to 3 Jul 2025, 13:00 (2 days)",
    );
  });
});
