import { describe, expect, it } from "vitest";
import { daily, historyFile, stream } from "../test/fixtures.ts";
import { addExports, openSaved, withoutSavedFile } from "./saved.ts";
import { loadExports } from "./spotify/exports.ts";

const older = [
  historyFile("2025-11", 0, daily("2024-11-06", "2025-05-31")),
  historyFile("2025-11", 1, daily("2025-06-01", "2025-11-07")),
];
const newer = [historyFile("2026-09", 0, daily("2025-09-18", "2026-09-18"))];

describe("addExports", () => {
  it("names each export after its folder", () => {
    const { exports, duplicates } = addExports([], [...older, ...newer]);
    expect(exports.map((ex) => ex.name)).toEqual(["2025-11", "2026-09"]);
    expect(duplicates).toBe(0);
  });

  it("names history files that weren't in a folder after the month they end", () => {
    const files = older.map((f) => ({
      ...f,
      path: f.path.replace("2025-11/", ""),
    }));
    const { exports } = addExports([], files);
    expect(exports.map((ex) => ex.name)).toEqual(["Nov 2025 export"]);
  });

  it("takes that month in local time", () => {
    // 23:30 UTC on 30 June is 00:30 on 1 July in UK summer time
    const { exports } = addExports(
      [],
      [
        {
          path: "StreamingHistory_music_0.json",
          text: JSON.stringify([stream("2025-06-30 23:30")]),
        },
      ],
    );
    expect(exports.map((ex) => ex.name)).toEqual(["Jul 2025 export"]);
  });

  it("numbers names that are taken", () => {
    const current = loadExports([
      historyFile("export", 0, daily("2024-01-01", "2024-01-31")),
      historyFile("export (2)", 0, daily("2024-02-01", "2024-02-28")),
    ]);
    const { exports } = addExports(current, [
      historyFile("export", 0, daily("2025-01-01", "2025-01-31")),
    ]);
    expect(exports.map((ex) => ex.name)).toEqual(["export (3)"]);
  });

  it("leaves out an export that's already added, whatever it's called", () => {
    const current = addExports([], older).exports;
    const renamed = older.map((f) => ({
      ...f,
      path: f.path.replace(
        "2025-11",
        "my_spotify_data.zip/Spotify Account Data",
      ),
    }));
    const added = addExports(current, [...renamed, ...newer]);
    expect(added.exports.map((ex) => ex.name)).toEqual(["2026-09"]);
    expect(added.duplicates).toBe(1);
  });

  it("leaves out the second of two identical exports added together", () => {
    const copy = older.map((f) => ({ ...f, path: `copy of ${f.path}` }));
    const added = addExports([], [...older, ...copy]);
    expect(added.exports.map((ex) => ex.name)).toEqual(["2025-11"]);
    expect(added.duplicates).toBe(1);
  });

  it("adds an export that differs by one stream", () => {
    const current = addExports(
      [],
      [historyFile("a", 0, [stream("2025-01-01 12:00")])],
    ).exports;
    for (const changed of [
      stream("2025-01-01 12:01"),
      stream("2025-01-01 12:00", "Sundial"),
      stream("2025-01-01 12:00", undefined, "Jo Example"),
      stream("2025-01-01 12:00", undefined, undefined, 1000),
    ]) {
      const { exports } = addExports(current, [historyFile("b", 0, [changed])]);
      expect(exports).toHaveLength(1);
    }
    const longer = [stream("2025-01-01 12:00"), stream("2025-01-01 12:05")];
    expect(
      addExports(current, [historyFile("b", 0, longer)]).exports,
    ).toHaveLength(1);
  });

  it("keeps each export's history files, and only those, under its name", () => {
    const current = addExports([], older).exports;
    const { saved } = addExports(current, [
      ...older.map((f) => ({ ...f, path: f.path.replace("2025-11", "copy") })),
      historyFile("2025-11", 3, daily("2026-01-01", "2026-01-02")),
      { path: "2025-11/Payments.json", text: "{}" },
    ]);
    expect(saved).toEqual([
      {
        name: "2025-11 (2)",
        files: [
          {
            path: "2025-11 (2)/StreamingHistory_music_3.json",
            text: historyFile("", 3, daily("2026-01-01", "2026-01-02")).text,
          },
        ],
      },
    ]);
  });

  it("gives back what was added when it's opened again", () => {
    const { exports, saved } = addExports([], [...older, ...newer]);
    expect(openSaved(saved)).toEqual({ exports, broken: [] });
  });

  it("adds nothing from a malformed file", () => {
    expect(() =>
      addExports(
        [],
        [
          ...newer,
          { path: "2025-11/StreamingHistory_music_0.json", text: "[{}]" },
        ],
      ),
    ).toThrow("2025-11/StreamingHistory_music_0.json doesn't look like");
  });
});

describe("openSaved", () => {
  it("names the exports that no longer open, and opens the rest", () => {
    const { saved } = addExports([], [...older, ...newer]);
    const opened = openSaved([
      {
        name: "malformed",
        files: [
          {
            ...older[0],
            path: "malformed/StreamingHistory_music_0.json",
            text: "{",
          },
        ],
      },
      saved[0],
      { name: "empty", files: [] },
      {
        name: "moved",
        files: [
          { ...older[0], path: "elsewhere/StreamingHistory_music_0.json" },
        ],
      },
      saved[1],
    ]);
    expect(opened.exports.map((ex) => ex.name)).toEqual(["2025-11", "2026-09"]);
    expect(opened.broken).toEqual(["malformed", "empty", "moved"]);
  });
});

describe("withoutSavedFile", () => {
  it("leaves out that file only", () => {
    const files = [0, 1, 10].map((n) =>
      historyFile("export", n, daily("2025-01-01", "2025-01-01")),
    );
    const saved = { name: "export", files };
    expect(withoutSavedFile(saved, 1)).toEqual({
      name: "export",
      files: [files[0], files[2]],
    });
    expect(withoutSavedFile(saved, 2)).toEqual(saved);
  });
});
