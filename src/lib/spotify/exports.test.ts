import { describe, expect, it } from "vitest";
import { daily, historyFile, stream } from "../../test/fixtures.ts";
import { loadExports } from "./exports.ts";

describe("loadExports", () => {
  it("makes one export per folder, in folder order", () => {
    const exports = loadExports([
      historyFile("2026-09", 0, daily("2025-09-20", "2025-09-21")),
      historyFile("2025-11", 0, daily("2024-11-06", "2024-11-07")),
    ]);
    expect(exports.map((ex) => ex.name)).toEqual(["2025-11", "2026-09"]);
  });

  it("joins a folder's files in number order", () => {
    const [ex] = loadExports([
      historyFile("export", 1, daily("2025-02-01", "2025-02-28")),
      historyFile("export", 0, daily("2025-01-01", "2025-01-31")),
    ]);
    expect(ex.records).toEqual(daily("2025-01-01", "2025-02-28"));
    expect(ex.spans).toEqual([
      { from: "2025-01-01 12:00", to: "2025-02-28 12:00" },
    ]);
    expect(ex.missingFiles).toEqual([]);
  });

  it("finds the first and last stream in a file that isn't in order", () => {
    const [ex] = loadExports([
      historyFile("export", 0, [
        stream("2025-01-05 10:00"),
        stream("2025-01-01 08:00"),
        stream("2025-01-03 23:59"),
      ]),
    ]);
    expect(ex).toMatchObject({
      from: "2025-01-01 08:00",
      to: "2025-01-05 10:00",
    });
  });

  it("splits the coverage where a file is missing from the middle", () => {
    const [ex] = loadExports([
      historyFile("export", 0, daily("2025-01-01", "2025-01-31")),
      historyFile("export", 1, daily("2025-02-01", "2025-02-28")),
      historyFile("export", 3, daily("2025-04-01", "2025-04-30")),
    ]);
    expect(ex.missingFiles).toEqual([2]);
    expect(ex.spans).toEqual([
      { from: "2025-01-01 12:00", to: "2025-02-28 12:00" },
      { from: "2025-04-01 12:00", to: "2025-04-30 12:00" },
    ]);
    expect(ex).toMatchObject({
      from: "2025-01-01 12:00",
      to: "2025-04-30 12:00",
    });
    expect(ex.records).toHaveLength(31 + 28 + 30);
  });

  it("lists every missing file", () => {
    const [ex] = loadExports([
      historyFile("export", 0, daily("2025-01-01", "2025-01-02")),
      historyFile("export", 3, daily("2025-04-01", "2025-04-02")),
    ]);
    expect(ex.missingFiles).toEqual([1, 2]);
  });

  it("ignores other files without reading them, and empty files", () => {
    const [ex] = loadExports([
      historyFile("export", 0, daily("2025-01-01", "2025-01-02")),
      { path: "export/StreamingHistory_music_0 (1).json", text: "not JSON" },
      { path: "export/Payments.json", text: "not JSON" },
      historyFile("export", 1, []),
    ]);
    expect(ex.records).toEqual(daily("2025-01-01", "2025-01-02"));
    expect(ex.missingFiles).toEqual([]);
  });

  it("skips a folder with no streams", () => {
    expect(loadExports([historyFile("empty", 0, [])])).toEqual([]);
    expect(loadExports([{ path: "export/Payments.json", text: "{}" }])).toEqual(
      [],
    );
  });

  it("makes one export from files with no folder", () => {
    const exports = loadExports([
      {
        path: "StreamingHistory_music_0.json",
        text: JSON.stringify(daily("2025-01-01", "2025-01-02")),
      },
    ]);
    expect(exports.map((ex) => ex.name)).toEqual([""]);
  });

  it("names an export by its whole folder path", () => {
    const [ex] = loadExports([
      historyFile(
        "data/2026-09 - Spotify Account Data",
        0,
        daily("2025-01-01", "2025-01-01"),
      ),
    ]);
    expect(ex.name).toBe("data/2026-09 - Spotify Account Data");
  });

  it("stops at a history file that isn't Spotify's format", () => {
    expect(() =>
      loadExports([
        { path: "export/StreamingHistory_music_0.json", text: "{}" },
      ]),
    ).toThrow(
      "export/StreamingHistory_music_0.json doesn't look like Spotify streaming history",
    );
  });
});
