import { strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { daily, historyFile, zipOf } from "../../test/fixtures.ts";
import { historyFilesInZip } from "./zip.ts";

describe("historyFilesInZip", () => {
  it("reads the history files as if the zip were a folder", () => {
    const file = historyFile(
      "Spotify Account Data",
      0,
      daily("2025-01-01", "2025-01-02"),
    );
    expect(historyFilesInZip("my_spotify_data.zip", zipOf([file]))).toEqual([
      {
        path: "my_spotify_data.zip/Spotify Account Data/StreamingHistory_music_0.json",
        text: file.text,
      },
    ]);
  });

  it("leaves every other file packed", () => {
    const files = historyFilesInZip(
      "data.zip",
      zipOf([
        historyFile("export", 0, daily("2025-01-01", "2025-01-02")),
        { path: "export/Payments.json", text: "{}" },
        { path: "export/StreamingHistory_music_0 (1).json", text: "[]" },
        { path: "__MACOSX/export/._StreamingHistory_music_0.json", text: "" },
      ]),
    );
    expect(files.map((f) => f.path)).toEqual([
      "data.zip/export/StreamingHistory_music_0.json",
    ]);
  });

  it("finds history files at any depth", () => {
    const files = historyFilesInZip(
      "data.zip",
      zipOf([
        { path: "StreamingHistory_music_0.json", text: "[]" },
        historyFile("a/b/c", 1, []),
      ]),
    );
    expect(files.map((f) => f.path)).toEqual([
      "data.zip/StreamingHistory_music_0.json",
      "data.zip/a/b/c/StreamingHistory_music_1.json",
    ]);
  });

  it("reads accented and non-Latin names", () => {
    const text = JSON.stringify([
      {
        endTime: "2025-01-01 12:00",
        artistName: "Jo Exämple",
        trackName: "紙の灯籠",
        msPlayed: 1000,
      },
    ]);
    const [file] = historyFilesInZip(
      "data.zip",
      zipOf([{ path: "StreamingHistory_music_0.json", text }]),
    );
    expect(file.text).toBe(text);
  });

  it("says which file isn't a zip", () => {
    expect(() =>
      historyFilesInZip("notes.zip", strToU8("just some text")),
    ).toThrow("notes.zip isn't a zip file Statify can open");
  });
});
