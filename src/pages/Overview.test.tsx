import { describe, expect, it } from "vitest";
import { loadExports } from "../lib/spotify/exports.ts";
import { daily, historyFile, stream } from "../test/fixtures.ts";
import { text } from "../test/render.tsx";
import { Overview } from "./Overview.tsx";

function overview(...files: Parameters<typeof loadExports>[0]) {
  return text(
    <Overview
      exports={loadExports(files)}
      onAdd={() => {}}
      onRemove={() => {}}
      onRemoveFile={() => {}}
      reading={null}
      notice={null}
    />,
  );
}

describe("Overview", () => {
  const older = historyFile("2025-11", 0, daily("2024-11-06", "2025-11-07"));
  const newer = historyFile("2026-09", 0, daily("2025-09-18", "2026-09-18"));

  it("says what the listening covers", () => {
    expect(overview(newer, older)).toContain(
      "682 streams from 6 Nov 2024 – 18 Sep 2026, merged from 2 exports.",
    );
    expect(overview(older)).toContain(
      "367 streams from 6 Nov 2024 – 7 Nov 2025. Times",
    );
  });

  it("has the listening, then the exports oldest first", () => {
    // Named so that folder order would put the newer one first
    const words = overview(
      historyFile("a", 0, daily("2025-09-18", "2026-09-18")),
      historyFile("b", 0, daily("2024-11-06", "2025-11-07")),
    );
    const order = [
      "Over time",
      "When you listen",
      "Most played",
      "Your data",
      "6 Nov 2024 – 7 Nov 2025 367 streams · b",
      "18 Sep 2025 – 18 Sep 2026 366 streams · a",
    ].map((heading) => words.indexOf(heading));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("ranks artists and songs", () => {
    const words = overview(
      historyFile("export", 0, [
        stream("2025-01-01 10:00", "Sundial", "Jo Example"),
        stream("2025-01-01 11:00", "Paper Lanterns"),
        stream("2025-01-01 12:00", "Paper Lanterns"),
      ]),
    );
    expect(words).toContain(
      "Top artists By time listened. 1 The Test Pilots 0.1 h 2 Jo Example 0.1 h",
    );
    expect(words).toContain(
      "Top songs By plays of 30 seconds or more. 1 Paper Lanterns · The Test Pilots 2 2 Sundial · Jo Example 1",
    );
  });

  it("says when you listen most", () => {
    // Noon UTC is 13:00 in UK summer time; 12 July 2025 was a Saturday
    const words = overview(
      historyFile("export", 0, [
        ...daily("2025-07-01", "2025-07-31"),
        // July 2025 has five Tuesdays, so Saturday needs two more at 13:00
        stream("2025-07-12 12:30"),
        stream("2025-07-12 12:40"),
        stream("2025-07-13 20:00"),
        stream("2025-07-13 20:10"),
        stream("2025-07-13 20:20"),
      ]),
    );
    expect(words).toContain(
      "You listen most on Saturdays around 13:00, and most overall on Sundays.",
    );
  });

  it("flags gaps first, and anything else to check", () => {
    const gappy = overview(
      historyFile("export", 0, daily("2025-01-01", "2025-01-31")),
      historyFile("export", 2, daily("2025-03-01", "2025-03-31")),
    );
    expect(gappy).toContain("Gaps in your data No export covers 31 Jan 2025");
    // A missing file another export covers leaves no gap
    const covered = overview(
      historyFile("a", 0, daily("2025-01-01", "2025-01-31")),
      historyFile("a", 2, daily("2025-03-01", "2025-03-31")),
      historyFile("b", 0, daily("2025-01-01", "2025-03-31")),
    );
    expect(covered).toContain(
      "Check your data a is missing StreamingHistory_music_1.json.",
    );
    expect(overview(older)).not.toMatch(/Gaps in your data|Check your data/);
  });

  it("still shows the exports when there's no listening in them", () => {
    const words = overview(
      historyFile("export", 0, [
        stream("2025-01-01 10:00", "Paper Lanterns", "Unknown Artist"),
      ]),
    );
    expect(words).toContain("There's no listening in these exports.");
    expect(words).not.toContain("Over time");
    expect(words).toContain("1 stream · export");
  });
});
