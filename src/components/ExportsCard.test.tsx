import { describe, expect, it } from "vitest";
import { loadExports } from "../lib/spotify/exports.ts";
import { mergeExports } from "../lib/spotify/merge.ts";
import { daily, historyFile } from "../test/fixtures.ts";
import { html, text } from "../test/render.tsx";
import { ExportsCard } from "./ExportsCard.tsx";

function card(...files: Parameters<typeof loadExports>[0]) {
  const exports = loadExports(files);
  return (
    <ExportsCard
      exports={exports}
      overlaps={mergeExports(exports).overlaps}
      onAdd={() => {}}
      onRemove={() => {}}
      onRemoveFile={() => {}}
      reading={null}
      notice={null}
    />
  );
}

describe("ExportsCard", () => {
  it("gives each export's days, streams and name, then overlaps", () => {
    const words = text(
      card(
        historyFile("2025-11", 0, daily("2024-11-06", "2025-11-07")),
        historyFile("2026-09", 0, daily("2025-09-18", "2026-09-18")),
      ),
    );
    expect(words).toContain("6 Nov 2024 – 7 Nov 2025 367 streams · 2025-11");
    expect(words).toContain("18 Sep 2025 – 18 Sep 2026 366 streams · 2026-09");
    expect(words).toContain(
      "18 Sep – 7 Nov 2025 is in two exports, with 51 streams in each.",
    );
  });

  it("lists each export's files, with missing ones in place", () => {
    expect(
      text(
        card(
          historyFile("2025-11", 0, daily("2025-01-01", "2025-01-31")),
          historyFile("2025-11", 3, daily("2025-04-01", "2025-04-30")),
          historyFile("2025-11", 1, daily("2025-02-01", "2025-02-28")),
        ),
      ),
    ).toContain(
      "3 files, 1 missing" +
        " StreamingHistory_music_0.json 1 Jan – 31 Jan 2025 · 31 streams Remove" +
        " StreamingHistory_music_1.json 1 Feb – 28 Feb 2025 · 28 streams Remove" +
        " StreamingHistory_music_2.json Missing" +
        " StreamingHistory_music_3.json 1 Apr – 30 Apr 2025 · 30 streams Remove",
    );
  });

  it("opens the file list only when a file is missing", () => {
    const open = '<details class="export-files" open';
    expect(
      html(card(historyFile("a", 0, daily("2025-01-01", "2025-01-02")))),
    ).not.toContain(open);
    expect(
      html(
        card(
          historyFile("a", 0, daily("2025-01-01", "2025-01-02")),
          historyFile("a", 2, daily("2025-01-05", "2025-01-06")),
        ),
      ),
    ).toContain(open);
  });

  it("offers to remove each export and file, even an export's only one", () => {
    const labels = [
      ...html(
        card(
          historyFile("a", 0, daily("2025-01-01", "2025-01-02")),
          historyFile("a", 2, daily("2025-01-05", "2025-01-06")),
          historyFile("b", 0, daily("2025-02-01", "2025-02-02")),
        ),
      ).matchAll(/aria-label="(Remove [^"]*)"/g),
    ].map((m) => m[1]);
    expect(labels).toEqual([
      "Remove a",
      "Remove StreamingHistory_music_0.json from a",
      "Remove StreamingHistory_music_2.json from a",
      "Remove b",
      "Remove StreamingHistory_music_0.json from b",
    ]);
  });
});
