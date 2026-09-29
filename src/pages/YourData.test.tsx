import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { loadExports } from "../lib/spotify/exports.ts";
import { daily, historyFile } from "../test/fixtures.ts";
import { YourData } from "./YourData.tsx";

function render(...files: Parameters<typeof loadExports>[0]) {
  const html = renderToString(
    <YourData
      exports={loadExports(files)}
      onAdd={() => {}}
      onRemove={() => {}}
      onRemoveFile={() => {}}
      reading={null}
      notice={null}
    />,
  );
  // Just the words, as they read
  return html
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");
}

describe("YourData", () => {
  it("says what the exports cover, oldest first", () => {
    const text = render(
      historyFile("2025-11", 0, daily("2024-11-06", "2025-11-07")),
      historyFile("2026-09", 0, daily("2025-09-18", "2026-09-18")),
    );
    expect(text).toContain(
      "682 streams from 6 Nov 2024 – 18 Sep 2026, merged from 2 exports.",
    );
    expect(text.indexOf("6 Nov 2024 – 7 Nov 2025")).toBeLessThan(
      text.indexOf("18 Sep 2025 – 18 Sep 2026"),
    );
    expect(text).toContain("366 streams · 2026-09");
    expect(text).toContain(
      "18 Sep – 7 Nov 2025 is in two exports, with 51 streams in each. The newer one is used there.",
    );
    expect(text).not.toContain("Check your data");
  });

  it("flags gaps, missing files and exports that disagree", () => {
    const text = render(
      historyFile("2025-11", 0, daily("2025-01-01", "2025-01-31")),
      historyFile("2025-11", 2, daily("2025-03-01", "2025-11-07")),
      historyFile("2026-09", 0, daily("2025-09-18", "2025-09-30")),
      historyFile("2026-09", 2, daily("2025-11-20", "2026-09-18")),
    );
    expect(text).toContain("Gaps in your data");
    expect(text).toContain(
      "No export covers 31 Jan 2025, 12:00 to 1 Mar 2025, 12:00 (29 days), so anything you played then is missing from every stat.",
    );
    expect(text).toContain(
      "No export covers 7 Nov 2025, 12:00 to 20 Nov 2025, 12:00 (13 days)",
    );
    expect(text).toContain("2025-11 is missing StreamingHistory_music_1.json.");
    expect(text).toContain("2026-09 is missing StreamingHistory_music_1.json.");
    expect(text).toContain(
      "Two exports disagree about 18 Sep – 7 Nov 2025, with 51 streams in the older and 13 in the newer, so one may be incomplete.",
    );
  });

  it("lists each export's files, with missing ones in place", () => {
    const text = render(
      historyFile("2025-11", 0, daily("2025-01-01", "2025-01-31")),
      historyFile("2025-11", 3, daily("2025-04-01", "2025-04-30")),
      historyFile("2025-11", 1, daily("2025-02-01", "2025-02-28")),
    );
    expect(text).toContain(
      "3 files, 1 missing" +
        " StreamingHistory_music_0.json 1 Jan – 31 Jan 2025 · 31 streams Remove" +
        " StreamingHistory_music_1.json 1 Feb – 28 Feb 2025 · 28 streams Remove" +
        " StreamingHistory_music_2.json Missing" +
        " StreamingHistory_music_3.json 1 Apr – 30 Apr 2025 · 30 streams Remove",
    );
  });

  it("opens the file list only when a file is missing", () => {
    const html = (...files: Parameters<typeof loadExports>[0]) =>
      renderToString(
        <YourData
          exports={loadExports(files)}
          onAdd={() => {}}
          onRemove={() => {}}
          onRemoveFile={() => {}}
          reading={null}
          notice={null}
        />,
      );
    expect(
      html(historyFile("a", 0, daily("2025-01-01", "2025-01-02"))),
    ).not.toContain('<details class="export-files" open');
    expect(
      html(
        historyFile("a", 0, daily("2025-01-01", "2025-01-02")),
        historyFile("a", 2, daily("2025-01-05", "2025-01-06")),
      ),
    ).toContain('<details class="export-files" open');
  });

  it("offers to remove each file, even an export's only one", () => {
    const html = renderToString(
      <YourData
        exports={loadExports([
          historyFile("a", 0, daily("2025-01-01", "2025-01-02")),
          historyFile("a", 2, daily("2025-01-05", "2025-01-06")),
          historyFile("b", 0, daily("2025-02-01", "2025-02-02")),
        ])}
        onAdd={() => {}}
        onRemove={() => {}}
        onRemoveFile={() => {}}
        reading={null}
        notice={null}
      />,
    );
    const labels = [...html.matchAll(/aria-label="(Remove [^"]*)"/g)].map(
      (m) => m[1],
    );
    expect(labels).toEqual([
      "Remove a",
      "Remove StreamingHistory_music_0.json from a",
      "Remove StreamingHistory_music_2.json from a",
      "Remove b",
      "Remove StreamingHistory_music_0.json from b",
    ]);
  });

  it("gives times in local time", () => {
    const text = render(
      historyFile("export", 0, daily("2025-07-01", "2025-07-01")),
      historyFile("export", 2, daily("2025-07-03", "2025-07-03")),
    );
    // 12:00 UTC is 13:00 in UK summer time
    expect(text).toContain(
      "No export covers 1 Jul 2025, 13:00 to 3 Jul 2025, 13:00 (2 days)",
    );
  });
});
